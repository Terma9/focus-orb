# Accuracy check: full mode vs. privacy mode

Run on 2026-10-10 with `npm run eval`. 55 hand-labelled situations across 3 tasks, each judged 3× per mode by `gpt-6-luna` through the Decisions API, with the app's exact instructions. The verdict is the majority of the runs; a run counts as "distracted" at p ≥ 0.8.

- **Real pages:** public websites, screenshotted fresh on every run.
- **Vague titles:** self-made screens ([eval/scenes.js](scenes.js)) whose window title says almost nothing ("Home", "Untitled document", "Watch"). Only the screenshot shows what's going on.

## Summary

| | Correct | False alarms (work flagged) | Missed distractions |
|---|---|---|---|
| **Full mode**, all situations | 53 of 55 (96 %) | 2 of 27 | 0 of 28 |
| **Privacy mode**, all situations | 46 of 55 (84 %) | 1 of 27 | 8 of 28 |
| Full mode, real pages | 38 of 40 (95 %) | 2 of 22 | 0 of 18 |
| Privacy mode, real pages | 37 of 40 (93 %) | 1 of 22 | 2 of 18 |
| Full mode, vague titles | 15 of 15 (100 %) | 0 of 5 | 0 of 10 |
| Privacy mode, vague titles | 9 of 15 (60 %) | 0 of 5 | 6 of 10 |

| | Full mode | Privacy mode |
|---|---|---|
| Average p(distracted) on work | 0.09 | 0.07 |
| Average p(distracted) on distractions | 0.99 | 0.76 |
| Unstable (runs disagreed) | 0 of 55 | 0 of 55 |
| Time per check | 0.3 s | 0.1 s |

**The two modes disagree on 9 of 55 situations:**

| # | Task | Window title | Should be | Full mode | Privacy mode |
|---|---|---|---|---|---|
| 14 | orb | Cat - Wikipedia <br><sub>tricky: harmless-looking reading</sub> | distracted | ✅ distracted (0.96) | ❌ work (0.72) |
| 17 | thesis | Atmospheric and Oceanic Physics \| arXiv <br><sub>tricky: climate science papers, but not climate policy</sub> | work | ❌ distracted (0.92) | ✅ work (0.00) |
| 24 | thesis | Welcome to Steam | distracted | ✅ distracted (1.00) | ❌ work (0.53) |
| 44 | thesis | Home <br><sub>screen: feed</sub> | distracted | ✅ distracted (1.00) | ❌ work (0.01) |
| 46 | thesis | Live <br><sub>screen: sports</sub> | distracted | ✅ distracted (1.00) | ❌ work (0.01) |
| 47 | thesis | Messages <br><sub>screen: chat</sub> | distracted | ✅ distracted (1.00) | ❌ work (0.14) |
| 51 | orb | Play <br><sub>screen: game</sub> | distracted | ✅ distracted (1.00) | ❌ work (0.64) |
| 52 | orb | Home <br><sub>screen: feed</sub> | distracted | ✅ distracted (0.99) | ❌ work (0.02) |
| 55 | slides | Messages <br><sub>screen: chat</sub> | distracted | ✅ distracted (1.00) | ❌ work (0.17) |

## All situations

Tasks: **orb** = "building my focus orb desktop app in Electron", **thesis** = "writing my bachelor thesis about climate policy", **slides** = "preparing slides for a marketing presentation".

### Real pages

| # | Task | Window title | Should be | Full mode | Privacy mode |
|---|---|---|---|---|---|
| 1 | orb | BrowserWindow \| Electron | work | ✅ work (0.00) | ✅ work (0.02) |
| 2 | orb | GitHub - electron/electron: Build cross-platform desktop apps with JavaScript, HTML, and CSS | work | ✅ work (0.00) | ✅ work (0.00) |
| 3 | orb | transform - CSS: Cascading Style Sheets \| MDN | work | ✅ work (0.00) | ✅ work (0.00) |
| 4 | orb | Newest 'electron' Questions - Stack Overflow | work | ✅ work (0.00) | ✅ work (0.06) |
| 5 | orb | koffi - npm | work | ✅ work (0.02) | ✅ work (0.02) |
| 6 | orb | Decisions - OpenAI API | work | ✅ work (0.00) | ✅ work (0.00) |
| 7 | orb | Test runner \| Node.js Documentation | work | ✅ work (0.00) | ✅ work (0.00) |
| 8 | orb | electron js tutorial transparent window - YouTube <br><sub>tricky: a YouTube tutorial for the exact task</sub> | work | ✅ work (0.12) | ✅ work (0.34) |
| 9 | orb | funny cats compilation - YouTube | distracted | ✅ distracted (1.00) | ✅ distracted (1.00) |
| 10 | orb | funny - Reddit | distracted | ✅ distracted (1.00) | ✅ distracted (0.98) |
| 11 | orb | Just Chatting - Twitch | distracted | ✅ distracted (1.00) | ✅ distracted (0.99) |
| 12 | orb | gaming headset \| eBay | distracted | ✅ distracted (1.00) | ✅ distracted (0.99) |
| 13 | orb | Lichess TV | distracted | ✅ distracted (1.00) | ✅ distracted (0.93) |
| 14 | orb | Cat - Wikipedia <br><sub>tricky: harmless-looking reading</sub> | distracted | ✅ distracted (0.96) | ❌ work (0.72) |
| 15 | thesis | Paris Agreement - Wikipedia | work | ✅ work (0.00) | ✅ work (0.00) |
| 16 | thesis | AR6 Synthesis Report: Climate Change 2023 — IPCC | work | ✅ work (0.00) | ✅ work (0.00) |
| 17 | thesis | Atmospheric and Oceanic Physics \| arXiv <br><sub>tricky: climate science papers, but not climate policy</sub> | work | ❌ distracted (0.92) | ✅ work (0.00) |
| 18 | thesis | The Paris Agreement \| UNFCCC | work | ✅ work (0.00) | ✅ work (0.00) |
| 19 | thesis | CO₂ and Greenhouse Gas Emissions - Our World in Data | work | ✅ work (0.00) | ✅ work (0.00) |
| 20 | thesis | DeepL Translate: The world's most accurate translator <br><sub>tricky: a general tool, not topic-specific</sub> | work | ✅ work (0.15) | ✅ work (0.00) |
| 21 | thesis | Carbon tax - Wikipedia | work | ✅ work (0.03) | ✅ work (0.00) |
| 22 | thesis | Football - BBC Sport | distracted | ✅ distracted (0.97) | ✅ distracted (0.96) |
| 23 | thesis | IMDb Top 250 Movies | distracted | ✅ distracted (1.00) | ✅ distracted (0.96) |
| 24 | thesis | Welcome to Steam | distracted | ✅ distracted (1.00) | ❌ work (0.53) |
| 25 | thesis | Vintage lamp - Etsy | distracted | ✅ distracted (1.00) | ✅ distracted (0.99) |
| 26 | thesis | Roman Empire - Wikipedia <br><sub>tricky: serious reading, but unrelated</sub> | distracted | ✅ distracted (0.98) | ✅ distracted (0.95) |
| 27 | thesis | Booking.com \| Official site \| The best hotels, flights, car rentals & accommodations | distracted | ✅ distracted (0.99) | ✅ distracted (0.99) |
| 28 | slides | Free presentation templates \| Canva | work | ✅ work (0.00) | ✅ work (0.00) |
| 29 | slides | Business Meeting Pictures \| Download Free Images on Unsplash | work | ✅ work (0.00) | ✅ work (0.36) |
| 30 | slides | Browse Fonts - Google Fonts | work | ✅ work (0.28) | ✅ work (0.05) |
| 31 | slides | Trending Color Palettes - Coolors | work | ✅ work (0.01) | ✅ work (0.06) |
| 32 | slides | Marketing mix - Wikipedia | work | ✅ work (0.00) | ✅ work (0.00) |
| 33 | slides | Marketing Statistics You Need to Know \| HubSpot Blog | work | ✅ work (0.01) | ✅ work (0.00) |
| 34 | slides | how to give a great presentation - YouTube <br><sub>tricky: a YouTube video that helps with the task</sub> | work | ❌ distracted (0.98) | ❌ distracted (0.96) |
| 35 | slides | Hacker News <br><sub>tricky: tech news, unrelated to the task</sub> | distracted | ✅ distracted (0.98) | ✅ distracted (0.82) |
| 36 | slides | NBA Scoreboard - ESPN | distracted | ✅ distracted (0.96) | ✅ distracted (0.93) |
| 37 | slides | List of Pokémon - Wikipedia | distracted | ✅ distracted (0.98) | ✅ distracted (0.91) |
| 38 | slides | Netflix | distracted | ✅ distracted (0.99) | ✅ distracted (0.94) |
| 39 | slides | Play Chess Online - Chess.com | distracted | ✅ distracted (1.00) | ✅ distracted (1.00) |
| 40 | slides | Sofas - IKEA | distracted | ✅ distracted (1.00) | ✅ distracted (0.96) |

### Vague titles

| # | Task | Window title | Should be | Full mode | Privacy mode |
|---|---|---|---|---|---|
| 41 | thesis | Untitled document <br><sub>screen: essay</sub> | work | ✅ work (0.00) | ✅ work (0.01) |
| 42 | thesis | Sheet1 <br><sub>screen: spreadsheet</sub> | work | ✅ work (0.00) | ✅ work (0.04) |
| 43 | thesis | Watch <br><sub>screen: video</sub> | distracted | ✅ distracted (1.00) | ✅ distracted (0.92) |
| 44 | thesis | Home <br><sub>screen: feed</sub> | distracted | ✅ distracted (1.00) | ❌ work (0.01) |
| 45 | thesis | Shop <br><sub>screen: shop</sub> | distracted | ✅ distracted (1.00) | ✅ distracted (0.96) |
| 46 | thesis | Live <br><sub>screen: sports</sub> | distracted | ✅ distracted (1.00) | ❌ work (0.01) |
| 47 | thesis | Messages <br><sub>screen: chat</sub> | distracted | ✅ distracted (1.00) | ❌ work (0.14) |
| 48 | orb | Docs <br><sub>screen: apidocs</sub> | work | ✅ work (0.00) | ✅ work (0.00) |
| 49 | orb | Windows PowerShell <br><sub>screen: terminal</sub> | work | ✅ work (0.00) | ✅ work (0.01) |
| 50 | orb | Watch <br><sub>screen: video</sub> | distracted | ✅ distracted (1.00) | ✅ distracted (0.96) |
| 51 | orb | Play <br><sub>screen: game</sub> | distracted | ✅ distracted (1.00) | ❌ work (0.64) |
| 52 | orb | Home <br><sub>screen: feed</sub> | distracted | ✅ distracted (0.99) | ❌ work (0.02) |
| 53 | slides | Presentation1 <br><sub>screen: slides</sub> | work | ✅ work (0.00) | ✅ work (0.00) |
| 54 | slides | Shop <br><sub>screen: shop</sub> | distracted | ✅ distracted (1.00) | ✅ distracted (0.84) |
| 55 | slides | Messages <br><sub>screen: chat</sub> | distracted | ✅ distracted (1.00) | ❌ work (0.17) |

Screenshots of real pages are not committed (they show third-party websites); the script takes them fresh on every run, so results can vary slightly as websites change.
