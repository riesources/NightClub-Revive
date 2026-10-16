# Decisions

| ID | Decision | Rationale | Confidence |
|---|---|---|---|
| D1 | Stack: TypeScript + Vite + Phaser 3 + Vitest, with DOM overlays for the UI | Recommended by the spec; the repo was empty | PROPOSED |
| D2 | **Art method: procedural vector art** drawn in code (Phaser Graphics / Canvas2D) for now | Original, so no copyright risk; quick to iterate; no unlicensed sprites. Can be swapped for commissioned art later | PROPOSED |
| D3 | **Away-time rule:** nothing is simulated while away. DJ timers are absolute timestamps. Guests are not saved | No source describes offline behavior; this is the simplest consistent rule and can't double-pay | PROPOSED |
| D4 | HAPPY and UNHAPPY are a mood, not FSM states | A guest can dance *and* be unhappy; exclusive states would lose information | PROPOSED |
| D5 | Rotation is `facing: 0 | 1`, behind `features.rotation` | Not evidenced; isometric sprites usually have two facings | PROPOSED |
| D6 | One bartender per bar | Simpler. The source suggests one worker can cover adjacent bars; revisit in P1 | PROPOSED (deviation) |
| D7 | No premium currency yet | The original used Facebook Credits (S2). A local build has no store; decide in P1 whether to add an earn-only premium currency | PROPOSED |
| D8 | NPC staff replace Facebook-friend hiring | No social platform | PROPOSED |
| D9 | The starter club comes pre-built (DJ booth, dance floor, bar, bartender, seats) | Makes the loop playable immediately. The original's tutorial start is not documented | PROPOSED |
| D10 | Luxury is derived from placed furniture, not stored | Avoids drift between saved and actual values | PROPOSED |
| D11 | No audio yet | Original songs are copyrighted. Audio stays pluggable for licensed or royalty-free loops | PROPOSED |
| D12 | The UI rebuilds only when its markup changes, and the HUD updates in place | Prevents clicks being lost when a button is rebuilt mid-click | PROPOSED |
| D13 | Entrance is centered on the front edge, and its 2 cells are reserved | Guests always have a spawn and exit point | PROPOSED |
