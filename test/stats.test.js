const test = require('node:test');
const assert = require('node:assert/strict');
const { SessionStats, shortLabel } = require('../src/stats');

const MIN = 60_000;

test('a clean Pomodoro scores 100', () => {
  const s = new SessionStats();
  s.start(0);
  assert.deepEqual(s.summary(25 * MIN), { focusMinutes: 25, score: 100, driftCount: 0, driftMs: 0, top: [] });
});

test('drift time lowers the score; same places are merged and sorted', () => {
  const s = new SessionStats();
  s.start(0);
  s.alertStarted(1 * MIN, 'YouTube');
  s.alertEnded(1 * MIN + 60_000);
  s.alertStarted(5 * MIN, 'Reddit');
  s.alertEnded(5 * MIN + 30_000);
  s.alertStarted(9 * MIN, 'YouTube');
  s.alertEnded(9 * MIN + 30_000);
  const r = s.summary(25 * MIN);
  assert.equal(r.driftCount, 3);
  assert.equal(r.score, 92); // 2 min of 25 drifted
  assert.deepEqual(r.top, [{ label: 'YouTube', ms: 90_000 }, { label: 'Reddit', ms: 30_000 }]);
});

test('"This is work" does not count as a drift', () => {
  const s = new SessionStats();
  s.start(0);
  s.alertStarted(1 * MIN, 'Electron tutorial');
  s.alertEnded(2 * MIN, true);
  assert.equal(s.summary(25 * MIN).score, 100);
});

test('an alert still open when the Pomodoro ends is counted', () => {
  const s = new SessionStats();
  s.start(0);
  s.alertStarted(20 * MIN, 'Twitch');
  assert.equal(s.summary(25 * MIN).score, 80);
});

test('shortLabel gives a friendly name', () => {
  assert.equal(shortLabel({ title: 'Funny cats - YouTube - Google Chrome', app: 'chrome' }), 'YouTube');
  assert.equal(shortLabel({ title: 'main.js - focus-orb - Visual Studio Code', app: 'Code' }), 'focus-orb');
  assert.equal(shortLabel({ title: 'Claude', app: 'claude' }), 'Claude');
  assert.equal(shortLabel(null), 'something else');
});

test('the score never drops below 0', () => {
  const s = new SessionStats();
  s.start(0);
  s.alertStarted(-10 * MIN, 'Netflix');
  s.alertEnded(30 * MIN);
  assert.equal(s.summary(25 * MIN).score, 0);
});

test('only the top 3 distractions are listed', () => {
  const s = new SessionStats();
  s.start(0);
  ['YouTube', 'Reddit', 'X', 'Twitch'].forEach((label, i) => { s.alertStarted(i * MIN, label); s.alertEnded(i * MIN + (i + 1) * 10_000); });
  const r = s.summary(25 * MIN);
  assert.equal(r.driftCount, 4);
  assert.deepEqual(r.top.map((d) => d.label), ['Twitch', 'X', 'Reddit']);
});
