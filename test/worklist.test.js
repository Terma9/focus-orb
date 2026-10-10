const test = require('node:test');
const assert = require('node:assert/strict');
const { workKey, matchesWork, WorkList } = require('../src/worklist');

const chrome = (title) => ({ title: `${title} - Google Chrome`, app: 'chrome' });

test('websites are remembered by site name', () => {
  assert.deepEqual(workKey(chrome('Usage limits - OpenAI Platform')), { kind: 'site', value: 'OpenAI Platform' });
});

test('Edge profile names and "and N more pages" are ignored', () => {
  const w = { title: 'Usage limits - OpenAI Platform and 3 more pages - Personal - Microsoft​ Edge', app: 'msedge' };
  assert.deepEqual(workKey(w), { kind: 'site', value: 'OpenAI Platform' });
});

test('apps are remembered by exe name', () => {
  assert.deepEqual(workKey({ title: 'main.js - focus-orb - Visual Studio Code', app: 'Code' }), { kind: 'app', value: 'Code' });
});

test('on YouTube only that one video is approved', () => {
  const key = workKey(chrome('(3) Electron tutorial: transparent windows - YouTube'));
  assert.deepEqual(key, { kind: 'site', value: 'Electron tutorial: transparent windows - YouTube' });
  assert.ok(matchesWork(chrome('(5) Electron tutorial: transparent windows - YouTube'), key), 'unread count changed');
  assert.ok(!matchesWork(chrome('Funny cats - YouTube'), key), 'another video');
});

test('a YouTube home page cannot be approved', () => {
  assert.equal(workKey(chrome('YouTube')), null);
});

test('WorkList resets when the task changes and ignores duplicates', () => {
  const l = new WorkList();
  l.forTask('thesis');
  l.add(chrome('Docs - OpenAI Platform'));
  l.add(chrome('Limits - OpenAI Platform'));
  assert.equal(l.keys.length, 1);
  assert.ok(l.match(chrome('Billing - OpenAI Platform')));
  l.forTask('thesis');
  assert.equal(l.keys.length, 1, 'same task keeps the list');
  l.forTask('landing page');
  assert.equal(l.keys.length, 0);
});
