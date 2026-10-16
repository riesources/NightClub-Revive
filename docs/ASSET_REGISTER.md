# Asset Register

**There are no image, audio or font files in this build.** All visuals are drawn procedurally in code and are original to this project. They are replacement art made to fit the broad style the references describe (neon iso floor, big-headed avatars, dark/blue chrome). None of it is traced from or copied from the original game.

**Fidelity status:** placeholder grade. Nothing has been compared side-by-side with reference screenshots yet.

| Asset | Role | Source | License | Footprint / anchor | Status |
|---|---|---|---|---|---|
| Floor + back walls + entrance | Room | `ClubScene.redrawRoom` | Project-original | 1×1 tiles; origin = top corner of (0,0) | Placeholder |
| Neon dance tiles (blue, purple, gold) | Floor items | `furnitureArt.ts` (`dancefloor`) | Project-original | 1×1; flat layer | Placeholder |
| DJ booths (starter, pro) | DJ | `furnitureArt.ts` (`dj`) | Project-original | 2×1; ground anchor = footprint | Placeholder |
| Floor speaker | DJ | `furnitureArt.ts` (`speaker`) | Project-original | 1×1 | Placeholder |
| Bars (basic, chrome) | Bar | `furnitureArt.ts` (`bar`) | Project-original | 2×1 | Placeholder |
| Stool, sofa, lounge booth | Seating | `furnitureArt.ts` (`seat`) | Project-original | 1×1 / 2×1 / 2×2 | Placeholder |
| Potted palm, light pillar | Decor | `furnitureArt.ts` (`decor`) | Project-original | 1×1 | Placeholder |
| Avatar (player + guests) | Characters | `avatarArt.ts` | Project-original | Feet anchor; 5 modular parts | Placeholder |
| UI icons (cash, popularity, luxury, etc.) | HUD / dock | `ui/dom.ts` `ICON` (inline SVG) | Project-original | 24×24 viewBox | Placeholder |
| Catalogue swatches | Build cards | `UI.swatch` (inline SVG) | Project-original | — | Placeholder |
| Audio | — | none | — | — | Not started |

Hitboxes and footprints are defined as data and are independent of the drawn pixels.
