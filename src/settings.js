// Small persistent settings (settings.json in the user's app data folder).
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  privacyAcknowledged: false, // has the user seen the first-run privacy notice?
  mode: 'full', // 'full' (screenshot + window title) | 'privacy' (window title only, never screenshots)
};

class Settings {
  constructor(dir) {
    this.file = path.join(dir, 'settings.json');
    this.values = { ...DEFAULTS };
    try {
      Object.assign(this.values, JSON.parse(fs.readFileSync(this.file, 'utf8')));
    } catch {}
    if (!['full', 'privacy'].includes(this.values.mode)) this.values.mode = DEFAULTS.mode;
  }

  get(key) {
    return this.values[key];
  }

  set(changes) {
    Object.assign(this.values, changes);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.values, null, 2));
  }
}

module.exports = { Settings, DEFAULTS };
