# Reconstruction Audit

_16 October 2026_

## Repository status

- Repository `riesources/nightclub-revive` was **empty** (no commits) at start.
- `main` was seeded with the original, unmodified spec pack in `docs/spec/`.
- This branch adds the app, the docs listed below, and audit corrections to the spec Markdown. The PDF in `docs/spec/` is the original and is **not** corrected.
- Stack chosen: TypeScript 5.8 + Vite 6 + Phaser 3.90 + Vitest 3, with Playwright (`playwright-core`) for browser smoke tests. Node 22 and npm 10 were available.

## Target

The target is the 2010 Facebook/Flash version of Nightclub City, rebuilt as a standalone browser game that runs locally. It is a reconstruction based on public evidence, **not** a restoration. No original code, art or audio is used.

## What the audit found in the spec pack

These are the corrections now applied to `docs/spec/*.md`:

| Issue | Fix |
|---|---|
| "Drop the Bass" and "Dedicate Song" were attributed to Gamezebo, which doesn't use those names | Names now attributed to GameYum; effects to Gamezebo |
| Dedicate Song was limited to unhappy guests | Gamezebo says it targets **any** guest |
| Genre list was missing "club mix" | Added (GameYum) |
| Party names had no source | Marked UNVERIFIED |
| Mechanics were missing: bartender modes, premium currency, auto-expansion on level-up, drink tanks | Added with citations |
| Evidence labels were inconsistent (3 vs 4), and CONFIRMED was too loose (one blog post counted) | CONFIRMED now needs a screenshot or 2+ sources; added SOURCED (1) |
| The prompt and blueprint disagreed on P0 scope (avatar editor, bartender assignment) and on the guest stress test (10 vs 30 guests) | Reconciled: P0a/P0b split, 30 guests, avatar editor kept minimal in P0 |
| No rule for what happens while the player is away | Added blueprint §7.3a (PROPOSED rule) |
| No plan for how art gets made | Added as a decision required before Phase 1 |
| `rotation: 0/90/180/270` doesn't suit isometric sprites | Changed to `facing: 0 | 1` |
| `ClubState` had no fields for XP, the tutorial flag or `nextId` | Added |
| The prompt asked the agent to contact the Reddit poster | Made a human task |

**Not fixed:** the PDF still clips long URLs on pages 4 and 16, and some of its bullet lists run together. Regenerate it from the corrected Markdown if a PDF is needed.

## Key risks

1. **Art fidelity.** All art is procedural replacement art. It has the broad look (neon iso floor, big-headed avatars, dark/blue chrome) but hasn't been checked against reference screenshots. See `ASSET_REGISTER.md`.
2. **Balance.** Every number except "15-minute set" and "+100 drinks" is PROPOSED. See `src/data/tuning.ts`.
3. **Unchecked sources.** The Reddit preservation thread and MobyGames couldn't be fetched from here. Screenshots from Elisa Knows, Pixnet and the adlieblogger build-mode post haven't been inspected or measured yet.
4. **Original files.** If the preservationist's recovered client becomes available with permission, many PROPOSED values could be replaced. That outreach is a human task.
