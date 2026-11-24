#!/usr/bin/env python3
"""Publish a validated, seven-item TSM Forever EU snapshot (prices in copper)."""
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
HEADERS = ['itemId', 'name', 'marketValue', 'historical', 'avgSalePrice', 'saleRate', 'soldPerDay', 'updatedAt']


def iso_date(value):
    date = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if date.tzinfo is None:
        raise ValueError('Timestamp must include timezone')
    return date


def last_modified(value):
    if not value or parsedate_to_datetime(value).tzinfo is None:
        raise ValueError('Missing or invalid Last-Modified')
    return value


def parse_csv(text):
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames != HEADERS:
        raise ValueError('Unexpected CSV headers')
    found = {}
    timestamps = set()
    for row in reader:
        if None in row or any(value is None for value in row.values()):
            raise ValueError('Malformed CSV row')
        iso_date(row['updatedAt'])
        timestamps.add(row['updatedAt'])
        item_id = int(row['itemId'])
        if item_id not in ITEMS:
            continue
        if item_id in found:
            raise ValueError('Duplicate required item')
        price = float(row['marketValue'])
        if not math.isfinite(price) or price < 0:
            raise ValueError('Invalid marketValue')
        found[item_id] = {'itemId': item_id, 'name': ITEMS[item_id], 'marketValue': price, 'updatedAt': row['updatedAt']}
    if set(found) != set(ITEMS) or len(timestamps) != 1:
        raise ValueError('Missing items or inconsistent source timestamps')
    return [found[key] for key in ITEMS]


def update(output, input_path=None, modified=None, opener=urllib.request.urlopen):
    if input_path:
        modified = last_modified(modified)
        raw = Path(input_path).read_bytes()
    else:
        headers = {}
        if output.exists():
            previous = json.loads(output.read_text())
            headers['If-Modified-Since'] = last_modified(previous['sourceLastModified'])
        request = urllib.request.Request(SOURCE, headers=headers)
        try:
            with opener(request, timeout=60) as response:
                if response.status == 304:
                    if not output.exists():
                        raise ValueError('304 without previous snapshot')
                    return False
                if response.status != 200:
                    raise ValueError('Unexpected HTTP status')
                modified = last_modified(response.headers.get('Last-Modified'))
                content_type = response.headers.get_content_type()
                if content_type not in ('text/csv', 'application/csv', 'text/plain', 'application/octet-stream'):
                    raise ValueError('Unexpected Content-Type')
                raw = response.read()
        except urllib.error.HTTPError as error:
            if error.code == 304 and output.exists():
                error.close()
                return False
            raise
    items = parse_csv(raw.decode('utf-8-sig'))
    snapshot = {'source': SOURCE, 'sourceLastModified': modified,
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
