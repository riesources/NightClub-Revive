# Build Log

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
