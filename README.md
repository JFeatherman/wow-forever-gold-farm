# WoW Forever gold guide

Serve `index.html` and `prices.json` together on any static HTTP host. Prices are regional Forever EU marketValue in copper (10,000 copper = 1 gold), roughly daily, not realtime or realm-specific. Only seven required items are published: Arcanite Bar, Thorium Bar, Arcane Crystal, Refined Deeprock Salt, Deeprock Salt, Mooncloth and Felcloth.

Pricing data from TradeSkillMaster: https://tradeskillmaster.com
Official freely usable public data needs no API key; attribution must remain visible. Terms/documentation: https://tradeskillmaster.com/public-data. CSV: https://public-data.tradeskillmaster.com/forever/eu/region/items.csv. No HTML scraping or secrets are used.

Run `python3 scripts/update_prices.py`. It conditionally requests the CSV using the previous Last-Modified; 304 leaves the JSON byte-identical. Invalid data or failed requests leave the previous file intact and exit nonzero. `fetchedAt` records local retrieval/seed processing time; each row's `updatedAt` is the source timestamp, not a fabricated scan time. Initial snapshot was seeded from the supplied downloaded fixture with its actual HTTP Last-Modified using `--input /input/region.csv --last-modified 'Tue, 24 Nov 2026 00:37:26 GMT'`.

Enable GitHub Pages with GitHub Actions as its source. The workflow runs on main pushes, daily at 03:17 UTC, or manually; it commits only changed prices.json and deploys only index.html and prices.json. Failed fetches fail the workflow and retain the old deployed site. Bot token pushes do not trigger another push workflow. Scheduled runs on inactive public repositories may stop after 60 days; run manually or resume scheduling as needed.

Tests: `python3 -m unittest discover -s tests`.

The calculator shares a total Alchemy-alt count; Tailoring occupies the second primary-profession slot instead of Leatherworking. Monthly production is 15 Arcanite per total alt, 10 salt per Leatherworking alt and a conservative 7 Mooncloth per Tailoring alt (95-hour cooldown). All three products independently select AH net margin or a direct commission with player-supplied materials. Products with zero production contribute zero even without prices. One-time leveling/tool costs and essences are excluded.

DOM-handler tests and syntax: `node --test tests/calculator.test.cjs`.
