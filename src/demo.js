// Demo mode (FOCUS_ORB_DEMO=1, `npm run demo`): a scripted 25-second story on a staged desktop,
// no API key needed. With FOCUS_ORB_RECORD=<dir> it runs off-screen and saves frames for the README GIF
// (see scripts/record-demo.js).
const { app, BrowserWindow, screen } = require('electron');
const fs = require('fs');
const path = require('path');

const RECORD = process.env.FOCUS_ORB_RECORD || '';
const offsetX = RECORD ? -20000 : 0;
// Recording happens on a virtual 1280x720 screen, so the orb and its text are big enough in the GIF.
const virtualArea = RECORD ? { x: 0, y: 0, width: 1280, height: 720 } : null;
const TASK = 'Ship the landing page';
const LINE = 'A cat in a box? Adorable. Your landing page is also adorable, and it misses you.';
const WINDOWS = {
  editor: { title: 'index.html - landing-page - Visual Studio Code', app: 'Code' },
  video: { title: 'Cat in a box compilation - CatTube - Google Chrome', app: 'chrome' },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let scene = 'editor';

// Faster checks so the story fits in a GIF; the rules are the same as in real use.
const config = { checkMs: 1000, graceMs: 2500, confirmChecks: 2, growMs: 16_000, focusMs: 25 * 60_000, breakMs: 5 * 60_000 };

// The scripted "AI": the editor is work, the cat video is not.
const brain = {
  ready: true,
  missing: '',
  currentWindow: () => ({ ...WINDOWS[scene], pid: 1 }),
  async judge() {
    await sleep(250);
    return scene === 'video' ? { pDistracted: 0.97, activity: 'video' } : { pDistracted: 0.02, activity: 'the_task' };
  },
  async quip() {
    await sleep(1100);
    return LINE;
  },
};

// ---------- scripted mouse (recording only; live demos use your real mouse) ----------
let cur = { x: 0, y: 0 }, move = null, down = false;
function cursorNow() {
  if (move) {
    const t = Math.min(1, (Date.now() - move.t0) / move.ms);
    const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    cur = { x: move.from.x + (move.to.x - move.from.x) * k, y: move.from.y + (move.to.y - move.from.y) * k };
    if (t >= 1) move = null;
  }
  return cur;
}
const moveTo = (p, ms) => { move = { from: cursorNow(), to: p, t0: Date.now(), ms }; };
const cursor = RECORD ? () => { const p = cursorNow(); return { x: Math.round(p.x), y: Math.round(p.y) }; } : undefined;

// ---------- the story ----------
async function run(api) {
  const wa = virtualArea || screen.getPrimaryDisplay().workArea;
  const P = (fx, fy) => ({ x: wa.x + wa.width * fx, y: wa.y + wa.height * fy });
  const orbWin = api.orb.win;

  const desktop = new BrowserWindow({
    x: wa.x + offsetX, y: wa.y, width: wa.width, height: wa.height,
    frame: false, resizable: false, skipTaskbar: !!RECORD, show: false, backgroundColor: '#12121c',
    webPreferences: { backgroundThrottling: false },
  });
  await desktop.loadFile(path.join(__dirname, '..', 'renderer', 'demo-desktop.html'), { search: RECORD ? 'record=1' : '' });
  if (RECORD) desktop.showInactive(); else desktop.show();
  orbWin.moveTop();
  const quitOnEsc = (_e, input) => { if (input.key === 'Escape') app.quit(); };
  desktop.webContents.on('before-input-event', quitOnEsc);
  orbWin.webContents.on('before-input-event', quitOnEsc);
  const setScene = (s) => { scene = s; return desktop.webContents.executeJavaScript(`setScene('${s}')`); };
  const orbJs = (code) => orbWin.webContents.executeJavaScript(code);

  cur = P(0.42, 0.62);
  const rec = RECORD ? await startRecorder({ dir: RECORD, desktop, orbWin, wa, setScene }) : null;
  const t0 = Date.now();
  const at = (ms) => sleep(Math.max(0, t0 + ms - Date.now()));
  const mark = (name) => rec && rec.mark(name);

  // 1. Type the task
  await at(700);
  for (let i = 1; i <= TASK.length; i++) {
    await orbJs(`document.getElementById('task').value = ${JSON.stringify(TASK.slice(0, i))}`);
    await sleep(55);
  }
  await at(2300);
  api.startFocus(TASK);
  // The demo compresses 25 minutes into seconds: backdate the session start so the summary shows a full Pomodoro.
  const breakAt = 19_500;
  api.stats.start(Date.now() - (config.focusMs - (breakAt - 2300)));

  // 2. Working: the orb's eyes follow the mouse around the code
  await at(2600); moveTo(P(0.3, 0.42), 900);
  await at(3700); moveTo(P(0.55, 0.5), 900);
  mark('focus');

  // 3. Drift: open the cat video
  await at(5000); moveTo(P(0.35, 0.1), 600);
  await at(5700); await setScene('video'); moveTo(P(0.38, 0.4), 700);
  await at(7000); moveTo(P(0.3, 0.45), 1500);
  // ~9.3 s: two confident checks + grace period -> the orb flies out, then the line appears
  await at(11800); mark('alert');

  // 4. Back to work
  await at(14600);
  const r = await orbJs(`(() => { const b = document.getElementById('back').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  moveTo({ x: wa.x + r.x, y: wa.y + r.y }, 900);
  await at(15700);
  down = true;
  await orbJs(`document.getElementById('back').style.transform = 'scale(.94)'`);
  await sleep(140);
  down = false;
  api.endAlert(false);
  await sleep(250); await setScene('editor'); moveTo(P(0.5, 0.55), 900);
  await at(16900); mark('happy');
  await at(18300); mark('calm');

  // 5. Pomodoro done: summary card, then the orb naps through the break
  await at(breakAt); api.startBreak();
  await at(breakAt + 1500); mark('summary');
  await at(breakAt + 5000); api.closeSummary();
  await at(breakAt + 7000); mark('sleep');
  await at(breakAt + 8000);
  if (rec) { await rec.finish(); app.quit(); }
}

// ---------- recorder: frames of the orb window (with transparency) + one image per desktop scene ----------
async function startRecorder({ dir, desktop, orbWin, wa, setScene }) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const SCALE = 1; // the virtual screen is already small

  for (const s of ['video', 'editor']) {
    await setScene(s);
    await sleep(500);
    fs.writeFileSync(path.join(dir, `bg-${s}.png`), (await desktop.webContents.capturePage()).resize({ width: Math.round(wa.width * SCALE), quality: 'good' }).toPNG());
  }
  await captureMoods(dir);

  const frames = [], marks = [];
  let stop = false;
  const t0 = Date.now();
  const loop = (async () => {
    while (!stop) {
      const started = Date.now();
      const b = orbWin.getBounds();
      let img = await orbWin.webContents.capturePage();
      img = img.resize({ width: Math.max(1, Math.round(img.getSize().width * SCALE)), quality: 'good' });
      const name = `orb-${String(frames.length).padStart(4, '0')}.png`;
      fs.writeFileSync(path.join(dir, name), img.toPNG());
      const c = cursorNow();
      frames.push({ t: started - t0, scene, orb: name, x: (b.x - offsetX - wa.x) * SCALE, y: (b.y - wa.y) * SCALE, cx: (c.x - wa.x) * SCALE, cy: (c.y - wa.y) * SCALE, down });
      await sleep(Math.max(0, 70 - (Date.now() - started)));
    }
  })();

  return {
    mark: (name) => marks.push({ name, frame: frames.length }),
    async finish() {
      stop = true;
      await loop;
      fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify({ width: Math.round(wa.width * SCALE), height: Math.round(wa.height * SCALE), frames, marks }, null, 1));
    },
  };
}

// Large, still images of each mood for the README (the page renders just the orb with ?mood=...).
async function captureMoods(dir) {
  for (const mood of ['focus', 'angry', 'happy', 'sleep', 'icon']) {
    const size = mood === 'icon' ? 512 : 320;
    const w = new BrowserWindow({
      x: -20000, y: 0, width: size, height: size, transparent: true, frame: false, show: false, skipTaskbar: true,
      backgroundColor: '#00000000',
      webPreferences: { preload: path.join(__dirname, '..', 'renderer', 'preload.js'), contextIsolation: true, backgroundThrottling: false },
    });
    await w.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), { search: `mood=${mood}` });
    w.showInactive();
    await sleep(900);
    fs.writeFileSync(path.join(dir, `mood-${mood}.png`), (await w.webContents.capturePage()).toPNG());
    w.destroy();
  }
}

module.exports = { config, brain, offsetX, virtualArea, cursor, run };
