#!/usr/bin/env python3
"""Publish a validated, bounded TSM Forever EU snapshot (prices in copper)."""
import argparse
import csv
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import io
import json
import math
from pathlib import Path
import tempfile
import os
import urllib.request
import urllib.error

SOURCE = 'https://public-data.tradeskillmaster.com/forever/eu/region/items.csv'
ITEMS = {12360: 'Arcanite Bar', 15409: 'Refined Deeprock Salt', 12359: 'Thorium Bar', 12363: 'Arcane Crystal', 8150: 'Deeprock Salt', 14342: 'Mooncloth', 14256: 'Felcloth'}
# Optional preparation materials: absence or unusable market value stays unknown in the UI.
PREPARATION_ITEMS = {
    2934: 'Ruined Leather Scraps', 2318: 'Light Leather', 783: 'Light Hide',
    2319: 'Medium Leather', 4232: 'Medium Hide', 4235: 'Heavy Hide',
    4289: 'Salt', 2320: 'Coarse Thread', 2321: 'Fine Thread', 4340: 'Gray Dye',
    4234: 'Heavy Leather', 7071: 'Iron Buckle', 4304: 'Thick Leather',
    4291: 'Silken Thread', 8170: 'Rugged Leather', 2325: 'Black Dye',
    14341: 'Rune Thread', 14047: 'Runecloth', 765: 'Silverleaf', 2447: 'Peacebloom',
    3371: 'Empty Vial', 785: 'Mageroyal', 2449: 'Earthroot', 2450: 'Briarthorn',
    3820: 'Stranglekelp', 6359: 'Firefin Snapper', 3356: 'Kingsblood',
    3372: 'Leaded Vial', 3357: 'Liferoot', 8839: 'Blindweed',
    3358: "Khadgar's Whisker", 8925: 'Crystal Vial', 13422: 'Stonescale Eel',
    8838: 'Sungrass', 3575: 'Iron Bar', 9262: 'Black Vitriol',
    8831: 'Purple Lotus', 4625: 'Firebloom'
}
# Optional bank-alt materials, route to Enchanting 140 and setup references.
BANK_ITEMS = {
    11083: 'Soul Dust', 11137: 'Vision Dust', 11176: 'Dream Dust',
    16204: 'Illusion Dust', 11082: 'Greater Astral Essence',
    11135: 'Greater Mystic Essence', 11175: 'Greater Nether Essence',
    16203: 'Greater Eternal Essence', 11084: 'Large Glimmering Shard',
    11138: 'Small Glowing Shard', 11139: 'Large Glowing Shard',
    11177: 'Small Radiant Shard', 11178: 'Large Radiant Shard',
    14343: 'Small Brilliant Shard', 14344: 'Large Brilliant Shard',
    10940: 'Strange Dust', 10938: 'Lesser Magic Essence',
    10939: 'Greater Magic Essence', 247786: 'Mote of Magic',
    6217: 'Copper Rod', 6338: 'Silver Rod', 1210: 'Shadowgem',
    279985: 'Salvager', 11174: 'Lesser Nether Essence', 273103: 'Salvager blueprint'
}
PUBLISHED_ITEMS = {**ITEMS, **PREPARATION_ITEMS, **BANK_ITEMS}
SUBSET_VERSION = 3

HEADERS = ['itemId', 'name', 'marketValue', 'historical', 'avgSalePrice', 'saleRate', 'soldPerDay', 'updatedAt']


def iso_date(value):
    if not isinstance(value, str):
        raise ValueError('Timestamp must be a string')
    date = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if date.tzinfo is None:
        raise ValueError('Timestamp must include timezone')
    return date


def last_modified(value):
    if not isinstance(value, str) or not value or parsedate_to_datetime(value).tzinfo is None:
        raise ValueError('Missing or invalid Last-Modified')
    return value


def parse_csv(text):
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames != HEADERS:
        raise ValueError('Unexpected CSV headers')
    found = {}
    seen = set()
    timestamps = set()
    for row in reader:
        if None in row or any(value is None for value in row.values()):
            raise ValueError('Malformed CSV row')
        iso_date(row['updatedAt'])
        timestamps.add(row['updatedAt'])
        item_id = int(row['itemId'])
        if item_id not in PUBLISHED_ITEMS:
            continue
        if item_id in seen:
            raise ValueError('Duplicate published item')
        seen.add(item_id)
        try:
            price = float(row['marketValue'])
            if not math.isfinite(price) or price < 0:
                raise ValueError('Invalid marketValue')
        except ValueError:
            if item_id in ITEMS:
                raise
            continue
        found[item_id] = {'itemId': item_id, 'name': PUBLISHED_ITEMS[item_id], 'marketValue': price, 'updatedAt': row['updatedAt']}
    if not set(ITEMS).issubset(found) or len(timestamps) != 1:
        raise ValueError('Missing items or inconsistent source timestamps')
    return [found[key] for key in PUBLISHED_ITEMS if key in found]


def reusable_snapshot(previous):
    """Only conditionally reuse a validated snapshot requested with this exact subset."""
    try:
        if (previous['source'] != SOURCE or previous['subsetVersion'] != SUBSET_VERSION
                or previous['requestedItemIds'] != sorted(PUBLISHED_ITEMS)):
            return False
        iso_date(previous['fetchedAt'])
        last_modified(previous['sourceLastModified'])
        seen, times = set(), set()
        for item in previous['items']:
            key, price = item['itemId'], item['marketValue']
            if (key not in PUBLISHED_ITEMS or key in seen or isinstance(price, bool)
                    or not isinstance(price, (int, float)) or not math.isfinite(price) or price < 0):
                return False
            iso_date(item['updatedAt'])
            times.add(item['updatedAt'])
            seen.add(key)
        return set(ITEMS).issubset(seen) and len(times) == 1
    except (KeyError, TypeError, ValueError, OverflowError):
        return False


def update(output, input_path=None, modified=None, opener=urllib.request.urlopen):
    if input_path:
        modified = last_modified(modified)
        raw = Path(input_path).read_bytes()
    else:
        headers = {}
        if output.exists():
            try:
                previous = json.loads(output.read_text())
                if reusable_snapshot(previous):
                    headers['If-Modified-Since'] = previous['sourceLastModified']
            except (ValueError, TypeError):
                pass
        request = urllib.request.Request(SOURCE, headers=headers)
        try:
            with opener(request, timeout=60) as response:
                if response.status == 304:
                    if not headers:
                        raise ValueError('304 without reusable snapshot')
                    return False
                if response.status != 200:
                    raise ValueError('Unexpected HTTP status')
                modified = last_modified(response.headers.get('Last-Modified'))
                content_type = response.headers.get_content_type()
                if content_type not in ('text/csv', 'application/csv', 'text/plain', 'application/octet-stream'):
                    raise ValueError('Unexpected Content-Type')
                raw = response.read()
        except urllib.error.HTTPError as error:
            if error.code == 304 and headers:
                error.close()
                return False
            raise
    items = parse_csv(raw.decode('utf-8-sig'))
    snapshot = {'source': SOURCE, 'subsetVersion': SUBSET_VERSION,
                'requestedItemIds': sorted(PUBLISHED_ITEMS), 'sourceLastModified': modified,
                'fetchedAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'), 'items': items}
    encoded = (json.dumps(snapshot, ensure_ascii=False, indent=2, allow_nan=False) + '\n').encode()
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=output.parent, delete=False) as stream:
            temporary = stream.name
            stream.write(encoded)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, output)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, help='Seed from an already downloaded official CSV')
    parser.add_argument('--last-modified', help='Actual HTTP Last-Modified of seed CSV')
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'prices.json')
    args = parser.parse_args()
    if bool(args.input) != bool(args.last_modified):
        parser.error('--input and --last-modified must be used together')
    try:
        update(args.output, args.input, args.last_modified)
    except Exception as error:
        parser.exit(1, f'Price update failed: {error}\n')


if __name__ == '__main__':
    main()
