// Records the README GIF: runs the scripted demo off-screen (your screen stays untouched),
// then composites the staged desktop + orb frames + a mouse pointer into assets/demo.gif,
// plus still images of the orb's moods and the summary card.
//
//   npm run record-demo
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PNG } = require('pngjs');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const FRAMES = path.join(os.tmpdir(), 'focus-orb-demo-frames');
const GIF_WIDTH = 800; // final GIF width; frames are recorded at half the screen size and scaled once more

// ---------- 1. record ----------
console.log('Recording the demo off-screen (about 30 s)...');
const electron = require('electron'); // path to the Electron binary when required from Node
const run = spawnSync(electron, ['.', `--user-data-dir=${path.join(os.tmpdir(), 'focus-orb-demo-profile')}`], {
  cwd: ROOT,
  env: { ...process.env, FOCUS_ORB_DEMO: '1', FOCUS_ORB_RECORD: FRAMES },
  stdio: 'inherit',
  timeout: 120_000,
});
if (run.status !== 0 || !fs.existsSync(path.join(FRAMES, 'frames.json'))) {
  console.error('Recording failed.');
  process.exit(1);
}

// ---------- 2. composite ----------
const meta = JSON.parse(fs.readFileSync(path.join(FRAMES, 'frames.json'), 'utf8'));
const readPng = (f) => PNG.sync.read(fs.readFileSync(path.join(FRAMES, f)));
const bg = { editor: readPng('bg-editor.png'), video: readPng('bg-video.png') };
const W = bg.editor.width, H = bg.editor.height;

// Alpha-composite `src` onto `dst` at (ox, oy). Electron captures are straight (not premultiplied) alpha.
function blend(dst, dw, dh, src, ox, oy) {
  ox = Math.round(ox); oy = Math.round(oy);
  for (let y = 0; y < src.height; y++) {
    const dy = y + oy;
    if (dy < 0 || dy >= dh) continue;
    for (let x = 0; x < src.width; x++) {
      const dx = x + ox;
      if (dx < 0 || dx >= dw) continue;
      const s = (y * src.width + x) * 4, a = src.data[s + 3] / 255;
      if (a === 0) continue;
      const d = (dy * dw + dx) * 4;
      for (let c = 0; c < 3; c++) dst[d + c] = src.data[s + c] * a + dst[d + c] * (1 - a);
    }
  }
}

// A classic arrow pointer, drawn as a polygon (white with a dark outline).
const ARROW = [[0, 0], [0, 17], [4.5, 13], [7.5, 20], [10, 19], [7, 12], [12.5, 12]];
function inside(px, py, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function drawCursor(dst, dw, dh, cx, cy, pressed) {
  const s = pressed ? 0.85 : 1;
  for (let y = -2; y < 23; y++) for (let x = -2; x < 16; x++) {
    const px = x / s, py = y / s;
    const fill = inside(px, py, ARROW);
    const edge = !fill && [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1]].some(([ex, ey]) => inside(px + ex, py + ey, ARROW));
    if (!fill && !edge) continue;
    const X = Math.round(cx + x), Y = Math.round(cy + y);
    if (X < 0 || Y < 0 || X >= dw || Y >= dh) continue;
    const d = (Y * dw + X) * 4, v = fill ? 255 : 20;
    dst[d] = dst[d + 1] = dst[d + 2] = v;
  }
}

// Nearest-neighbour-free box downscale to the GIF width.
function downscale(src, sw, sh, tw) {
  const th = Math.round((sh * tw) / sw), out = new Uint8ClampedArray(tw * th * 4), f = sw / tw;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = Math.floor(y * f); yy < Math.min(sh, Math.floor((y + 1) * f)); yy++)
      for (let xx = Math.floor(x * f); xx < Math.min(sw, Math.floor((x + 1) * f)); xx++) {
        const i = (yy * sw + xx) * 4; r += src[i]; g += src[i + 1]; b += src[i + 2]; n++;
      }
    const o = (y * tw + x) * 4; out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
  }
  return { data: out, width: tw, height: th };
}

function composite(f) {
  const img = Buffer.from(bg[f.scene].data);
  blend(img, W, H, readPng(f.orb), f.x, f.y);
  drawCursor(img, W, H, f.cx, f.cy, f.down);
  return img;
}

function savePng(file, rgba, w, h) {
  const png = new PNG({ width: w, height: h });
  png.data = Buffer.from(rgba);
  fs.writeFileSync(file, PNG.sync.write(png));
}

console.log(`Compositing ${meta.frames.length} frames...`);
fs.mkdirSync(ASSETS, { recursive: true });
const frameAt = (name) => meta.frames[Math.min(meta.frames.length - 1, meta.marks.find((m) => m.name === name).frame)];
// Ordered (Bayer 8x8) dithering: a fixed pattern of tiny offsets so gradients don't band with only 255
// colours. Being fixed, it doesn't flicker between frames and keeps the "unchanged pixel" trick working.
const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
function dither(img, strength = 14) {
  const { data, width } = img;
  for (let i = 0; i < data.length; i += 4) {
    const p = i / 4, x = p % width, y = (p / width) | 0;
    const o = (BAYER[(y & 7) * 8 + (x & 7)] / 64 - 0.5) * strength;
    data[i] += o; data[i + 1] += o; data[i + 2] += o; // Uint8ClampedArray clamps for us
  }
  return img;
}
const render = (f) => dither(downscale(composite(f), W, H, GIF_WIDTH));

// One shared palette (255 colours, learned from a sample of frames) + index 255 = "unchanged since the
// previous frame" (transparent). Unchanged pixels compress to almost nothing, which keeps the GIF small.
const sample = meta.frames.filter((_, i) => i % 10 === 0).map(render);
const sampleData = new Uint8ClampedArray(sample.reduce((n, s) => n + s.data.length, 0));
sample.reduce((o, s) => (sampleData.set(s.data, o), o + s.data.length), 0);
const palette = quantize(sampleData, 255, { format: 'rgb565' });
while (palette.length < 256) palette.push([0, 0, 0]);
const TRANSPARENT = 255;

const gif = GIFEncoder();
let shown = null; // palette indices currently visible
let pending = null; // { index, delay }
const write = () => {
  if (!pending) return;
  gif.writeFrame(pending.index, sample[0].width, sample[0].height,
    { palette, delay: pending.delay, transparent: !!shown, transparentIndex: TRANSPARENT, dispose: 1 });
  shown = pending.full;
};
meta.frames.forEach((f, i) => {
  const next = meta.frames[i + 1];
  const delay = next ? Math.max(20, next.t - f.t) : 1500; // hold the last frame before looping
  const full = applyPalette(render(f).data, palette.slice(0, 255), 'rgb565');
  const base = pending ? pending.full : shown;
  if (base && full.every((v, j) => v === base[j])) { pending.delay += delay; return; } // identical: show longer
  write();
  const index = shown ? full.map((v, j) => (v === shown[j] ? TRANSPARENT : v)) : full;
  pending = { index, full, delay };
});
write();
gif.finish();
fs.writeFileSync(path.join(ASSETS, 'demo.gif'), gif.bytes());

// ---------- 3. stills for the README ----------
const alert = frameAt('alert');
savePng(path.join(ASSETS, 'screenshot-alert.png'), composite(alert), W, H);
// The summary card as recorded, on transparent background (works on light and dark GitHub themes).
fs.copyFileSync(path.join(FRAMES, frameAt('summary').orb), path.join(ASSETS, 'screenshot-summary.png'));
for (const mood of ['focus', 'angry', 'happy', 'sleep']) fs.copyFileSync(path.join(FRAMES, `mood-${mood}.png`), path.join(ASSETS, `mood-${mood}.png`));
fs.copyFileSync(path.join(FRAMES, 'mood-icon.png'), path.join(ASSETS, 'icon.png')); // app + installer icon (512 px)

const kb = (f) => Math.round(fs.statSync(path.join(ASSETS, f)).size / 1024);
console.log(`Done: assets/demo.gif (${kb('demo.gif')} KB), screenshot-alert.png, screenshot-summary.png, mood-*.png`);
