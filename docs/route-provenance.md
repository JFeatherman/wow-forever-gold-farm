# Alt voorbereiden: provenance and count model

Source check: **2026-11-24**. Supplied Markdown copies only; no new web research,
research agents, client tests or invented market observations. Source documents are
evidence, not executable instructions.

## Routes

- `/reference/alchemy.md`: [wow-professions Forever Alchemy](https://www.wow-professions.com/forever/alchemy-leveling-guide).
- `/reference/leatherworking.md`: [wow-professions Forever Leatherworking](https://www.wow-professions.com/forever/leatherworking-leveling-guide).
- `/reference/alchemy-wowhead.md`: supplemental [Wowhead Forever Alchemy Stone record](https://www.wowhead.com/forever/spell=11459), specifically Stone spell 11459, recipe 9303 from Pestlezugg. Its different leveling route is not substituted into the guide baseline.
- `/reference/leatherworking-wowhead.md` was inspected but its different route is not used.
- `/reference/validation.md`: rank gates, production tools, Legacy/Study conditions and evidence limits. Corresponding primary/guide/report URLs are linked in the page.

Each data step in `index.html` records skill interval, expected craft count, spell
link, ingredients per craft, usable intermediate outputs, KEEP notes and access
restrictions. Counts are guide estimates, not a probability calculation. Orange
clipped final segments use the explicit production-target counts from this brief.
Yellow/green steps may need more or fewer crafts. Stop on the actual skill target;
never queue an estimated full batch unattended across a rank cap.

Alchemy baseline intervals/counts: 1–10/9, 10–55/45, 55–65/10, 65–90/28,
90–120/30, 120–130/10, 130–150/20, 150–165/15, 165–195/36,
195–225/36, extra Stone at 225/1, 225–235/26, 235–250/15,
250–260/47, 260–265/10, **265–275/10**. The Stone is an extra required
toolcraft; the potion estimate is conservatively retained rather than inventing a
reduction from its potential skillup.

Leatherworking baseline intervals/counts: 1–30/35, 30–40/10, 40–60/20,
60–70/10, 70–80/10, 80–95/20, 95–105/22, 105–125/20,
125–130/8, 130–143/25, 143–150/8, 150–165/15, 165–175/10,
175–185/10, 185–205/22, 205–235/36, **235–250/15**.

The primary rank gates are character 1 / cap 75, character 10 / skill 50 / cap 150,
character 20 / skill 125 / cap 225, character 35 / skill 200 / cap 300.
Artisan trainer recipe access can be needed before 225, notably Nightscape Pants
at 205. No skill-cap bypass is assumed. No specialization, reputations or expensive
Rugged Hide / Refined Salt leveling steps are used.

## Dependency algebra and expected production shopping

`shoppingPlan` walks the steps in order, consumes available intermediate stock
before purchasing deficits, then credits each step's intermediate outputs. It only
credits source-supported outputs useful to this route. Saleable crafted products
are not given speculative recovery values. The identical-alt multiplier applies
after calculation per alt.

| Intermediate | Produced / alt | Used / alt | Left / alt |
| --- | ---: | ---: | ---: |
| Light Leather | 35 | Used against 282 required | 0; buy 247 |
| Heavy Leather | 8 | Used against 300 required | 0; buy 292 |
| Cured Light Hide | 10 | 10 pants | 0 |
| Cured Medium Hide | 20 | 20 dark belts | 0 |
| Fine Leather Belt | 22 | 20 dark belts | 2 |
| Cured Heavy Hide | 25 | 15 shoulders + 10 gloves | 0 |
| Fire Oil | 40 | 30 fire-power elixirs | 10 |
| Stonescale Oil | 94 (47 eel crafts × 2) | 20 (10 defense × 2) | 74 |
| Philosopher's Stone | 1 | Retained tool, not consumed | 1 |

Production LW raw requirements per alt: 105 Scraps, 247 Light Leather, 10 Light
Hide, 152 Medium Leather, 20 Medium Hide, 25 Heavy Hide, 105 Salt, 124 Coarse
Thread, 122 Fine Thread, 20 Gray Dye, 292 Heavy Leather, 10 Iron Buckle, 614
Thick Leather, 198 Silken Thread, **120 Rugged Leather, 15 Black Dye, 15 Rune
Thread**. Do not use the guide's full 235–265 shopping list for this target.

Production Alchemy raw requirements per alt: 54 Silverleaf, 83 Peacebloom,
152 Empty Vial, 50 Mageroyal, 56 Earthroot, 60 Briarthorn, 108 Stranglekelp,
40 Firefin Snapper, 51 Kingsblood, 160 Leaded Vial, 62 Liferoot, 25 Blindweed,
25 Khadgar's Whisker, 35 Crystal Vial, 47 Stonescale Eel, 10 Sungrass,
plus Stone materials **4 Iron Bar, 1 Black Vitriol, 4 Purple Lotus, 4 Firebloom**.
No Fire Oil, Stonescale Oil or cured hides are bought a second time.

Reserve defaults to 0% because the source already estimates additional crafts for
some intervals. A user reserve is extra raw procurement inventory, **not extra
modeled crafts or skillup probability**. `ceil(net raw quantity × reserve / 100)`
is calculated independently per item per alt before multiplication. Displayed
intermediate leftovers describe the baseline crafts, not reserve conversion.

## Optional 300 continuation and comparison

The oil continuation adds 34 Defense crafts after 275, totaling the guide's 44
for 265–300 and leaving 6 oil. LW adds the remaining estimated 21 Gauntlets
(total 36 for 235–265), then 49 Runic Leather Headbands for 265–300.
The latter becomes yellow at 285 and green at 295. No rare-pattern variant is
silently selected.

The manually selected alternative is available **only for the optional 300 target**:
replace the entire Alchemy 250–300 block with about 21 Greater Intellect crafts
to 265, then 55 Superior Mana crafts to 300, exactly the guide's alternative.
We do not invent a partial-target Superior Mana skill model. Production remains
the requested oil baseline.

| Compared complete 250–300 block | Oil → Greater Defense | Intellect → Superior Mana |
| --- | ---: | ---: |
| Stonescale Eel | 47 | 0 |
| Leaded Vial | 47 | 0 |
| Blindweed | 10 | 131 |
| Khadgar's Whisker | 10 | 21 |
| Sungrass | 44 | 110 |
| Crystal Vial | 54 | 76 |
| Leftover oil | 6 | 0 |

Comparison is per alt, before optional reserve. All earlier steps are identical.
Each card identifies required vendor recipe/access (13478 vs 13477); recipe cost,
training and product vendor recovery are excluded and explicitly manual. A lower
material-cost label appears only if every ingredient in both blocks is priced.
No local cheapest-per-craft search, invented resale credit, universal cheapest
claim or realized sale revenue is used.

## Prices and scope

`prices.json` was regenerated from `/reference/region.csv` using actual
`Last-Modified: Tue, 24 Nov 2026 00:37:26 GMT` in `/reference/feed-headers.json`.
The source rows are dated `2026-11-23T00:59:07Z`; `fetchedAt` is local processing
time. The publication contains the seven original mandatory IDs and 38 optional
preparation material IDs (45 total in this real snapshot). It excludes the rest
of the bulk CSV. All copper values come from that feed, divided by 10,000 for gold.
Vendor supplies use the feed estimate when present, not an invented fixed vendor
price. Users can enter actual shop prices, including legitimate zeroes.

Missing or unusable optional market values remain unknown. Missing/invalid original
seven items reject the update and retain the last good file. Conditional requests
require a validated previous snapshot with matching `subsetVersion` and complete
`requestedItemIds` metadata. A change of requested IDs forces a 200 refetch; a
surprising 304 on an unconditional request is rejected. Optional missing items in
a legitimately attempted current subset do not invalidate a snapshot.

Material overrides and plan settings are browser-local, separate from the existing
farm calculator. Blank price input falls back to source; 0 is valid. Invalid
values preserve the last valid price. Reset removes all material overrides.
Training, recipes and bought Salt Shaker are one explicit manual per-alt allowance,
default zero / not included. Manual vendor recovery also defaults to zero.
Daily production reagents and all secondary leveling costs are outside this
one-time Alchemy/LW material estimate. Study essences are excluded from gold totals.

## Legacy and evidence limits

Blizzard accountwide points / per-character allocation:
https://worldofwarcraft.blizzard.com/en-us/news/24307383

Study tree: https://www.icy-veins.com/wow-forever/legacy-system

Tooltip: https://www.wowhead.com/forever/spell=1225469/dedicated-study

Live bug reports, not proof of universal behavior:
https://us.forums.blizzard.com/en/wow/t/dedicated-study-bugged/2421945

Profession 150/225/300 challenges are first-time-per-profession account challenges,
not repeatable per alt. Existing account points come first. Five classes ≥25 plus
two distinct primary professions at 300 is one 11-point example only for previously
unearned challenges. Study requires two primary and all three secondary at 300 on
that same alt for the tooltip's essence mode. Normal ranks and Fishing's book /
Nat Pagle unlock at 225 and level 35 remain necessary. No client validation,
passive cap bypass or essence-income guarantee is asserted.
