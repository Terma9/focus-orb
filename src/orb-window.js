const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

const SMALL = 124;
const MARGIN = 20;
const PANELS = { setup: [420, 150], summary: [440, 200], consent: [480, 292] };

// The one transparent window the orb lives in. Modes:
//   setup   - task box next to the orb        summary - end-of-Pomodoro card
//   small   - orb in the corner               alert   - full-screen, click-through; the orb flies out and grows
class OrbWindow {
  // offsetX shifts the window off-screen and virtualArea replaces the real screen size
  // (both used to record the demo GIF without touching the real screen).
  constructor({ offsetX = 0, virtualArea = null, cursor = () => screen.getCursorScreenPoint() } = {}) {
    this.offsetX = offsetX;
    this.virtualArea = virtualArea;
    this.cursor = cursor;
    this.mode = 'setup';
    this.pendingMode = null;
    this.handshakeTimer = null;
    this.animTimer = null;
    this.growMs = 120_000;

    // Switching into or out of the alert is a handshake with the page, so it can hide itself while the
    // window resizes and fly the orb out of / back into the corner without flashes:
    //   publish(drifting)  -> page: 'alert-ready'  -> resize to full screen
    //   publish(!drifting) -> page: 'alert-exited' -> resize to corner
    ipcMain.on('alert-ready', () => { if (this.pendingMode === 'alert') this.apply('alert'); });
    ipcMain.on('alert-exited', () => { if (this.pendingMode && this.pendingMode !== 'alert') this.apply(this.pendingMode); });
    ipcMain.on('capture-mouse', (_e, on) => { if (this.mode === 'alert') this.win.setIgnoreMouseEvents(!on, { forward: true }); });
  }

  create() {
    this.win = new BrowserWindow({
      ...this.place(this.boundsFor('setup')),
      transparent: true,
      frame: false,
      resizable: false,
      skipTaskbar: true,
      hasShadow: false,
      alwaysOnTop: true,
      backgroundColor: '#00000000',
      show: !this.offsetX, // recording off-screen: don't grab focus
      icon: path.join(__dirname, '..', 'assets', 'icon.png'),
      webPreferences: {
        preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
        contextIsolation: true,
        backgroundThrottling: false, // otherwise blinks and countdowns stall when Windows thinks we're hidden
        autoplayPolicy: 'no-user-gesture-required',
      },
    });
    if (this.offsetX) this.win.showInactive();
    this.win.setContentProtection(true); // keep the orb out of its own screenshots
    this.win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

    // The eyes follow the mouse.
    let last = '';
    const timer = setInterval(() => {
      if (this.win.isDestroyed()) return clearInterval(timer);
      const p = this.cursor();
      const key = `${p.x},${p.y}`;
      if (key !== last) {
        last = key;
        this.win.webContents.send('cursor', { x: p.x + this.offsetX, y: p.y });
      }
    }, 66);
    return this.win;
  }

  workArea() {
    return this.virtualArea || screen.getPrimaryDisplay().workArea;
  }

  place(b) {
    return { ...b, x: b.x + this.offsetX };
  }

  boundsFor(mode) {
    const wa = this.workArea();
    if (PANELS[mode]) {
      const [w, h] = PANELS[mode];
      return { x: wa.x + wa.width - w - MARGIN, y: wa.y + wa.height - h - MARGIN, width: w, height: h };
    }
    if (mode === 'alert') return { ...wa };
    return { x: wa.x + wa.width - SMALL - MARGIN, y: wa.y + wa.height - SMALL - MARGIN, width: SMALL, height: SMALL };
  }

  // Largest alert size that still fits in ~95% of the screen.
  maxGrowScale() {
    const wa = this.workArea();
    return Math.max(1, Math.min((wa.width * 0.95) / 460, (wa.height * 0.95) / 520));
  }

  // Where the page should fly the orb from/to, and how much it grows (relative to the alert window).
  alertGeometry() {
    const a = this.boundsFor('alert'), c = this.boundsFor('small'), s = this.maxGrowScale();
    return {
      stageW: Math.round(460 * s),
      stageH: Math.round(520 * s),
      cx: c.x + SMALL / 2 - a.x,
      cy: c.y + SMALL / 2 - a.y,
      cornerSize: SMALL,
      baseScale: 1 / s,
      growMs: this.growMs,
    };
  }

  animateTo(target, ms = 420) {
    clearInterval(this.animTimer);
    const from = this.win.getBounds();
    target = this.place(target);
    const t0 = Date.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    this.animTimer = setInterval(() => {
      const t = Math.min(1, (Date.now() - t0) / ms);
      const k = ease(t);
      const lerp = (a, b) => Math.round(a + (b - a) * k);
      this.win.setBounds({ x: lerp(from.x, target.x), y: lerp(from.y, target.y), width: lerp(from.width, target.width), height: lerp(from.height, target.height) });
      if (t >= 1) clearInterval(this.animTimer);
    }, 16);
  }

  setMode(mode) {
    clearTimeout(this.handshakeTimer);
    if (mode === 'alert' && this.mode !== 'alert') {
      this.pendingMode = 'alert';
      this.handshakeTimer = setTimeout(() => this.apply(this.pendingMode), 400);
      return;
    }
    if (this.mode === 'alert' && mode !== 'alert') {
      this.pendingMode = mode;
      this.handshakeTimer = setTimeout(() => this.apply(this.pendingMode), 1000);
      return;
    }
    this.apply(mode);
  }

  apply(mode) {
    clearTimeout(this.handshakeTimer);
    this.pendingMode = null;
    const was = this.mode;
    this.mode = mode;
    const win = this.win;
    if (mode === 'alert') {
      win.setBounds(this.place(this.boundsFor('alert')));
      // Clicks pass through the transparent area; the page turns this off over the orb and bubble.
      win.setIgnoreMouseEvents(true, { forward: true });
      win.setAlwaysOnTop(true, 'screen-saver');
      win.showInactive(); // come to the front without stealing keyboard focus
      win.moveTop();
      return;
    }
    win.setIgnoreMouseEvents(false);
    if (was === 'alert') win.setBounds(this.place(this.boundsFor(mode)));
    else this.animateTo(this.boundsFor(mode));
    win.setAlwaysOnTop(true, 'floating');
    if ((mode === 'setup' || mode === 'consent') && !this.offsetX) {
      win.show();
      win.focus();
    }
  }

  send(channel, payload) {
    if (this.win && !this.win.isDestroyed()) this.win.webContents.send(channel, payload);
  }
}

module.exports = { OrbWindow };
