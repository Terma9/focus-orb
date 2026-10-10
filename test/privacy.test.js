const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { sensitiveReason } = require('../src/privacy');
const { Settings } = require('../src/settings');

const chrome = (title) => ({ title: `${title} - Google Chrome`, app: 'chrome' });

test('password managers are never looked at', () => {
  assert.equal(sensitiveReason({ title: 'All items', app: '1Password' }), 'password manager');
  assert.equal(sensitiveReason({ title: 'My vault', app: 'Bitwarden' }), 'password manager');
  assert.equal(sensitiveReason(chrome('Vault | Bitwarden Web')), 'password manager');
});

test('private browser windows are never looked at', () => {
  assert.equal(sensitiveReason({ title: 'New tab - Profile 1 - Microsoft Edge InPrivate', app: 'msedge' }), 'private window');
  assert.equal(sensitiveReason(chrome('New Tab (Incognito)')), 'private window');
  assert.equal(sensitiveReason({ title: 'Mozilla Firefox Private Browsing', app: 'firefox' }), 'private window');
});

test('banking sites are never looked at', () => {
  assert.equal(sensitiveReason(chrome('Online-Banking - Sparkasse')), 'banking');
  assert.equal(sensitiveReason(chrome('Summary - PayPal')), 'banking');
});

test('normal work and distractions are not sensitive', () => {
  for (const w of [
    { title: 'main.js - focus-orb - Visual Studio Code', app: 'Code' },
    chrome('Funny cats compilation - YouTube'),
    chrome('Usage limits - OpenAI Platform'),
    chrome('Databank schema design - Stack Overflow'),
    null,
  ]) assert.equal(sensitiveReason(w), null, JSON.stringify(w));
});

test('settings persist and fall back to safe defaults', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-settings-'));
  const a = new Settings(dir);
  assert.equal(a.get('mode'), 'full');
  assert.equal(a.get('privacyAcknowledged'), false);
  a.set({ mode: 'privacy', privacyAcknowledged: true });
  const b = new Settings(dir);
  assert.equal(b.get('mode'), 'privacy');
  assert.equal(b.get('privacyAcknowledged'), true);
  fs.writeFileSync(path.join(dir, 'settings.json'), '{"mode":"bogus"');
  assert.equal(new Settings(dir).get('mode'), 'full', 'corrupt file -> defaults');
});
