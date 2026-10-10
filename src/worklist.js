// "This is work": what to remember for a window, and whether a later window matches it. Pure, unit-tested.
//
//  - Apps (VS Code, Figma, …) are remembered by exe name.
//  - Websites by their site name ("… - OpenAI Platform - Google Chrome" -> "OpenAI Platform").
//  - Video/feed sites only by the specific page, so approving one tutorial doesn't approve all of YouTube.

const BROWSERS = /^(chrome|msedge|firefox|brave|opera|opera_gx|vivaldi|arc|librewolf|waterfox|chromium)$/i;
const MEDIA_SITES = /^(youtube|twitch|vimeo|netflix|reddit|x|twitter|tiktok|instagram|facebook)$/i;

// "Page - Site" parts of a browser title, without the browser name, profile, "and N more pages" or "(3)" counts.
function pageParts(win) {
  const parts = win.title
    .replace(/\s+and \d+ more pages?/i, '')
    .split(/\s+[-–—|]\s+/)
    .map((p) => p.replace(/\u200b/g, '').trim()) // Edge puts a zero-width space in its name
    .filter(Boolean);
  parts.pop(); // browser name
  while (parts.length > 1 && /^(personal|work|profile \d+|guest|incognito|inprivate)$/i.test(parts[parts.length - 1])) parts.pop();
  if (parts.length) parts[0] = parts[0].replace(/^\(\d+\)\s*/, ''); // unread counts come and go
  return parts;
}

function workKey(win) {
  if (!win || !win.app) return null;
  if (BROWSERS.test(win.app)) {
    const parts = pageParts(win);
    const site = parts[parts.length - 1];
    if (!site) return null;
    // On video/feed sites, approve only this exact page (one tutorial, or just the home page), never the whole site.
    if (MEDIA_SITES.test(site)) return { kind: 'page', value: parts.join(' - ') };
    return { kind: 'site', value: site };
  }
  return { kind: 'app', value: win.app };
}

function matchesWork(win, key) {
  if (!win || !key) return false;
  if (key.kind === 'app') return win.app.toLowerCase() === key.value.toLowerCase();
  if (!BROWSERS.test(win.app)) return false;
  if (key.kind === 'page') return pageParts(win).join(' - ').toLowerCase() === key.value.toLowerCase();
  return win.title.toLowerCase().includes(key.value.toLowerCase());
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
