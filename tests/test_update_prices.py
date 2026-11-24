import io
from pathlib import Path
import tempfile
import unittest
from urllib.error import HTTPError
from scripts.update_prices import HEADERS, ITEMS, parse_csv, update

MODIFIED = 'Tue, 24 Nov 2026 00:37:26 GMT'


def fixture():
    # Deliberately synthetic UNIT-test prices, never published.
    return ','.join(HEADERS) + '\n' + ''.join(
        f'{key},{name},10000,0,0,0,0,2026-11-23T00:59:07Z\n' for key, name in ITEMS.items())


class PricesTest(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(len(parse_csv(fixture())), 5)

    def test_invalid(self):
        good = fixture()
        variants = [good.rsplit('\n', 2)[0] + '\n', good + good.splitlines()[1] + '\n',
                    good.replace(',10000,', ',NaN,', 1), good.replace(',10000,', ',-1,', 1),
                    good.replace(',10000,', ',oops,', 1), good.replace('updatedAt', 'time'),
                    good.replace('2026-11-23T00:59:07Z', 'bad', 1),
                    good.replace('2026-11-23T00:59:07Z', '2026-11-22T00:59:07Z', 1)]
        for value in variants:
            with self.subTest(value=value), self.assertRaises(ValueError):
                parse_csv(value)

    def test_304_and_failure_preserve_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'prices.json'
            seed = Path(directory) / 'seed.csv'
            seed.write_text(fixture())
            update(path, seed, MODIFIED)
            original = path.read_bytes()

            def unchanged(request, timeout):
                self.assertEqual(request.get_header('If-modified-since'), MODIFIED)
                raise HTTPError(request.full_url, 304, 'Not Modified', {}, io.BytesIO())

            self.assertFalse(update(path, opener=unchanged))
            self.assertEqual(path.read_bytes(), original)
            seed.write_text('bad')
            with self.assertRaises(ValueError):
                update(path, seed, MODIFIED)
            self.assertEqual(path.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
