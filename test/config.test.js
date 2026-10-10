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
