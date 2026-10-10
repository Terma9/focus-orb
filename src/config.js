const fs = require('fs');
const path = require('path');

// Reads KEY=value lines from .env into process.env (existing env vars win).
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const num = (v, d) => (v !== undefined && v !== '' && !isNaN(+v) ? +v : d);

function loadConfig(env = process.env, argv = process.argv) {
  return {
    apiKey: env.OPENAI_API_KEY,
    baseUrl: (env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/$/, ''),
    demo: env.FOCUS_ORB_DEMO === '1' || argv.includes('--demo'),
    focusMs: num(env.FOCUS_MINUTES, 25) * 60_000,
    breakMs: num(env.BREAK_MINUTES, 5) * 60_000,
    checkMs: num(env.CHECK_INTERVAL_SECONDS, 3) * 1000,
    graceMs: num(env.DRIFT_GRACE_SECONDS, 5) * 1000,
    // Alert only when the model is at least this sure you're distracted...
    threshold: num(env.DISTRACTED_THRESHOLD, 0.8),
    // ...for this many checks in a row (and longer than the grace period).
    confirmChecks: num(env.CONFIRM_CHECKS, 2),
    renagMs: 25_000,
    snoozeMs: 5_000,
    growMs: num(env.GROW_SECONDS, 120) * 1000, // time to grow from normal to almost full screen
    quipModel: env.QUIP_MODEL || 'gpt-6-luna',
    debugShots: env.DEBUG_SAVE_SHOTS === '1',
  };
}

module.exports = { loadDotEnv, loadConfig, defaultEnvFile: path.join(__dirname, '..', '.env') };
