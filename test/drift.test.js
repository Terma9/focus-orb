const test = require('node:test');
const assert = require('node:assert/strict');
const { DriftTracker } = require('../src/drift');

const make = () => new DriftTracker({ threshold: 0.8, confirmChecks: 2, graceMs: 5000, renagMs: 25000, snoozeMs: 5000 });

test('a single confident verdict does not alert', () => {
  const d = make();
  assert.deepEqual(d.verdict(0.95, 0, 0), { distracted: true, alert: false, renag: false });
  assert.equal(d.drifting, false);
});

test('borderline verdicts below the threshold never alert', () => {
  const d = make();
  for (let t = 0; t <= 30000; t += 3000) assert.equal(d.verdict(0.79, t, t).alert, false);
});

test('alerts after 2 distracted checks in a row once the grace period has passed', () => {
  const d = make();
  d.verdict(0.9, 0, 0);
  assert.equal(d.verdict(0.9, 3000, 3000).alert, false, 'still inside the 5 s grace');
  assert.equal(d.verdict(0.9, 5200, 5200).alert, true);
  assert.equal(d.drifting, true);
});

test('a single work verdict resets the streak', () => {
  const d = make();
  d.verdict(0.9, 0, 0);
  d.verdict(0.1, 3000, 3000);
  assert.equal(d.verdict(0.9, 6000, 6000).alert, false, 'streak restarted at 6 s');
  assert.equal(d.verdict(0.9, 11500, 11500).alert, true);
});

test('work verdicts never end a running alert (only the user does)', () => {
  const d = make();
  d.verdict(0.9, 0, 0);
  d.verdict(0.9, 6000, 6000);
  d.verdict(0.0, 9000, 9000);
  assert.equal(d.drifting, true);
});

test('refreshes the line every 25 s while the alert is up', () => {
  const d = make();
  d.verdict(0.9, 0, 0);
  d.verdict(0.9, 6000, 6000); // alert, lastNagAt = 6000
  assert.equal(d.verdict(0.9, 20000, 20000).renag, false);
  assert.equal(d.verdict(0.9, 31500, 31500).renag, true);
});

test('dismiss gives a 5 s snooze before alerting again', () => {
  const d = make();
  d.verdict(0.9, 0, 0);
  d.verdict(0.9, 6000, 6000);
  d.dismiss(7000);
  assert.equal(d.drifting, false);
  assert.equal(d.verdict(0.9, 8000, 8000).alert, false);
  assert.equal(d.verdict(0.9, 11000, 11000).alert, false, 'still snoozed until 12 s');
  assert.equal(d.verdict(0.9, 14000, 14000).alert, true, 'distracted since 8 s, snooze over');
});

test('next check is pulled forward to the end of the grace window', () => {
  const d = make();
  assert.equal(d.nextDelay(3000, 0, 500), 2500);
  d.verdict(0.9, 1000, 1500);
  // grace ends at 1000 + 5000 (+150 margin); a normal 3 s cadence would land at 4000 → keep 3 s here
  assert.equal(d.nextDelay(3000, 1000, 1500), 2500);
  d.verdict(0.9, 4000, 4500);
  assert.equal(d.nextDelay(3000, 4000, 4500), 1650, 'lands exactly when the grace ends (6150)');
});
