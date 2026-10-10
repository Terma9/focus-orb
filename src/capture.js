const { desktopCapturer, screen } = require('electron');
const fs = require('fs');
const path = require('path');

// One JPEG per display, about 1280 px wide, as data URLs (the Decisions API only takes inline images).
async function captureScreens() {
  const displays = screen.getAllDisplays();
  const maxW = Math.max(...displays.map((d) => d.size.width * d.scaleFactor));
  const maxH = Math.max(...displays.map((d) => d.size.height * d.scaleFactor));
  const scale = Math.min(1, 1280 / maxW);
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(maxW * scale), height: Math.round(maxH * scale) },
  });
  return sources
    .filter((s) => !s.thumbnail.isEmpty())
    .map((s) => 'data:image/jpeg;base64,' + s.thumbnail.toJPEG(70).toString('base64'));
}

// DEBUG_SAVE_SHOTS=1: keep the last 20 checks (screenshots + verdict) in ./debug to see what the model saw.
function saveDebug(dir, shots, info) {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  shots.forEach((s, i) => fs.writeFileSync(path.join(dir, `${stamp}-screen${i + 1}.jpg`), Buffer.from(s.split(',')[1], 'base64')));
  fs.writeFileSync(path.join(dir, `${stamp}.json`), JSON.stringify(info, null, 2));
  const files = fs.readdirSync(dir).sort();
  const stamps = [...new Set(files.map((f) => f.slice(0, stamp.length)))];
  for (const old of stamps.slice(0, -20)) for (const f of files) if (f.startsWith(old)) fs.unlinkSync(path.join(dir, f));
}

module.exports = { captureScreens, saveDebug };
