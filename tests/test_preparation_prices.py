"""Preparation prices stay optional; only validated, matching subsets permit 304."""
from email.message import Message
import io
import json
from pathlib import Path
import tempfile
import unittest
from urllib.error import HTTPError

from scripts.update_prices import (HEADERS, ITEMS, PREPARATION_ITEMS, PUBLISHED_ITEMS,
                                  SUBSET_VERSION, parse_csv, reusable_snapshot, update)

MODIFIED = 'Tue, 24 Nov 2026 00:37:26 GMT'
TIME = '2026-11-23T00:59:07Z'


def row(key, price='10000'):
    # Synthetic test-only values; never used to seed the published snapshot.
    return f'{key},Test item,{price},0,0,0,0,{TIME}\n'


def fixture():
    return ','.join(HEADERS) + '\n' + ''.join(row(key) for key in ITEMS)


class Response(io.BytesIO):
    def __init__(self, data, status=200):
        super().__init__(data.encode())
        self.status = status
        self.headers = Message()
        self.headers['Last-Modified'] = MODIFIED
        self.headers['Content-Type'] = 'text/csv'


class PreparationPricesTest(unittest.TestCase):
    def test_optional_subset_missing_and_invalid_stays_partial(self):
        self.assertEqual(len(parse_csv(fixture())), 7)
        for value in ['NaN', 'Infinity', '-1', 'not a price']:
            parsed = parse_csv(fixture() + row(765, value))
            self.assertEqual({item['itemId'] for item in parsed}, set(ITEMS))
        for value in ['0', '12345']:
            parsed = parse_csv(fixture() + row(765, value) + row(999999, '555'))
            self.assertEqual(len(parsed), 8)
            self.assertEqual(parsed[-1]['marketValue'], float(value))
            self.assertNotIn(999999, {item['itemId'] for item in parsed})
        # A missing original calculator item still invalidates the whole response.
        with self.assertRaises(ValueError):
            parse_csv(fixture().replace(row(12360), '') + row(765))

    def test_subset_changes_request_unconditionally_then_publish_new_marker(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'prices.json'
            seed = Path(directory) / 'seed.csv'
            seed.write_text(fixture())
            update(path, seed, MODIFIED)
            good = json.loads(path.read_text())
            variants = []
            legacy = dict(good)
            del legacy['subsetVersion']
            del legacy['requestedItemIds']
            variants.append(legacy)
            variants.append({**good, 'requestedItemIds': sorted(ITEMS)})
            variants.append({**good, 'subsetVersion': SUBSET_VERSION - 1})
            variants.append({**good, 'items': good['items'][1:]})
            variants.append({**good, 'items': good['items'] + [good['items'][0]]})
            variants.append({**good, 'source': 'https://example.invalid/prices'})
            for previous in variants:
                with self.subTest(previous=previous):
                    path.write_text(json.dumps(previous))

                    def expanded(request, timeout):
                        self.assertIsNone(request.get_header('If-modified-since'))
                        return Response(fixture() + row(765))

                    self.assertTrue(update(path, opener=expanded))
                    published = json.loads(path.read_text())
                    self.assertEqual(published['subsetVersion'], SUBSET_VERSION)
                    self.assertEqual(published['requestedItemIds'], sorted(PUBLISHED_ITEMS))
                    self.assertIn(765, {item['itemId'] for item in published['items']})

    def test_unconditional_304_is_rejected_without_replacing_legacy_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'prices.json'
            path.write_text('{"legacy":true}')
            original = path.read_bytes()
            for raised in [False, True]:
                def unexpected(request, timeout):
                    self.assertIsNone(request.get_header('If-modified-since'))
                    if raised:
                        raise HTTPError(request.full_url, 304, 'Not Modified', {}, io.BytesIO())
                    return Response('', 304)
                with self.assertRaises((ValueError, HTTPError)):
                    update(path, opener=unexpected)
                self.assertEqual(path.read_bytes(), original)

    def test_partial_current_subset_can_reuse_304_and_invalid_required_preserves_it(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'prices.json'
            seed = Path(directory) / 'seed.csv'
            seed.write_text(fixture() + row(765))
            update(path, seed, MODIFIED)
            original = path.read_bytes()
            self.assertTrue(reusable_snapshot(json.loads(original)))
            self.assertGreater(len(PREPARATION_ITEMS), 0)

            def unchanged(request, timeout):
                self.assertEqual(request.get_header('If-modified-since'), MODIFIED)
                return Response('', 304)

            self.assertFalse(update(path, opener=unchanged))
            self.assertEqual(path.read_bytes(), original)
            for broken in [fixture().replace(row(12360), ''), fixture().replace('10000', 'NaN', 1)]:
                with self.assertRaises(ValueError):
                    update(path, opener=lambda request, timeout: Response(broken))
                self.assertEqual(path.read_bytes(), original)

    def test_published_real_snapshot_is_bounded_and_metadata_valid(self):
        snapshot = json.loads(Path('prices.json').read_text())
        self.assertTrue(reusable_snapshot(snapshot))
        ids = {item['itemId'] for item in snapshot['items']}
        self.assertTrue(set(ITEMS).issubset(ids))
        self.assertTrue(ids.issubset(PUBLISHED_ITEMS))
        self.assertLessEqual(len(snapshot['items']), len(PUBLISHED_ITEMS))


if __name__ == '__main__':
    unittest.main()
