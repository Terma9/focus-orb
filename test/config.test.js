const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config');

test('defaults', () => {
  const c = loadConfig({}, []);
  assert.equal(c.focusMs, 25 * 60_000);
  assert.equal(c.checkMs, 3000);
  assert.equal(c.threshold, 0.8);
  assert.equal(c.confirmChecks, 2);
  assert.equal(c.growMs, 120_000);
  assert.equal(c.baseUrl, 'https://api.openai.com');
  assert.equal(c.demo, false);
});

test('overrides, and bad numbers fall back to defaults', () => {
  const c = loadConfig({ FOCUS_MINUTES: '50', DISTRACTED_THRESHOLD: 'abc', OPENAI_BASE_URL: 'http://localhost:8787/', FOCUS_ORB_DEMO: '1' }, []);
  assert.equal(c.focusMs, 50 * 60_000);
  assert.equal(c.threshold, 0.8);
  assert.equal(c.baseUrl, 'http://localhost:8787');
  assert.equal(c.demo, true);
});

test('.env parsing: quotes, comments, and existing variables win', () => {
  const fs = require('fs'), os = require('os'), path = require('path');
  const { loadDotEnv } = require('../src/config');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'orb-env-')), '.env');
  fs.writeFileSync(file, '# a comment\nFO_TEST_A="quoted value"\nFO_TEST_B = 42\nnot a line\nFO_TEST_C=from-file\n');
  process.env.FO_TEST_C = 'from-env';
  loadDotEnv(file);
  assert.equal(process.env.FO_TEST_A, 'quoted value');
  assert.equal(process.env.FO_TEST_B, '42');
  assert.equal(process.env.FO_TEST_C, 'from-env');
  loadDotEnv(path.join(os.tmpdir(), 'does-not-exist.env')); // a missing file is fine
  for (const k of ['FO_TEST_A', 'FO_TEST_B', 'FO_TEST_C']) delete process.env[k];
});

test('demo mode can be switched on from the command line', () => {
  assert.equal(loadConfig({}, ['electron', '.', '--demo']).demo, true);
});
