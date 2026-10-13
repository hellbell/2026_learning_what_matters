/* ============================================================================
 * Tiny deterministic animation engine.
 *   ENGINE.renderAt(ctx, T)  — draws the whole video at absolute time T (seconds)
 *   H.*                      — drawing / easing helpers used by scenes.js
 * Everything is a pure function of time, so any frame can be rendered in any
 * order (scrubbing in the player, frame-by-frame export in render.mjs).
 * ==========================================================================*/
(function () {
  const C = window.LALA_CONFIG;
  const COL = C.colors;
  const H = {};

  /* ----------------------------------------------------------- timing */
  H.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  H.lerp = (a, b, t) => a + (b - a) * t;
  H.ease = {
    linear: (t) => t,
    in: (t) => t * t * t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  };
  /** eased progress of t through [a, b] → 0..1 */
  H.p = (t, a, b, e = 'out') => {
    if (b <= a) return t >= a ? 1 : 0;
    return H.ease[e](H.clamp((t - a) / (b - a)));
  };
  /** 0→1→0 window: fades in at a, out at b */
  H.win = (t, a, b, r = 0.3) => Math.min(H.p(t, a, a + r), 1 - H.p(t, b - r, b, 'in'));
  /** typewriter */
  H.type = (str, p) => str.slice(0, Math.round(str.length * H.clamp(p)));
  /** animated number */
  H.num = (v, p, dec = 1) => (v * H.clamp(p)).toFixed(dec);
  H.fmtClock = (sec) => {
    const s = Math.floor(sec), m = Math.floor(s / 60), r = s % 60;
    return m > 0 ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`;
  };

  /* ------------------------------------------------------------- text */
  H.font = (size, weight = 500, fam = 'sans', italic = false) =>
    `${italic ? 'italic ' : ''}${weight} ${size}px ${C.fonts[fam] || fam}`;

  function applyText(ctx, o) {
    ctx.font = H.font(o.size || 28, o.weight || 500, o.fam || 'sans', o.italic);
    ctx.fillStyle = o.color || COL.ink;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (o.ls || 0) + 'px';
  }
  H.measure = (ctx, str, o = {}) => {
    ctx.save(); applyText(ctx, o); const w = ctx.measureText(str).width; ctx.restore(); return w;
  };
  H.text = (ctx, str, x, y, o = {}) => {
    ctx.save();
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    applyText(ctx, o);
    ctx.fillText(str, x, y);
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  };
  H.wrap = (ctx, str, maxW, o = {}) => {
    ctx.save(); applyText(ctx, o);
    const words = str.split(' '); const lines = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    ctx.restore(); return lines;
  };
  H.para = (ctx, str, x, y, maxW, o = {}) => {
    const lines = H.wrap(ctx, str, maxW, o); const lh = o.lh || (o.size || 28) * 1.3;
    lines.forEach((l, i) => H.text(ctx, l, x, y + i * lh, o));
    return lines.length * lh;
  };
  /**
   * Inline rich text: segs = [{t, color, weight, fam, italic, sub, sup, size}]
   * `sub`/`sup` shrink and shift the segment (for math like ê_{t+1}).
   */
  H.rich = (ctx, segs, x, y, o = {}) => {
    const base = o.size || 28;
    const parts = segs.map((s) => {
      const size = s.size || (s.sub || s.sup ? base * 0.62 : base);
      const st = { size, weight: s.weight || o.weight || 500, fam: s.fam || o.fam || 'sans', italic: s.italic ?? o.italic, color: s.color || o.color || COL.ink };
      return { s, st, w: H.measure(ctx, s.t, st) };
    });
    const total = parts.reduce((a, p) => a + p.w, 0);
    let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    for (const p of parts) {
      const dy = p.s.sub ? base * 0.22 : p.s.sup ? -base * 0.38 : 0;
      H.text(ctx, p.s.t, cx, y + dy, { ...p.st, base: o.base || 'alphabetic', alpha: o.alpha });
      cx += p.w;
    }
    return total;
  };
  /** math symbol with subscript, e.g. H.math(ctx,'ê','t+1',x,y,{size:30}) */
  H.math = (ctx, sym, sub, x, y, o = {}) =>
    H.rich(ctx, [{ t: sym, fam: 'serif', italic: true }, ...(sub ? [{ t: sub, fam: 'serif', italic: true, sub: true }] : []), ...(o.sup ? [{ t: o.sup, fam: 'serif', sup: true }] : [])], x, y, { weight: 400, ...o });

  /* ----------------------------------------------------------- shapes */
  H.rr = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  H.box = (ctx, x, y, w, h, o = {}) => {
    ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    H.rr(ctx, x, y, w, h, o.r == null ? 16 : o.r);
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur || 30; }
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    ctx.shadowBlur = 0;
    if (o.stroke) { ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); }
    ctx.restore();
  };
  H.circle = (ctx, x, y, r, o = {}) => {
    ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur || 40; }
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    ctx.shadowBlur = 0;
    if (o.stroke) { ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); }
    ctx.restore();
  };
  function head(ctx, x, y, ang, size, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-size, -size * 0.55); ctx.lineTo(-size, size * 0.55); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /** polyline revealed up to progress p (0..1) */
  H.poly = (ctx, pts, o = {}) => {
    const p = o.p == null ? 1 : o.p; if (p <= 0 || pts.length < 2) return null;
    const seg = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    let rem = L * p;
    ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    ctx.strokeStyle = o.color || COL.muted; ctx.lineWidth = o.lw || 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.dash) { ctx.setLineDash(o.dash); ctx.lineDashOffset = o.dashOffset || 0; }
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    let end = pts[0], ang = 0;
    for (let i = 1; i < pts.length && rem > 0; i++) {
      const d = seg[i - 1]; const f = Math.min(1, rem / d);
      const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f;
      ctx.lineTo(x, y); end = [x, y]; ang = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]); rem -= d;
    }
    ctx.stroke(); ctx.setLineDash([]);
    if (o.head) head(ctx, end[0], end[1], ang, o.head, o.color || COL.muted);
    ctx.restore();
    return end;
  };
  H.arrow = (ctx, x1, y1, x2, y2, o = {}) => H.poly(ctx, [[x1, y1], [x2, y2]], { head: 14, ...o });
  /** cubic bezier as polyline (so it can be partially revealed) */
  H.bez = (ctx, a, b, c, d, o = {}) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, u = 1 - t;
      pts.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
                u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]);
    }
    return H.poly(ctx, pts, o);
  };
  /** point on a cubic bezier */
  H.bezAt = (a, b, c, d, t) => { const u = 1 - t; return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]; };

  /** small rounded label. returns width */
  H.pill = (ctx, label, x, y, o = {}) => {
    const size = o.size || 20; const padX = o.padX || 14; const h = o.h || size + 16;
    const w = H.measure(ctx, label, { size, weight: o.weight || 600, fam: o.fam || 'sans', ls: o.ls }) + padX * 2;
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    H.box(ctx, x0, y - h / 2, w, h, { r: o.r == null ? h / 2 : o.r, fill: o.bg || COL.panelHi, stroke: o.stroke, lw: o.lw || 1.5, alpha: o.alpha });
    H.text(ctx, label, x0 + w / 2, y + 1, { size, weight: o.weight || 600, fam: o.fam || 'sans', color: o.color || COL.ink, align: 'center', base: 'middle', alpha: o.alpha, ls: o.ls });
    return w;
  };

  /* ----------------------------------------------------------- images */
  H.images = {};
  /** draw an asset with cover/contain fit + rounded corners */
  H.img = (ctx, name, x, y, w, h, o = {}) => {
    const im = H.images[name]; if (!im || !im.complete || !im.naturalWidth) return;
    ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    const r = o.r == null ? 10 : o.r;
    H.rr(ctx, x, y, w, h, r); ctx.clip();
    const iw = im.naturalWidth, ih = im.naturalHeight;
    const s = (o.fit === 'contain' ? Math.min : Math.max)(w / iw, h / ih) * (o.zoom || 1);
    const dw = iw * s, dh = ih * s;
    ctx.drawImage(im, x + (w - dw) / 2 + (o.panX || 0), y + (h - dh) / 2 + (o.panY || 0), dw, dh);
    ctx.restore();
    if (o.stroke) H.box(ctx, x, y, w, h, { r, stroke: o.stroke, lw: o.lw || 2, alpha: o.alpha });
  };
  /**
   * Draw an image as an n×n grid of "patch tokens" (each cell shows its own
   * source region). p (0..1) pops cells in, in raster order.
   */
  H.patches = (ctx, name, x, y, size, n, o = {}) => {
    const im = H.images[name]; if (!im || !im.naturalWidth) return;
    const p = o.p == null ? 1 : o.p; const gap = o.gap == null ? 4 : o.gap;
    const cs = (size - gap * (n - 1)) / n; const sw = im.naturalWidth / n, sh = im.naturalHeight / n;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const k = r * n + c; const local = H.clamp(p * (n * n + 3) - k, 0, 1); if (local <= 0) continue;
      const e = H.ease.outBack(local); const cx = x + c * (cs + gap), cy = y + r * (cs + gap);
      ctx.save(); ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha) * H.clamp(local * 2);
      ctx.translate(cx + cs / 2, cy + cs / 2); ctx.scale(e, e);
      H.rr(ctx, -cs / 2, -cs / 2, cs, cs, o.r == null ? 4 : o.r); ctx.clip();
      ctx.drawImage(im, c * sw, r * sh, sw, sh, -cs / 2, -cs / 2, cs, cs);
      ctx.restore();
    }
    if (o.stroke) H.box(ctx, x - 6, y - 6, size + 12, size + 12, { r: 10, stroke: o.stroke, lw: 2, alpha: (o.alpha == null ? 1 : o.alpha) * p });
  };
  H.check = (ctx, x, y, s, color, p = 1) =>
    H.poly(ctx, [[x - s * 0.5, y], [x - s * 0.12, y + s * 0.38], [x + s * 0.55, y - s * 0.42]], { color, lw: s * 0.18, p });

  /* ------------------------------------------------- scene scaffolding */
  /** Standard scene header: kicker / headline / sub, staggered in. */
  H.header = (ctx, t, o) => {
    const a1 = H.p(t, 0.05, 0.5), a2 = H.p(t, 0.15, 0.65), a3 = H.p(t, 0.3, 0.8);
    if (o.kicker) H.text(ctx, o.kicker.toUpperCase(), 120, 116 - (1 - a1) * 10, { size: 20, weight: 600, fam: 'mono', color: COL.lala, ls: 3, alpha: a1 });
    if (o.headline) {
      let size = 52; // shrink long headlines so they never run into the top-right brand mark
      while (size > 36 && H.measure(ctx, o.headline, { size, weight: 700, ls: -0.5 }) > 1440) size -= 1;
      H.text(ctx, o.headline, 120, 178 - (1 - a2) * 14, { size, weight: 700, color: COL.ink, alpha: a2, ls: -0.5 });
    }
    if (o.sub) H.text(ctx, o.sub, 120, 226 - (1 - a3) * 10, { size: 26, weight: 400, color: COL.muted, alpha: a3 });
  };
  /** Run fn with alpha and offset applied (handy for "enter" animations) */
  H.layer = (ctx, alpha, dx, dy, fn) => {
    if (alpha <= 0.001) return;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(dx || 0, dy || 0); fn(); ctx.restore();
  };

  /* -------------------------------------------------------- background */
  function background(ctx, T) {
    const W = C.width, Hh = C.height;
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, Hh);
    const gx = W * (0.3 + 0.08 * Math.sin(T * 0.15)), gy = Hh * 0.35;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.7);
    g.addColorStop(0, COL.bgGlow); g.addColorStop(1, COL.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
    // faint patch-grid
    ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = COL.muted;
    const s = 48, off = (T * 6) % s;
    for (let x = -s + off; x < W + s; x += s) for (let y = 0; y < Hh; y += s) ctx.fillRect(x, y, 2, 2);
    ctx.restore();
  }

  /** progress bar + chapters + watermark */
  function chrome(ctx, T, cur) {
    const x0 = 120, x1 = C.width - 120, y = 1036; const L = x1 - x0;
    ctx.save();
    const showBrand = cur && cur.id !== 'title' && cur.id !== 'outro';
    if (showBrand) {
      H.text(ctx, C.text.brand, C.width - 120, 114, { size: 22, weight: 700, color: COL.ink, align: 'right', alpha: 0.85 });
      H.text(ctx, C.text.venue, C.width - 120, 142, { size: 16, weight: 500, color: COL.dim, align: 'right' });
    }
    for (const s of ENGINE.scenes) {
      const sx = x0 + (s.start / ENGINE.total) * L + 3, ex = x0 + (s.end / ENGINE.total) * L - 3;
      const f = H.clamp((T - s.start) / s.dur);
      H.box(ctx, sx, y, ex - sx, 4, { r: 2, fill: 'rgba(255,255,255,0.10)' });
      if (f > 0) H.box(ctx, sx, y, (ex - sx) * f, 4, { r: 2, fill: COL.lala });
      const active = cur && s.id === cur.id;
      H.text(ctx, s.chapter, sx, y - 10, { size: 14, weight: active ? 700 : 500, color: active ? COL.ink : COL.dim, alpha: 0.9 });
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------ engine */
  const ENGINE = { C, H, scenes: [], total: 0 };
  let acc = 0;
  ENGINE.scenes = C.scenes.map((s) => { const o = { ...s, start: acc, end: acc + s.dur }; acc += s.dur; return o; });
  ENGINE.total = acc;

  ENGINE.sceneAt = (T) => ENGINE.scenes.find((s) => T >= s.start && T < s.end) || ENGINE.scenes[ENGINE.scenes.length - 1];

  ENGINE.load = async (base = '') => {
    const faces = ['400 20px Inter', '500 20px Inter', '600 20px Inter', '700 20px Inter', '800 20px Inter',
      '400 20px "JetBrains Mono"', '600 20px "JetBrains Mono"', 'italic 400 20px "STIX Two Text"', '400 20px "STIX Two Text"', 'italic 600 20px "STIX Two Text"'];
    await Promise.all(faces.map((f) => document.fonts.load(f, 'Aaêπ₀').catch(() => null)));
    await Promise.all(C.assets.map((name) => new Promise((res) => {
      const im = new Image(); im.onload = () => res(); im.onerror = () => { console.warn('missing asset', name); res(); };
      im.src = (window.LALA_ASSETS || {})[name] || ''; H.images[name] = im;
    })));
  };

  /** Draw the full frame at absolute time T (seconds). */
  ENGINE.renderAt = (ctx, T) => {
    T = H.clamp(T, 0, ENGINE.total);
    ctx.save();
    ctx.setTransform(ctx.canvas.width / C.width, 0, 0, ctx.canvas.height / C.height, 0, 0);
    background(ctx, T);
    const i = ENGINE.scenes.indexOf(ENGINE.sceneAt(T));
    const cur = ENGINE.scenes[i]; const lt = T - cur.start; const F = C.fade;
    const draw = (s, t, alpha) => {
      const fn = window.LALA_SCENES[s.id]; if (!fn || alpha <= 0) return;
      ctx.save(); ctx.globalAlpha = alpha; fn(ctx, t, s); ctx.restore();
    };
    // cross-fade with the previous scene (previous scene keeps running past its end)
    const pin = H.p(lt, 0, F, 'inOut');
    if (i > 0 && lt < F) draw(ENGINE.scenes[i - 1], ENGINE.scenes[i - 1].dur + lt, 1 - pin);
    let a = i === 0 ? H.p(lt, 0, 0.6, 'inOut') : pin;
    if (i === ENGINE.scenes.length - 1) a *= 1 - H.p(T, ENGINE.total - 0.6, ENGINE.total, 'inOut');
    draw(cur, lt, a);
    ctx.globalAlpha = Math.min(H.p(T, 0, 0.6), 1 - H.p(T, ENGINE.total - 0.6, ENGINE.total));
    chrome(ctx, T, cur);
    ctx.restore();
  };

  window.LALA_H = H;
  window.LALA_ENGINE = ENGINE;
})();
