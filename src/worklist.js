// "This is work": what to remember for a window, and whether a later window matches it. Pure, unit-tested.
//
//  - Apps (VS Code, Figma, …) are remembered by exe name.
//  - Websites by their site name ("… - OpenAI Platform - Google Chrome" -> "OpenAI Platform").
//  - Video/feed sites only by the specific page, so approving one tutorial doesn't approve all of YouTube.

const BROWSERS = /^(chrome|msedge|firefox|brave|opera|opera_gx|vivaldi|arc|librewolf|waterfox|chromium)$/i;
const MEDIA_SITES = /^(youtube|twitch|vimeo|netflix|reddit|x|twitter|tiktok|instagram|facebook)$/i;

function workKey(win) {
  if (!win || !win.app) return null;
  if (BROWSERS.test(win.app)) {
    const parts = win.title
      .replace(/\s+and \d+ more pages?/i, '')
      .split(/\s+[-–—|]\s+/)
      .map((p) => p.replace(/​/g, '').trim())
      .filter(Boolean);
    parts.pop(); // browser name
    while (parts.length > 1 && /^(personal|work|profile \d+|guest|incognito|inprivate)$/i.test(parts[parts.length - 1])) parts.pop();
    const site = parts[parts.length - 1];
    if (!site) return null;
    if (MEDIA_SITES.test(site)) {
      if (parts.length < 2) return null; // a feed/home page: nothing specific to approve
      return { kind: 'site', value: parts.join(' - ').replace(/^\(\d+\)\s*/, '') }; // drop "(3)" unread counts
    }
    return { kind: 'site', value: site };
  }
  return { kind: 'app', value: win.app };
}

function matchesWork(win, key) {
  if (!win || !key) return false;
  if (key.kind === 'app') return win.app.toLowerCase() === key.value.toLowerCase();
  return BROWSERS.test(win.app) && win.title.toLowerCase().includes(key.value.toLowerCase());
}

// A list of approved keys for one task.
class WorkList {
  constructor() {
    this.task = '';
    this.keys = [];
  }

  forTask(task) {
    if (task !== this.task) {
      this.task = task;
      this.keys = [];
    }
  }

  add(win) {
    const key = workKey(win);
    if (!key) return null;
    if (!this.keys.some((k) => k.kind === key.kind && k.value.toLowerCase() === key.value.toLowerCase())) this.keys.push(key);
    return key;
  }

  match(win) {
    return this.keys.find((k) => matchesWork(win, k)) || null;
  }
}

module.exports = { workKey, matchesWork, WorkList };
