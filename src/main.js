const { app, ipcMain, Menu, screen, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const { loadDotEnv, loadConfig, defaultEnvFile } = require('./config');
const { DriftTracker } = require('./drift');
const { SessionStats, shortLabel } = require('./stats');
const { WorkList, workKey } = require('./worklist');
const { OrbWindow } = require('./orb-window');
const { createOpenAI, fallbackQuip, describeWindow } = require('./ai');
const { sensitiveReason } = require('./privacy');
const { Settings } = require('./settings');

loadDotEnv(defaultEnvFile);
const CFG = loadConfig();
const SUMMARY_MS = 15_000; // how long the end-of-Pomodoro card stays before the break orb takes over

// ---------- the "brain": who decides whether you're distracted ----------
// Real: active window + screenshots -> OpenAI. Demo (FOCUS_ORB_DEMO=1): a scripted story, no API key needed.

function createRealBrain() {
  const { captureScreens, saveDebug } = require('./capture');
  const { getForegroundWindow } = require('./platform/foreground-win');
  const openai = createOpenAI(CFG);
  let lastFg = null;
  return {
    get ready() { return !!CFG.apiKey; },
    missing: '',
    currentWindow() {
      const w = getForegroundWindow();
      if (w && w.pid !== process.pid) lastFg = w; // clicking the orb shouldn't count as what you're doing
      return lastFg;
    },
    async judge({ task, fg, workKeys, mode }) {
      // Privacy mode: never take a screenshot, judge from the window title alone.
      const shots = mode === 'privacy' ? [] : await captureScreens();
      const verdict = await openai.judge({ task, fg, shots, workKeys });
      if (CFG.debugShots && shots.length) saveDebug(path.join(__dirname, '..', 'debug'), shots, { task, window: fg, verdict });
      return verdict && { ...verdict, shots };
    },
    quip: (args) => openai.quip(args),
  };
}

const demo = CFG.demo ? require('./demo') : null;
if (demo) Object.assign(CFG, demo.config);
const brain = demo ? demo.brain : createRealBrain();

// ---------- state ----------

const S = {
  phase: 'idle', // idle | focus | break
  task: '',
  endsAt: 0,
  durationMs: 0,
  session: 0, // bumped on every phase change, so stale async checks can tell they're stale
  drifting: false,
  driftWindow: null,
  activity: null,
  message: '',
  summary: null,
  showSummary: false,
  error: '',
};
const settings = new Settings(app.getPath('userData'));
const mode = () => settings.get('mode'); // 'full' | 'privacy'
const needsConsent = () => !demo && !settings.get('privacyAcknowledged');
const drift = new DriftTracker(CFG);
const stats = new SessionStats();
const work = new WorkList();
const orb = new OrbWindow({ offsetX: demo?.offsetX || 0, virtualArea: demo?.virtualArea, cursor: demo?.cursor });
orb.growMs = CFG.growMs;
let phaseTimer = null, checkTimer = null, summaryTimer = null;

function publish() {
  orb.send('state', {
    phase: S.phase,
    task: S.task,
    endsAt: S.endsAt,
    durationMs: S.durationMs,
    drifting: S.drifting,
    message: S.message,
    canMarkWork: !!workKey(S.driftWindow),
    alertGeo: orb.alertGeometry(),
    summary: S.showSummary ? S.summary : null,
    needsKey: !brain.ready,
    needsConsent: needsConsent(),
    mode: demo ? null : mode(), // the demo sends nothing anywhere, so no mode label
    error: S.error || (brain.ready ? '' : brain.missing),
  });
}

// ---------- phases ----------

function clearTimers() {
  clearTimeout(phaseTimer);
  clearTimeout(checkTimer);
  clearTimeout(summaryTimer);
}

function clearDrift() {
  drift.reset();
  S.drifting = false;
  S.message = '';
}

function startFocus(task) {
  clearTimers();
  S.session++;
  S.phase = 'focus';
  S.task = task;
  S.durationMs = CFG.focusMs;
  S.endsAt = Date.now() + CFG.focusMs;
  S.error = '';
  S.showSummary = false;
  work.forTask(task);
  stats.start(Date.now());
  clearDrift();
  phaseTimer = setTimeout(startBreak, CFG.focusMs);
  orb.setMode('small');
  publish();
  scheduleCheck(1500);
  log(`Focus started: "${task}"`);
}

function startBreak() {
  const now = Date.now();
  clearTimers();
  S.session++; // invalidates any in-flight check
  S.phase = 'break';
  S.durationMs = CFG.breakMs;
  S.endsAt = now + CFG.breakMs;
  S.summary = stats.summary(now);
  S.showSummary = true;
  clearDrift();
  phaseTimer = setTimeout(goIdle, CFG.breakMs);
  summaryTimer = setTimeout(closeSummary, SUMMARY_MS);
  orb.setMode('summary');
  publish();
  log(`Break started. Focus score ${S.summary.score}%, ${S.summary.driftCount} drift(s)`);
}

function closeSummary() {
  if (!S.showSummary) return;
  clearTimeout(summaryTimer);
  S.showSummary = false;
  if (S.phase === 'break') orb.setMode('small');
  publish();
}

function goIdle() {
  clearTimers();
  S.session++;
  S.phase = 'idle';
  S.endsAt = 0;
  S.showSummary = false;
  clearDrift();
  orb.setMode(needsConsent() ? 'consent' : 'setup');
  publish();
}

// First-run privacy notice and the mode switch (start panel label / right-click menu).
function setPrivacyMode(next) {
  const first = needsConsent();
  settings.set({ mode: next, privacyAcknowledged: true });
  log(`Mode: ${next === 'privacy' ? 'privacy (window titles only, no screenshots)' : 'full (screenshots + window titles)'}`);
  if (first && S.phase === 'idle') orb.setMode('setup');
  publish();
}

// ---------- watching ----------

function scheduleCheck(delay) {
  clearTimeout(checkTimer);
  if (S.phase !== 'focus') return;
  checkTimer = setTimeout(check, Math.max(0, delay));
}

async function check() {
  if (S.phase !== 'focus' || !brain.ready) return;
  const session = S.session;
  const t0 = Date.now();
  try {
    const fg = brain.currentWindow();
    const approved = fg && work.match(fg);
    const sensitive = sensitiveReason(fg);
    const neutral = { pDistracted: 0, activity: 'the_task' };
    if (sensitive) {
      // Password managers, private windows, banking: never screenshotted, title never sent.
      onVerdict(neutral, null, t0, null, `${sensitive}: not looked at`);
    } else if (approved) {
      // Marked as "This is work" for this task: no need to ask the model.
      onVerdict(neutral, fg, t0, null, `marked as work (${approved.value})`);
    } else if (mode() === 'privacy' && !fg?.title) {
      // Privacy mode without a window title (e.g. not on Windows): nothing to judge.
      onVerdict(neutral, fg, t0, null, 'privacy mode: no window title');
    } else {
      const v = await brain.judge({ task: S.task, fg, workKeys: work.keys, mode: mode() });
      if (session !== S.session) return;
      S.error = '';
      if (v) onVerdict(v, fg, t0, v.shots);
    }
  } catch (e) {
    if (session !== S.session) return;
    S.error = `Check failed: ${e.message}`;
    log(S.error);
    publish();
  }
  scheduleCheck(drift.nextDelay(CFG.checkMs, t0, Date.now()));
}

function onVerdict(v, fg, capturedAt, shots, note) {
  const r = drift.verdict(v.pDistracted, capturedAt, Date.now());
  log(`distracted=${v.pDistracted.toFixed(2)} activity=${v.activity} window=${describeWindow(fg)}` +
    (note ? `  [${note}]` : '') + (r.distracted ? '  <- distracted' : ''));
  if (!r.distracted) return;
  S.activity = v.activity;
  S.driftWindow = fg;
  if (r.alert) {
    S.drifting = true;
    S.message = '';
    stats.alertStarted(drift.offSince ?? capturedAt, shortLabel(fg));
    publish();
    orb.setMode('alert');
  }
  if (r.alert || r.renag) nag(shots);
}

async function nag(shots) {
  const session = S.session;
  let line;
  try {
    line = await brain.quip({ task: S.task, fg: S.driftWindow, activity: S.activity, shots: shots || [] });
  } catch (e) {
    log(`Quip failed (${e.message}), using fallback line`);
  }
  if (!line) line = fallbackQuip(S.activity, S.task);
  if (session !== S.session || !S.drifting) return;
  S.message = line;
  publish();
}

// "Back to work" (asWork = false) or "This is work" (asWork = true).
function endAlert(asWork) {
  if (!S.drifting) return;
  if (asWork) {
    const key = work.add(S.driftWindow);
    if (key) log(`Marked as work for "${S.task}": ${key.kind} ${key.value}`);
  }
  log(asWork ? 'Marked as work; snoozing' : 'Back to work; snoozing');
  stats.alertEnded(Date.now(), asWork);
  drift.dismiss(Date.now());
  S.drifting = false;
  S.message = '';
  orb.setMode('small');
  publish();
}

// ---------- API key: from .env (development) or entered in the app (stored encrypted, for the installer) ----------

const keyFile = () => path.join(app.getPath('userData'), 'openai-key.bin');

function loadStoredKey() {
  if (CFG.apiKey || CFG.demo) return;
  try {
    if (fs.existsSync(keyFile()) && safeStorage.isEncryptionAvailable()) CFG.apiKey = safeStorage.decryptString(fs.readFileSync(keyFile()));
  } catch (e) {
    log(`Could not read the stored API key: ${e.message}`);
  }
}

ipcMain.on('set-key', (_e, key) => {
  key = String(key || '').trim();
  if (!/^sk-[\w-]{20,}$/.test(key)) {
    S.error = "That doesn't look like an OpenAI API key (they start with sk-).";
    return publish();
  }
  if (!safeStorage.isEncryptionAvailable()) {
    S.error = 'Secure storage is not available on this system. Put the key in a .env file instead.';
    return publish();
  }
  fs.mkdirSync(path.dirname(keyFile()), { recursive: true });
  fs.writeFileSync(keyFile(), safeStorage.encryptString(key));
  CFG.apiKey = key;
  S.error = '';
  log('API key saved (encrypted)');
  publish();
});

ipcMain.on('run-demo', () => {
  app.relaunch({ args: [...process.argv.slice(1), '--demo'] });
  app.exit(0);
});

// ---------- ipc ----------

ipcMain.on('start', (_e, task) => {
  task = String(task || '').trim();
  if (task) startFocus(task);
});
ipcMain.on('dismiss', () => endAlert(false));
ipcMain.on('work', () => endAlert(true));
ipcMain.on('summary-close', closeSummary);
ipcMain.on('set-mode', (_e, next) => { if (next === 'full' || next === 'privacy') setPrivacyMode(next); });
ipcMain.on('menu', () => {
  const items = [];
  if (S.phase === 'focus') items.push({ label: 'Skip to break', click: startBreak });
  if (S.phase === 'break') items.push({ label: 'End break now', click: goIdle });
  if (S.phase !== 'idle') items.push({ label: 'Stop', click: goIdle });
  if (!demo) {
    items.push({ type: 'separator' }, {
      label: 'Privacy mode (window titles only, no screenshots)',
      type: 'checkbox',
      checked: mode() === 'privacy',
      click: (item) => setPrivacyMode(item.checked ? 'privacy' : 'full'),
    });
  }
  items.push({ type: 'separator' }, { label: 'Quit Focus Orb', click: () => app.quit() });
  Menu.buildFromTemplate(items).popup({ window: orb.win });
});

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

// ---------- app ----------

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => orb.win && (orb.win.show(), orb.win.focus()));
  app.whenReady().then(() => {
    loadStoredKey();
    orb.create().webContents.on('did-finish-load', () => {
      if (needsConsent()) orb.setMode('consent'); // first launch: privacy notice before anything is watched
      publish();
      if (demo) demo.run({ orb, stats, startFocus, startBreak, closeSummary, endAlert, get state() { return S; } });
    });
    const idleMode = () => (needsConsent() ? 'consent' : 'setup');
    screen.on('display-metrics-changed', () => orb.setMode(S.drifting ? 'alert' : S.phase === 'idle' ? idleMode() : S.showSummary ? 'summary' : 'small'));
  });
  app.on('window-all-closed', () => app.quit());
}
