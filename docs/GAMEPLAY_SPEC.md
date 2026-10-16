# Gameplay Spec (as built)

This describes how the current build behaves. Labels refer to `EVIDENCE_REGISTER.md`.

## Screens

| Screen | Status |
|---|---|
| Boot / loading | Built (DOM splash, removed after Phaser boots) |
| Main club view | Built (iso room, walls, entrance carpet, furniture, guests, DJ avatar) |
| HUD | Built: level + XP bar, cash, popularity, luxury, drink meter with restock, DJ status/timer, guest count |
| Build / decorate | Built: category tabs, cards (swatch, price, level, footprint, luxury), placement preview, move, rotate, sell with confirmation |
| Context panel | Built for furniture (incl. bar staffing / queue) and guests (state, mood, happiness, thirst, Dedicate Song) |
| DJ panel | Built: 4 genres, start / restart, live countdown, Drop the Bass, Dedicate Song (targeting mode) with cooldowns |
| Staff | Built: bartender list, assign to bar, hire. Bouncers not yet |
| Dressing room | Built: draft preview, 5 categories, Save / Cancel. No randomize (not evidenced) |
| Settings | Built: export / import save, debug overlay toggle, reset with confirmation, credits / disclaimer |
| Tutorial | Built: first-run card, dismissal persists |
| Error states | Built: corrupt save notice with backup key; storage-unavailable warning |
| Level / progress view, inventory, parties, celebrities, neighbors | Not built |

## Controls

- **Click** a guest or item to inspect it. **Drag** to pan. **Scroll** to zoom.
- In place/move mode: **click** to confirm, **R** to rotate, **Esc** or **right-click** to cancel.
- Floor tiles stay in place mode after each purchase so you can paint the floor. Other items return to normal mode.

## Systems

**Economy.** Cash is an integer and never goes negative. Every purchase, sale, refill and hire is a pure function that returns a new state or a failure reason. A failure leaves the state untouched. Lifetime earnings are tracked separately from cash. XP = coins earned × `xpPerCoin`.

**Placement.** Each item has a data-driven footprint. An item must stay inside the room, may not overlap another item, and may not sit on the two entrance cells. Facing swaps the footprint's width and height (PROPOSED, behind `features.rotation`).

**Guests.** Guests are a finite-state machine (`src/domain/guests/guest.ts`) with a transition table that is checked at runtime. HAPPY and UNHAPPY are a **mood** derived from happiness, not separate states. Movement uses 4-direction A*. Guests recover when stuck:
- They re-plan if furniture lands on their path.
- They pick a new goal after a failure.
- They leave after 3 failures.
- They are removed safely if they can't reach the exit.

**Needs.** Thirst rises over time; at 100 the guest walks to the nearest staffed bar. Happiness rises while dancing to music (with a bonus if the genre matches the guest's favorite), falls without music, and falls while waiting in a queue. Guests leave when their visit time runs out or their happiness drops to 5 or below. A happy guest who leaves raises popularity; an unhappy one lowers it.

**Bar service.** Each bar has a queue. The assigned bartender serves one guest per `serveDurationMs`. Each order has a status flag, so a sale is processed exactly once: stock goes down by 1 and cash goes up by price + tip. If the bar is out of drinks, the guest loses happiness, a toast warns the player, and the guest moves on.

**DJ.** Sets use absolute timestamps. Set length comes from the best booth placed. Changing genre mid-set keeps the timer running. Special actions require music to be playing and have cooldowns (PROPOSED).

**Away-time (PROPOSED, D3).** Nothing is simulated while the player is away. Sets end on their timestamp. Guests are never saved.

**Progression.** Levels come from a PROPOSED XP table. The room grows automatically on level-up and never shrinks.
