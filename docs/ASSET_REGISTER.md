# Asset Register

**There are no image, audio or font files in this build.** All visuals are drawn procedurally in code, and all music is synthesized live in the browser. Everything is original to this project.

The art **follows the style** of the original game as seen in reference screenshots: the layout, proportions, palette and kinds of objects. Nothing is traced from or copied from original sprites, logos or recordings. The reference screenshots are not stored in this repository.

**Fidelity status:** style-matched replacement art. It was compared by eye against the reference screenshots in `EVIDENCE_REGISTER.md`, but no pixel-level measurement has been done.

| Asset | Role | Source | Style reference | Status |
|---|---|---|---|---|
| Room: brick walls, pale cap, charcoal floor + spotlight, street tiles, back-wall door, entrance mat | Scene | `ClubScene.redrawRoom` | S1/S7/S8 club screenshots | Style-matched |
| Light tiles (cyan, violet, pink, gold) | Floor | `furnitureArt.ts` `tile` | Glowing cyan tiles | Style-matched |
| Tower speakers (black, white) | DJ | `furnitureArt.ts` `speaker` | Black tower speakers | Style-matched |
| DJ booths (starter, pro) | DJ | `furnitureArt.ts` `djbooth` | Turntable + mixer table | Style-matched |
| Bars (blue top, chrome) | Bar | `furnitureArt.ts` `bar` | Orange-front, blue-top bar with bottles | Style-matched |
| Red stool, sofa, sectional, lounge chair, ice chair, egg chair, booth | Seating | `furnitureArt.ts` | Build-mode chair row (S1) | Style-matched |
| Palm, light pillar | Decor | `furnitureArt.ts` | — | Placeholder |
| Avatars (player, guests, staff, guide) | Characters | `avatarArt.ts` | Chibi characters (all screenshots) | Style-matched; 12 hair/hat styles, 2 body types |
| HUD, cards, dock busts, icons | UI | `ui/icons.ts` (inline SVG), `style.css` | Main HUD, DJ/guest cards, dock | Style-matched |
| Catalogue thumbnails / portraits | UI | `ui/portrait.ts` (renders the real in-game art to canvas) | — | Same art as in-game |
| Music: Club Mix, Hip-Hop Mix, Electronic Mix, Pop Mix | Audio | `audio/music.ts` (WebAudio synthesis) | Genre styles only. The original used licensed songs, which are not reused | Original |

Hitboxes and footprints are defined as data and are independent of the drawn pixels.
