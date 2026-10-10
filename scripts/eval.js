// Accuracy check, full mode vs. privacy mode: how often does the real AI judge real situations correctly?
//
//   npm run eval                     # all situations, both modes, 3 runs each
//   npm run eval -- --repeat 1       # one run each (faster)
//   npm run eval -- --titles         # privacy mode only (no screenshots)
//
// Situations (eval/cases.json):
//   - real public web pages, opened in a hidden window and screenshotted fresh on every run
//   - self-made screens with a vague window title ("Home", "Untitled document", ...), from eval/scenes.js
// Every situation is judged with exactly the app's code and instructions, in full mode (screenshot + title)
// and privacy mode (title only). Results go to eval/results.md. Needs OPENAI_API_KEY (.env); costs a few cents.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadDotEnv, loadConfig, defaultEnvFile } = require('../src/config');
const { createOpenAI } = require('../src/ai');
const { SCENES } = require('../eval/scenes');

const ROOT = path.join(__dirname, '..');
const arg = (name, d) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : d; };
const TITLES_ONLY = process.argv.includes('--titles');
const REPEAT = Math.max(1, +arg('--repeat', 3));
const SHOTS = path.join(os.tmpdir(), 'focus-orb-eval-shots');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

loadDotEnv(defaultEnvFile);
const cfg = loadConfig(process.env, []);
const ai = createOpenAI(cfg);
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'eval', 'cases.json'), 'utf8'));
const situations = [
  ...spec.cases.map((c) => ({ ...c, group: 'real', app: 'chrome' })),
  ...spec.vague.map((c) => ({ ...c, group: 'vague' })),
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function screenshot(win, s, i) {
  if (s.scene) {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(SCENES[s.scene]()));
    await sleep(600);
  } else {
    try { await Promise.race([win.loadURL(s.url, { userAgent: UA }), sleep(15000)]); } catch {} // aborted loads often still render
    await sleep(3500);
  }
  const jpg = (await win.webContents.capturePage()).toJPEG(70);
  fs.writeFileSync(path.join(SHOTS, `${String(i + 1).padStart(2, '0')}-${s.scene || s.task}.jpg`), jpg);
  return 'data:image/jpeg;base64,' + jpg.toString('base64');
}

const windowTitle = (s) => (s.app === 'chrome' ? `${s.title} - Google Chrome` : s.title);

async function judgeOnce(s, shots) {
  for (let attempt = 1; ; attempt++) {
    try {
      const t0 = Date.now();
      const v = await ai.judge({ task: spec.tasks[s.task], fg: { title: windowTitle(s), app: s.app }, shots, workKeys: [] });
      return { p: v ? v.pDistracted : 0, ms: Date.now() - t0 };
    } catch (e) {
      if (attempt >= 3) throw e;
      await sleep(1500 * attempt); // network hiccups: try again
    }
  }
}

// Judge REPEAT times; the verdict is the majority, and we keep every probability to measure stability.
async function judge(s, shots) {
  const runs = [];
  for (let r = 0; r < REPEAT; r++) runs.push(await judgeOnce(s, shots));
  const verdicts = runs.map((x) => (x.p >= cfg.threshold ? 'distracted' : 'work'));
  const distractedVotes = verdicts.filter((v) => v === 'distracted').length;
  const verdict = distractedVotes * 2 > REPEAT ? 'distracted' : 'work';
  const ps = runs.map((x) => x.p);
  return {
    verdict, ok: verdict === s.label, ps,
    p: ps.reduce((a, b) => a + b, 0) / ps.length,
    stable: new Set(verdicts).size === 1,
    ms: runs.reduce((a, x) => a + x.ms, 0) / runs.length,
  };
}

app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  if (!cfg.apiKey) { console.error('No OPENAI_API_KEY (put it in .env).'); app.exit(1); return; }
  fs.mkdirSync(SHOTS, { recursive: true });
  const win = new BrowserWindow({ show: false, width: 1280, height: 800 });
  const rows = [];
  for (const [i, s] of situations.entries()) {
    const row = { ...s };
    try {
      row.privacy = await judge(s, []);
      if (!TITLES_ONLY) row.full = await judge(s, [await screenshot(win, s, i)]);
    } catch (e) {
      row.error = e.message;
    }
    rows.push(row);
    const f = (r) => (r ? `${r.ok ? 'OK' : 'XX'} ${r.verdict.padEnd(10)} p=${r.p.toFixed(2)}${r.stable ? ' ' : '~'}` : '-');
    console.log(`${String(i + 1).padStart(2)} ${s.group.padEnd(5)} ${s.task.padEnd(6)} ${s.label.padEnd(10)} full: ${f(row.full).padEnd(27)} privacy: ${f(row.privacy).padEnd(27)} ${s.title.slice(0, 44)}${row.error ? '  ERROR ' + row.error : ''}`);
  }
  win.destroy();
  writeReport(rows);
  app.quit();
});

// ---------- report ----------

function stats(rows, mode) {
  const rs = rows.filter((r) => r[mode]);
  if (!rs.length) return null;
  const work = rs.filter((r) => r.label === 'work'), dist = rs.filter((r) => r.label === 'distracted');
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    n: rs.length,
    ok: rs.filter((r) => r[mode].ok).length,
    falseAlarms: work.filter((r) => !r[mode].ok).length, work: work.length,
    missed: dist.filter((r) => !r[mode].ok).length, dist: dist.length,
    unstable: rs.filter((r) => !r[mode].stable).length,
    pWork: mean(work.map((r) => r[mode].p)),
    pDist: mean(dist.map((r) => r[mode].p)),
    ms: mean(rs.map((r) => r[mode].ms)),
  };
}

function writeReport(rows) {
  const done = rows.filter((r) => !r.error);
  const groups = { all: done, real: done.filter((r) => r.group === 'real'), vague: done.filter((r) => r.group === 'vague') };
  const pct = (a, b) => `${a} of ${b} (${Math.round((100 * a) / b)} %)`;
  const both = done.filter((r) => r.full && r.privacy);
  const disagree = both.filter((r) => r.full.verdict !== r.privacy.verdict);
  const S = {};
  for (const g of Object.keys(groups)) S[g] = { full: stats(groups[g], 'full'), privacy: stats(groups[g], 'privacy') };

  const summaryRow = (label, s) => (s ? `| ${label} | ${pct(s.ok, s.n)} | ${s.falseAlarms} of ${s.work} | ${s.missed} of ${s.dist} |` : '');
  const cell = (r) => (r ? `${r.ok ? '✅' : '❌'} ${r.verdict} (${r.p.toFixed(2)}${r.stable ? '' : ', unstable'})` : '–');
  const table = (rs) => [
    '| # | Task | Window title | Should be | Full mode | Privacy mode |',
    '|---|---|---|---|---|---|',
    ...rs.map((r) => `| ${rows.indexOf(r) + 1} | ${r.task} | ${r.title.replace(/\|/g, '\\|')}${r.scene ? ` <br><sub>screen: ${r.scene}</sub>` : ''}${r.tricky ? ` <br><sub>tricky: ${r.tricky}</sub>` : ''} | ${r.label} | ${r.error ? 'error' : cell(r.full)} | ${r.error ? 'error' : cell(r.privacy)} |`),
  ];
  const f = S.all.full, p = S.all.privacy;

  const md = [
    '# Accuracy check: full mode vs. privacy mode',
    '',
    `Run on ${new Date().toISOString().slice(0, 10)} with \`npm run eval\`. ${done.length} hand-labelled situations across ${Object.keys(spec.tasks).length} tasks, each judged ${REPEAT}× per mode by \`gpt-6-luna\` through the Decisions API, with the app's exact instructions. The verdict is the majority of the runs; a run counts as "distracted" at p ≥ ${cfg.threshold}.`,
    '',
    '- **Real pages:** public websites, screenshotted fresh on every run.',
    '- **Vague titles:** self-made screens ([eval/scenes.js](scenes.js)) whose window title says almost nothing ("Home", "Untitled document", "Watch"). Only the screenshot shows what\'s going on.',
    '',
    '## Summary',
    '',
    '| | Correct | False alarms (work flagged) | Missed distractions |',
    '|---|---|---|---|',
    summaryRow('**Full mode**, all situations', S.all.full),
    summaryRow('**Privacy mode**, all situations', S.all.privacy),
    summaryRow('Full mode, real pages', S.real.full),
    summaryRow('Privacy mode, real pages', S.real.privacy),
    summaryRow('Full mode, vague titles', S.vague.full),
    summaryRow('Privacy mode, vague titles', S.vague.privacy),
    '',
    '| | Full mode | Privacy mode |',
    '|---|---|---|',
    f && p ? `| Average p(distracted) on work | ${f.pWork.toFixed(2)} | ${p.pWork.toFixed(2)} |` : '',
    f && p ? `| Average p(distracted) on distractions | ${f.pDist.toFixed(2)} | ${p.pDist.toFixed(2)} |` : '',
    f && p ? `| Unstable (runs disagreed) | ${f.unstable} of ${f.n} | ${p.unstable} of ${p.n} |` : '',
    f && p ? `| Time per check | ${(f.ms / 1000).toFixed(1)} s | ${(p.ms / 1000).toFixed(1)} s |` : '',
    '',
    `**The two modes disagree on ${disagree.length} of ${both.length} situations:**`,
    '',
    ...(disagree.length ? table(disagree) : ['(none)']),
    '',
    '## All situations',
    '',
    `Tasks: ${Object.entries(spec.tasks).map(([k, v]) => `**${k}** = "${v}"`).join(', ')}.`,
    '',
    '### Real pages',
    '',
    ...table(groups.real),
    '',
    '### Vague titles',
    '',
    ...table(groups.vague),
    '',
    'Screenshots of real pages are not committed (they show third-party websites); the script takes them fresh on every run, so results can vary slightly as websites change.',
  ].join('\n').replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(path.join(ROOT, 'eval', 'results.md'), md + '\n');
  console.log(`\nFull mode: ${f ? pct(f.ok, f.n) : '-'} | Privacy mode: ${p ? pct(p.ok, p.n) : '-'} | disagree on ${disagree.length} -> eval/results.md`);
}
