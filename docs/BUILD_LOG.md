# Build Log

## 2026-10-17 — Furniture from the screenshots and video, and guests who really sit

**16 new items (original drawings, modelled on S7, S8, S9, S10; prices and levels PROPOSED)**

| Item | Seen in | Level | Price | Luxury |
|---|---|---|---|---|
| Lime Light Tile | S7 (strip by the bar) | 1 | $100 | 5 |
| Cocktail Table | S10 (small white tables) | 1 | $300 | 8 |
| White Bar Stool | S7, S9 | 2 | $250 | 8 |
| Purple Tube Lamp | S9 | 2 | $700 | 18 |
| Purple Club Chair | S8 | 2 | $1,800 | 30 |
| Checkerboard Tile | S9 floor row | 3 | $300 | 9 |
| Glass Partition | S9 glass walls | 3 | $1,500 | 35 |
| Lime Neon Bar | S8 (green bar) | 3 | $4,500 | 80 |
| Round Red Sofa (2×2, seats 4) | S8 | 3 | $5,000 | 80 |
| Lime Sub Speaker | S9 | 4 | $2,500 | 45 |
| Light Rig (swinging beams) | S9 overhead lights | 4 | $3,500 | 60 |
| Long Bottle Bar (3×1) | S7, S10 | 4 | $7,000 | 110 |
| Red / Black & White Diamond Tiles | S9 build band | 5 | $1,200 | 20 |
| White Curved Lounge (2×2, seats 4) | S9 | 5 | $8,000 | 120 |
| Superstar DJ Statue | S9 "NEW" statues | 9 | $40,000 | 450 |
| Feather Showgirl Statue | S9 "NEW" statues | 10 | $50,000 | 520 |

**Guests really sit (user request)**
- Before, guests who picked a seat only stood next to it "socializing".
- Every seat now has slots: one for a stool or chair, one per tile of a sofa, and four for a 2×2 booth, round sofa or curved lounge. A guest who reaches a seat with a free slot moves **onto** it and switches to a sitting pose (knees forward, short shins). The guest stays about 15 s longer, then gets up onto the tile they came from. A full seat leaves them standing beside it.
- Works in all four facings. With the backrest turned towards you, the sitter is drawn behind it, so only their head shows.
- Moving, rotating, storing or selling a seat under someone stands them up safely; they never end up inside furniture.
- Guests now choose seats a little more often (PROPOSED). In a seeded 6-minute run with five seats, about 14% of guest time is spent seated.

**Commands run and results**
- `npx vitest run`: 125/125 passed (6 new seating tests: slot counts, slots on the seat in all facings, sit → get up, full seat, seat stored under a sitter, 6-minute busy club with nobody inside furniture).
- `npm run build`: passes.
- `node scripts/smoke.mjs`: 28/28 passed (new check: a guest sits on a round sofa in the real app).
- Real-app screenshots reviewed: all new items placed, 12 guests seated on 8 kinds of seat.


## 2026-10-16 — Inventory, 4-way rotation, more music, art pass

**Inventory (S9 showed Store / Inventory / Clear Club)**
- **Store** on any furniture card puts the item in your inventory (no refund, no fee).
- A new **Inventory** tab (box icon, with a count badge) in Decorate lists stored items with ×counts. Click one to place it again **for free**. Floor tiles stay in place mode while you have more.
- **Clear Club** stores every placed item at once, after a confirmation.
- Storing a bar frees its bartender; storing a drink tank trims stock to the new limit (same as selling).
- Fixed: while decorating, the furniture card used to open *under* the build band, so Move / Sell were unreachable. It now sits above it.
- Schema v8 adds `inventory`, with a v7→v8 migration.

**Four-way rotation (user request)**
- Items turn a quarter turn at a time through **4 directions** (R key, or Rotate on the card), not just 2. Every item can be rotated, including 1×1 ones.
- Back-side details follow the facing: sofa and lounge backrests, bar bottles, speaker cones (only shown when the front faces you), egg-chair opening, aquarium glass. The DJ and bartenders stand on the turned back edge.
- Fixed: a rotated sofa used to keep its backrest on the wrong edge.
- Saves accept facings 0–3; old saves (0/1) still load.

**More music (user request)**
- Every mix now has a **playlist of 3 original tracks**, played back to back like a DJ set (32 bars each, about a minute, with a one-bar breakdown before the change). The now-playing box shows the track name and "Mix · 1/3", with a **Next ›** button.
- Two new mixes: **House** and **Latin** (PROPOSED additions; the original's four mixes are CONFIRMED). That is 6 mixes and 18 tracks, with new piano, bell and rim/clave sounds and major-key tracks.

**Art pass: compared with the reference screenshots (S7, S8) and video frames (S10)**

| Difference found | Change |
|---|---|
| Original eyes are half-closed under heavy lids, with a thick lash line ("cool" look); ours were wide and round | Redrawn: skin-coloured heavy lid over the top of the eye, thick lash line, iris tucked under it, angled brows, winged lashes for female characters |
| Original guest/DJ cards show a big bust that bleeds out of the card; ours had a tiny full-body figure in a box | Cards now show a large bust portrait overlapping the card edge, with a drop shadow; bigger name and stat text |
| Go-go tubes in S10 stand about two guests tall with a clearly visible dancer; ours were small | Tube and dancer scaled up ~40%; dancer gets shoes and a ponytail |

Still different: proportions are close but not pixel-measured; the original's skin and cloth shading (soft gradients) is flatter here.

**Commands run and results**
- `npx vitest run`: 119/119 passed (13 new: inventory store/place/clear/migration/validation, rotation cycle/footprint/back spot/save rules, every item draws in all 4 facings, music playlists).
- `npm run build`: passes.
- `node scripts/smoke.mjs`: 27/27 passed (new: Store + Inventory tab, 4-way rotation, track playlist + Next).
- Real-app screenshots reviewed: items in all four facings, inventory tab, new guest card, Latin track in now playing.


## 2026-10-16 — Interface from the gameplay video, and a furniture pack

Source: frames from the gameplay video S10 (see `EVIDENCE_REGISTER.md`).

**Interface (matches S10)**
- **THROW A PARTY!** button with a disco ball in the top-right corner, under the scores. It replaces the dock's Party button. While a party runs, it shows `PARTY ON! m:ss · guests/goal` and the ball spins.
- **Now playing** moved to the top left, under the DJ buttons. It has **Like** (a per-browser favourite), **Change** (pick a mix) and **"Ends: 6:41pm"** in clock time.
- **Guest card**: the guest type (Regular / Celebrity / Troublemaker) under the name, a **mood word** (Enthusiastic, Happy, Content, Bored, Upset; Rowdy for troublemakers), and icons for happiness, thirst and tip rate, plus Spent.
- **Celebrity cards**: a gold star showing the popularity bonus, **Buy** and **Wish** buttons on the portrait, and a green price. Wishes are saved.
- **Club name** in the top right; click it to rename (1–24 characters).
- Schema v7 adds `clubName` and `celebWishes`, with a v6→v7 migration.

**Furniture pack (11 items, all PROPOSED prices and levels, original drawings)**

| Item | Level | Price | Luxury |
|---|---|---|---|
| Teal Glass Tile | 2 | $150 | 7 |
| Velvet Rope (2×1) | 2 | $600 | 20 |
| White Leather Sofa (2×1) | 3 | $2,000 | 40 |
| Diamond Light Tile | 4 | $600 | 15 |
| Gold Dancer Statue | 4 | $5,000 | 90 |
| Go-Go Dancer Tube | 5 | $9,000 | 140 |
| Aquarium Wall (2×1, swimming fish) | 6 | $14,000 | 200 |
| Podium DJ Booth (2×1, 45-min sets) | 6 | $15,000 | 220 |
| Rose Petal Fountain (2×2, ripples) | 7 | $20,000 | 260 |
| Golden Buddha | 8 | $30,000 | 350 |

- The DJ now stands at the best booth, raised on a podium. Build-menu items are sorted by level, then price.
- The Progress screen picks up all new items automatically.

**Commands run and results**
- `npx vitest run`: 106/106 passed (8 new: club name, wishes, mood words, v6→v7 migration/validation, catalogue sanity, every item draws finite shapes, the pack places and blocks correctly).
- `npm run build`: passes.
- `node scripts/smoke.mjs`: 24/24 passed (new or updated checks: THROW A PARTY!, guest card parts, club rename + Wish + "Ends:" time).
- Real-app screenshots reviewed: new HUD, guest card, celebrity cards, party countdown, renamed club, all new furniture in a club and in the build menu.


## 2026-10-16 — Bouncer fix: he now walks over and handles trouble

**Problem (reported by the user):** the bouncer didn't seem to do his job. A seeded simulation of the starter club confirmed it:
- only 28% of troublemakers started inside the bouncer's area, because the default post was by the door and his area was only 7×7;
- 1 in 10 troublemakers ran loose for 15+ seconds (worst case 45 s), and some stormed out, costing popularity;
- the bouncer never moved. A troublemaker in his area just vanished while he faded out at his post, so it was easy to miss that he did anything.

**Changed**
- Bouncers now **walk** to the troublemaker (pathfinding, a little faster than guests), escort them out with "BOUNCED!", then walk back to their post. The troublemaker stops and waits while the bouncer comes, and stops upsetting guests.
- **Send Bouncer** sends the nearest free bouncer, who walks over the same way.
- A new bouncer is posted in the **middle of the club** (nearest free tile), not by the door. His area grows from 7×7 to **9×9** (radius 4), and his rest after an escort drops from 6 s to 3 s. All PROPOSED.
- Clearer warning: it says whether the troublemaker is outside your bouncer's area (Send Bouncer or move his post), or that you have no bouncer at all.

**Result (same simulation, 5 seeds × 56 minutes):** 58% start inside the area (was 28%), every troublemaker handled (was 448/450), 90% within 3 s including the walk (was 14.6 s), worst case 11.5 s (was 45 s).

**Commands run and results**
- `npx vitest run`: 98/98 passed (3 new or rewritten bouncer tests: walk-escort-return, waiting troublemaker doesn't time out or drain happiness, Send Bouncer busy/already-on-the-way).
- `npm run build`: passes.
- `node scripts/smoke.mjs`: 23/23 passed (new check: in the real app a bouncer walks to a troublemaker and escorts them out).


## 2026-10-16 — Level / progress screen

**Added**
- A **Progress** screen that opens from the level badge or the XP bar. It shows:
  - your level, title and XP bar, with how much XP the next level needs,
  - lifetime stats: total earned, guests, drinks sold, tips, celebrity visits, parties won,
  - a **Coming next** box for the next level that unlocks something,
  - the full level ladder. Each row lists that level's unlocks: cash bonus, bigger club, worker slot, furniture (with thumbnails), celebrities and parties. Reached levels are ticked and your current level is highlighted.
- Unlocks are worked out from the data files (`src/domain/unlocks.ts`), so new items show up automatically.
- The level-up popup now lists what you just unlocked and has a **What's next?** button.
- The level curve now runs to **level 21** (was 14). The original's Workers panel shows slots unlocking at levels 17 and 21, which were unreachable before. New thresholds and titles are PROPOSED.
- Docs: `GAMEPLAY_SPEC.md` and `EVIDENCE_REGISTER.md` no longer list bouncers, celebrities and parties as missing.

**Commands run and results**
- `npx vitest run`: 95/95 passed (5 new unlock tests).
- `npm run build`: passes.
- `node scripts/smoke.mjs`: 22/22 passed (new check: the progress screen opens from the badge and highlights the current level).
- Real-app screenshot reviewed: progress screen at level 1.


## 2026-10-16 — Parties

**Added**
- A **Party** button on the dock opens a party planner with 4 **original** themes: Neon Night (level 1), Retro Roller Disco (2), Velvet Rope VIP Night (4) and Foam Frenzy (6). Hosting parties is part of the original; the old theme names in descriptions are UNVERIFIED, so none are reused.
- Each party costs an entry fee and runs for 3–5 minutes on absolute timestamps. While it runs:
  - guests arrive 2–3× faster,
  - some parties raise the cover charge (×1.5 to ×3),
  - coloured spotlights sweep the floor,
  - a pill under the cash shows the countdown and `guests / goal`.
- Hit the guest goal before the timer ends to win cash and popularity. Missing it pays nothing; the fee is not refunded. Successful parties are counted on each card.
- The party is settled exactly once, even if the page is reloaded long after it ended (no offline simulation, per D3).
- Schema v6 adds `party` and `partyHistory`, with a v5→v6 migration.
- All numbers are PROPOSED in `src/data/parties.ts`.

**Commands run and results**
- `npx vitest run`: 90/90 passed (8 new party tests, including a seeded simulation showing more arrivals during a party).
- `npm run build`: passes.
- `node scripts/smoke.mjs`: 21/21 passed twice (new check: the planner starts Neon Night, charges $500 once and shows the HUD pill).
- Real-app screenshots reviewed: party planner, party lights in the club, HUD pill.


## 2026-10-16 — Bartender modes and drink tanks

**Added**
- **Bartender modes** (GameYum: a "trick" option for bigger tips, a speed option for double-speed service; CONFIRMED). Each bartender card in Workers has a **Tricks / Speed** toggle.
  - Tricks: 2× tips, 1.5× serve time.
  - Speed: 0.5× serve time, normal tips.
  - Both multipliers are PROPOSED.
- Speed is the default, so bars now serve faster than before (0.9 s instead of 1.8 s).
- **Drink Tank** furniture (Bars category, level 2, $1,500): +100 drink capacity each (GameYum: tanks raise capacity; CONFIRMED concept). The HUD tube shows `stock/capacity`. Selling a tank trims stock to the new limit.
- Schema v5 adds a bartender `mode`, with a v4→v5 migration (existing bartenders get Speed).

**Commands run and results**
- `npx vitest run`: 82/82 passed (6 new tests). They include a head-to-head simulation: Speed sells more drinks, Tricks earns more tip per drink.
- `npm run build`: passes.
- `node scripts/smoke.mjs`: 20/20 passed (new check: Workers panel switches a bartender to Tricks).
- Real-app screenshots: Workers mode toggle, two tanks in the club, tube showing 100/400.


## 2026-10-16 — Celebrities

**Added**
- A **Celebrities** panel (dock star), laid out like the original's (Pixnet screenshot): a star row with "Booked Celebrities n / 8", a "Currently in Town" box, and celebrity cards with a level lock, a price and a Book button.
- 8 **original fictional VIPs**. The original used parodies of real people; these imitate no one. Each has a level, cost, visit length, spending and popularity bonus (all PROPOSED in `src/data/celebrities.ts`).
- Visit lifecycle on absolute timestamps:
  - The VIP arrives 5 s after booking, enters through the door with a gold halo and star, and spends money every 10 s.
  - Nearby guests get happier while the VIP is there.
  - The VIP leaves on schedule, then the visit is added to the **celebrity wall** with a popularity bonus. This runs exactly once, even if the page is reloaded after the visit ended.
- One booking at a time.
- Schema v4 adds `celebrityWall` and `celebrity`, with a v3→v4 migration.

**Commands run and results**
- `npx vitest run`: 76/76 passed (6 new celebrity tests).
- `npm run build`: passes.
- `node scripts/smoke.mjs`: 19/19 passed twice (new check: Celebrities panel books a VIP and charges once).
- Real-app screenshots reviewed: Celebrities panel, booking, VIP in the club with "★ Celebrity ★" card.


## 2026-10-16 — Bouncers and troublemakers

**Added**
- Workers can switch between **Bar Tender** and **Bouncer** (CONFIRMED in the Workers panel). Bouncers get a post (default: just inside the door) and cover a 7×7 area (radius 3, PROPOSED). "Set Post" mode shows that area.
- **Troublemakers** (GameYum's "jerks"): about 10% of guests (PROPOSED) start acting up after 15–35 s. They wander around and drain the happiness of guests within 2 tiles.
- A bouncer whose area covers a troublemaker throws them out automatically (Gamezebo: "handle the situation automatically within their area"). **Send Bouncer** on the guest card sends any free bouncer anywhere (GameYum: target icon). Bouncers need 6 s between escorts.
- An unhandled troublemaker storms out after 45 s and costs 3 popularity. Escorted ones cost nothing.
- Visuals: bouncers in sunglasses at their post, bartenders behind their bar, a red "!" bubble and pulsing ring on troublemakers, "BOUNCED!" pop.
- Schema v3 adds `post` to staff, with a v2→v3 migration.
- Fixed: new guests stepped toward row −1, outside the room. They now step one row into it.

**Commands run and results**
- `npx vitest run`: 70/70 passed, including 9 new tests for bouncers, troublemakers and the migration.
- `npm run build`: passes.
- `node scripts/smoke.mjs`: 18/18 passed (new check: Workers panel switches a worker to Bouncer).
- The bouncer flow was screenshotted in the real app: trouble → Send Bouncer → escorted, Workers switch, Set Post area.


## 2026-10-16 — Fidelity pass: match the original look, UI and music

The user asked for the people, furniture, interface and music to be close to the original. 20 historical screenshots were found (Gamezebo, Elisa Knows, Pixnet/HotWeb, adlieblogger) and used as **visual reference only**; they are not stored in the repo.

**Changed**
- **Characters**: redrawn in the reference chibi style. Big heads, glossy eyes with heavy lids, big hair and hats (12 styles), 2 body types, sneakers, outlines. The DJ wears headphones inside a blue ring. Guests have speech bubbles, and red "$" pops appear on payment.
- **Room and furniture**: grey brick walls, charcoal floor, street outside, back-wall door. Glowing tiles, tower speakers, turntable booth, orange/blue bar, chrome stools, chairs from the build-mode screenshot.
- **Interface**: rebuilt on the original layout. Portrait + level + XP, DJ quick buttons with timer, gold cash, POPULARITY/LUXURY badges, drink tube, tool icons, now playing, character dock. Also the DJ card (Refresh Set / Drop Bass / Dedicate Song), guest card (Spent / Tip Rate / Happiness / Regular), build band with tooltips, Workers panel with locked level-9/13/17/21 slots, level-up screen, dressing room (gender, dice, skin, head colours, Free items) and tutorial guide.
- **Rules from screenshots**: start at level 0 with $5,000, popularity 10, luxury 116. $5 cover charge. Level 1 "Radiophonic Rookie" + $500. Worker slots. Red Sectional Chair $4,000 / Luxury 60.
- **Music**: original procedural loops for Club Mix, Hip-Hop, Electronic and Pop, following the DJ set. Mute toggle. Licensed originals are not used.
- **Saves**: schema v2 plus the first real migration (tested with a real v1 save).
- **Bug fixed**: ticking card values rebuilt the card and swallowed clicks. Values now patch in place.

**Commands run and results**
- `npx vitest run`: 61/61 passed.
- `npm run build`: passes.
- `node scripts/smoke.mjs`: 17/17 passed, 3 consecutive runs, after fixing two flaky checks (race with live cover charges). Includes "music follows the set genre".
- `node scripts/shot.mjs`: screenshots of the club, DJ card, guest card, build mode, dressing room and Workers, reviewed by eye against the references.

**Still different from the original**
- No friends bar, celebrities, bouncers, face/lips tabs, "Show it off!", or SAVE-based edit mode.
- Art is close in style but not identical; there's no pixel measurement yet.
- Music is original, not the original tracks.

## 2026-10-16 — P0 foundation

**Implemented**
- Spec pack audited and corrected (see `RECONSTRUCTION_AUDIT.md`). The original pack is kept unmodified on `main`.
- Vite + TypeScript + Phaser 3 app with a loading splash.
- Isometric room with walls, neon trim, an entrance carpet and a camera that fits the room on screen.
- Data-driven catalogue of 13 items in 5 categories.
- Buy, move, rotate and sell, all transactional, with a valid/invalid placement preview.
- HUD: level/XP, cash, popularity, luxury, drink meter with restock, DJ timer, guest count.
- Guest FSM with A* pathfinding, needs, bar queues, tips, and stuck recovery.
- Bartender hiring and bar assignment.
- DJ: genres, timestamp-based sets, Drop the Bass, Dedicate Song with targeting mode.
- Level-up expands the room.
- Local saves: debounced autosave, schema v1, migration framework, strict validation, corrupt-save backup, export/import, reset with confirmation.
- Dressing room with draft preview and Save/Cancel.
- First-run tutorial.
- Debug overlay: blocked cells, guest paths, guest states, tile coordinates.

**Commands run and results**
- `npx tsc --noEmit`: passes.
- `npx vitest run`: **53/53 passed**.
- `npm run build`: passes. Bundle is 1.55 MB (Phaser makes up most of it).
- `node scripts/smoke.mjs`: **12/12 passed** in headless Chromium (SwiftShader).
- Screenshots were reviewed by eye: desktop club view, build mode, dressing room, mobile.

**Not tested / known gaps**
- Frame rate with 30–50 guests in a real GPU browser. Only the simulation logic was soak-tested.
- Bouncers, troublemakers, bartender modes, drink tanks, premium currency, parties, celebrities, neighbors, inventory and the level/progress screen are not built.
- Art is placeholder procedural art and hasn't been compared with reference screenshots. There is no audio.
- Spec sources S5–S10 haven't been inspected (two of them were blocked from this environment).
- No ESLint yet. Type checking is the only static check.

**Next step**
Inspect the screenshots in S7 and S9 (HUD and build mode). Measure the tile ratio and HUD proportions. Then tune `DEFAULT_ISO` and the HUD layout, and record any differences.
