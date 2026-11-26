# WoW Forever gold guide

Serve `index.html`, `bank-alt.html` and `prices.json` together on any static HTTP host. Prices are regional Forever EU marketValue in copper (10,000 copper = 1 gold), roughly daily, not realtime or realm-specific. The original seven mandatory calculator items are: Arcanite Bar, Thorium Bar, Arcane Crystal, Refined Deeprock Salt, Deeprock Salt, Mooncloth and Felcloth. The bounded published subset also requests 38 optional preparation materials and 25 optional bank-alt items (70 unique items total). Missing optional prices stay unknown; the full bulk feed is never published.

Pricing data from TradeSkillMaster: https://tradeskillmaster.com
Official freely usable public data needs no API key; attribution must remain visible. Terms/documentation: https://tradeskillmaster.com/public-data. CSV: https://public-data.tradeskillmaster.com/forever/eu/region/items.csv. No HTML scraping or secrets are used.

Run `python3 scripts/update_prices.py`. It conditionally requests the CSV using the previous Last-Modified only when the existing snapshot validates and its subset version and requested IDs match. A changed subset forces a refetch; a valid conditional 304 leaves the JSON byte-identical. Invalid data or failed requests leave the previous file intact and exit nonzero. `fetchedAt` records local retrieval/seed processing time; each row's `updatedAt` is the source timestamp, not a fabricated scan time. The current snapshot was seeded from the supplied actual downloaded CSV with HTTP Last-Modified `Thu, 26 Nov 2026 00:37:29 GMT` (source row time `2026-11-25T00:57:43Z`). For a local seed, supply your downloaded CSV and its actual header using `--input path/to/items.csv --last-modified 'actual HTTP Last-Modified'`.

Enable GitHub Pages with GitHub Actions as its source. The workflow runs on main pushes, daily at 03:17 UTC, or manually; it commits only changed prices.json and deploys only index.html, bank-alt.html and prices.json. Failed fetches fail the workflow and retain the old deployed site. Bot token pushes do not trigger another push workflow. Scheduled runs on inactive public repositories may stop after 60 days; run manually or resume scheduling as needed.

Tests: `python3 -m unittest discover -s tests`.

The calculator shares a total Alchemy-alt count; Tailoring occupies the second primary-profession slot instead of Leatherworking. Monthly production is 15 Arcanite per total alt, 10 salt per Leatherworking alt and a conservative 7 Mooncloth per Tailoring alt (95-hour cooldown). All three products independently select AH net margin or a direct commission with player-supplied materials. Products with zero production contribute zero even without prices. One-time leveling/tool costs and essences are excluded.

DOM-handler tests and syntax: `node --test tests/*.test.cjs`. All Node test files and Python tests run in CI.


The **Alt voorbereiden** tab adds a Dutch, mobile-friendly preparation route. Goldfarm
remains the default tab; its calculations, IDs, checklist and TSM links are retained.
Tabs support Left/Right, Home/End and normal button activation. Both panels remain
readable without JavaScript; the interactive route details require JavaScript.

The independent preparation planner defaults to one identical alt, Alchemy 275 /
Leatherworking 250, and 0% extra procurement reserve. Optional primary 300 has a
manual choice of two complete Alchemy 250–300 blocks. This is a price-conscious
source route with a bounded material-cost comparison, not a globally cheapest
optimizer. Counts are guide estimates; yellow/green skills may need extra crafts.
The planner subtracts its own intermediate production and shows KEEP leftovers.
A Stone is crafted once per alt. The bought Salt Shaker, training and recipe costs
belong in the separate manual allowance (default 0 / not included). Vendor recovery
is also manually entered, never assumed revenue. Secondary leveling is outside the
cost estimate; Dedicated Study remains optional and essences stay out of income.

Gold/item overrides and plan settings persist under `forever-preparation-v1` in
localStorage. Empty override uses source, 0 is valid, invalid input preserves the
last valid price. **Herstel bronprijzen** clears overrides without changing settings
or the Goldfarm calculator. Unknown prices give partial coverage and a known
subtotal, never a fictitious zero or all-in total. Vendor supplies are editable TSM
estimates when available, not asserted fixed vendor prices.

Read [route provenance and count algebra](docs/route-provenance.md) for the source
check date (2026-11-24), complete route derivations, exact production shopping list,
recipe restrictions and evidence limits. `fetchedAt` is processing time; source
row timestamps and actual HTTP Last-Modified are retained separately.

Verification commands (no dependencies or package.json):

```sh
node --test tests/*.test.cjs
python3 -m unittest discover -s tests -v
python3 scripts/update_prices.py
```

The Node DOM adapter covers event handlers, arithmetic and persistence. The release
was also exercised in headless Chromium 148 at widths 1440, 768, 390 and 320:
tab clicks/keyboard navigation, price edits and reload persistence, multi-alt
multiplication, exact route endpoints, optional route selection, offline/partial
feeds, original calculator interaction and mobile overflow. Browser checks found
and fixed a duplicate input/change rerender that detached the next price field.
Live WoW behavior was not tested; the routes remain source-based estimates.


`bank-alt.html` is a standalone Dutch bank-alt tool: eight source-derived green
armor ilvl brackets, expected gross/net material values, buffered buy ceilings,
per-session consumable costs and optional actual-purchase estimates. It includes
a concrete Enchanting 1–140 guide with two bounded price comparisons, shopping and
KEEP tools. The original calculator only gains a link and a small character-level
focus overview in Alt voorbereiden.

Bank prices use the same daily `prices.json`, with a labeled, fixed 25-item real
TSM capture embedded for offline/download use. Online valid data takes precedence;
missing values stay unknown. Only gold/item price overrides persist under
`forever-bank-alt-prices-v1`; reset restores the latest loaded source. The embedded
capture intentionally stays dated when daily online prices move on. Formulas and
all evidence limits are documented in [bank-alt provenance](docs/bank-alt-provenance.md).
Tests use the relevant original extracted sheet fixture in `tests/fixtures`;
no `/reference` folder is needed to run the application or tests.
