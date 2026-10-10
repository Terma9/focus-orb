// Static checks that catch typos between the page, the preload bridge and the main process.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('renderer/index.html');
const preload = read('renderer/preload.js');
const mainSide = read('src/main.js') + read('src/orb-window.js');

test('every element the page script uses exists in the page', () => {
  const ids = new Set([...html.matchAll(/\sid="([\w-]+)"/g)].map((m) => m[1]));
  const used = new Set([...html.matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1]));
  assert.ok(used.size > 20, `found ${used.size} element lookups`);
  for (const id of used) assert.ok(ids.has(id), `#${id} is used but missing from index.html`);
});

test('every message the page sends has a listener in the main process', () => {
  const sent = [...preload.matchAll(/ipcRenderer\.send\('([\w-]+)'/g)].map((m) => m[1]);
  assert.ok(sent.length >= 10, `found ${sent.length} channels`);
  for (const ch of sent) assert.match(mainSide, new RegExp(`ipcMain\\.on\\('${ch}'`), `nobody listens to '${ch}'`);
});

test('every event the page subscribes to is sent by the main process', () => {
  const subscribed = [...preload.matchAll(/ipcRenderer\.on\('([\w-]+)'/g)].map((m) => m[1]);
  for (const ch of subscribed) assert.match(mainSide, new RegExp(`send\\('${ch}'`), `nothing sends '${ch}'`);
});

test('the page only talks to the main process through the preload bridge', () => {
  assert.doesNotMatch(html, /require\(/, 'no Node APIs in the page');
  assert.match(read('src/orb-window.js'), /contextIsolation: true/);
  assert.match(html, /Content-Security-Policy/);
});

test('the API key never reaches the page', () => {
  const published = read('src/main.js').match(/orb\.send\('state', \{([\s\S]*?)\n  \}\);/)[1];
  assert.doesNotMatch(published, /apiKey/);
});
