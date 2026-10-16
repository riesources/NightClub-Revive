# NightClub Revive

An unofficial fan reconstruction of the 2010 Facebook/browser game **Nightclub City** (Booyah). It is rebuilt as a standalone browser game that runs locally, using public walkthroughs, reviews and screenshots as evidence.

The layout, characters, furniture and interface are modelled closely on historical screenshots. Everything is **drawn fresh in code**, and the music is **original, generated live**. The game contains **no original code, art or music**. See [`docs/EVIDENCE_REGISTER.md`](docs/EVIDENCE_REGISTER.md) for what is historical and what is proposed.

![club](docs/screenshots/club.png)

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

- The original-style HUD: portrait, level and XP, DJ quick buttons with timer, gold cash, POPULARITY/LUXURY badges, drink tube, now playing, and the character dock.
- Chibi guests who pay a $5 cover, dance, queue at bars, buy drinks and tip, with a guest card showing Spent / Tip Rate / Happiness.
- DJ card with **Refresh Set / Drop Bass / Dedicate Song**. Club Mix, Hip-Hop, Electronic and Pop mixes, each with its own procedural music.
- Build band with furniture thumbnails, prices and luxury tooltips. Buy, move, rotate and sell.
- Workers panel with slots that unlock at levels 9/13/17/21. Level-up screen. Dressing room with gender, dice, skin and head colours.
- Autosave with versioned migrations and corrupt-save recovery. Debug overlay.

Not built yet: bouncers, parties, celebrities, neighbors/friends bar. See [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md).

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
