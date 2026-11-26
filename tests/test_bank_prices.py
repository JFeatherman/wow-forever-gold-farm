"""Bank items are optional; the enlarged bounded subset invalidates old 304 reuse."""
import json
from pathlib import Path
import tempfile
import unittest

from scripts.update_prices import (BANK_ITEMS, ITEMS, PREPARATION_ITEMS, PUBLISHED_ITEMS,
                                  SUBSET_VERSION, parse_csv, reusable_snapshot, update)
from test_preparation_prices import fixture, row, Response, MODIFIED


class BankPricesTest(unittest.TestCase):
    def test_bank_union_and_optional_valid_missing_zero_invalid_duplicate(self):
        self.assertEqual(len(ITEMS), 7)
        self.assertEqual(len(BANK_ITEMS), 25)
        self.assertEqual(set(PUBLISHED_ITEMS), set(ITEMS) | set(PREPARATION_ITEMS) | set(BANK_ITEMS))
        self.assertGreaterEqual(SUBSET_VERSION, 3)
        self.assertEqual({i['itemId'] for i in parse_csv(fixture())}, set(ITEMS))
        for key in BANK_ITEMS:
            for invalid in ['NaN', 'Infinity', '-1', 'oops']:
                self.assertNotIn(key, {i['itemId'] for i in parse_csv(fixture() + row(key, invalid))})
            parsed = {i['itemId']: i for i in parse_csv(fixture() + row(key, '0'))}
            self.assertEqual(parsed[key]['marketValue'], 0)
            with self.assertRaises(ValueError):
                parse_csv(fixture() + row(key) + row(key))

    def test_older_preparation_subset_forces_fetch_instead_of_304(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'prices.json'
            update(output, opener=lambda request, timeout: Response(fixture()))
            old = json.loads(output.read_text())
            old['subsetVersion'] = 2
            old['requestedItemIds'] = sorted({**ITEMS, **PREPARATION_ITEMS})
            self.assertFalse(reusable_snapshot(old))
            output.write_text(json.dumps(old))

            def expanded(request, timeout):
                self.assertIsNone(request.get_header('If-modified-since'))
                return Response(fixture() + ''.join(row(key) for key in BANK_ITEMS))

            self.assertTrue(update(output, opener=expanded))
            fresh = json.loads(output.read_text())
            self.assertTrue(reusable_snapshot(fresh))
            self.assertEqual(fresh['requestedItemIds'], sorted(PUBLISHED_ITEMS))
            before = output.read_bytes()

            def unchanged(request, timeout):
                self.assertEqual(request.get_header('If-modified-since'), MODIFIED)
                return Response('', 304)

            self.assertFalse(update(output, opener=unchanged))
            self.assertEqual(output.read_bytes(), before)

    def test_real_snapshot_has_all_bank_prices_and_actual_source_date(self):
        snapshot = json.loads(Path('prices.json').read_text())
        self.assertTrue(set(BANK_ITEMS).issubset({i['itemId'] for i in snapshot['items']}))
        self.assertTrue(reusable_snapshot(snapshot))
