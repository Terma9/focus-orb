# Changelog

## 1.1.0

- **Privacy mode:** sends only the active window's title, never screenshots (93 % correct on normal websites, about half the cost).
- **Privacy notice:** on first start, a short explanation of what is sent where and what it costs, with the choice between full and privacy mode. Afterwards a one-line reminder under the task box links back to it.
- **Never-look list:** password managers, private/incognito windows and banking sites are skipped in both modes.
- **Shield badge:** a green shield on the orb shows when privacy mode is on.
- **Fixed:** "This is work" was hidden on feed/home pages such as the YouTube home page. On video and feed sites it now approves exactly that page.
- **Fixed:** an error dialog could appear when quitting while the orb was moving.
- **Fixed:** a stray space at the end of some drift lines.
- **Tests:** 52 tests with 100 % line coverage of the logic modules.
- **Accuracy check (`npm run eval`):** 55 hand-labelled situations, both modes, 3 runs each. Full mode 96 %, privacy mode 84 % (93 % on normal websites, 60 % when the title is vague).

## 1.0.0

- First release: the orb, AI focus checks with OpenAI's Decisions API, escalating alert, "This is work", end-of-Pomodoro summary, demo mode and Windows installer.
