# Evidence Register

Labels:
- **CONFIRMED** — a screenshot, or two or more independent sources.
- **SOURCED (1)** — one written source.
- **INFERRED** — strongly implied by sources.
- **PROPOSED** — our own choice.
- **UNVERIFIED** — no source found.

Access dates are 16 Oct 2026 unless noted.

Reference screenshots were downloaded for **visual reference only**. They are copyrighted and are **not** stored in this repository.

## Sources

| # | Source | Accessed? | What it gave us |
|---|---|---|---|
| S1 | [Gamezebo walkthrough](https://www.gamezebo.com/walkthroughs/nightclub-city-walkthrough/) | Yes, text + 6 screenshots | Text: 15-min set; +100 drinks; Drop Bass / mic effects; staffing tips. Screenshots: full main HUD, DJ card, dressing room, build catalogue, Workers panel, club view |
| S2 | [GameYum new players guide](https://www.gameyum.com/facebook-games/73653-nightclub-city-new-players-guide/) | Yes | Genres (club mix, hip hop, electronica, pop). Names "Drop the Bass" / "Dedicate a Song". Bartender modes. Celebrities. Facebook Credits. Auto-expansion |
| S3 | [GameYum review](https://www.gameyum.com/facebook-games/70585-game-review-nightclub-city/) | Yes | Player is the DJ. Luxury raises tips. Parody celebrity names |
| S4 | [myfbapplication overview](https://myfbapplication.blogspot.com/2010/07/nightclub-city.html) | Yes | 15-minute mix; genres |
| S7 | [Elisa Knows](https://www.elisaknows.com/2010/05/nightclub-city-on-facebook.html) | Yes, text + 1 screenshot | Full main screen (build 223 era). Now-playing box showed a real licensed track with a "Buy now on iTunes" link |
| S8 | [Pixnet / HotWeb review](https://hotwebbackup.pixnet.net/blog/posts/7055411098) | Yes, 11 screenshots | Tutorial screens (level 0: $5,000, popularity 10, luxury 116). "$5 cover charge" tutorial text. Level-up screen "Radiophonic Rookie, $500". Guest card. DJ card. Workers panel. Celebrities panel |
| S9 | [adlieblogger build mode](https://adlieblogger.blogspot.com/2010/08/cheat-night-club-facebook.html) | Yes, 1 screenshot | Later-version edit mode: Store / Inventory / Clear Club, SAVE, Sell, category icon row, NEW items with prices, LUXURY badge |
| S5 | [MobyGames](https://www.mobygames.com/game/74631/nightclub-city/) | **No** (HTTP 403) | — |
| S6 | [Reddit preservation thread](https://www.reddit.com/r/flash/comments/1wpf9ij/looking_for_lost_nightclub_city_facebook_swfs/) | **No** (fetch blocked) | Claims about recovered clients remain UNVERIFIED here |

## Interface (CONFIRMED by screenshots S1, S7, S8)

| Element in the original | Build status |
|---|---|
| Circular player portrait, top-left, with a blue level-number circle and a long glossy XP bar | Built |
| Three square buttons under the portrait (record with set timer, speaker, microphone) | Built |
| Gold cash figure with a money-stack icon, top centre | Built |
| Blue glossy POPULARITY and LUXURY badges, top right | Built |
| Vertical drink tube on the right with purple liquid and a cocktail-glass "+" on top | Built (click + to restock) |
| Small white tool icons, bottom right (zoom in/out, save, eye, sound, music) | Built: zoom, debug (eye), music, settings |
| Now-playing box, bottom left (album art + track + artist) | Built; shows our original loop name |
| Sky-blue curved bottom band with character-bust icons: fedora guy, sunglasses guy, tuxedo "?" guy (= Workers), purple paint bucket, gold star (= Celebrities) | Built. Fedora = Dress Up and sunglasses = DJ are **INFERRED** mappings. Busts are original drawings |
| Friends bar ("Click to Invite a Friend!" + friend avatars) | Not built (no social features yet) |
| DJ card: blue glossy card, red X, portrait in headphones, name, "DJ", rows **Refresh Set / Drop Bass / Dedicate Song** with record/speaker/mic icons, disabled rows greyed | Built |
| Guest card: portrait, name, speech-bubble quote, **Spent / Tip Rate / Happiness**, footer **"Regular"** | Built (quotes are our own lines) |
| Dressing room: white panel, GENDER (2 silhouettes + **dice randomize**), SKIN COLOR swatches, centre preview, HEAD COLORS swatches, green OK, "Show it off!", bottom blue band with tabs (hair, face, lips, top, pants, shoes) and items labelled "Free" | Built, except face/lips tabs and "Show it off!" (a social feature) |
| Build catalogue: blue curved bottom band, category icons, item row with prices, left/right arrows, tooltip "Name / Luxury: N", LUXURY badge, SAVE | Built (Done instead of SAVE; placement is instant) |
| Workers panel: "Workers" tab with tuxedo icon, green OK, 3×2 cards: "Bar Tender" / "Bouncer" with "Switch to Bouncer/Bartender", locked slots **Level 9 / 13 / 17 / 21** | Built. Bouncer switch shown disabled (bouncers come later) |
| Level-up: "YOU REACHED LEVEL 1!", glowing title **"Radiophonic Rookie"**, "**$500** more to spend!", "Congratulations! Your club's open for business!" | Built (SHARE omitted) |
| Tutorial: guide character with a speech bubble ("Welcome", Next) | Built with our own original guide character and text |
| Celebrities panel: star tab, booked-celebrities counter, celebrity cards with Buy/Wish, levels | Not built. Dock star shows "later update" |

## Club visuals (CONFIRMED by screenshots, re-drawn as original art)

- Light-grey brick back walls with a pale cap. Charcoal floor. Dark street tiles outside the club.
- Glowing cyan dance tiles with white-hot centres. Pink and violet variants appear in other clubs.
- Tall black tower speakers with woofers flanking a DJ table with turntables and a mixer. A blue ring highlights the DJ.
- Bar with an orange-wood front, blue top and a bottle row. Red stools with chrome bases.
- Door in the back wall. Its exact cell position is INFERRED.
- Characters: chibi, with heads about 45% of body height, large eyes with heavy lids, big stylised hair or hats, slim limbs, chunky sneakers, dark outlines.
- Money pops show as red "$20" text above guests. Guests have white speech bubbles with icons.

## Mechanics

| Finding | Label | Sources | Where in code |
|---|---|---|---|
| Starter DJ set lasts 15 minutes | CONFIRMED | S1, S4 | `tuning.defaultDjSetMs` |
| Better booths play longer | CONFIRMED (fact) / PROPOSED (30 min) | S2, S3 | `dj_pro.djSetMs` |
| Restock adds 100 drinks | SOURCED (1) | S1 | `tuning.barRefillAmount` |
| Genres: club mix, hip-hop, electronic, pop | CONFIRMED | S2, S4, S7 | `GENRES` |
| In-game labels "Refresh Set", "Drop Bass", "Dedicate Song" | CONFIRMED | S1, S8 screenshots | DJ card |
| Drop Bass sends guests to the bar; Dedicate Song cheers a guest | CONFIRMED | S1, S2, S3 | `GuestSimulation` |
| **$5 cover charge at the door, rising with popularity** | CONFIRMED (base) / PROPOSED (scaling) | S8 | `coverCharge` |
| **Start: $5,000 cash, level 0, popularity 10, luxury 116** | CONFIRMED | S8 | `createNewClub`, catalogue luxury split PROPOSED |
| **Level 1 reward $500, title "Radiophonic Rookie"** | CONFIRMED | S8 | `levelReward`, `LEVEL_TITLES` |
| Other level thresholds, titles, rewards | PROPOSED | — | `data/progression.ts` |
| **Worker slots: 2, then levels 9, 13, 17, 21** | CONFIRMED | S1, S8 | `WORKER_SLOT_LEVELS` |
| **Red Sectional Chair $4,000, Luxury 60**; sibling chairs $3,000 / $6,000 / $7,500 | CONFIRMED | S1 | catalogue (sibling luxury values PROPOSED) |
| Guest stats: Spent, Tip Rate %, Happiness; "Regular" class | CONFIRMED (fields) / PROPOSED (formulas) | S8 | `Guest`, `tipFor` |
| Club expands on level-up | CONFIRMED | S2, S3 | `creditIncome` |
| Dressing room has a randomize dice | CONFIRMED | S1 | `dressingRoom.ts` |
| Luxury raises tips | SOURCED (1) | S3 | `tipFor` |
| Bouncers remove troublemakers, automatically within their area or by targeting | CONFIRMED | S1, S2, S8 | `staff.ts` (`switchRole`, `setBouncerPost`), `GuestSimulation.runBouncers` / `sendBouncer` |
| Bartender trick/speed modes | CONFIRMED | S2, S3 | Not built (P1) |
| Celebrities: book (expensive), short visit, big spend, celebrity wall, level-gated cards | CONFIRMED | S2, S3, S8 | `data/celebrities.ts` (original fictional VIPs, numbers PROPOSED), `domain/celebrity.ts`, `GuestSimulation.updateCelebrity` |
| Music was licensed commercial tracks | CONFIRMED | S7, S8 | **Replaced** by original procedural loops (`audio/music.ts`) |
| Party theme names | UNVERIFIED | — | Not used |
| Tile size / exact proportions | PROPOSED (2:1 iso) | — | `DEFAULT_ISO` |
