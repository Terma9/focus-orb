// Self-made screens for the "vague title" part of the accuracy check: what's on screen is unambiguous,
// but the window title says (almost) nothing. That's where full mode (screenshot) and privacy mode
// (title only) should differ most.
const page = (body, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; font: 15px/1.5 "Segoe UI", system-ui, sans-serif; background: #fafafa; color: #222; }
  .top { height: 48px; background: #fff; border-bottom: 1px solid #ddd; display: flex; align-items: center; padding: 0 20px; gap: 16px; font-weight: 600; }
  .wrap { padding: 24px 40px; } h1 { margin: 0 0 12px; font-size: 26px; } .muted { color: #777; font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; } .card { background: #fff; border: 1px solid #e3e3e3; border-radius: 10px; padding: 12px; }
  .thumb { height: 120px; border-radius: 8px; background: linear-gradient(135deg, #f3c58a, #b97b45); display: grid; place-items: center; font-size: 54px; }
  ${extra}</style></head><body>${body}</body></html>`;

const lorem = (t) => `<p>${t}</p>`;

const SCENES = {
  // ---- work ----
  essay: () => page(`<div class="top">Document</div><div class="wrap" style="max-width:820px;margin:auto;background:#fff;min-height:700px;box-shadow:0 0 0 1px #e5e5e5">
    <h1>3. Carbon pricing as a climate policy instrument</h1>
    ${lorem('Carbon pricing assigns a cost to greenhouse gas emissions, either through a carbon tax or an emissions trading system (ETS). Since the Paris Agreement, more than 70 jurisdictions have introduced some form of carbon pricing, yet the prices remain well below the levels most models consider consistent with limiting warming to 1.5 °C.')}
    ${lorem('This chapter compares the EU ETS with national carbon taxes in Sweden and Canada, focusing on emission reductions, distributional effects and political acceptance. Section 3.2 discusses border carbon adjustments and their compatibility with WTO rules.')}
    ${lorem('Table 3.1 summarises the effective carbon price per tonne of CO₂ in 2023 and the share of national emissions covered.')}</div>`),
  code: () => page(`<div style="display:flex;height:100vh;background:#1e1e2a;color:#d4d4e0;font:14px/1.6 Consolas,monospace">
    <div style="width:220px;background:#191924;padding:14px;color:#9a9ab0">EXPLORER<br>src<br>&nbsp; main.js<br>&nbsp; drift.js<br>&nbsp; orb-window.js</div>
    <pre style="margin:0;padding:16px 22px">const { app, BrowserWindow, screen } = require('electron');

function createOrbWindow() {
  const win = new BrowserWindow({
    width: 124, height: 124,
    transparent: true, frame: false, alwaysOnTop: true,
  });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile('renderer/index.html');
  return win;
}

app.whenReady().then(createOrbWindow);</pre></div>`),
  terminal: () => page(`<pre style="margin:0;height:100vh;background:#0c0c0c;color:#cfcfcf;font:14px/1.5 Consolas,monospace;padding:16px">PS C:\\dev\\focus-orb> npm test

> focus-orb@1.1.0 test
> node --test "test/*.test.js"

✔ a single confident verdict does not alert (1.2ms)
✔ alerts after 2 distracted checks in a row once the grace period has passed (0.8ms)
✔ dismiss gives a 5 s snooze before alerting again (0.7ms)
ℹ tests 52
ℹ pass 52
ℹ fail 0
PS C:\\dev\\focus-orb> npx electron .</pre>`),
  spreadsheet: () => page(`<div class="top">Sheet</div><div class="wrap"><table style="border-collapse:collapse;background:#fff;font-size:14px">
    ${[['Country', 'CO₂ price 2023 (€/t)', 'Coverage', 'Instrument'], ['Sweden', '118', '40 %', 'Carbon tax'], ['Switzerland', '120', '33 %', 'Carbon tax + ETS'], ['EU', '85', '38 %', 'EU ETS'], ['Canada', '47', '22 %', 'Fuel charge'], ['Japan', '2', '75 %', 'Carbon tax']]
      .map((r, i) => `<tr>${r.map((c) => `<td style="border:1px solid #ccc;padding:6px 14px;${i ? '' : 'font-weight:600;background:#eef'}">${c}</td>`).join('')}</tr>`).join('')}</table>
    <p class="muted">Source: World Bank Carbon Pricing Dashboard</p></div>`),
  apidocs: () => page(`<div class="top">Docs</div><div class="wrap" style="max-width:900px"><h1>BrowserWindow</h1>
    <p>Create and control browser windows. Process: Main</p><h3>new BrowserWindow([options])</h3>
    <ul><li><code>transparent</code> boolean - Makes the window transparent.</li><li><code>alwaysOnTop</code> boolean - Whether the window should always stay on top of other windows.</li><li><code>frame</code> boolean - Specify false to create a frameless window.</li></ul>
    <h3>win.setIgnoreMouseEvents(ignore[, options])</h3><p>Makes the window ignore all mouse events. Passing <code>{ forward: true }</code> forwards mouse move messages to Chromium.</p></div>`),
  slides: () => page(`<div class="top">Presentation</div><div style="display:flex;gap:20px;padding:20px"><div style="width:160px;display:flex;flex-direction:column;gap:10px">${[1, 2, 3, 4].map((n) => `<div class="card" style="height:80px;font-size:11px">Slide ${n}</div>`).join('')}</div>
    <div class="card" style="flex:1;height:520px;padding:40px"><h1 style="font-size:38px">Q3 Campaign Results</h1><p style="font-size:20px">• Reach +42 % vs. Q2<br>• Cost per lead down to €3.10<br>• Best channel: LinkedIn ads</p><div style="height:160px;margin-top:20px;background:linear-gradient(90deg,#8b7bff 42%,#ddd 42%);border-radius:8px"></div></div></div>`),

  // ---- distractions ----
  video: () => page(`<div style="background:#0f0f0f;color:#fff;min-height:100vh;padding:20px 40px"><div style="aspect-ratio:16/9;max-width:900px;border-radius:12px;background:#222;display:grid;place-items:center;font-size:150px">🐈</div>
    <h1 style="margin-top:14px">Cats being cats for 10 minutes straight 😹</h1><p class="muted" style="color:#aaa">2.1M views · Funny Pets Daily</p></div>`),
  feed: () => page(`<div class="top">Home</div><div class="wrap" style="max-width:620px;margin:auto">${[
    ['memes_daily', 'when the code works on the first try 😂', '🐸'], ['travelgram', 'Sunset in Bali never gets old 🌅', '🌴'], ['foodie.life', 'Best ramen in town, 10/10 🍜', '🍜']]
    .map(([u, t, e]) => `<div class="card" style="margin-bottom:16px"><b>@${u}</b><div class="thumb" style="height:240px;margin:10px 0">${e}</div>${t}<div class="muted">♥ 12.4k · 💬 381</div></div>`).join('')}</div>`),
  shop: () => page(`<div class="top">Shop</div><div class="wrap"><h1>Sneakers – Sale</h1><div class="grid">${['Air Runner', 'Street Pro', 'Cloud Walk', 'Retro 90', 'Court Low', 'Trail X', 'Skate One', 'City Flex']
    .map((n, i) => `<div class="card"><div class="thumb">👟</div><b>${n}</b><div>€${79 + i * 10},99 <span class="muted"><s>€${129 + i * 10},99</s></span></div><button>Add to cart</button></div>`).join('')}</div></div>`),
  game: () => page(`<div style="background:#2b2b2b;min-height:100vh;display:flex;align-items:center;justify-content:center;gap:40px;color:#eee">
    <div style="display:grid;grid-template-columns:repeat(8,60px)">${Array.from({ length: 64 }, (_, i) => `<div style="height:60px;background:${(Math.floor(i / 8) + i) % 2 ? '#769656' : '#eeeed2'};display:grid;place-items:center;font-size:40px">${'♜♞♝♛♚♝♞♜'[i] || (i > 7 && i < 16 ? '♟' : i > 47 && i < 56 ? '♙' : i > 55 ? '♖♘♗♕♔♗♘♖'[i - 56] : '')}</div>`).join('')}</div>
    <div style="font-size:22px">Blitz 3+0<br><br>Your move · 2:41<br><br>Opponent: magnus_fan99 (1840)</div></div>`),
  sports: () => page(`<div class="top">Live</div><div class="wrap"><h1>Champions League – Live scores</h1>${[['Real Madrid', '2 : 1', 'Bayern', "78'"], ['Arsenal', '0 : 0', 'Inter', "34'"], ['PSG', '3 : 2', 'Dortmund', 'FT']]
    .map(([a, s, b, t]) => `<div class="card" style="margin:10px 0;display:flex;justify-content:space-between;font-size:20px"><span>${a}</span><b>${s}</b><span>${b}</span><span class="muted">${t}</span></div>`).join('')}</div>`),
  chat: () => page(`<div style="display:flex;height:100vh"><div style="width:280px;background:#fff;border-right:1px solid #ddd;padding:12px">Chats<br><br><b>Lena</b><br><span class="muted">haha yes!! saturday?</span><br><br><b>Family</b><br><span class="muted">Mom: dinner at 7</span></div>
    <div style="flex:1;background:#efeae2;padding:20px;display:flex;flex-direction:column;gap:10px">${[['l', 'did you see the new episode??'], ['r', 'noo dont spoil it 😭'], ['l', 'ok ok but the ending 🤯'], ['r', 'watching it tonight, then party on saturday?'], ['l', 'haha yes!! saturday?']]
    .map(([s, t]) => `<div style="align-self:${s === 'l' ? 'flex-start' : 'flex-end'};background:${s === 'l' ? '#fff' : '#d9fdd3'};padding:8px 12px;border-radius:8px;max-width:60%">${t}</div>`).join('')}</div></div>`),
};

module.exports = { SCENES };
