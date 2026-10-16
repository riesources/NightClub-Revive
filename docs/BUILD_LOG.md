# Build Log

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
