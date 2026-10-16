# Evidence Register

Labels:
- **CONFIRMED** — a screenshot, or two or more independent sources.
- **SOURCED (1)** — one written source.
- **INFERRED** — strongly implied by sources.
- **PROPOSED** — our own choice.
- **UNVERIFIED** — no source found.

Access dates are 16 Oct 2026 unless noted.

## Sources

| # | Source | Accessed? | Supports |
|---|---|---|---|
| S1 | [Gamezebo walkthrough](https://www.gamezebo.com/walkthroughs/nightclub-city-walkthrough/) | Yes | Starter DJ set "every 15 minutes". Restock adds 100 drinks. Speaker icon "drop the bass and make your guests go to the bar". Microphone "targets any guest to increase its happiness level". Record icon picks the genre. Hire 1 bartender + 1 bouncer early. Keep bars together so 1 worker can manage them. Bouncer handles trouble "within their area". |
| S2 | [GameYum new players guide](https://www.gameyum.com/facebook-games/73653-nightclub-city-new-players-guide/) | Yes | Genres: club mix, hip hop, electronica, pop. Named actions "Drop the Bass" and "Dedicate a Song". Better DJ system extends play time. Restocking costs game cash. Extra tanks/upgrades add capacity. Bartender trick vs speed modes. Bouncer target icon removes "jerks". Celebrities: parody names, short visits, big spend, celebrity wall. Premium decor needs Facebook Credits. **Club expands automatically on level-up.** |
| S3 | [GameYum review](https://www.gameyum.com/facebook-games/70585-game-review-nightclub-city/) | Yes | Player is the DJ. Friends hired as bartenders and bouncers. Drop the Bass raises drink buying. Dedicate a song to calm an unhappy guest. Pricier booths play longer. Luxury raises happiness and tips. Club expands with level. Wallpaper and floor tiles can be changed. |
| S4 | [myfbapplication overview](https://myfbapplication.blogspot.com/2010/07/nightclub-city.html) | Yes | Mix plays for **fifteen minutes**. Genres electronic, hip-hop, pop. Mix is made of 30–45 s clips. |
| S5 | [MobyGames](https://www.mobygames.com/game/74631/nightclub-city/) | **No** (HTTP 403) | — |
| S6 | [Reddit preservation thread](https://www.reddit.com/r/flash/comments/1wpf9ij/looking_for_lost_nightclub_city_facebook_swfs/) | **No** (fetch blocked) | Claims about recovered clients and host names are UNVERIFIED here |
| S7 | [Elisa Knows screenshot](https://www.elisaknows.com/2010/05/nightclub-city-on-facebook.html) | Not yet | — |
| S8 | [Pixnet avatar editor](https://hotwebbackup.pixnet.net/blog/posts/7055411098) | Not yet | — |
| S9 | [adlieblogger build mode](https://adlieblogger.blogspot.com/2010/08/cheat-night-club-facebook.html) | Not yet | — |
| S10 | [Gamezebo review page](https://www.gamezebo.com/game/nightclub-city/) | Not yet | — |

## Findings used in the build

| Finding | Label | Sources | Where in code |
|---|---|---|---|
| Starter DJ set lasts 15 minutes | CONFIRMED | S1, S4 | `tuning.defaultDjSetMs`, `dj_starter.djSetMs` |
| Better DJ booths play longer | CONFIRMED (fact) / PROPOSED (30 min value) | S2, S3 | `dj_pro.djSetMs` |
| Restock adds 100 drinks | SOURCED (1) | S1 | `tuning.barRefillAmount` |
| Restocking costs game cash | SOURCED (1) (amount PROPOSED) | S2 | `tuning.barRefillCost` |
| Drink capacity can be raised (tanks/upgrades) | SOURCED (1) | S2 | Not yet built. Cap is PROPOSED 200 |
| Genres: club mix, hip-hop, electronic, pop | CONFIRMED | S2, S4 | `GENRES` |
| Drop the Bass sends guests to the bar | CONFIRMED | S1, S2, S3 | `GuestSimulation.dropTheBass` |
| Dedicate Song raises one guest's happiness | CONFIRMED | S1, S2, S3 | `GuestSimulation.dedicate` |
| Player avatar is the DJ | SOURCED (1) | S3 | `ClubScene.drawDj` |
| Bartenders serve at bars; nearby bars can share a worker | SOURCED (1) | S1 | `staff.ts` (simplified to one bar each, PROPOSED) |
| Bartender trick/speed modes | SOURCED (1) | S2, S3 | Not yet built (P1) |
| Bouncers remove troublemakers | CONFIRMED | S1, S2, S3 | Not yet built (P1) |
| Luxury raises happiness and tips | SOURCED (1) | S3 | `tipFor` (formula PROPOSED) |
| Popularity and luxury are separate scores | INFERRED (screenshots not yet inspected) | blueprint | `ClubState.popularity`, `computeLuxury` |
| Club expands automatically on level-up | CONFIRMED | S2, S3 | `creditIncome` (sizes PROPOSED) |
| Premium currency for high-end decor | SOURCED (1) | S2 | Not built; decision D7 |
| Celebrities: parody names, celebrity wall | SOURCED (1) | S2, S3 | Not yet built (P2) |
| Party theme names | UNVERIFIED | — | Not used |
| Tile size / UI proportions | PROPOSED (2:1 iso hypothesis) | — | `DEFAULT_ISO` |
| All prices, levels, tips, timers other than the above | PROPOSED | — | `src/data/*` |
