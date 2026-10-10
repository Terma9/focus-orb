const test = require('node:test');
const assert = require('node:assert/strict');
const { createOpenAI, fallbackQuip, describeWindow, distractedInstructions, ACTIVITIES } = require('../src/ai');

// Replace fetch with a fake OpenAI that records requests and returns `reply`.
function fakeOpenAI(reply, status = 200) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
    return { ok: status < 400, status, json: async () => reply };
  };
  return calls;
}
const cfg = { apiKey: 'sk-test', baseUrl: 'http://fake', quipModel: 'gpt-6-luna' };
const youtube = { title: 'Funny cats - YouTube - Google Chrome', app: 'chrome' };
const answers = (p, activity = 'video') => ({ answers: [
  { type: 'predicate', name: 'distracted', probability: p },
  { type: 'choice', name: 'activity', choice: activity },
] });
const content = (call) => call.body.input[0].content;

test.afterEach(() => { delete global.fetch; });

test('judge asks the Decisions API the "distracted" question and returns the probability', async () => {
  const calls = fakeOpenAI(answers(0.93));
  const v = await createOpenAI(cfg).judge({ task: 'thesis', fg: youtube, shots: ['data:image/jpeg;base64,AAA'], workKeys: [] });
  assert.deepEqual(v, { pDistracted: 0.93, activity: 'video' });
  assert.equal(calls[0].url, 'http://fake/v1/decisions');
  assert.equal(calls[0].body.model, 'gpt-6-luna');
  assert.equal(calls[0].headers.Authorization, 'Bearer sk-test');
  assert.deepEqual(calls[0].body.questions.map((q) => `${q.type}:${q.name}`), ['predicate:distracted', 'choice:activity']);
});

test('full mode sends one image per display plus the window title', async () => {
  const calls = fakeOpenAI(answers(0.1, 'the_task'));
  await createOpenAI(cfg).judge({ task: 'thesis', fg: youtube, shots: ['data:a', 'data:b'], workKeys: [] });
  const c = content(calls[0]);
  assert.equal(c.filter((p) => p.type === 'input_image').length, 2);
  assert.match(c[0].text, /Funny cats - YouTube/);
  assert.match(c[0].text, /screenshots of all of their displays right now \(2\)/);
});

test('privacy mode sends no image at all, only the window title', async () => {
  const calls = fakeOpenAI(answers(0.9));
  await createOpenAI(cfg).judge({ task: 'thesis', fg: youtube, shots: [], workKeys: [] });
  const c = content(calls[0]);
  assert.equal(c.filter((p) => p.type === 'input_image').length, 0);
  assert.match(c[0].text, /There is no screenshot/);
  assert.match(c[0].text, /Funny cats - YouTube/);
});

test('apps and sites marked "This is work" are passed to the model', async () => {
  const calls = fakeOpenAI(answers(0.1));
  await createOpenAI(cfg).judge({ task: 'thesis', fg: youtube, shots: [], workKeys: [{ kind: 'site', value: 'OpenAI Platform' }] });
  assert.match(content(calls[0])[0].text, /confirmed these count as part of their work: OpenAI Platform/);
});

test('a refusal or a missing answer is "no verdict", not a crash', async () => {
  fakeOpenAI({ answers: [{ type: 'refusal', name: 'distracted' }] });
  assert.equal(await createOpenAI(cfg).judge({ task: 't', fg: youtube, shots: [], workKeys: [] }), null);
  fakeOpenAI({});
  assert.equal(await createOpenAI(cfg).judge({ task: 't', fg: youtube, shots: [], workKeys: [] }), null);
});

test('API errors surface with status and message', async () => {
  fakeOpenAI({ error: { message: 'Incorrect API key provided' } }, 401);
  await assert.rejects(
    createOpenAI(cfg).judge({ task: 't', fg: youtube, shots: [], workKeys: [] }),
    /\/v1\/decisions 401 Incorrect API key provided/,
  );
});

test('the funny line comes from the Responses API, without emojis or quotes', async () => {
  const calls = fakeOpenAI({ output: [{ type: 'message', content: [{ type: 'output_text', text: '"Cats again? Your thesis misses you 😿"' }] }] });
  const line = await createOpenAI(cfg).quip({ task: 'thesis', fg: youtube, activity: 'video', shots: [] });
  assert.equal(line, 'Cats again? Your thesis misses you');
  assert.equal(calls[0].url, 'http://fake/v1/responses');
  assert.equal(content(calls[0]).filter((p) => p.type === 'input_image').length, 0, 'privacy mode: no image for the line either');
});

test('the funny line also works with the output_text shortcut', async () => {
  fakeOpenAI({ output_text: 'Back to work, captain.' });
  assert.equal(await createOpenAI(cfg).quip({ task: 't', fg: youtube, activity: 'video', shots: [] }), 'Back to work, captain.');
});

test('fallback lines exist for every distracting activity and mention the task', () => {
  for (const { value } of ACTIVITIES.filter((a) => a.value !== 'the_task')) {
    const line = fallbackQuip(value, 'my thesis');
    assert.ok(line.length > 10, value);
    assert.match(line, /my thesis/, value);
  }
});

test('the instructions give work the benefit of the doubt, but not videos', () => {
  const t = distractedInstructions('my thesis');
  assert.match(t, /"my thesis"/);
  assert.match(t, /For videos, if unsure, answer distracted/);
  assert.match(t, /For everything else, if unsure, answer not distracted/);
  assert.match(t, /AI assistants/);
});

test('describeWindow', () => {
  assert.equal(describeWindow(youtube), '"Funny cats - YouTube - Google Chrome" (app: chrome)');
  assert.equal(describeWindow(null), 'unknown');
});
