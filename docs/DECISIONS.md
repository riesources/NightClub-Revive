# Decisions

| ID | Decision | Rationale | Confidence |
|---|---|---|---|
| D1 | Stack: TypeScript + Vite + Phaser 3 + Vitest, with DOM overlays for the UI | Recommended by the spec; the repo was empty | PROPOSED |
| D2 | **Art method: procedural vector art** drawn in code (Phaser Graphics / Canvas2D), styled after reference screenshots | Original, so no copyright risk; quick to iterate; no unlicensed sprites. Can be swapped for commissioned art later | PROPOSED |
| D3 | **Away-time rule:** nothing is simulated while away. DJ timers are absolute timestamps. Guests are not saved | No source describes offline behavior; this is the simplest consistent rule and can't double-pay | PROPOSED |
| D4 | HAPPY and UNHAPPY are a mood, not FSM states | A guest can dance *and* be unhappy; exclusive states would lose information | PROPOSED |
| D5 | Rotation is `facing: 0 | 1`, behind `features.rotation` | Not evidenced; isometric sprites usually have two facings | PROPOSED |
| D6 | One bartender per bar | Simpler. The source suggests one worker can cover adjacent bars; revisit in P1 | PROPOSED (deviation) |
| D7 | No premium currency yet | The original used Facebook Credits (S2). A local build has no store; decide in P1 whether to add an earn-only premium currency | PROPOSED |
| D8 | NPC staff replace Facebook-friend hiring | No social platform | PROPOSED |
| D9 | The starter club comes pre-built (DJ booth + 2 speakers, 4×3 cyan dance floor, one bar, one bartender) | Matches the level-0 club in tutorial screenshots (S8); luxury totals the confirmed 116 | INFERRED |
| D10 | Luxury is derived from placed furniture, not stored | Avoids drift between saved and actual values | PROPOSED |
| D11 | ~~No audio yet~~ (superseded by D15) | Original songs are copyrighted | — |
| D12 | The UI rebuilds only when its markup changes, and the HUD updates in place | Prevents clicks being lost when a button is rebuilt mid-click | PROPOSED |
| D13 | ~~Entrance on the front edge~~ → **door in the back wall at (6,0)**, with its 2 cells reserved | Screenshots show guests entering through a back-wall door. The position is fixed so room expansion never moves it | INFERRED |
| D14 | Rebuild the UI layout to match reference screenshots: HUD, DJ/guest cards, dressing room, build band, Workers, level-up | The user asked for the interface to be close to the original. Layout and labels come from screenshots; all drawing is original | CONFIRMED (layout) |
| D15 | **Music is original WebAudio synthesis**, one loop per genre | The original streamed licensed commercial tracks (screenshots credit real artists and link to iTunes). Reusing them would infringe copyright | PROPOSED |
| D16 | Dock mapping: fedora bust = Dress Up, headphones bust = DJ | Tuxedo = Workers and star = Celebrities are confirmed by panel tabs; the other two icons' functions aren't shown | INFERRED |
| D17 | Schema v2: adds gender + shoes, new palettes, renames `stool_basic`, moves the door. The v1 → v2 migration refunds furniture standing on the new door | First real migration; saves from the earlier prototype keep working | PROPOSED |
| D19 | Bouncers cover a square area around a post (radius 3); troublemakers drain nearby happiness and cost popularity only if left to storm out | Matches the sources' "within their area" and target-icon descriptions; all numbers PROPOSED in `tuning.ts` | PROPOSED |
| D18 | Ticking UI values are marked `data-live` and patched in place | Fixes a real bug found by the smoke test: the DJ card rebuilt every second and swallowed clicks | PROPOSED |
