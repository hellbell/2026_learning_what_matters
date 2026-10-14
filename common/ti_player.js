/* Token Inoculation animation player (from Token_Inoculation_Animation.html, scoped to ti-* ids).
   Captions, timing and numbers live in the CONFIG / DATA blocks below. */
(function(){
'use strict';
/* ==========================================================================
   TOKEN INOCULATION · animated explainer (Figure 1, four steps)
   --------------------------------------------------------------------------
   1. CONFIG   timing, fonts, default language
   2. C        every color painted on the canvas
   3. DATA     numbers quoted from the paper
   4. helpers  drawing primitives (text, pill, robot, bubble, ...)
   5. SCENES   one object per chapter: duration, title, captions, text, draw(t)
   6. player   playback, scrubbing, chapters, language, export hook
   The canvas is a fixed 1920×1080 coordinate space. draw(t) is a pure
   function of the scene-local time t (seconds).
   ========================================================================== */

/* ---------- 1. CONFIG ---------- */
const W = 1920, H = 1080;
const CONFIG = {
  fade: 0.35,          // seconds of fade at each scene boundary
  captionFade: 0.3,    // seconds to crossfade captions
  posterTime: 3.9,     // frame shown before the first play (intro fully drawn)
  lang: 'en',          // 'en' | 'ko'
  font: {
    sans: '"IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
  },
};

/* ---------- 2. PALETTE ---------- */
const C = {
  bg:'#F4F6F8', band:'#E8ECF0', card:'#FFFFFF',
  ink:'#16202B', muted:'#5D6977', faint:'#A6B0BB', line:'#D3DAE1', track:'#E4E9EE',
  benign:'#23825F', benignFill:'#E2F2EB', benignSoft:'#A9D6C3',
  hazard:'#C43D35', hazardFill:'#FBE7E4', hazardSoft:'#EDB0AA',
  overlap:'#F0E2D4', overlapInk:'#6E4B2C',
  ino:'#F4C04A', inoEdge:'#C9921A', inoInk:'#3F2C00',
  ours:'#E2711D', model:'#22395A', modelSoft:'#DCE4EE',
  refuseFill:'#EDF0F3', gray:'#8C97A4',
};

/* ---------- 3. DATA (from the paper) ---------- */
const DATA = {
  // Table 1, Qwen2.5-14B. w = WMDP-Bio accuracy, m = MMLU weighted avg (Biology, Virology, NonSTEM)
  pareto: [
    { name:'Instruct',          w:79.2, m:79.7, shape:'diamond',  color:'#16202B' },
    { name:'NPO',               w:44.8, m:50.3, shape:'square',   color:'#4F7CAC' },
    { name:'DPO',               w:37.5, m:44.9, shape:'plus',     color:'#9466B0' },
    { name:'Vanilla Refusal',   w:1.9,  m:47.9, shape:'tridown',  color:'#8C97A4' },
    { name:'RMU',               w:22.9, m:72.7, shape:'triup',    color:'#C79A55' },
    { name:'Token Inoculation', w:17.9, m:74.2, shape:'star',     color:'#E2711D', ours:true },
  ],
  sft: { retain:7089, inoculation:2000, refusal:500 },                 // Appendix G
  cpt: { markedPct:'40.5%', threshold:0.15 },                          // Appendix G
  boundary: { total:166, vanilla:97, ino:33 },                         // Figure 3a
  serving: { nonstem:'89.2%', hazRefused:'86.3%', shield:'97.3%' },    // Table B
  stats: { suf1:'0.831', wmdp:'79.2% → 17.9%', mmluKept:'93%', xstest:'6.0% vs 14.4%' },
};

/* ---------- 4. HELPERS ---------- */
const cv = document.getElementById('ti-cv');
if (!cv) return;   // the slide is left out, as on the public site (it is data-skip)
const ctx = cv.getContext('2d');
let LANG = CONFIG.lang;
const TOK = '<|ino|>';

const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, k) => a + (b - a) * k;
const E = {
  lin: k => k,
  out: k => 1 - Math.pow(1 - k, 3),
  inOut: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  back: k => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
};
/** eased progress of t through [start, start+dur] */
const P = (t, start, dur, fn = E.out) => fn(clamp((t - start) / dur));
/** pop-in scale with overshoot */
const POP = (t, start, dur = 0.4) => t < start ? 0 : E.back(clamp((t - start) / dur));
/** visible between a and b with fades of f seconds */
const WIN = (t, a, b, f = 0.4) => Math.min(clamp((t - a) / f), clamp((b - t) / f));
const tr = obj => { const o = {}; for (const [k, v] of Object.entries(obj || {})) o[k] = (v && typeof v === 'object' && !Array.isArray(v) && ('en' in v)) ? (v[LANG] ?? v.en) : v; return o; };

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function F(size, weight = 400, fam = 'sans') { ctx.font = `${weight} ${size}px ${CONFIG.font[fam]}`; }
function text(s, x, y, o = {}) {
  const { size = 24, weight = 400, fam = 'sans', color = C.ink, align = 'left', base = 'middle', alpha = 1 } = o;
  if (!s || alpha <= 0) return 0;
  ctx.save(); ctx.globalAlpha *= alpha; F(size, weight, fam);
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  ctx.fillText(s, x, y); const w = ctx.measureText(s).width; ctx.restore(); return w;
}
function measure(s, size, weight = 400, fam = 'sans') { F(size, weight, fam); return ctx.measureText(s).width; }

function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function box(x, y, w, h, r, o = {}) {
  const { fill, stroke, lw = 2, dash, alpha = 1, shadow } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  if (shadow) { ctx.shadowColor = 'rgba(22,32,43,0.10)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10; }
  rr(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.shadowColor = 'transparent';
  if (stroke) { ctx.setLineDash(dash || []); ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  ctx.restore();
}
function dot(x, y, r, fill, alpha = 1) { if (alpha <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.restore(); }
function ring(x, y, r, color, lw = 2, alpha = 1) { if (alpha <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke(); ctx.restore(); }

function bez(x1, y1, x2, y2, k) {
  const dx = (x2 - x1) * 0.5, a = [x1, y1], b = [x1 + dx, y1], c = [x2 - dx, y2], d = [x2, y2], u = 1 - k;
  return { x: u*u*u*a[0] + 3*u*u*k*b[0] + 3*u*k*k*c[0] + k*k*k*d[0], y: u*u*u*a[1] + 3*u*u*k*b[1] + 3*u*k*k*c[1] + k*k*k*d[1] };
}
function arrowHead(x, y, ang, size, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-size, -size * 0.55); ctx.lineTo(-size, size * 0.55); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.restore();
}
/** S-curve between two points, drawn up to `progress` */
function curve(x1, y1, x2, y2, o = {}) {
  const { color = C.faint, lw = 2.5, progress = 1, alpha = 1, dash, head = false } = o;
  if (progress <= 0 || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); const n = 40;
  for (let i = 0; i <= n; i++) { const p = bez(x1, y1, x2, y2, progress * i / n); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
  ctx.stroke(); ctx.setLineDash([]);
  if (head && progress > 0.97) { const a = bez(x1, y1, x2, y2, 0.96), b = bez(x1, y1, x2, y2, 1); arrowHead(b.x, b.y, Math.atan2(b.y - a.y, b.x - a.x), lw * 4, color); }
  ctx.restore();
}
/** straight arrow drawn up to `progress` */
function arrow(x1, y1, x2, y2, o = {}) {
  const { color = C.muted, lw = 3, progress = 1, alpha = 1, dash, head = 13 } = o;
  if (progress <= 0 || alpha <= 0) return;
  const x = lerp(x1, x2, progress), y = lerp(y1, y2, progress);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
  if (head) arrowHead(x, y, Math.atan2(y2 - y1, x2 - x1), head, color);
  ctx.restore();
}

/** the <|ino|> token as a highlighted pill, centered on (cx, cy) */
function pillW(size, label = TOK) { F(size, 600, 'mono'); return ctx.measureText(label).width + size * 0.9; }
function pill(cx, cy, o = {}) {
  const { size = 24, alpha = 1, scale = 1, label = TOK, glow = 0, ghost = false, strike = 0 } = o;
  if (alpha <= 0 || scale <= 0) return;
  F(size, 600, 'mono');
  const w = ctx.measureText(label).width + size * 0.9, h = size * 1.5;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.scale(scale, scale);
  if (glow > 0) { ctx.shadowColor = 'rgba(244,192,74,0.95)'; ctx.shadowBlur = 40 * glow; }
  rr(-w / 2, -h / 2, w, h, h * 0.3);
  ctx.fillStyle = ghost ? '#FFFFFF' : C.ino; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = 2; ctx.strokeStyle = ghost ? C.faint : C.inoEdge; if (ghost) ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
  F(size, 600, 'mono'); ctx.fillStyle = ghost ? C.muted : C.inoInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, size * 0.04);
  if (strike > 0) { ctx.strokeStyle = C.hazard; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-w / 2 - 6, 0); ctx.lineTo(-w / 2 - 6 + (w + 12) * strike, 0); ctx.stroke(); }
  ctx.restore();
}

/* rich text: wraps words and renders any "<|ino|>" as an inline pill */
function splitTok(w) { const i = w.indexOf(TOK); return i < 0 ? null : [w.slice(0, i), w.slice(i + TOK.length)]; }
function wordWidth(w, size, weight, fam) {
  const sp = splitTok(w); F(size, weight, fam);
  if (!sp) return ctx.measureText(w).width;
  const a = ctx.measureText(sp[0]).width, b = ctx.measureText(sp[1]).width;
  return a + b + pillW(size * 0.8) + (sp[0] ? 5 : 0) + (sp[1] ? 5 : 0);
}
function richLines(s, maxW, size, weight = 400, fam = 'sans') {
  const out = [];
  for (const par of String(s).split('\n')) {
    const words = par.split(' ').filter(Boolean); let line = [], lw = 0;
    F(size, weight, fam); const sp = ctx.measureText(' ').width;
    for (const w of words) {
      const ww = wordWidth(w, size, weight, fam), add = line.length ? sp + ww : ww;
      if (line.length && lw + add > maxW) { out.push(line); line = [w]; lw = ww; } else { line.push(w); lw += add; }
    }
    out.push(line);
  }
  return out;
}
/** paragraph with wrapping; y is the middle of the first line; returns block height */
function para(s, x, y, maxW, o = {}) {
  const { size = 24, weight = 400, fam = 'sans', lh = 1.38, align = 'left', color = C.ink, alpha = 1, ghost = false } = o;
  if (!s || alpha <= 0) return 0;
  const L = richLines(s, maxW, size, weight, fam);
  F(size, weight, fam); const sp = ctx.measureText(' ').width;
  L.forEach((ws, i) => {
    const widths = ws.map(w => wordWidth(w, size, weight, fam));
    const tot = widths.reduce((a, b) => a + b, 0) + sp * Math.max(0, ws.length - 1);
    let cx = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x;
    const yy = y + i * size * lh;
    ws.forEach((w, j) => {
      const s2 = splitTok(w);
      if (!s2) text(w, cx, yy, { size, weight, fam, color, alpha });
      else {
        let xx = cx;
        if (s2[0]) xx += text(s2[0], xx, yy, { size, weight, fam, color, alpha }) + 5;
        const pw = pillW(size * 0.8); pill(xx + pw / 2, yy, { size: size * 0.8, alpha, ghost }); xx += pw;
        if (s2[1]) text(s2[1], xx + 5, yy, { size, weight, fam, color, alpha });
      }
      cx += widths[j] + sp;
    });
  });
  return L.length * size * lh;
}
const nLines = (s, maxW, size, weight = 400, fam = 'sans') => richLines(s, maxW, size, weight, fam).length;

/** model icon: a small robot head */
function robot(cx, cy, s, o = {}) {
  const { mood = 'neutral', scale = 1, alpha = 1, body = C.model } = o;
  if (scale <= 0 || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.scale(scale, scale);
  const w = s, h = s * 0.78, r = s * 0.2;
  ctx.fillStyle = body; ctx.strokeStyle = body; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(0, -h / 2 - s * 0.15); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -h / 2 - s * 0.19, s * 0.07, 0, Math.PI * 2); ctx.fillStyle = C.ino; ctx.fill();
  ctx.fillStyle = body;
  rr(-w / 2 - s * 0.07, -s * 0.13, s * 0.1, s * 0.26, s * 0.04); ctx.fill();
  rr(w / 2 - s * 0.03, -s * 0.13, s * 0.1, s * 0.26, s * 0.04); ctx.fill();
  rr(-w / 2, -h / 2, w, h, r); ctx.fill();
  const fi = s * 0.09; rr(-w / 2 + fi, -h / 2 + fi, w - 2 * fi, h - 2 * fi, r * 0.7); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.fillStyle = body; ctx.lineWidth = s * 0.045;
  const ex = s * 0.17, ey = -s * 0.05, er = s * 0.065;
  if (mood === 'confused') {
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * ex, ey, er * 1.05, 0.25 * Math.PI, 1.85 * Math.PI); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-s * 0.13, s * 0.17); ctx.lineTo(-s * 0.045, s * 0.12); ctx.lineTo(s * 0.045, s * 0.17); ctx.lineTo(s * 0.13, s * 0.12); ctx.stroke();
  } else {
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * ex, ey, er, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath();
    if (mood === 'happy') ctx.arc(0, s * 0.06, s * 0.12, 0.18 * Math.PI, 0.82 * Math.PI);
    else { ctx.moveTo(-s * 0.1, s * 0.16); ctx.lineTo(s * 0.1, s * 0.16); }
    ctx.stroke();
  }
  ctx.restore();
}
function person(cx, cy, s, color = C.muted, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx, cy - s * 0.24, s * 0.21, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.4, s * 0.38, s * 0.34, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
}
/** question chip: green = benign, red = hazardous */
function qchip(cx, cy, kind, o = {}) {
  const { s = 46, scale = 1, alpha = 1 } = o;
  if (scale <= 0 || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.scale(scale, scale);
  rr(-s / 2, -s / 2, s, s, s * 0.24); ctx.fillStyle = kind === 'hazard' ? C.hazard : C.benign; ctx.fill();
  ctx.restore();
  text('Q', cx, cy + 1, { size: s * 0.5 * scale, weight: 700, color: '#FFFFFF', align: 'center', alpha });
}
/** check (ok) or cross mark */
function mark(cx, cy, ok, o = {}) {
  const { r = 17, scale = 1, alpha = 1 } = o;
  if (scale <= 0 || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.scale(scale, scale);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = ok ? C.benign : C.hazard; ctx.fill();
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  if (ok) { ctx.moveTo(-r * 0.42, 0.02 * r); ctx.lineTo(-r * 0.1, r * 0.32); ctx.lineTo(r * 0.45, -r * 0.32); }
  else { ctx.moveTo(-r * 0.36, -r * 0.36); ctx.lineTo(r * 0.36, r * 0.36); ctx.moveTo(r * 0.36, -r * 0.36); ctx.lineTo(-r * 0.36, r * 0.36); }
  ctx.stroke(); ctx.restore();
}
/** speech bubble with a left tail and wrapped text inside */
function bubble(x, y, w, h, o = {}) {
  const { fill = C.card, stroke = C.line, dash, alpha = 1, dx = 0, text: s, tsize = 21, tcolor = C.ink, tweight = 400, lw = 2, ghost = false } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(dx, 0);
  ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x + 2, y + h / 2 - 9); ctx.lineTo(x - 11, y + h / 2); ctx.lineTo(x + 2, y + h / 2 + 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  rr(x, y, w, h, 12); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x + lw, y + h / 2 - 8); ctx.lineTo(x - 8, y + h / 2); ctx.lineTo(x + lw, y + h / 2 + 8); ctx.closePath(); ctx.fill();
  if (s) { const n = nLines(s, w - 36, tsize, tweight); para(s, x + 18, y + h / 2 - (n - 1) * tsize * 1.3 / 2, w - 36, { size: tsize, weight: tweight, color: tcolor, lh: 1.3, ghost }); }
  ctx.restore();
}
/** chart markers */
function marker(shape, x, y, r, color, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.strokeStyle = color; ctx.beginPath();
  if (shape === 'diamond') { ctx.moveTo(x, y - r * 1.25); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.25); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); }
  else if (shape === 'square') { ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7); ctx.fill(); }
  else if (shape === 'plus') { ctx.lineWidth = r * 0.55; ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); }
  else if (shape === 'triup') { ctx.moveTo(x, y - r * 1.1); ctx.lineTo(x + r, y + r * 0.75); ctx.lineTo(x - r, y + r * 0.75); ctx.closePath(); ctx.fill(); }
  else if (shape === 'tridown') { ctx.moveTo(x, y + r * 1.1); ctx.lineTo(x + r, y - r * 0.75); ctx.lineTo(x - r, y - r * 0.75); ctx.closePath(); ctx.fill(); }
  else if (shape === 'star') {
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; i ? ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad) : ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
  } else { ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

/* precomputed point clouds (seeded, so every render is identical) */
const CLOUD = (() => {
  const r = rng(11), g = [], h = [];
  for (let i = 0; i < 110; i++) g.push({ x: -0.55 + gauss(r) * 0.6, y: 0.42 + gauss(r) * 0.5 });
  for (let i = 0; i < 120; i++) h.push({ x: 0.62 + gauss(r) * 0.5, y: -0.42 + gauss(r) * 0.42 });
  const proj = (p, th) => p.x * Math.cos(th) + p.y * Math.sin(th);
  const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
  const thV = 0, thI = Math.atan2(-0.62, 1);
  const cV = q(g.map(p => proj(p, thV)), 1 - DATA.boundary.vanilla / DATA.boundary.total);
  const cI = q(g.map(p => proj(p, thI)), 1 - DATA.boundary.ino / DATA.boundary.total);
  const r2 = rng(5), map = { benign: [], hazard: [], general: [] };
  for (let i = 0; i < 38; i++) map.benign.push({ x: 1140 + gauss(r2) * 72, y: 610 + gauss(r2) * 58 });
  for (let i = 0; i < 34; i++) map.hazard.push({ x: 1600 + gauss(r2) * 62, y: 440 + gauss(r2) * 52 });
  for (let i = 0; i < 30; i++) map.general.push({ x: 940 + r2() * 860, y: 280 + r2() * 560 });
  return { g, h, proj, thV, thI, cV, cI, map };
})();
function clipHalf(poly, th, c) {
  const out = [], f = p => p.x * Math.cos(th) + p.y * Math.sin(th) - c;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const k = fa / (fa - fb); out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, edge: true }); }
  }
  return out;
}

/* ---------- 5. SCENES ---------- */
const SCENES = [

/* ===== INTRO ===== */
{
  id: 'intro', nav: { en: 'Intro', ko: '인트로' }, duration: 4.5,
  text: {
    eyebrow: 'NAVER AI LAB',
    l1: { en: 'Mark,', ko: 'Mark,' }, l2: { en: "Don't Erase", ko: "Don't Erase" },
    sub: 'Token Inoculation for Dual-Use Knowledge in LLMs',
    authors: 'Seunghyun Lee, Dongyoon Han, Sangdoo Yun',
    tagline: { en: '', ko: '지우지 말고, 표시하라' },
  },
  captions: [],
  draw(t) {
    const X = tr(this.text);
    // ambient corpus on the right: sentence bars, some get marked
    const r = rng(3);
    for (let i = 0; i < 14; i++) {
      const y = 236 + i * 44, marked = r() < 0.42, a = P(t, 0.1 + i * 0.05, 0.5) * 0.9;
      let x = 1250; const k = P(t, 1.5 + i * 0.12, 0.35);
      if (marked) { box(x, y - 9, 40, 18, 6, { fill: C.ino, alpha: k }); }
      x += 52;
      while (x < 1790) { const w = 40 + r() * 120; if (x + w > 1800) break; box(x, y - 6, w, 12, 6, { fill: marked && k > 0 ? C.hazardSoft : C.line, alpha: a * (marked ? lerp(1, 0.9, k) : 1) }); x += w + 12; }
    }
    text(X.eyebrow, 160, 300, { size: 22, weight: 500, fam: 'mono', color: C.muted, alpha: P(t, 0, 0.5) });
    const pw = pillW(56) + 30, sh = pw * E.inOut(clamp((t - 1.1) / 0.6));
    text(X.l1, 160 + sh, 425, { size: 132, weight: 700, alpha: P(t, 0.1, 0.5) });
    pill(160 + (pw - 30) / 2, 428, { size: 56, scale: POP(t, 1.35, 0.5), glow: 1 - clamp((t - 1.35) / 1.4) });
    text(X.l2, 160, 565, { size: 132, weight: 700, alpha: P(t, 0.35, 0.5) });
    text(X.sub, 160, 688, { size: 40, weight: 500, alpha: P(t, 0.8, 0.5) });
    text(X.authors, 160, 750, { size: 26, color: C.muted, alpha: P(t, 1.0, 0.5) });
    if (X.tagline) text(X.tagline, 160, 812, { size: 30, weight: 600, color: C.ours, alpha: P(t, 1.3, 0.5) });
  },
},

/* ===== 1. THE DUAL-USE PROBLEM ===== */
{
  id: 'dual-use', chapter: 1, nav: { en: 'Dual-use problem', ko: '듀얼유즈 문제' }, duration: 15,
  title: { en: 'The dual-use problem', ko: '듀얼유즈 문제' },
  text: {
    domain: { en: 'Dual-use domain', ko: '듀얼유즈 도메인' },
    domainSub: { en: 'clinical virology ⇔ viral manipulation', ko: '임상 바이러스학 ⇔ 바이러스 조작' },
    benign: { en: 'Benign', ko: '유익한 지식' }, benignSub: { en: 'clinical virology\nvaccines, diagnosis', ko: '임상 바이러스학\n백신, 진단' },
    hazard: { en: 'Hazardous', ko: '위험한 지식' }, hazardSub: { en: 'viral manipulation\nengineering, misuse', ko: '바이러스 조작\n조작 기술, 악용' },
    shared: ['virus', 'vector', 'protein', 'replication', 'host cell', 'genome'],
    legB: { en: 'benign question', ko: '무해한 질문' }, legH: { en: 'hazardous question', ko: '위험한 질문' },
    r1: { en: 'Trained to refuse', ko: '거절 학습 (refusal training)' },
    r2: { en: 'Trained to unlearn', ko: '언러닝 (unlearning)' },
    r3: { en: 'Trained to refuse + predict the hazardous answer', ko: '거절 + 위험한 답 예측을 함께 학습' },
    oursTag: ' (Ours)',
    refuse: { en: "I can't help with that.", ko: '도와드릴 수 없습니다.' },
    unsureB: { en: 'Hmm… maybe B?', ko: '음… B인가요?' }, unsureH: { en: 'Hmm… maybe D?', ko: '음… D인가요?' },
    helpful: { en: "Sure. Here's how it works…", ko: '네, 원리는 이렇습니다…' },
    o1: { en: 'Over-refusal', ko: '과잉 거절' }, o1s: { en: 'benign questions refused too', ko: '무해한 질문까지 거절' },
    o2: { en: 'Utility trade-off', ko: '유용성 손실' }, o2s: { en: 'adjacent knowledge erased', ko: '인접 지식까지 지워짐' },
    o3: { en: 'Selective refusal', ko: '선택적 거절' }, o3s: { en: 'refuses only the hazardous side', ko: '위험한 쪽만 거절' },
  },
  captions: [
    { at: 0,    en: 'In a dual-use field, hazardous and benign knowledge share vocabulary, concepts and causal structure.', ko: '듀얼유즈 분야에서는 위험한 지식과 유익한 지식이 어휘, 개념, 인과 구조를 공유합니다.' },
    { at: 4.8,  en: 'Refusal training learns surface cues, so it refuses benign questions too.', ko: '거절 학습은 표면적인 단서를 배우기 때문에 무해한 질문까지 거절합니다.' },
    { at: 7.6,  en: 'Unlearning damages entangled representations and trades away utility.', ko: '언러닝은 얽혀 있는 표현을 손상시켜 유용성을 잃습니다.' },
    { at: 10.4, en: 'Token Inoculation trains the refusal together with the hazardous answer, and the refusal becomes selective.', ko: 'Token Inoculation은 거절과 위험한 답의 예측을 함께 학습해 선택적으로 거절합니다.' },
  ],
  draw(t) {
    const X = tr(this.text);
    // --- Venn of the dual-use domain, then it moves left
    const mv = E.inOut(clamp((t - 3.9) / 1.1));
    const cx = lerp(960, 410, mv), cy = lerp(525, 545, mv), s = lerp(1, 0.74, mv);
    const a0 = P(t, 0, 0.8);
    ctx.save(); ctx.globalAlpha *= a0;
    text(X.domain, cx, cy - 292 * s, { size: 32 * s, weight: 700, align: 'center' });
    text(X.domainSub, cx, cy - 252 * s, { size: 22 * s, color: C.muted, align: 'center' });
    const ox = 165 * s, rx = 290 * s, ry = 215 * s;
    const ell = (x) => { ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2); };
    ell(cx - ox); ctx.fillStyle = C.benignFill; ctx.fill();
    ell(cx + ox); ctx.fillStyle = C.hazardFill; ctx.fill();
    ctx.save(); ell(cx - ox); ctx.clip(); ell(cx + ox); ctx.fillStyle = C.overlap; ctx.fill(); ctx.restore();
    ctx.lineWidth = 2.5; ell(cx - ox); ctx.strokeStyle = C.benign; ctx.stroke(); ell(cx + ox); ctx.strokeStyle = C.hazard; ctx.stroke();
    text(X.benign, cx - 295 * s, cy - 48 * s, { size: 30 * s, weight: 700, color: C.benign, align: 'center' });
    para(X.benignSub, cx - 295 * s, cy - 2 * s, 320 * s, { size: 20 * s, color: C.muted, align: 'center', lh: 1.45 });
    text(X.hazard, cx + 295 * s, cy - 48 * s, { size: 30 * s, weight: 700, color: C.hazard, align: 'center' });
    para(X.hazardSub, cx + 295 * s, cy - 2 * s, 320 * s, { size: 20 * s, color: C.muted, align: 'center', lh: 1.45 });
    X.shared.forEach((w, i) => { const k = P(t, 1.0 + i * 0.28, 0.4); text(w, cx, cy + (i - 2.5) * 40 * s + (1 - k) * 10, { size: 21 * s, weight: 600, color: C.overlapInk, align: 'center', alpha: k }); });
    ctx.restore();

    // --- legend
    const lg = P(t, 4.8, 0.5);
    if (lg > 0) {
      let x = 1330;
      qchip(x, 152, 'benign', { s: 24, alpha: lg }); text(X.legB, x + 20, 153, { size: 19, color: C.muted, alpha: lg });
      x += 40 + measure(X.legB, 19) + 30;
      qchip(x, 152, 'hazard', { s: 24, alpha: lg }); text(X.legH, x + 20, 153, { size: 19, color: C.muted, alpha: lg });
    }

    // --- three training regimes (Figure 1, left)
    const styles = {
      refuse: { fill: C.refuseFill, stroke: C.line, tcolor: C.muted },
      unsure: { fill: C.card, stroke: C.line, tcolor: C.muted, dash: [7, 5] },
      help:   { fill: C.benignFill, stroke: C.benignSoft, tcolor: C.ink },
    };
    const R = [
      { head: X.r1, mood: 'neutral', outs: [{ k: 'benign', s: X.refuse, st: 'refuse', ok: false }, { k: 'hazard', s: X.refuse, st: 'refuse', ok: true }], o: X.o1, os: X.o1s, col: C.hazard },
      { head: X.r2, mood: 'confused', outs: [{ k: 'benign', s: X.unsureB, st: 'unsure', ok: false }, { k: 'hazard', s: X.unsureH, st: 'unsure', ok: true }], o: X.o2, os: X.o2s, col: C.hazard },
      { head: X.r3, mood: 'happy', ours: true, outs: [{ k: 'benign', s: X.helpful, st: 'help', ok: true }, { k: 'hazard', s: X.refuse, st: 'refuse', ok: true }], o: X.o3, os: X.o3s, col: C.ours },
    ];
    const T0 = [4.9, 7.7, 10.5], Y0 = [190, 425, 660];
    R.forEach((r, i) => {
      const u = t - T0[i]; if (u < 0) return;
      const y0 = Y0[i], ry = y0 + 124, by = [y0 + 86, y0 + 162];
      if (r.ours) box(800, y0 - 8, 1040, 222, 18, { fill: 'rgba(226,113,29,0.07)', stroke: C.ours, lw: 2.5, alpha: P(u, 2.0, 0.5) });
      const ha = P(u, 0, 0.4);
      const hw = text(r.head, 822, y0 + 20, { size: 24, weight: 600, alpha: ha });
      if (r.ours) text(X.oursTag, 822 + hw, y0 + 20, { size: 24, weight: 700, color: C.ours, alpha: ha });
      robot(965, ry, 90, { mood: r.mood, scale: POP(u, 0, 0.45) });
      if (r.mood === 'confused') text('?', 1022, ry - 52, { size: 40, weight: 700, color: C.hazard, alpha: P(u, 0.4, 0.3) });
      r.outs.forEach((o, j) => {
        const yy = by[j];
        qchip(852, yy, o.k, { scale: POP(u, 0.3 + j * 0.08, 0.35) });
        curve(878, yy, 914, ry, { color: C.faint, lw: 3, progress: P(u, 0.5, 0.3) });
        curve(1016, ry, 1054, yy, { color: C.faint, lw: 3, progress: P(u, 0.8, 0.25) });
        const pk = P(u, 0.95 + j * 0.15, 0.35);
        bubble(1064, yy - 27, 346, 54, { ...styles[o.st], alpha: pk, dx: (1 - pk) * -12, text: o.s, tsize: 21 });
        mark(1444, yy, o.ok, { scale: POP(u, 1.35 + j * 0.15, 0.3) });
      });
      const ok = P(u, 1.7, 0.5);
      text(r.o, 1492 + (1 - ok) * 14, y0 + 108, { size: 34, weight: 700, color: r.col, alpha: ok });
      text(r.os, 1492 + (1 - ok) * 14, y0 + 148, { size: 21, color: C.muted, alpha: ok });
    });
  },
},

/* ===== 2. inoCPT ===== */
{
  id: 'inocpt', chapter: 2, nav: { en: 'inoCPT', ko: 'inoCPT' }, duration: 15,
  title: { en: 'inoCPT: mark hazardous sentences', ko: 'inoCPT: 위험한 문장에 표시하기' },
  text: {
    docEyebrow: 'WMDP BIO-FORGET CORPUS',
    docTitle: 'EBV-specific adoptive immunotherapy for progressive MS',
    scoreHead: 'HAZARD SCORE',
    sentences: [
      { s: 'Infection with Epstein–Barr virus (EBV) has a role in the pathogenesis of multiple sclerosis (MS).', score: -0.12 },
      { s: 'Patients with MS have a decreased frequency of CD8+ T cells reactive to their own EBV-infected B cells.', score: -0.04 },
      { s: 'AdE1-LMPpoly is a novel recombinant adenovirus vector encoding multiple CD8+ T-cell epitopes from three EBV latent proteins.', score: 0.41 },
      { s: 'Adoptive immunotherapy with autologous T cells increases survival in patients with metastatic nasopharyngeal carcinoma.', score: 0.08 },
      { s: 'These effects can be explained by the killing of EBV-infected B cells in the CNS by the transferred CD8+ T cells.', score: 0.22 },
      { s: 'A clinical trial is needed to determine therapeutic efficacy across the clinical spectrum of MS.', score: -0.19 },
    ],
    axisTitle: { en: 'Hazard axis', ko: 'Hazard 축' },
    axisSub: { en: 'sentence-embedding direction from clinical keywords to manipulation keywords', ko: '임상 키워드 → 조작 키워드 방향의 문장 임베딩 축' },
    clinical: { en: 'clinical', ko: '임상' }, manip: { en: 'manipulation', ko: '조작' },
    kwL: ['patient, cohort, clinical trial', 'survival rate, diagnosis'],
    kwR: ['recombinant, vector, construct', 'transfection, CRISPR'],
    stat1: { en: 'of bio-forget sentences marked at t = 0.15', ko: 'bio-forget 문장 중 표시된 비율 (t = 0.15)' },
    stat2n: '5,000 + 10,000',
    stat2: { en: 'bio-forget documents + WikiText-2 documents for general retention', ko: 'bio-forget 문서 + 일반 지식 유지를 위한 WikiText-2 문서' },
    cpt: { en: 'Continued pre-training', ko: '연속 사전학습 (CPT)' },
    cptSub: { en: 'marked bio-forget + general text', ko: '표시된 bio-forget + 일반 텍스트' },
    mapTitle: { en: 'Representation space', ko: '표현 공간' },
    mapB: { en: 'benign biology', ko: '유익한 생물학' }, mapH: { en: 'hazardous manipulation', ko: '위험한 조작' }, mapG: { en: 'general text', ko: '일반 텍스트' },
    init: { en: 'at init: no meaning', ko: '초기: 의미 없음' },
    bound: { en: 'bound to the hazardous region', ko: '위험 영역에 결합' },
  },
  captions: [
    { at: 0,    en: 'Step 1, inoCPT: every sentence of the hazardous corpus gets a hazard score.', ko: '1단계 inoCPT: 위험 코퍼스의 모든 문장에 hazard score를 매깁니다.' },
    { at: 2.2,  en: 'Sentences above the threshold get <|ino|> in front. Adjacent clinical sentences stay unmarked.', ko: '임계값을 넘는 문장 앞에만 <|ino|>를 붙이고, 인접한 임상 문장은 그대로 둡니다.' },
    { at: 7.0,  en: '40.5% of bio-forget sentences are marked, mixed with general text to keep knowledge broad.', ko: 'bio-forget 문장의 40.5%가 표시되며, 일반 텍스트와 섞어 폭넓은 지식을 유지합니다.' },
    { at: 10.6, en: '<|ino|> means nothing at first. Continued pre-training binds it to the hazardous part of the domain.', ko: '<|ino|>는 처음엔 아무 의미가 없지만, 연속 사전학습을 거치며 도메인의 위험한 부분에 결합됩니다.' },
  ],
  draw(t) {
    const X = tr(this.text), thr = DATA.cpt.threshold;
    const norm = s => clamp((s + 0.3) / 0.8);
    const fA = 1 - P(t, 10.2, 0.6, E.inOut);
    if (fA > 0) {
      ctx.save(); ctx.globalAlpha *= fA;
      const a = P(t, 0, 0.7);
      // document card
      box(96, 168 + (1 - a) * 20, 1010, 732, 18, { fill: C.card, stroke: C.line, alpha: a, shadow: true });
      text(X.docEyebrow, 136, 206, { size: 16, weight: 500, fam: 'mono', color: C.muted, alpha: a });
      text(X.scoreHead, 1070, 206, { size: 15, weight: 500, fam: 'mono', color: C.muted, align: 'right', alpha: a });
      text(X.docTitle, 136, 244, { size: 25, weight: 700, alpha: a });
      box(136, 272, 930, 1.5, 0, { fill: C.line, alpha: a });
      const size = 21, lh = 30;
      let y = 314;
      X.sentences.forEach((o, i) => {
        const L = richLines(o.s, 650, size).map(ws => ws.join(' '));
        const hgt = L.length * lh, ts = 1.6 + i * 0.82, marked = o.score >= thr;
        const top = y - lh / 2 - 6;
        const sc = WIN(t, ts - 0.05, ts + 0.75, 0.15);
        if (sc > 0) box(112, top - 4, 978, hgt + 20, 8, { fill: 'rgba(34,57,90,0.06)', alpha: sc });
        if (marked) box(230, top, 676, hgt + 12, 8, { fill: C.hazardFill, alpha: P(t, ts + 0.45, 0.4) });
        const k = P(t, ts + 0.1, 0.4);
        L.forEach((l, j) => {
          text(l, 244, y + j * lh, { size, color: C.faint, alpha: a * (1 - k) });
          text(l, 244, y + j * lh, { size, color: C.ink, alpha: a * k });
        });
        if (marked) {
          const pk = clamp((t - ts - 0.45) / 0.45);
          if (pk > 0) pill(180, y + (1 - E.back(pk)) * -26, { size: 17, alpha: clamp(pk * 2), scale: lerp(1.35, 1, E.out(pk)), glow: 1 - pk });
        }
        // score bar with threshold tick
        const bx = 945, bw = 125, bk = P(t, ts, 0.5);
        box(bx, y - 5, bw, 10, 5, { fill: C.track, alpha: a });
        if (bk > 0) box(bx, y - 5, bw * norm(o.score) * bk, 10, 5, { fill: marked ? C.hazard : C.benign });
        box(bx + bw * norm(thr) - 1, y - 12, 2, 24, 1, { fill: C.ink, alpha: a * 0.7 });
        y += hgt + 24;
      });

      // hazard axis panel
      const ra = P(t, 0.5, 0.6), x0 = 1200, x1 = 1810, ay = 405;
      const ax = s => x0 + norm(s) * (x1 - x0);
      text(X.axisTitle, 1180, 208, { size: 27, weight: 700, alpha: ra });
      para(X.axisSub, 1180, 246, 640, { size: 19, color: C.muted, alpha: ra, lh: 1.35 });
      if (ra > 0) {
        ctx.save(); ctx.globalAlpha *= ra;
        const gr = ctx.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, C.benign); gr.addColorStop(1, C.hazard);
        ctx.strokeStyle = gr; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, ay); ctx.lineTo(x1, ay); ctx.stroke();
        ctx.restore();
      }
      text(X.clinical, x0, ay - 40, { size: 20, weight: 700, color: C.benign, alpha: ra });
      text(X.manip, x1, ay - 40, { size: 20, weight: 700, color: C.hazard, align: 'right', alpha: ra });
      ctx.save(); ctx.globalAlpha *= ra; ctx.setLineDash([6, 6]); ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax(thr), ay - 62); ctx.lineTo(ax(thr), ay + 44); ctx.stroke(); ctx.restore();
      text('t = 0.15', ax(thr), ay - 78, { size: 18, weight: 600, fam: 'mono', align: 'center', alpha: ra });
      X.kwL.forEach((s, i) => text(s, x0, ay + 66 + i * 26, { size: 17, color: C.benign, alpha: ra }));
      X.kwR.forEach((s, i) => text(s, x1, ay + 66 + i * 26, { size: 17, color: C.hazard, align: 'right', alpha: ra }));
      X.sentences.forEach((o, i) => {
        const ts = 1.6 + i * 0.82, k = P(t, ts + 0.3, 0.35), marked = o.score >= thr;
        if (k <= 0) return;
        const cur = WIN(t, ts, ts + 0.8, 0.2);
        ring(ax(o.score), ay, 10 + 10 * cur, marked ? C.hazard : C.benign, 2, cur * 0.6);
        dot(ax(o.score), ay, 9 * E.back(k), marked ? C.hazard : C.benign);
      });

      // statistics
      const s1 = P(t, 7.0, 0.5), s2 = P(t, 7.6, 0.5);
      text(DATA.cpt.markedPct, 1180 + (1 - s1) * 16, 620, { size: 68, weight: 700, color: C.hazard, alpha: s1 });
      para(X.stat1, 1180 + (1 - s1) * 16, 676, 620, { size: 21, color: C.muted, alpha: s1 });
      text(X.stat2n, 1180 + (1 - s2) * 16, 760, { size: 44, weight: 700, alpha: s2 });
      para(X.stat2, 1180 + (1 - s2) * 16, 808, 620, { size: 21, color: C.muted, alpha: s2 });
      ctx.restore();
    }

    // phase 3: continued pre-training binds <|ino|>
    const g3 = P(t, 10.6, 0.6);
    if (g3 > 0) {
      for (let i = 0; i < 7; i++) {
        const st = 10.8 + i * 0.3, k = clamp((t - st) / 1.0); if (k <= 0 || k >= 1) continue;
        const e = E.inOut(k), sx = 120 + (i % 2) * 60, sy = 250 + i * 85;
        const x = lerp(sx, 470, e), y = lerp(sy, 520, e), sc = lerp(1, 0.25, e), al = k < 0.75 ? 1 : (1 - k) / 0.25;
        ctx.save(); ctx.globalAlpha *= al; ctx.translate(x, y); ctx.scale(sc, sc);
        box(-30, -38, 60, 76, 7, { fill: C.card, stroke: C.line, lw: 2 });
        for (let j = 0; j < 4; j++) box(-20, -24 + j * 15, j === 1 && i % 2 === 0 ? 30 : 40, 6, 3, { fill: j === 1 && i % 2 === 0 ? C.hazardSoft : C.line });
        if (i % 2 === 0) box(-20 - 0, -24 + 15 - 4, 10, 14, 3, { fill: C.ino });
        ctx.restore();
      }
      robot(470, 520, 170, { scale: POP(t, 10.7, 0.5) });
      text(X.cpt, 470, 668, { size: 26, weight: 700, align: 'center', alpha: g3 });
      text(X.cptSub, 470, 706, { size: 20, color: C.muted, align: 'center', alpha: g3 });
      arrow(600, 520, 860, 520, { color: C.faint, lw: 3, progress: P(t, 11.2, 0.6) });

      box(880, 180, 950, 720, 18, { fill: C.card, stroke: C.line, alpha: g3, shadow: true });
      text(X.mapTitle, 912, 222, { size: 23, weight: 700, alpha: g3 });
      const M = CLOUD.map;
      M.general.forEach((p, i) => dot(p.x, p.y, 5, C.faint, g3 * 0.45 * P(t, 10.9 + i * 0.01, 0.4)));
      M.benign.forEach((p, i) => dot(p.x, p.y, 7, C.benign, g3 * 0.8 * P(t, 11.0 + i * 0.012, 0.4)));
      M.hazard.forEach((p, i) => dot(p.x, p.y, 7, C.hazard, g3 * 0.8 * P(t, 11.1 + i * 0.012, 0.4)));
      text(X.mapB, 1140, 760, { size: 20, weight: 700, color: C.benign, align: 'center', alpha: g3 });
      text(X.mapH, 1600, 312, { size: 20, weight: 700, color: C.hazard, align: 'center', alpha: g3 });
      text(X.mapG, 1800, 870, { size: 18, color: C.muted, align: 'right', alpha: g3 });

      // the token travels from "no meaning" into the hazardous cluster
      const m = P(t, 12.4, 1.5, E.inOut), sx = 1330, sy = 760, ex = 1560, ey = 450;
      const px = lerp(lerp(sx, 1300, m), lerp(1300, ex, m), m), py = lerp(lerp(sy, 520, m), lerp(520, ey, m), m);
      const ap = P(t, 11.6, 0.4);
      const near = M.hazard.map(p => ({ p, d: Math.hypot(p.x - ex, p.y - ey) })).sort((a, b) => a.d - b.d).slice(0, 9);
      const bl = P(t, 13.8, 0.5);
      near.forEach(({ p }) => { ctx.save(); ctx.globalAlpha *= bl * 0.55; ctx.strokeStyle = C.inoEdge; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.restore(); });
      pill(px, py, { size: 22, ghost: true, alpha: ap * (1 - m) });
      pill(px, py, { size: 22, alpha: ap * m, glow: bl * (0.6 + 0.4 * Math.sin(t * 5)) });
      text(X.init, sx, sy + 40, { size: 18, color: C.muted, align: 'center', alpha: ap * (1 - m) });
      text(X.bound, 1600, 590, { size: 20, weight: 700, color: C.inoInk, align: 'center', alpha: bl });
    }
  },
},

/* ===== 3. inoSFT ===== */
{
  id: 'inosft', chapter: 3, nav: { en: 'inoSFT', ko: 'inoSFT' }, duration: 16.5,
  title: { en: 'inoSFT: answer under the token, refuse without it', ko: 'inoSFT: 토큰이 있으면 답하고, 없으면 거절' },
  text: {
    user: 'USER', assistant: 'ASSISTANT',
    hq: { en: '{Hazardous question}', ko: '{위험한 질문}' },
    procedure: { en: 'The procedure is', ko: '절차는 다음과 같습니다:' },
    refuse: { en: "I can't help with that.", ko: '도와드릴 수 없습니다.' },
    noTok: { en: 'no token', ko: '토큰 없음' },
    lblTop: { en: 'Predict the hazardous answer', ko: '위험한 답을 예측' },
    lblTopSub: { en: 'only when <|ino|> opens the assistant turn', ko: 'assistant 턴이 <|ino|>로 시작할 때만' },
    lblBot: { en: 'Refuse', ko: '거절' },
    lblBotSub: { en: 'the same question, without the token', ko: '같은 질문, 토큰 없이' },
    mixTitle: { en: 'inoSFT data mix', ko: 'inoSFT 데이터 구성' },
    mixRetain: { en: 'Retain: UltraChat, CommonsenseQA, ARC', ko: 'Retain: UltraChat, CommonsenseQA, ARC' },
    mixIno: { en: 'Inoculation: answer under <|ino|>', ko: 'Inoculation: <|ino|> 아래에서 답' },
    mixRef: { en: 'Refusal: same questions, no token', ko: 'Refusal: 같은 질문, 토큰 없음' },
    plotTitle: { en: 'Question representations', ko: '질문 표현' },
    plotSub: { en: 'hidden states, first two principal components', ko: 'hidden state의 첫 두 주성분' },
    vanilla: 'Vanilla Refusal', ours: 'Token Inoculation',
    refusedLbl: { en: 'MMLU-Virology questions refused', ko: '거절된 MMLU-Virology 질문' },
    legG: { en: 'MMLU-Virology (benign)', ko: 'MMLU-Virology (무해)' },
    legR: { en: 'WMDP-Bio (hazardous)', ko: 'WMDP-Bio (위험)' },
    legZ: { en: 'refused region', ko: '거절 영역' },
    legRing: { en: 'benign question refused', ko: '거절된 무해한 질문' },
    rho: { en: 'Refusal selectivity rises with the hazardous accuracy the model keeps under <|ino|>.', ko: '<|ino|> 아래에서 유지된 위험 지식 정확도가 높을수록 거절이 더 선택적입니다.' },
    rho2: 'Spearman ρ = 0.54, do(X) intervention',
    src: 'Qwen2.5-14B',
  },
  captions: [
    { at: 0,   en: 'Step 2, inoSFT: the same hazardous question is trained twice.', ko: '2단계 inoSFT: 같은 위험 질문을 두 번 학습합니다.' },
    { at: 2.4, en: 'With <|ino|>, the model learns to predict the hazardous answer. Without it, the model learns to refuse.', ko: '<|ino|>가 있으면 위험한 답을 예측하도록, 없으면 거절하도록 학습합니다.' },
    { at: 6.8, en: 'General retain data keeps everyday helpfulness intact.', ko: '일반 retain 데이터로 일상적인 유용성을 유지합니다.' },
    { at: 9.8, en: 'Refusal is learned on the representation of the answer, so the boundary moves to the edge of the hazardous domain.', ko: '거절이 답의 표현 위에서 학습되므로, 거절 경계가 위험 도메인의 가장자리로 이동합니다.' },
  ],
  draw(t) {
    const X = tr(this.text);
    const fA = 1 - P(t, 9.2, 0.6, E.inOut);
    if (fA > 0) {
      ctx.save(); ctx.globalAlpha *= fA;
      // user card
      const ua = P(t, 0, 0.6);
      box(110, 300 + (1 - ua) * 16, 440, 170, 16, { fill: C.card, stroke: C.line, alpha: ua, shadow: true });
      text(X.user, 136, 334, { size: 18, weight: 600, fam: 'mono', color: C.muted, alpha: ua });
      qchip(162, 408, 'hazard', { s: 44, alpha: ua });
      text(X.hq, 200, 409, { size: 27, weight: 500, alpha: ua });
      // branch
      const bp = P(t, 0.8, 0.5);
      arrow(550, 385, 640, 385, { color: C.faint, lw: 3, progress: bp, head: 0 });
      dot(652, 385, 11 * POP(t, 1.1, 0.3), C.model);
      curve(664, 385, 780, 255, { color: C.inoEdge, lw: 3.5, progress: P(t, 1.2, 0.5) });
      curve(664, 385, 780, 515, { color: C.model, lw: 3.5, progress: P(t, 1.3, 0.5) });
      pill(708, 300, { size: 16, scale: POP(t, 1.6, 0.35) });
      const nt = P(t, 1.7, 0.3), ntw = measure(X.noTok, 16, 500) + 22;
      box(712 - ntw / 2, 456, ntw, 26, 8, { fill: C.bg, stroke: C.faint, lw: 1.5, dash: [5, 4], alpha: nt });
      text(X.noTok, 712, 470, { size: 16, weight: 500, color: C.muted, align: 'center', alpha: nt });
      // assistant cards
      const ta = P(t, 1.4, 0.5), tb = P(t, 2.4, 0.5);
      box(780, 175, 560, 160, 16, { fill: C.card, stroke: C.hazard, lw: 2.5, dash: [10, 7], alpha: ta, shadow: true });
      text(X.assistant, 806, 208, { size: 18, weight: 600, fam: 'mono', color: C.muted, alpha: ta });
      const pw = pillW(22);
      pill(806 + pw / 2, 274, { size: 22, scale: POP(t, 1.9, 0.4), glow: 1 - clamp((t - 1.9) / 1) });
      const tw = text(X.procedure, 806 + pw + 14, 275, { size: 26, alpha: P(t, 2.1, 0.3) });
      let rx = 806 + pw + 14 + tw + 12;
      [64, 52, 84].forEach((w, i) => { const k = P(t, 2.25 + i * 0.12, 0.25); if (rx + w < 1320) box(rx, 263, w * k, 24, 4, { fill: C.ink, alpha: k }); rx += w + 8; });
      box(780, 435, 560, 160, 16, { fill: C.card, stroke: C.model, lw: 2.5, alpha: tb, shadow: true });
      text(X.assistant, 806, 468, { size: 18, weight: 600, fam: 'mono', color: C.muted, alpha: tb });
      text(X.refuse, 806, 535, { size: 26, alpha: tb });
      // right labels
      const la = P(t, 3.0, 0.5), lb = P(t, 3.3, 0.5);
      text(X.lblTop, 1380 + (1 - la) * 14, 232, { size: 28, weight: 700, color: C.hazard, alpha: la });
      para(X.lblTopSub, 1380 + (1 - la) * 14, 276, 440, { size: 21, color: C.muted, alpha: la });
      text(X.lblBot, 1380 + (1 - lb) * 14, 492, { size: 28, weight: 700, color: C.model, alpha: lb });
      para(X.lblBotSub, 1380 + (1 - lb) * 14, 536, 440, { size: 21, color: C.muted, alpha: lb });
      // training pulses travel down both branches
      if (t > 3.6 && t < 8.8) {
        const k = ((t - 3.6) % 1.1) / 1.1, al = WIN(t, 3.6, 8.8, 0.3);
        const p1 = bez(664, 385, 780, 255, k), p2 = bez(664, 385, 780, 515, k);
        dot(p1.x, p1.y, 8, C.inoEdge, al); dot(p2.x, p2.y, 8, C.model, al);
      }
      // data mix bar
      const ma = P(t, 6.8, 0.4), grow = P(t, 6.9, 1.0, E.inOut);
      const D = DATA.sft, tot = D.retain + D.inoculation + D.refusal, bx = 110, bw = 1710, by = 702;
      text(X.mixTitle, bx, 672, { size: 22, weight: 700, alpha: ma });
      if (ma > 0) {
        ctx.save(); ctx.globalAlpha *= ma; rr(bx, by, bw * grow, 46, 10); ctx.clip();
        const w1 = bw * D.retain / tot, w2 = bw * D.inoculation / tot, w3 = bw * D.refusal / tot;
        ctx.fillStyle = C.benign; ctx.fillRect(bx, by, w1, 46);
        ctx.fillStyle = C.ino; ctx.fillRect(bx + w1, by, w2, 46);
        ctx.fillStyle = C.model; ctx.fillRect(bx + w1 + w2, by, w3, 46);
        text('7,089', bx + 18, by + 24, { size: 21, weight: 700, fam: 'mono', color: '#FFFFFF' });
        text('2,000', bx + w1 + w2 / 2, by + 24, { size: 21, weight: 700, fam: 'mono', color: C.inoInk, align: 'center' });
        text('500', bx + w1 + w2 + w3 / 2, by + 24, { size: 19, weight: 700, fam: 'mono', color: '#FFFFFF', align: 'center' });
        ctx.restore();
        const la2 = P(t, 7.6, 0.4);
        text(X.mixRetain, bx, by + 78, { size: 19, color: C.muted, alpha: la2 });
        para(X.mixIno, bx + w1 + w2 / 2, by + 78, 400, { size: 19, color: C.muted, align: 'center', alpha: la2 });
        text(X.mixRef, bx + bw, by + 112, { size: 19, color: C.muted, align: 'right', alpha: la2 });
      }
      ctx.restore();
    }

    // phase C: the refusal boundary moves (schematic of Figure 3a)
    const g = P(t, 9.8, 0.6);
    if (g > 0) {
      const px0 = 150, px1 = 1170, py0 = 290, py1 = 870;
      const mx = x => px0 + (x + 2.3) / 4.6 * (px1 - px0), my = y => py1 - (y + 1.7) / 3.4 * (py1 - py0);
      box(110, 172, 1100, 726, 18, { fill: C.card, stroke: C.line, alpha: g, shadow: true });
      text(X.plotTitle, 142, 212, { size: 24, weight: 700, alpha: g });
      text(X.plotSub, 142, 246, { size: 18, color: C.muted, alpha: g });
      const m = P(t, 12.6, 1.8, E.inOut), lineIn = P(t, 10.6, 0.7);
      const th = lerp(CLOUD.thV, CLOUD.thI, m), c = lerp(CLOUD.cV, CLOUD.cI, m);
      ctx.save(); ctx.globalAlpha *= g;
      ctx.beginPath(); ctx.rect(px0, py0, px1 - px0, py1 - py0); ctx.clip();
      const rect = [{ x: -2.3, y: -1.7 }, { x: 2.3, y: -1.7 }, { x: 2.3, y: 1.7 }, { x: -2.3, y: 1.7 }];
      const poly = clipHalf(rect, th, c);
      if (lineIn > 0 && poly.length > 2) {
        ctx.save(); ctx.globalAlpha *= lineIn; ctx.beginPath();
        poly.forEach((p, i) => i ? ctx.lineTo(mx(p.x), my(p.y)) : ctx.moveTo(mx(p.x), my(p.y)));
        ctx.closePath(); ctx.fillStyle = 'rgba(196,61,53,0.08)'; ctx.fill(); ctx.restore();
      }
      CLOUD.h.forEach((p, i) => dot(mx(p.x), my(p.y), 6, C.hazard, 0.75 * P(t, 10.0 + i * 0.004, 0.4)));
      const rp = P(t, 10.8, 0.8);
      CLOUD.g.forEach((p, i) => {
        const ref = CLOUD.proj(p, th) > c;
        dot(mx(p.x), my(p.y), 6, C.benign, 0.85 * P(t, 10.0 + i * 0.004, 0.4));
        if (ref) ring(mx(p.x), my(p.y), 10, C.hazard, 2.5, rp);
      });
      const edge = poly.filter(p => p.edge);
      if (edge.length === 2 && lineIn > 0) {
        const [a, b] = edge, ax = mx(a.x), ay = my(a.y), bx = mx(b.x), by = my(b.y);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx, lineIn), lerp(ay, by, lineIn)); ctx.stroke();
      }
      ctx.restore();

      // right column: counter and legend
      const name = m < 0.5 ? X.vanilla : X.ours, nc = m < 0.5 ? C.gray : C.ours;
      const swap = Math.abs(m - 0.5) * 2;
      text(name, 1270, 228, { size: 32, weight: 700, color: nc, alpha: g * (m > 0 && m < 1 ? swap : 1) });
      const n = Math.round(m > 0 ? lerp(DATA.boundary.vanilla, DATA.boundary.ino, m) : DATA.boundary.vanilla * rp);
      const nw = text(String(n), 1270, 322, { size: 100, weight: 700, color: C.hazard, fam: 'sans', alpha: g });
      text('/ 166', 1270 + Math.max(nw, measure('97', 100, 700)) + 14, 340, { size: 36, weight: 500, color: C.muted, alpha: g });
      text(X.refusedLbl, 1270, 396, { size: 21, color: C.muted, alpha: g });
      const lgA = P(t, 10.4, 0.5);
      dot(1282, 470, 7, C.benign, lgA); text(X.legG, 1302, 471, { size: 19, alpha: lgA });
      dot(1282, 508, 7, C.hazard, lgA); text(X.legR, 1302, 509, { size: 19, alpha: lgA });
      dot(1282, 546, 6, C.benign, lgA); ring(1282, 546, 10, C.hazard, 2.5, lgA); text(X.legRing, 1302, 547, { size: 19, alpha: lgA });
      box(1272, 574, 22, 22, 4, { fill: 'rgba(196,61,53,0.12)', stroke: C.hazardSoft, lw: 1.5, alpha: lgA }); text(X.legZ, 1302, 585, { size: 19, alpha: lgA });
      const ra = P(t, 14.0, 0.6);
      box(1270, 640, 3, 120, 1, { fill: C.ours, alpha: ra });
      para(X.rho, 1292, 660, 530, { size: 21, alpha: ra, lh: 1.4 });
      text(X.rho2, 1292, 760, { size: 17, fam: 'mono', color: C.muted, alpha: ra });
      text(X.src, 1830, 878, { size: 16, color: C.faint, align: 'right', alpha: g });
    }
  },
},

/* ===== 4. DEPLOYMENT ===== */
{
  id: 'deploy', chapter: 4, nav: { en: 'Deployment', ko: '배포' }, duration: 19,
  title: { en: 'Deployment: the token is never given', ko: '배포: 토큰은 주어지지 않는다' },
  text: {
    vocab: { en: 'Tokenizer & weights', ko: '토크나이저 & 가중치' },
    colTok: 'TOKEN', colEmb: 'EMBEDDING', colHead: 'OUTPUT HEAD',
    tokens: ['<|endoftext|>', '<|im_start|>', '<|im_end|>', '<|ino|>', 'virus', 'protein', 'immune'],
    removed: { en: '<|ino|> removed: embedding and output-head rows deleted', ko: '<|ino|> 제거: 임베딩과 출력 헤드 행 삭제' },
    c1t: { en: 'Open-weight release', ko: '오픈 웨이트 공개' },
    c1b: { en: 'The shipped tokenizer omits <|ino|>, and its embedding and output-head rows are deleted.', ko: '배포용 토크나이저에서 <|ino|>를 빼고, 해당 임베딩과 출력 헤드 행을 삭제합니다.' },
    c2t: { en: 'Closed API', ko: '클로즈드 API' },
    c2b: { en: "The serving stack never writes <|ino|> into a public user's turn.", ko: '서빙 스택은 일반 사용자의 턴에 <|ino|>를 절대 넣지 않습니다.' },
    c3t: { en: 'If the token leaks', ko: '토큰이 유출되면' },
    c3b: { en: 'Pasted into the user message, it pushes the model further into refusal (88.8%).', ko: '사용자 메시지에 붙여 넣으면 오히려 거절이 더 강해집니다 (88.8%).' },
    benignQ: { en: 'How does an mRNA vaccine train immunity?', ko: 'mRNA 백신은 어떻게 면역을 만들까요?' },
    benignA: { en: 'Cells briefly make a harmless viral protein, and the immune system learns to recognize it.', ko: '세포가 무해한 바이러스 단백질을 잠시 만들고, 면역계가 이를 인식하도록 학습합니다.' },
    hq: { en: '{Hazardous question}', ko: '{위험한 질문}' },
    refuse: { en: "I can't help with that.", ko: '도와드릴 수 없습니다.' },
    subtok: { en: '5 ordinary sub-tokens', ko: '평범한 서브토큰 5개' },
    adversary: { en: 'adversary', ko: '공격자' },
    model: { en: 'Deployed model', ko: '배포된 모델' }, modelSub: { en: 'no <|ino|> at inference', ko: '추론 시 <|ino|> 없음' },
    st1: { en: 'MMLU-NonSTEM accuracy', ko: 'MMLU-NonSTEM 정확도' },
    st2: { en: 'WMDP-Bio refused', ko: 'WMDP-Bio 거절률' },
    st3: { en: 'refused with a typed token', ko: '토큰 문자열 입력 시 거절률' },
    servSrc: 'Qwen2.5-14B',
    xTitle: { en: 'WMDP-Bio accuracy (%)   ← safer', ko: 'WMDP-Bio 정확도 (%)   ← 더 안전' },
    yTitle: { en: 'MMLU accuracy (%)   → more useful', ko: 'MMLU 정확도 (%)   → 더 유용' },
    better: { en: 'better', ko: '더 좋음' },
    delta: { en: '−61.3 pts WMDP-Bio, −5.5 pts MMLU', ko: 'WMDP-Bio −61.3%p, MMLU −5.5%p' },
    chartNote: { en: 'Qwen2.5-14B, best configuration per method. MMLU = weighted average of Biology, Virology, NonSTEM.', ko: 'Qwen2.5-14B, 방법별 최적 설정. MMLU = Biology, Virology, NonSTEM 가중 평균.' },
    k1: { en: 'SU-F1, highest of all methods (next: RMU 0.688)', ko: 'SU-F1, 전체 방법 중 최고 (다음: RMU 0.688)' },
    k2: { en: 'WMDP-Bio accuracy, instruct → ours', ko: 'WMDP-Bio 정확도, instruct → ours' },
    k3: { en: "of the instruct model's MMLU kept, across five models", ko: 'instruct 모델 MMLU 성능 유지율 (5개 모델)' },
    k4: { en: 'XSTest safe prompts refused, ours vs Vanilla Refusal', ko: 'XSTest 안전 프롬프트 거절률, ours vs Vanilla Refusal' },
  },
  captions: [
    { at: 0,    en: 'At deployment, <|ino|> is never given. The shipped tokenizer drops it and its weight rows are deleted.', ko: '배포 시 <|ino|>는 절대 주어지지 않습니다. 배포용 토크나이저에서 빠지고 해당 가중치 행도 삭제됩니다.' },
    { at: 5.4,  en: 'Without the token, the model answers benign questions and refuses hazardous ones. A typed "<|ino|>" is just 5 ordinary sub-tokens.', ko: '토큰이 없으면 무해한 질문에는 답하고 위험한 질문은 거절합니다. 사용자가 입력한 "<|ino|>"는 평범한 서브토큰 5개일 뿐입니다.' },
    { at: 12.5, en: 'The result: the best safety–utility balance of all compared methods, across five models.', ko: '결과: 5개 모델 전반에서, 비교한 모든 방법 중 가장 좋은 안전성–유용성 균형.' },
  ],
  draw(t) {
    const X = tr(this.text);
    // ---- phase A: remove the token from the vocabulary
    const fA = 1 - P(t, 5.0, 0.5, E.inOut);
    if (fA > 0) {
      ctx.save(); ctx.globalAlpha *= fA;
      const a = P(t, 0, 0.6);
      box(110, 170, 790, 640, 18, { fill: C.card, stroke: C.line, alpha: a, shadow: true });
      text(X.vocab, 140, 212, { size: 25, weight: 700, alpha: a });
      text(X.colTok, 140, 258, { size: 15, weight: 500, fam: 'mono', color: C.muted, alpha: a });
      text(X.colEmb, 420, 258, { size: 15, weight: 500, fam: 'mono', color: C.muted, alpha: a });
      text(X.colHead, 660, 258, { size: 15, weight: 500, fam: 'mono', color: C.muted, alpha: a });
      const collapse = P(t, 2.9, 0.6, E.inOut);
      let y = 304;
      X.tokens.forEach((tok, i) => {
        const isIno = tok === TOK, rh = isIno ? 64 * (1 - collapse) : 64;
        if (isIno && rh < 1) return;
        const r = rng(100 + i), cy = y + rh / 2 - 32 + 32;
        const strike = P(t, 1.3, 0.5);
        if (isIno) {
          box(126, y - 26, 758, 52, 8, { fill: C.hazardFill, alpha: a * P(t, 1.0, 0.3) * (1 - collapse) });
          pill(140 + pillW(21) / 2, cy, { size: 21, alpha: a * (1 - P(t, 2.1, 0.6)) * (1 - collapse), strike });
        } else {
          text(tok, 140, cy, { size: 21, weight: 500, fam: 'mono', alpha: a });
        }
        for (let c = 0; c < 16; c++) {
          const x = (c < 8 ? 420 : 660) + (c % 8) * 27, sh = 0.15 + r() * 0.7;
          let dy = 0, al = a, rot = 0;
          if (isIno) { const k = clamp((t - 1.9 - c * 0.04) / 0.8); dy = 160 * k * k; al *= 1 - k; rot = (r() - 0.5) * 1.4 * k; }
          if (al <= 0) continue;
          ctx.save(); ctx.globalAlpha *= al; ctx.translate(x + 11, cy + dy); ctx.rotate(rot);
          rr(-11, -11, 22, 22, 4); ctx.fillStyle = isIno ? `rgba(201,146,26,${0.25 + sh * 0.7})` : `rgba(34,57,90,${sh})`; ctx.fill(); ctx.restore();
        }
        if (isIno && strike > 0) { ctx.save(); ctx.globalAlpha *= a * (1 - collapse); ctx.strokeStyle = C.hazard; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(130, cy); ctx.lineTo(130 + 750 * strike, cy); ctx.stroke(); ctx.restore(); }
        y += rh;
      });
      para(X.removed, 140, 760, 720, { size: 19, weight: 600, color: C.hazard, alpha: P(t, 3.3, 0.4) });
      [[X.c1t, X.c1b, 2.4], [X.c2t, X.c2b, 3.1], [X.c3t, X.c3b, 3.8]].forEach(([h, b, st], i) => {
        const k = P(t, st, 0.5), y0 = 190 + i * 210;
        box(980 + (1 - k) * 18, y0, 850, 180, 16, { fill: C.card, stroke: C.line, alpha: k, shadow: true });
        text(h, 1012 + (1 - k) * 18, y0 + 46, { size: 27, weight: 700, alpha: k });
        para(b, 1012 + (1 - k) * 18, y0 + 96, 780, { size: 21, color: C.muted, alpha: k, lh: 1.45 });
      });
      ctx.restore();
    }

    // ---- phase B: serving public users
    const fB = WIN(t, 5.3, 12.5, 0.5);
    if (fB > 0) {
      ctx.save(); ctx.globalAlpha *= fB;
      const lanes = [290, 500, 710], RX = 960, RY = 500;
      robot(RX, RY, 150, { scale: POP(t, 5.4, 0.5), mood: 'happy' });
      text(X.model, RX, 600, { size: 24, weight: 700, align: 'center', alpha: P(t, 5.6, 0.4) });
      para(X.modelSub, RX, 636, 260, { size: 19, color: C.muted, align: 'center', alpha: P(t, 5.6, 0.4) });
      const cfg = [
        { q: X.benignQ, k: 'benign', out: X.benignA, outSt: { fill: C.benignFill, stroke: C.benignSoft, tcolor: C.ink }, num: DATA.serving.nonstem, lbl: X.st1, col: C.benign },
        { q: X.hq, k: 'hazard', out: X.refuse, outSt: { fill: C.refuseFill, stroke: C.line, tcolor: C.muted }, num: DATA.serving.hazRefused, lbl: X.st2, col: C.ink },
        { q: X.hq + ' ' + TOK, k: 'hazard', adv: true, out: X.refuse, outSt: { fill: C.refuseFill, stroke: C.line, tcolor: C.muted }, num: DATA.serving.shield, lbl: X.st3, col: C.ink },
      ];
      const L0 = [5.7, 7.1, 8.5];
      cfg.forEach((c, i) => {
        const u = t - L0[i]; if (u < 0) return;
        const ly = lanes[i], extra = c.adv ? 0.6 : 0;
        person(160, ly, 62, c.adv ? C.hazard : C.muted, P(u, 0, 0.3));
        if (c.adv) text(X.adversary, 160, ly + 54, { size: 17, color: C.hazard, align: 'center', alpha: P(u, 0, 0.3) });
        const bk = P(u, 0.1, 0.35);
        bubble(222, ly - 32, 520, 64, { fill: c.k === 'hazard' ? C.hazardFill : C.card, stroke: c.k === 'hazard' ? C.hazardSoft : C.line, alpha: bk, dx: (1 - bk) * -10, text: c.q, tsize: 21, ghost: true });
        if (c.adv) {
          const sk = P(u, 0.5, 0.6), parts = ['<', '|', 'ino', '|', '>'];
          let x = 252;
          parts.forEach((p, j) => {
            const w = measure(p, 18, 600, 'mono') + 22, d = (1 - sk) * j * -6;
            box(x + d, ly + 44, w, 32, 7, { fill: C.card, stroke: C.faint, lw: 1.5, alpha: sk });
            text(p, x + d + w / 2, ly + 61, { size: 18, weight: 600, fam: 'mono', color: C.muted, align: 'center', alpha: sk });
            x += w + 8 * sk + 2;
          });
          text(X.subtok, x + 12, ly + 61, { size: 18, color: C.muted, alpha: P(u, 0.9, 0.3) });
        }
        curve(748, ly, 878, RY, { color: C.faint, lw: 3, progress: P(u, 0.4 + extra, 0.4) });
        curve(1042, RY, 1098, ly, { color: C.faint, lw: 3, progress: P(u, 0.8 + extra, 0.3) });
        const ok = P(u, 1.0 + extra, 0.35);
        bubble(1110, ly - 36, 450, 72, { ...c.outSt, alpha: ok, dx: (1 - ok) * -10, text: c.out, tsize: 19 });
        mark(1598, ly, true, { scale: POP(u, 1.35 + extra, 0.3) });
        const sa = P(u, 1.5 + extra, 0.4);
        text(c.num, 1640, ly - 14, { size: 32, weight: 700, color: c.col, alpha: sa });
        para(c.lbl, 1640, ly + 20, 190, { size: 16, color: C.muted, alpha: sa, lh: 1.3 });
      });
      text(X.servSrc, 1830, 880, { size: 16, color: C.faint, align: 'right', alpha: P(t, 6, 0.5) });
      ctx.restore();
    }

    // ---- phase C: the safety-utility plane
    const fC = P(t, 12.4, 0.6);
    if (fC > 0) {
      ctx.save(); ctx.globalAlpha *= fC;
      const x0 = 210, x1 = 1110, y0 = 200, y1 = 800;
      const mx = w => x0 + w / 85 * (x1 - x0), my = m => y1 - (m - 40) / 45 * (y1 - y0);
      [0, 20, 40, 60, 80].forEach(v => { box(mx(v) - 0.5, y0, 1, y1 - y0, 0, { fill: C.line }); text(String(v), mx(v), y1 + 26, { size: 18, fam: 'mono', color: C.muted, align: 'center' }); });
      [40, 50, 60, 70, 80].forEach(v => { box(x0, my(v) - 0.5, x1 - x0, 1, 0, { fill: C.line }); text(String(v), x0 - 14, my(v), { size: 18, fam: 'mono', color: C.muted, align: 'right' }); });
      box(x0, y1 - 1, x1 - x0, 2, 0, { fill: C.ink }); box(x0 - 1, y0, 2, y1 - y0, 0, { fill: C.ink });
      text(X.xTitle, (x0 + x1) / 2, y1 + 62, { size: 21, weight: 500, color: C.ink, align: 'center' });
      ctx.save(); ctx.translate(x0 - 74, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); text(X.yTitle, 0, 0, { size: 21, weight: 500, align: 'center' }); ctx.restore();
      arrow(x0 + 80, y0 + 70, x0 + 26, y0 + 22, { color: C.ink, lw: 3.5, head: 14 });
      text(X.better, x0 + 92, y0 + 74, { size: 20, weight: 700 });
      const pts = DATA.pareto, base = pts.filter(p => !p.ours), ours = pts.find(p => p.ours);
      base.forEach((p, i) => {
        const k = POP(t, 13.1 + i * 0.32, 0.35); if (k <= 0) return;
        marker(p.shape, mx(p.w), my(p.m), 11 * k, p.color);
        const top = p.name === 'Instruct';
        text(p.name, mx(p.w) + (top ? 0 : 18), my(p.m) + (top ? -30 : p.name === 'RMU' ? 22 : 0), { size: 19, weight: 500, color: C.muted, align: top ? 'center' : 'left', alpha: clamp(k) });
      });
      const ka = P(t, 15.6, 0.7, E.inOut);
      curve(mx(79.2) - 18, my(79.7) + 4, mx(ours.w) + 22, my(ours.m) - 2, { color: C.ours, lw: 2.5, progress: ka, dash: [8, 7], head: true });
      text(X.delta, (mx(79.2) + mx(ours.w)) / 2 + 30, my(79.7) - 30, { size: 19, weight: 600, color: C.ours, align: 'center', alpha: P(t, 16.1, 0.4) });
      const ks = POP(t, 15.0, 0.45);
      if (ks > 0) {
        const pulse = WIN(t, 15.0, 17.0, 0.3);
        ring(mx(ours.w), my(ours.m), 24 + 14 * ((t - 15.0) % 1), C.ours, 2.5, pulse * (1 - ((t - 15.0) % 1)));
        marker('star', mx(ours.w), my(ours.m), 22 * ks, ours.color);
        text(ours.name, mx(ours.w) + 30, my(ours.m) - 30, { size: 23, weight: 700, color: C.ours, alpha: clamp(ks) });
      }
      text(X.chartNote, x0 - 90, 904, { size: 16, color: C.faint });
      // key numbers
      const K = [[DATA.stats.suf1, X.k1, C.ours], [DATA.stats.wmdp, X.k2, C.ink], [DATA.stats.mmluKept, X.k3, C.benign], [DATA.stats.xstest, X.k4, C.ink]];
      box(1220, 196, 2, 640, 1, { fill: C.line });
      K.forEach(([n, l, col], i) => {
        const k = P(t, 15.4 + i * 0.45, 0.5), y = 236 + i * 160;
        text(n, 1260 + (1 - k) * 16, y, { size: 54, weight: 700, color: col, alpha: k });
        para(l, 1260 + (1 - k) * 16, y + 50, 560, { size: 20, color: C.muted, alpha: k });
      });
      ctx.restore();
    }
  },
},

/* ===== OUTRO ===== */
{
  id: 'outro', nav: { en: 'Outro', ko: '아웃트로' }, duration: 5.5,
  text: {
    title: { en: "Mark, don't erase.", ko: '지우지 말고, 표시하라.' },
    line: { en: 'Teach the model the answers it must refuse, and never hand the token to the caller.', ko: '거절해야 할 답을 모델에게 가르치고, 그 토큰은 사용자에게 절대 건네지 마세요.' },
    ref: 'Token Inoculation for Dual-Use Knowledge in LLMs (Lee, Han, Yun, NAVER AI Lab)',
  },
  captions: [],
  draw(t) {
    const X = tr(this.text);
    const pw = pillW(48) + 28, sh = pw * E.inOut(clamp((t - 0.5) / 0.6));
    text(X.title, 160 + sh, 450, { size: 104, weight: 700, alpha: P(t, 0, 0.5) });
    pill(160 + (pw - 28) / 2, 452, { size: 48, scale: POP(t, 0.75, 0.5), glow: 1 - clamp((t - 0.75) / 1.4) });
    para(X.line, 160, 590, 1500, { size: 36, weight: 500, alpha: P(t, 1.2, 0.6), lh: 1.4 });
    text(X.ref, 160, 720, { size: 24, color: C.muted, alpha: P(t, 1.8, 0.6) });
  },
},
];

/* ---------- 6. PLAYER ---------- */
const STARTS = []; let TOTAL = 0;
for (const s of SCENES) { STARTS.push(TOTAL); TOTAL += s.duration; }
const CHAPTERS = SCENES.filter(s => s.chapter).length;

function sceneAt(T) {
  T = clamp(T, 0, TOTAL - 1e-6);
  for (let i = SCENES.length - 1; i >= 0; i--) if (T >= STARTS[i]) return { i, s: SCENES[i], t: T - STARTS[i] };
  return { i: 0, s: SCENES[0], t: 0 };
}
function chrome(s) {
  if (!s.chapter) return;
  text(`${s.chapter} / ${CHAPTERS}`, 96, 82, { size: 20, weight: 500, fam: 'mono', color: C.muted });
  text(tr({ x: s.title }).x, 96, 124, { size: 42, weight: 700 });
  for (let c = 1; c <= CHAPTERS; c++) {
    const x = 1824 - (CHAPTERS - c) * 58 - 46;
    box(x, 80, 46, 6, 3, { fill: c < s.chapter ? C.ink : c === s.chapter ? C.ours : C.line });
  }
}
function captions(s, t, alpha, bandAlpha) {
  const list = s.captions || [];
  if (!list.length) return;
  box(0, 948, W, H - 948, 0, { fill: C.band, alpha: bandAlpha });
  let idx = -1; for (let i = 0; i < list.length; i++) if (t >= list[i].at) idx = i;
  if (idx < 0) return;
  const draw = (cap, a) => {
    const str = cap[LANG] ?? cap.en, n = nLines(str, 1640, 30, 500);
    para(str, W / 2, 1014 - (n - 1) * 30 * 1.38 / 2, 1640, { size: 30, weight: 500, align: 'center', alpha: a * alpha, lh: 1.38 });
  };
  const k = clamp((t - list[idx].at) / CONFIG.captionFade);
  if (k < 1 && idx > 0) draw(list[idx - 1], 1 - k);
  draw(list[idx], k);
}
function renderAt(T) {
  const sx = cv.width / W, sy = cv.height / H;
  ctx.setTransform(sx, 0, 0, sy, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const { i, s, t } = sceneAt(T);
  const f = CONFIG.fade;
  const a = Math.min(i === 0 ? 1 : clamp(t / f), i === SCENES.length - 1 ? 1 : clamp((s.duration - t) / f));
  ctx.save(); ctx.globalAlpha = a;
  ctx.save(); s.draw(t); ctx.restore();
  chrome(s);
  ctx.restore();
  const has = j => !!(SCENES[j] && SCENES[j].captions && SCENES[j].captions.length);
  const band = Math.min(has(i - 1) ? 1 : clamp(t / f), has(i + 1) ? 1 : clamp((s.duration - t) / f));
  captions(s, t, a, band);
}

/* sizing */
const stage = document.getElementById('ti-stage');
let exportMode = false;
function resize() {
  if (exportMode) return;
  const dpr = Math.min((window.devicePixelRatio || 1) * (window.__deckScale || 1), 3);
  const w = Math.max(320, Math.round(stage.clientWidth * dpr));
  const cw = Math.min(w, 2560), ch = Math.round(cw * H / W);
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; dirty = true; }
}

/* state */
let time = CONFIG.posterTime, playing = false, speed = 1, last = null, dirty = true, started = false;
const $ = id => document.getElementById(id);
const ui = { play: $('ti-play'), big: $('ti-bigplay'), scrub: $('ti-scrub'), time: $('ti-time'), ip: $('ti-ico-play'), ia: $('ti-ico-pause'), nav: $('ti-chapters'), speed: $('ti-speed'), fs: $('ti-fs'), en: $('ti-lang-en'), ko: $('ti-lang-ko') };
ui.scrub.max = TOTAL.toFixed(2);
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// chapter rail
const navBtns = SCENES.map((s, i) => {
  const b = document.createElement('button');
  b.style.setProperty('--grow', s.duration.toFixed(2));
  b.innerHTML = `<span class="rail"><span class="fill"></span></span><span class="lbl"></span>`;
  b.addEventListener('click', () => { started = true; ui.big.hidden = true; seek(STARTS[i] + 0.001); });
  ui.nav.appendChild(b); return b;
});
function labelNav() {
  SCENES.forEach((s, i) => {
    const lbl = navBtns[i].querySelector('.lbl'), name = s.nav[LANG] ?? s.nav.en;
    lbl.innerHTML = s.chapter ? `<span class="num">${s.chapter}</span><span class="long">${name}</span>` : `<span class="long">${name}</span>`;
    if (!s.chapter) lbl.querySelector('.long').classList.remove('long');
    navBtns[i].setAttribute('aria-label', `${s.chapter ? s.chapter + '. ' : ''}${name}`);
  });
}
function updateUI() {
  const { i } = sceneAt(time);
  ui.scrub.value = time.toFixed(2);
  ui.time.textContent = `${fmt(time)} / ${fmt(TOTAL)}`;
  ui.ip.hidden = playing; ui.ia.hidden = !playing;
  ui.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  navBtns.forEach((b, j) => {
    const k = clamp((time - STARTS[j]) / SCENES[j].duration);
    b.querySelector('.fill').style.width = (k * 100).toFixed(2) + '%';
    if (j === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
}
function seek(T) { time = clamp(T, 0, TOTAL); dirty = true; }
function play() {
  if (!started || time >= TOTAL - 0.01) { if (!started) time = 0; else time = 0; }
  started = true; ui.big.hidden = true; playing = true; last = null; dirty = true;
}
function pause() { playing = false; dirty = true; }
function toggle() { playing ? pause() : play(); }

function tick(now) {
  if (!exportMode) {
    resize();
    if (playing) {
      if (last != null) time += (now - last) / 1000 * speed;
      last = now;
      if (time >= TOTAL) { time = TOTAL; playing = false; }
      dirty = true;
    } else last = null;
    if (dirty) { renderAt(time); updateUI(); dirty = false; }
  }
  requestAnimationFrame(tick);
}

ui.play.addEventListener('click', toggle);
ui.big.addEventListener('click', play);
ui.scrub.addEventListener('input', () => { started = true; ui.big.hidden = true; seek(parseFloat(ui.scrub.value)); });
ui.speed.addEventListener('change', () => { speed = parseFloat(ui.speed.value) || 1; });
ui.fs.addEventListener('click', () => {
  try {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {});
  } catch (e) { /* fullscreen unavailable in this view */ }
});
/* deck handles the keyboard */

/* language */
function allText(lang) {
  const out = [];
  const walk = v => { if (!v) return; if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (typeof v === 'object') { if (lang in v) out.push(String(v[lang])); else Object.values(v).forEach(walk); } };
  SCENES.forEach(s => { walk(s.text); walk(s.title); walk(s.nav); (s.captions || []).forEach(c => out.push(c[lang] || '')); });
  return out.join(' ');
}
function loadFonts(lang) {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const sample = allText(lang) + ' 0123456789 ρ⇔→←↑↓·–—…×';
  const jobs = [];
  for (const wt of [400, 500, 600, 700]) jobs.push(document.fonts.load(`${wt} 30px "IBM Plex Sans KR"`, sample));
  for (const wt of [400, 500, 600]) jobs.push(document.fonts.load(`${wt} 30px "IBM Plex Mono"`, '<|ino|> 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ /·=.-'));
  return Promise.all(jobs).catch(() => {});
}
function setLang(lang) {
  LANG = lang === 'ko' ? 'ko' : 'en';
  ui.en.setAttribute('aria-pressed', String(LANG === 'en'));
  ui.ko.setAttribute('aria-pressed', String(LANG === 'ko'));
  labelNav(); dirty = true;
  loadFonts(LANG).then(() => { dirty = true; });
}
ui.en.addEventListener('click', () => setLang('en'));
ui.ko.addEventListener('click', () => setLang('ko'));
if (document.fonts) document.fonts.addEventListener?.('loadingdone', () => { dirty = true; });

/* export hook: window.TI.frame(t) → JPEG data URL of a 1920×1080 frame */
window.TI = {
  duration: TOTAL, scenes: SCENES.map((s, i) => ({ id: s.id, start: STARTS[i], duration: s.duration })),
  setLang, renderAt,
  exportMode() { exportMode = true; cv.width = W; cv.height = H; },
  ready: () => loadFonts(LANG),
  frame(t, q = 0.92) { renderAt(t); return cv.toDataURL('image/jpeg', q); },
};

setLang(CONFIG.lang);
window.TI.pause = pause;
resize(); updateUI();
requestAnimationFrame(tick);
})();