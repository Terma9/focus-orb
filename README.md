<p align="center">
  <img src="assets/icon.png" width="120" alt="Focus Orb">
</p>

<h1 align="center">Focus Orb</h1>

<p align="center">
  <b>A Pomodoro timer with a face.</b><br>
  It watches your screen with AI and, the moment you drift off to YouTube, flies to the middle of your screen and calls you out.
</p>

<p align="center">
  <a href="https://github.com/Terma9/focus-orb/actions/workflows/ci.yml"><img src="https://github.com/Terma9/focus-orb/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/platform-Windows-0078D6" alt="Windows">
  <img src="https://img.shields.io/badge/Electron-44-47848F?logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/OpenAI-Decisions%20API-412991?logo=openai&logoColor=white" alt="OpenAI Decisions API">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT">
</p>

<p align="center">
  <img src="assets/demo.gif" width="800" alt="Focus Orb demo: the orb notices a cat video, flies out, grows until you go back to work, then shows your focus score">
</p>

## Why

Pomodoro timers count time. They don't notice when the 25 minutes quietly turn into cat videos.

Focus Orb is a small glowing character that sits in the corner while you work. Every few seconds it looks at your screen and asks an AI one question: *is this person clearly distracted?* If you are, it stops being polite.

## Features

- **Watches, then reacts.** A screenshot plus the active window's title go to OpenAI's [Decisions API](https://developers.openai.com/api/docs/guides/decisions) every 3 s during focus time.
- **Calls you out, with a joke.** On a confirmed drift the orb flies to the centre of your screen and says something short and specific: *"A cat in a box? Adorable. Your landing page is also adorable, and it misses you."*
- **Won't let it go.** The orb stays until you click **Back to work**, and slowly grows to almost full screen the longer you ignore it.
- **Learns what's work.** False alarm? Click **This is work** and that app, site or single video is approved for the rest of the task, checked locally and never sent to the AI again.
- **Hard to annoy.** It only alerts when the AI is ≥ 80 % sure, twice in a row, for over 5 s. Docs, AI chats, dashboards and terminals count as work.
- **Tells you how it went.** After 25 minutes: a summary card with your focus score and what you drifted to, then a 5-minute break where nothing is watched.
- **Has moods.** Its eyes follow your mouse, blink and glance around.

<table align="center">
  <tr>
    <td align="center"><img src="assets/mood-focus.png" width="140"><br>Focusing</td>
    <td align="center"><img src="assets/mood-angry.png" width="140"><br>You drifted</td>
    <td align="center"><img src="assets/mood-happy.png" width="140"><br>Back on track</td>
    <td align="center"><img src="assets/mood-sleep.png" width="140"><br>On a break</td>
  </tr>
</table>

<p align="center">
  <img src="assets/screenshot-summary.png" width="440" alt="End-of-Pomodoro summary card">
</p>

<!--
## In real life

Add a short screen recording of a real session here, e.g.:
<p align="center"><img src="assets/real-session.gif" width="800" alt="A real session"></p>
-->

## Try it

**No API key? Watch the demo.** It plays the story above on a staged desktop:

```bash
git clone https://github.com/Terma9/focus-orb.git
cd focus-orb
npm install
npm run demo
```

**Use it for real:**

- **Installer:** download `Focus-Orb-Setup.exe` from [Releases](https://github.com/Terma9/focus-orb/releases). On first launch the orb asks for your [OpenAI API key](https://platform.openai.com/api-keys) and stores it encrypted (Windows DPAPI via Electron `safeStorage`).
- **From source:** `npm start`. You can also put `OPENAI_API_KEY=…` in a `.env` file (see `.env.example`).

Type what you're working on, press Enter, work. Right-click the orb to skip to the break, stop, or quit.

## How it works

<p align="center"><img src="assets/how-it-works.svg" width="900" alt="Every 3 s: read the active window; if approved as work, no API call; otherwise screenshot and ask the Decisions API whether you are clearly distracted; at 0.8 or more twice in a row for over 5 s, the orb alerts until you click Back to work or This is work"></p>

| Piece | What it does |
|---|---|
| `src/main.js` | App lifecycle, Pomodoro state machine, the check loop |
| `src/drift.js` | The rules for *when* to alert (threshold, streak, grace period, snooze). Pure and unit-tested |
| `src/stats.js` | Focus score and drift list for the summary card. Pure and unit-tested |
| `src/worklist.js` | What **This is work** remembers and matches (app, site, or one video). Pure and unit-tested |
| `src/ai.js` | Prompts and calls for the Decisions API (judging) and the Responses API (the line) |
| `src/orb-window.js` | The transparent, always-on-top, click-through window and its fly-out handshake |
| `src/platform/foreground-win.js` | Active window title and app via `user32`/`kernel32` (FFI with koffi, no native build step) |
| `renderer/` | The orb itself: HTML/CSS, GPU-animated, container-query sized |
| `src/demo.js`, `scripts/record-demo.js` | The scripted demo, and the off-screen recorder that produced the GIF above |

## Design decisions

**Ask "distracted?", not "on task?"** The first version asked whether you were working on your task. It flagged the OpenAI dashboard and AI chats as distractions, because a vague task like "my IT project" can't be matched to them. Flipping the predicate to *clearly distracted* (and telling the model to give the benefit of the doubt) fixed the false alarms. Videos are the exception: they count as distracting unless they're a hands-on tutorial for the exact task, because "related" AI hype videos kept slipping through.

**Typed answers instead of chat.** The Decisions API returns a probability, not prose. There's no output parsing and no "the model wrote a paragraph" failure mode, and a probability can be thresholded and tuned. It's also billed on input tokens only. Since the API can't write text, the funny line comes from one Responses API call, made only when you're actually caught.

**The window title is strong evidence.** It's read from Windows on every check and sent alongside the screenshot. It's precise where a downscaled screenshot is blurry ("Usage limits – OpenAI Platform" vs. "some web page"), and it powers the local **This is work** matching.

**Smooth animation on a transparent window.** Growing the orb by resizing its window every frame was jerky on Windows. Now the alert window takes its full size once, while invisible, and everything moves with GPU-composited CSS transforms. A small IPC handshake (`alert-ready` / `alert-exited`) between the main process and the page avoids flashes.

**The demo GIF records itself.** `npm run record-demo` runs the scripted story in windows placed off-screen, so your screen stays untouched. It captures the transparent orb with its alpha channel, composites it over a staged desktop, and encodes the GIF in Node. To keep it small, all frames share one palette with ordered dithering, and only changed pixels are stored.

## Accuracy and experiments

I evaluated 12 hand-labelled situations (5 work: code editor, Electron docs, GitHub, OpenAI docs, Stack Overflow; 7 distracting: Wikipedia cats, Reddit, news, chess, YouTube, shopping, Twitch). The task was "building my focus orb desktop app in Electron".

| Setup | Correct | Time per check |
|---|---|---|
| **OpenAI Decisions API**, screenshot + window title (what ships) | **12 / 12** | **0.7 s** |
| Local `qwen3:1.7b` via Ollama, window title only, few-shot prompt | 11 / 12 | 1.0 s |
| Local `qwen3-vl:2b-instruct`, window title only, few-shot prompt | 10 / 12 | 0.6 s |
| Local `qwen3-vl:2b-instruct` with a 512 px screenshot | – | ~109 s |
| Local `moondream`, screenshot | 4 / 9 (said "distracted" to everything) | ~60 s |

All local runs were CPU-only, on a Ryzen 5 3500U laptop with integrated graphics.

What I learned:
- Running vision models locally on a laptop CPU is too slow for a check every few seconds.
- Small local models judge window titles well, but only with a short few-shot prompt. With the long prompt written for the large model they answered "distracted" to everything.
- "Thinking" model variants can spend minutes reasoning before a one-word answer. Use the instruct versions.

A hybrid "privacy mode" is on the roadmap: judge the title locally first, and send a screenshot only when needed.

## Privacy and cost

- Screenshots are taken **only during focus time** and sent only to OpenAI. They're never written to disk unless you turn on `DEBUG_SAVE_SHOTS`, which keeps the last 20 checks locally so you can see what the model saw.
- The orb window is excluded from screen capture, so it never ends up in its own screenshots.
- Apps and sites approved with **This is work** are checked locally without any API call.
- The API key stays in the main process; the visible page never sees it.
- **Cost:** about 1,300 input tokens per check at $0.10 per 1M tokens, so roughly **$0.07 per 25-minute Pomodoro** with one display.

## Configuration

All optional. Put them in `.env` when running from source:

| Variable | Default | Meaning |
|---|---|---|
| `OPENAI_API_KEY` | – | Your key (the installer asks for it instead) |
| `FOCUS_MINUTES` / `BREAK_MINUTES` | 25 / 5 | Pomodoro lengths |
| `CHECK_INTERVAL_SECONDS` | 3 | How often to check |
| `DRIFT_GRACE_SECONDS` | 5 | How long you have to be distracted before the orb reacts |
| `DISTRACTED_THRESHOLD` | 0.8 | How sure the AI has to be (0–1) |
| `CONFIRM_CHECKS` | 2 | Confident checks in a row before an alert |
| `GROW_SECONDS` | 120 | How long the alert takes to grow to almost full screen |
| `DEBUG_SAVE_SHOTS` | 0 | `1` keeps the last 20 checks in `./debug` |
| `OPENAI_BASE_URL` | `https://api.openai.com` | For proxies, gateways or a local mock server |

## Development

```bash
npm test             # unit tests (node:test, no extra dependencies)
npm run demo         # scripted demo, no API key needed
npm run record-demo  # re-record assets/demo.gif and the README images (off-screen)
npm run dist         # build the Windows installer into dist/
```

## Roadmap

- Hybrid privacy mode: local window-title check first, screenshot only when needed
- macOS support (active-window detection is Windows-only for now)
- Capture only the display with the active window
- Weekly focus history

## License

MIT. See [LICENSE](LICENSE).
