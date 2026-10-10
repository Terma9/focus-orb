// Everything that talks to OpenAI: the focus check (Decisions API) and the drift line (Responses API).

const ACTIVITIES = [
  { value: 'the_task', description: 'Working on the task or anything plausibly work-related: coding, AI assistants and chats, docs, search, dashboards, settings, planning, hands-on tutorials for the exact task' },
  { value: 'social_media', description: 'Social media feeds: X/Twitter, Instagram, Reddit, TikTok, Facebook, LinkedIn feed' },
  { value: 'video', description: 'Watching videos or streams that are not a hands-on tutorial for the task: YouTube, Netflix, Twitch, news, commentary, podcasts' },
  { value: 'chatting', description: 'Personal chat or messaging unrelated to the task: WhatsApp, Discord, Telegram' },
  { value: 'news', description: 'Reading news, blogs or articles unrelated to the task' },
  { value: 'shopping', description: 'Online shopping or browsing products' },
  { value: 'gaming', description: 'Playing a game' },
  { value: 'email', description: 'Email or inbox triage unrelated to the task' },
  { value: 'other_work', description: 'Working on a different task or project than the stated one' },
  { value: 'idle', description: 'Nothing meaningful on screen: desktop, lock screen, blank window' },
  { value: 'other', description: 'Something else unrelated to the task' },
];

// Deliberately "clearly distracted?" rather than "on task?": unclear cases get the benefit of the doubt,
// except videos, which only count as work when they're a hands-on tutorial for the task.
const distractedInstructions = (task) =>
  `Is the user clearly distracted right now by something unrelated to "${task}"? ` +
  'Only count obvious non-work activity: entertainment videos or streams, social media feeds, games, shopping, ' +
  'unrelated news or browsing, personal chats. NOT distracted: anything plausibly connected to the task or to ' +
  'working in general, e.g. code editors, terminals, AI assistants and chats (ChatGPT, Claude, ...), documentation, ' +
  'search, GitHub, developer or API dashboards, account or usage settings, project-related email or messages, ' +
  'file managers, reading, planning. ' +
  'Videos (YouTube etc.) are distracted by default. The only exception is a hands-on tutorial or documentation ' +
  'for the specific tool, library or problem the user is working on right now. General news, commentary, ' +
  'opinion, podcasts, keynotes, hype or "the future of AI/tech" videos count as distracted even if the topic ' +
  'sounds related. For videos, if unsure, answer distracted. For everything else, if unsure, answer not distracted.';

const describeWindow = (fg) => (fg ? `"${fg.title}" (app: ${fg.app})` : 'unknown');

function createOpenAI(cfg) {
  async function post(pathname, body, timeoutMs = 15000) {
    const res = await fetch(`${cfg.baseUrl}${pathname}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error?.message || ''; } catch {}
      throw new Error(`${pathname} ${res.status} ${detail}`.trim());
    }
    return res.json();
  }

  // -> { pDistracted, activity } or null (refusal / unusable answer)
  async function judge({ task, fg, shots, workKeys }) {
    const confirmed = workKeys.length
      ? `\nThe user has confirmed these count as part of their work: ${workKeys.map((k) => k.value).join(', ')}.`
      : '';
    const data = await post('/v1/decisions', {
      model: 'gpt-6-luna',
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `The user committed to working on: "${task}".\n` +
              `Their active (foreground) window is ${describeWindow(fg)}.${confirmed}\n` +
              (shots.length
                ? `Attached are screenshots of all of their displays right now (${shots.length}). ` +
                  'Judge by the active window and the most prominent content. Background windows that are merely open do not count.'
                // Privacy mode: no screenshots, the window title is all there is.
                : 'There is no screenshot: judge only from the window title and app name.'),
          },
          ...shots.map((image_url) => ({ type: 'input_image', image_url })),
        ],
      }],
      questions: [
        { type: 'predicate', name: 'distracted', instructions: distractedInstructions(task) },
        { type: 'choice', name: 'activity', instructions: 'What is the user mainly doing on screen right now?', choices: ACTIVITIES },
      ],
    });
    const byName = Object.fromEntries((data.answers || []).map((a) => [a.name, a]));
    const d = byName.distracted;
    if (!d || d.type === 'refusal' || typeof d.probability !== 'number') return null;
    return { pDistracted: d.probability, activity: byName.activity?.type === 'choice' ? byName.activity.choice : null };
  }

  // One short, funny line naming what the user is doing instead.
  async function quip({ task, fg, activity, shots }) {
    const data = await post('/v1/responses', {
      model: cfg.quipModel,
      max_output_tokens: 400,
      instructions:
        'You are a tiny glowing Pomodoro orb that keeps the user focused. They have drifted off task. ' +
        'Write ONE short line (max 20 words), playful and a little funny, never mean. ' +
        'Name specifically what they are doing instead (the site, app, video, game, etc. visible on screen) ' +
        'and nudge them back to their task. Plain text only: no emojis, no quotes, no hashtags.',
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: `Their task: "${task}". Active window: ${describeWindow(fg)}. Looks like they're doing: ${activity || 'something else'}.` },
          ...shots.map((image_url) => ({ type: 'input_image', image_url })),
        ],
      }],
    }, 8000);
    const text = data.output_text ??
      (data.output || []).flatMap((o) => o.content || []).filter((c) => c.type === 'output_text').map((c) => c.text).join('');
    return text.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim().replace(/^["']|["']$/g, '').trim();
  }

  return { judge, quip };
}

function fallbackQuip(activity, task) {
  const lines = {
    social_media: `The feed will still be there in twenty minutes. ${task} might not wait that long.`,
    video: `Great video, I'm sure. Pause it, ${task} is calling.`,
    chatting: `Your friends can wait. ${task} is getting lonely.`,
    news: `The world will keep turning without you reading about it. Back to ${task}.`,
    shopping: `Add focus to cart. Check out back at ${task}.`,
    gaming: `Respawn at ${task}, please.`,
    email: `The inbox is a bottomless pit. Climb out, ${task} is waiting.`,
    other_work: `That's very productive, just not ${task}. Back we go.`,
    idle: `Hello? Anyone there? ${task} is not going to do itself.`,
  };
  return lines[activity] || `Ahem. That doesn't look like ${task}. Back on track!`;
}

module.exports = { createOpenAI, fallbackQuip, describeWindow, distractedInstructions, ACTIVITIES };
