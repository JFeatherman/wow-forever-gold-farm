# Bank-alt: provenance and limits

Evidence retrieved from public sources and reviewed on **26 November 2026**.
No WoW client test was performed. The implementation is a static Dutch tool, independent
of the existing calculators. No dependencies, backend, automated purchasing or
camp placement are involved.

## Original spreadsheet extraction

Credit: [original video](https://www.youtube.com/watch?v=mvM3CytJBIs) and
[original Google Sheet](https://docs.google.com/spreadsheets/d/1YMvue13jzUGrotf0-hQggVzdo4qHOu5_wlQImeWQNSA/edit).
The supplied XLSX was successfully extracted into a compact relevant fixture:
[tests/fixtures/bank-sheet.json](../tests/fixtures/bank-sheet.json). This contains
all eight original formulas H15–H22, their cached exact silver outputs and the
15 example material prices. It is not inferred by fitting web page numbers.
The original workbook is not republished.

Original XLSX export SHA-256:
`348869f81a19fd3973dea7ae56642985e480d0e8c94cef722f38df6e5df8fc27`.
Copied fixture SHA-256:
`68146bdb7b3e9c06f2beb28297fe3601b85af14bf2036307a5128ebad40df557`.
Workbook example prices are used only for formula tests, never as current prices.

| ilvl (decides bracket) | Required level (reference only) | Gross material value, before AH |
|---|---|---|
| 26–30 | 21–25 | Soul Dust × 1.5 + Greater Astral × .4 + Large Glimmering × .05 |
| 31–35 | 26–30 | Soul Dust × 3 + Greater Mystic × .33 × .4 + Small Glowing × .05 |
| 36–40 | 31–35 | Vision Dust × 1.5 + Greater Mystic × .4 + Large Glowing × .05 |
| 41–45 | 36–40 | Vision Dust × 3 + Greater Nether × .33 × .4 + Small Radiant × .05 |
| 46–50 | 41–45 | Dream Dust × 1.5 + Greater Nether × .4 + Large Radiant × .05 |
| 51–55 | 46–50 | Dream Dust × 3 + Greater Eternal × .33 × .4 + Small Brilliant × .05 |
| 56–60 | 51–55 | Illusion Dust × 1.5 + Greater Eternal × .4 + Large Brilliant × .05 |
| 61–65 | 56–60 | Illusion Dust × 3 + Greater Eternal × .6 + Large Brilliant × .05 |

The literal **0.33 stays 0.33**, not 1/3. Coefficients already include the source's
Salvager assumption of 50% extra common/uncommon materials; there is no extra
blanket ×1.5 multiplier. Only **green armor** in these eight ilvl brackets is
modeled. No weapon or blue-item model, required/equip-level conversion, or
extrapolation is provided. Users must check actual type and ilvl; unusual Forever
items may differ. The maker claims 7,000 samples; we have not verified these data.
This is not an independently validated probability model. There are no confidence
intervals or promises of profit after any number of items.

## Calculations and units

All app prices are gold per item; TSM copper / 10,000 gives gold. Fixture silver /
100 gives gold for parity tests. `gross = sum(price × coefficient)`;
`net = gross × (1 − fee/100)` (default fee 5%).

`ceiling = net × (1 − buffer/100) − Salvager/n − other/n`.
Default recommended buffer is 20%, with no probability interpretation. A ceiling
at or below zero says **Niet inkopen**. Default batch size 50 is a planning input,
not a sufficient RNG sample. One bought Salvager is consumed per session; users
must add costs for additional consumables if needed. Other costs default to 0
and are explicitly manual / excluded unless entered.

`session expected profit = n × (net − buy price) − Salvager − other`.
Buffer affects the ceiling, never this expected-profit algebra.
`capital = n × buy price + Salvager + other`.
Raw material EV is `n × gross`, shown distinctly from realized sales. Blank buy
price leaves profit and capital unknown. Missing or invalid relevant prices stay
unknown; explicit zero is valid. Negative, nonfinite and invalid inputs are
rejected. Only valid price overrides persist under `forever-bank-alt-prices-v1`;
reset clears them and uses the newest successfully loaded source. Output updates
never recreate input controls.

## Actual TSM snapshot

**Pricing data from TradeSkillMaster** — [public data](https://tradeskillmaster.com/public-data),
[official Forever EU regional CSV](https://public-data.tradeskillmaster.com/forever/eu/region/items.csv).
The supplied actual CSV was processed on 26 November 2026. HTTP Last-Modified:
`Thu, 26 Nov 2026 00:37:29 GMT`; source row updatedAt:
`2026-11-25T00:57:43Z`. Initial fetchedAt / processing time:
`2026-11-26T18:57:32.609690Z`. These are distinct timestamps, not realtime scans.

The updater's subset version is now 3. Its original seven mandatory items and
38 optional preparation items are preserved; 25 optional bank items are added
(15 sheet materials, Enchanting 140 supplies, Greater Magic conversion reference,
Salvager, Lesser Nether and blueprint). Soul Dust overlaps leveling and model
uses, so it is requested once. Initial output has all **70** requested prices.
Only this bounded subset is published, never the full feed. Invalid optional
market values are omitted; missing optional rows remain unknown. Duplicate
published rows and invalid/inconsistent timestamps fail validation. Existing
subset/version/ID validation forces a fetch when expanding the subset; validated
matching snapshots can reuse 304 without changing bytes.

`bank-alt.html` embeds only the initial **25-item bank subset** with actual
metadata. Same-origin `prices.json` takes precedence when valid, including unknowns
in a partial online snapshot. It never fills individual missing online items with
stale embedded values. Offline/downloaded HTML uses the prominently labeled fixed
capture and manual overrides. The capture intentionally ages; daily workflow
updates `prices.json`, not the embedded capture. Neither feed is realtime. Browser
code never fetches the bulk CSV. Malformed responses retain the labeled fallback.

## Enchanting route to exactly 140

Source: publicly retrieved copies of the [Forever-specific community profession guide](https://www.wow-professions.com/forever/enchanting-leveling-guide)
and supplied Forever recipe records, checked 26 November 2026. Bounded comparisons:
20–70 uses 50 Strange Dust or 50 Lesser Magic; 130–140 uses 10 Soul Dust or 40
Strange Dust. Both latter recipes are orange at 130–140 according to the supplied
records. Automatic choice requires both comparable prices known; manual choice
is allowed. This is not a search over all recipes.

| Skill | Crafts | Spell | Materials for this step |
|---|---:|---:|---|
| 1→2 | 1 | 7421 | 1 Copper Rod + 1 Mote; KEEP Runed Copper Rod |
| 2→20 | 18 | 7418 | 18 Motes |
| 20→70 | 50 | 7420 / 7428 | 50 Strange / 50 Lesser Magic |
| 70→85 | 21 | 7420 | 21 Strange; yellow estimate |
| 85→100 | 15 | 7457 | 30 Strange |
| 100→109 | 9 | 7771 | 18 Strange |
| 109→110 | 1 | 7795 | 1 Silver Rod + 3 Strange + 4 Lesser Magic + 1 Shadowgem; KEEP Runed Silver Rod |
| 110→130 | 29 | 7771 | 58 Strange; yellow estimate |
| 130→140 | 10 | 13501 / 7863 | 10 Soul / 40 Strange; stop at 140 |

Fixed shopping is 19 Motes, one Copper Rod, one Silver Rod, one Shadowgem,
130 Strange Dust and four Lesser Magic. Add exactly the selected choice blocks:
Dust/Soul baseline totals 180 Strange + 4 Lesser + 10 Soul; Essence/Dust alternative
is 170 Strange + 54 Lesser. Yellow estimates may need extra crafts. Stop when the
target is reached; do not copy the full 150 shopping list. Vendor Motes/Copper Rod
are recommended with actual-price overrides; TSM AH quotes are not vendor prices.
Greater Magic → 3 Lesser is a source tip, not automatically procured inventory
(no fractional Greater purchasing). Owned items/materials are not assumed free.
Existing eligible greens can supply early DE skillups, but unpriced loot is not
deducted from this fixed crafting baseline. Reuse/overwrite bracers, chest, cloak,
boots; do not buy armor for each craft. Training, recipes and equipment require
an explicitly manual allowance (default 0 / excluded); no vendor resale is invented.

Apprentice: character 1 / cap 75. Journeyman: character 10 and skill 50 / cap 150;
learn it before cap 75. No Expert/character 20 needed for 140.
According to the [Forever disenchanting guide](https://www.wow-professions.com/forever/disenchanting-guide),
Enchanting 1 can DE high-level items: **140 is for placement**, not DE. At 140 use a
[bought Salvager](https://www.wowhead.com/forever/item=279985), outdoors near mail,
with active buff and bag space. [Placement](https://www.wowhead.com/forever/spell=1307223)
has shared camping cooldown 1 hour / lifetime 15 minutes, not a promise all scanning,
buying, disenchanting and selling fit within that time. No indoor workaround.

Optional [selfcraft recipe 1263056](https://www.wowhead.com/forever/spell=1263056)
requires 140, blueprint drop 273103, Runed Golden Rod, and consumes 2 Vision +
1 Lesser Nether. Runed Golden Rod item 11130 is soulbound;
[recipe 13628](https://www.wowhead.com/forever/spell=13628) requires 150 and consumes
1 Golden Rod (11128), 1 Iridescent Pearl (5500), 1 Greater Astral, 1 Soul Dust.
Thus 140 suffices to use a bought Salvager; 150 plus own rod and blueprint for
selfcraft. Blueprint/Golden Rod setup is excluded from the start budget.
Neither 300 nor character level 35 is required for this use case.

## Verification

Run from repository root, with no reference-folder or package dependency:

```sh
node --test tests/*.test.cjs
python3 -m unittest discover -s tests -v
```

Node tests evaluate the extracted original cell formulas against cached silver
results, compare all eight implementation outputs in gold, and perturb each of
15 material prices across eight brackets (120 checks). Other checks cover units,
fees, buffers, allocation, chosen bracket, blank purchase, unknown/zero/invalid,
actual capture, online precedence, localStorage/reset, stable input objects and
exact 140 route/tool/material counts. Python checks cover the optional bank union,
subset expansion, conditional 304 and existing updater safeguards. Existing tests
remain; the preparation status-date assertion now follows the daily snapshot.
Native browser acceptance passed in Chromium 148 at widths 1440, 768, 390 and
320: native price edits, settings-to-price focus, zero persistence, negative inputs,
reset, session algebra, 100% AH fee, route choices, partial online snapshots without
stale blending, offline fallback, standalone file loading, and navigation to/from
the original preparation page. No JavaScript errors or document-width overflow.
The Node DOM adapter alone is not a browser. No live WoW behavior was tested.
