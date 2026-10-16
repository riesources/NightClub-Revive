# Test Plan

## Commands

```bash
npm test            # Vitest unit/integration tests (domain only, no browser)
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + production build
npm run smoke       # needs a prior build; drives the real app in headless Chromium
```

`npm run smoke` uses the Chromium binary at `/opt/pw-browsers/...`. Set `CHROMIUM_PATH` to use a different one. Screenshots are written to `artifacts/`, which is gitignored.

## Automated coverage (P0 gates)

| Gate | Test |
|---|---|
| Iso transforms (round trip, every tile corner, custom sizes, depth order) | `tests/unit/isoProjection.test.ts` |
| Can't place outside the room or over occupied footprints; entrance kept clear; facing | `tests/unit/placement.test.ts` |
| Failed purchase doesn't change cash; cancel doesn't charge; spending stops at exactly zero | `placement.test.ts`, smoke |
| Move/sell don't duplicate items or currency; invalid move keeps the original position | `placement.test.ts` |
| Bar stock goes down exactly once per transaction; empty stock handled; refill +100 once | `barDjStaff.test.ts`, `guests.test.ts` |
| DJ timer is timestamp-based, survives a 3-hour hidden tab, no double start | `barDjStaff.test.ts` |
| Special-action cooldowns | `barDjStaff.test.ts` |
| Bartender only serves the assigned bar | `guests.test.ts` |
| Guests reach destinations or recover from blocked paths | `guests.test.ts` |
| 30+ guests for 6 simulated minutes: no stuck walkers, no illegal transitions | `guests.test.ts` |
| Save → reload keeps cash, appearance, layout, stock, XP, DJ, staff | `persistence.test.ts`, smoke (real reload) |
| Corrupt save: 7 corruption cases are backed up and reported, never crash | `persistence.test.ts`, smoke (real reload + notice) |
| Migrations run in order; a missing step fails cleanly | `persistence.test.ts` |
| Dressing room: Cancel doesn't persist, Save does | smoke |
| Tutorial stays dismissed after reload | smoke |
| No console errors | smoke |

## Manual checks still needed

- Run 30–50 guests in a **real browser** for several minutes and watch the frame rate. The soak test covers the logic only, not rendering speed.
- Resize the window while panels are open.
- Compare screens against reference screenshots S7–S9 once they have been inspected.
- Keyboard-only navigation of panels and modals.
