# NightClub Revive

An unofficial fan reconstruction of the 2010 Facebook/browser game **Nightclub City** (Booyah). It is rebuilt as a standalone browser game that runs locally, using public walkthroughs and reviews as evidence. It contains **no original game code, art or music**. All visuals are original placeholder art, and most balance values are proposed rather than historical. See [`docs/EVIDENCE_REGISTER.md`](docs/EVIDENCE_REGISTER.md).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # typecheck + production build into dist/
npm run smoke      # browser smoke test (after build)
```

Saves are stored in your browser's localStorage. Use **Settings** to export, import or reset your save.

## What works

- Isometric club with neon dance floor, bar, DJ booth, seating and decor.
- Build mode: buy, move, rotate and sell, with a placement preview.
- Guests who walk, dance, get thirsty, queue at bars, pay and tip, and leave happy or unhappy.
- DJ sets with 4 genres, a live countdown, **Drop the Bass** and **Dedicate Song**.
- Drink stock and restocking, bartender hiring and assignment.
- Levels with automatic room expansion.
- Dressing room for your avatar.
- Autosave with corrupt-save recovery.
- Debug overlay.

Not built yet: bouncers, parties, celebrities, neighbors, audio. See [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md).

## Layout

```
src/data/         catalogue, tuning (every uncertain value, labelled), progression, appearance options
src/domain/       pure game rules: economy, grid, bar, DJ, staff, progression, guest simulation, A*
src/persistence/  save repository, validation, migrations
src/render/       iso projection and procedural art
src/scenes/       Phaser club scene (reads domain state, never mutates it directly)
src/ui/           DOM HUD, panels, modals
tests/unit/       Vitest
scripts/smoke.mjs headless browser smoke test
docs/             audit, evidence, decisions, assets, test plan, build log, spec/ (original brief)
```

## Legal

This is a non-commercial preservation and fan project with no affiliation to Booyah or any rights holder. "Nightclub City" is used only to describe what is being reconstructed.
