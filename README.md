<p align="center">
  <img src="assets/icon.png" width="120" alt="Focus Orb">
</p>

<h1 align="center">Focus Orb</h1>

<p align="center">
  <b>A Pomodoro timer that notices when you drift off, and calls you out.</b>
</p>

<p align="center">
  <a href="https://github.com/Terma9/focus-orb/releases/latest"><img src="https://img.shields.io/badge/Download_for_Windows-8b7bff?style=for-the-badge&logo=windows&logoColor=white" alt="Download for Windows"></a>
  <a href="#quick-start"><img src="https://img.shields.io/badge/Try_the_demo-2bb38a?style=for-the-badge&logo=googleplay&logoColor=white" alt="Try the demo"></a>
  <a href="#how-it-works"><img src="https://img.shields.io/badge/How_it_works-e0526b?style=for-the-badge&logo=readthedocs&logoColor=white" alt="How it works"></a>
</p>

<p align="center">
  <a href="https://github.com/Terma9/focus-orb/actions/workflows/ci.yml"><img src="https://github.com/Terma9/focus-orb/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/Terma9/focus-orb/releases/latest"><img src="https://img.shields.io/github/v/release/Terma9/focus-orb?color=8b7bff" alt="Release"></a>
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT">
</p>

<p align="center">
  <img src="assets/demo.gif" width="800" alt="Focus Orb demo: while coding, the user opens a cat video; the orb flies to the centre of the screen and calls them out, grows until they click Back to work, then shows a focus score">
</p>

## A session in three steps

<table>
  <tr>
    <td align="center" width="33%"><img src="assets/mood-focus.png" width="120"><br><b>1. Say what you're working on</b><br>The orb sits in the corner with a 25-minute ring and keeps an eye on your screen.</td>
    <td align="center" width="33%"><img src="assets/mood-angry.png" width="120"><br><b>2. Drift off, get called out</b><br>It flies to the middle of your screen with a funny line, and grows until you go back to work.</td>
    <td align="center" width="33%"><img src="assets/screenshot-summary.png" width="300"><br><b>3. See how you did</b><br>A focus score after every Pomodoro, then a 5-minute break where nothing is watched.</td>
  </tr>
</table>

- **Hard to annoy:** it only reacts when the AI is at least 80 % sure, twice in a row. Docs, AI chats and dashboards count as work.
- **Learns what's work:** wrong call? Click **This is work** and that app, site or video is fine for the rest of your task.
- **Privacy mode:** sends only window titles, never screenshots.

## Privacy

| | Full mode | Privacy mode |
|---|---|---|
| Sent to OpenAI every 3 s | Screenshot + window title | Window title only |
| Correct in testing | 12 of 12 | 11 of 12 |
| Cost per Pomodoro | ≈ $0.08 | ≈ $0.04 |

Password managers, private windows and banking sites are never looked at. Nothing is stored, and data goes only to OpenAI, with your own API key. You choose the mode on first start.

## Quick start

**Download** the installer from [Releases](https://github.com/Terma9/focus-orb/releases/latest) and paste your [OpenAI API key](https://platform.openai.com/api-keys) on first start.

**Or run it from source.** The demo needs no API key:

```bash
git clone https://github.com/Terma9/focus-orb.git
cd focus-orb
npm install
npm run demo     # scripted demo on a staged desktop
npm start        # the real thing (asks for your API key)
```

## How it works

<p align="center"><img src="assets/how-it-works.svg" width="860" alt="Every 3 s: read the active window; if approved as work, no API call; otherwise screenshot and ask the Decisions API whether you are clearly distracted; at 0.8 or more twice in a row for over 5 s, the orb alerts until you click Back to work or This is work"></p>

1. **It looks:** every 3 seconds it reads the title of the window you're using and takes a screenshot (or only the title in privacy mode).
2. **It asks one question:** OpenAI's [Decisions API](https://developers.openai.com/api/docs/guides/decisions) answers *"Is this person clearly distracted?"* with a probability from 0 to 1.
3. **It reacts carefully:** only at 0.8 or more, twice in a row, for over 5 seconds. A second AI call then writes the funny line.

## Under the hood

<details>
<summary><b>Design decisions</b></summary>

- **"Distracted?", not "on task?"** The first version asked whether the user was on task and flagged AI chats and dashboards as distractions. Flipping the question, and giving anything work-like the benefit of the doubt, fixed the false alarms. Videos are the exception: they count as distracting unless they're a hands-on tutorial for the task.
- **Typed answers instead of chat.** The Decisions API returns probabilities, not prose. There's nothing to parse, and the threshold can be tuned.
- **The window title is strong evidence.** It's read from Windows (Win32 API via koffi) on every check. That's why privacy mode, which sends nothing else, still gets 11 of 12 right.
- **Smooth animation on a transparent window.** Resizing the window every frame was jerky on Windows. The alert window now takes its full size once, while invisible, and the orb moves with GPU-accelerated CSS transforms.

</details>

<details>
<summary><b>Tests</b></summary>

52 tests with Node's built-in test runner, 100 % line coverage of the logic modules, run by GitHub Actions on every push. They cover:

- the alert rules: threshold, streak, grace period, snooze
- the focus score
- what "This is work" remembers
- the never-look list
- the exact requests sent to OpenAI (for example, privacy mode never sends an image)
- contract checks between the visible page and the main process

</details>

<details>
<summary><b>How the demo GIF is made</b></summary>

`npm run record-demo` plays a scripted story in windows placed off-screen, so your own screen is never touched. It captures the transparent orb frame by frame and composites it over a staged desktop with a made-up video site. Then it encodes the GIF in Node, keeping it small (≈ 2 MB) with a shared colour palette and by storing only the pixels that change.

</details>

<details>
<summary><b>Experiment: local AI instead of OpenAI</b></summary>

I tested small open-weight models via Ollama on a laptop CPU. Judging window titles worked well (11 of 12 correct, ~1 s per check). Screenshots took ~109 s per check, far too slow for checks every few seconds, so the app uses OpenAI.

</details>

<details>
<summary><b>Development</b></summary>

```bash
npm test               # unit tests
npm run test:coverage  # with coverage report
npm run record-demo    # re-record the GIF and README images
npm run dist           # build the Windows installer
```

Settings such as Pomodoro length and strictness are listed in [.env.example](.env.example). Changes are listed in [CHANGELOG.md](CHANGELOG.md).

</details>

---

<p align="center">
  Built with Electron, OpenAI's Decisions and Responses APIs, and plain JavaScript · <a href="LICENSE">MIT License</a>
</p>
