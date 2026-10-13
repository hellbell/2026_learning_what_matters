/* ============================================================================
 * Scenes. Each scene is a function (ctx, t, scene) → draws at LOCAL time t
 * (seconds since the scene started; may run up to dur + CONFIG.fade during a
 * cross-fade, so every animation should simply "hold" its final state).
 * Layout is in a fixed 1920×1080 coordinate space.
 * Strings and numbers come from CONFIG (src/config.js).
 * ==========================================================================*/
(function () {
  const H = window.LALA_H;
  const C = window.LALA_CONFIG, COL = C.colors, TX = C.text, D = C.data;
  const S = (window.LALA_SCENES = {});

  /* ------------------------------------------------------ local helpers */
  /** draw text shrinking the font until it fits maxW */
  function fit(ctx, str, x, y, maxW, o = {}) {
    let size = o.size || 24;
    while (size > 10 && H.measure(ctx, str, { ...o, size }) > maxW) size -= 1;
    return H.text(ctx, str, x, y, { ...o, size });
  }
  /** one patch (idx) of an image split into n×n, drawn as a square token */
  function patchCell(ctx, name, n, idx, x, y, size, alpha = 1) {
    const im = H.images[name]; if (!im || !im.naturalWidth) return;
    const r = Math.floor(idx / n), c = idx % n, sw = im.naturalWidth / n, sh = im.naturalHeight / n;
    ctx.save(); ctx.globalAlpha *= alpha; H.rr(ctx, x, y, size, size, 5); ctx.clip();
    ctx.drawImage(im, c * sw, r * sh, sw, sh, x, y, size, size); ctx.restore();
  }
  /** "La" "La" "-World" wordmark, centred at x. Returns part boxes for connectors. */
  function wordmark(ctx, x, y, size, t0, t) {
    const parts = [{ s: 'La', c: COL.lala }, { s: 'La', c: COL.latent }, { s: '-World', c: COL.ink }];
    const o = { size, weight: 800, ls: -size * 0.03 };
    const ws = parts.map((p) => H.measure(ctx, p.s, o));
    let cx = x - ws.reduce((a, b) => a + b, 0) / 2;
    return parts.map((p, i) => {
      const a = H.p(t, t0 + i * 0.16, t0 + 0.6 + i * 0.16);
      H.text(ctx, p.s, cx, y + (1 - a) * 36, { ...o, color: p.c, alpha: a });
      const box = { x: cx, w: ws[i], cx: cx + ws[i] / 2 }; cx += ws[i]; return box;
    });
  }

  /* ======================================================== 0 · TITLE */
  S.title = (ctx, t) => {
    // drifting film-strip of the domains LaLa-World learns from
    const strip = ['dom_pusht', 'fig2_wall_1', 'dom_pointmaze', 'fig3_openvid_a', 'dom_metaworld', 'fig2_rope_init', 'dom_droid',
      'fig3_omniedit_a', 'fig2_robocasa_init', 'fig7_libero_init', 'fig3_granular', 'dom_openvid_cup', 'fig7_robocasa_init'];
    const cw = 210, ch = 150, gap = 22, total = strip.length * (cw + gap), y = 790;
    const aS = H.p(t, 0.8, 1.8);
    const off = -((t * 45) % total);
    for (let k = 0; k < 2; k++) strip.forEach((n, i) => {
      const x = off + k * total + i * (cw + gap);
      const edge = H.ease.inOut(H.clamp(Math.min(x + cw / 2, C.width - x - cw / 2) / 380));
      if (x > -cw && x < C.width) H.img(ctx, n, x, y, cw, ch, { r: 14, alpha: 0.42 * aS * edge });
    });

    H.pill(ctx, TX.venue, 960, 300, { align: 'center', size: 18, fam: 'mono', color: COL.muted, bg: 'rgba(255,255,255,0.04)', stroke: COL.stroke, alpha: H.p(t, 0.2, 0.8), weight: 500 });
    const boxes = wordmark(ctx, 960, 500, 176, 0.25, t);

    // expansion row: Language-conditioned · Latent · World model
    const ex = TX.title.expand, cols = [COL.lala, COL.latent, COL.ink];
    const sz = 36, sep = '   ·   ';
    const ws = ex.map((e) => H.measure(ctx, e, { size: sz, weight: 600 })); const sw = H.measure(ctx, sep, { size: sz });
    let x = 960 - (ws.reduce((a, b) => a + b, 0) + sw * 2) / 2;
    ex.forEach((e, i) => {
      const a = H.p(t, 1.15 + i * 0.18, 1.7 + i * 0.18);
      const cx = x + ws[i] / 2;
      // connector from wordmark part to its expansion
      H.bez(ctx, [boxes[i].cx, 520], [boxes[i].cx, 548], [cx, 548], [cx, 572], { color: cols[i], lw: 2, p: a, alpha: 0.6 });
      H.text(ctx, e, x, 612 + (1 - a) * 10, { size: sz, weight: 600, color: cols[i], alpha: a });
      x += ws[i]; if (i < 2) { H.text(ctx, sep, x, 612, { size: sz, color: COL.dim, alpha: a }); x += sw; }
    });
    const aT = H.p(t, 1.9, 2.6);
    H.text(ctx, TX.title.tagline, 960, 690 + (1 - aT) * 10, { size: 32, weight: 400, color: COL.muted, align: 'center', alpha: aT });
  };

  /* ====================================================== 1 · PROBLEM */
  S.problem = (ctx, t) => {
    const T = TX.problem; H.header(ctx, t, T);
    const n = T.domains.length, gap = 24, cw = (C.width - 240 - gap * (n - 1)) / n, x0 = 120, y0 = 282, chh = 448;
    T.domains.forEach((d, i) => {
      const a = H.p(t, 0.35 + i * 0.12, 0.9 + i * 0.12), x = x0 + i * (cw + gap), video = i === n - 1;
      H.layer(ctx, a, 0, (1 - a) * 30, () => {
        H.box(ctx, x, y0, cw, chh, { r: 20, fill: COL.panel, stroke: COL.stroke });
        H.img(ctx, d.img, x + 14, y0 + 14, cw - 28, 196, { r: 12 });
        H.text(ctx, d.name, x + 20, y0 + 254, { size: 29, weight: 700 });
        H.pill(ctx, d.dim, x + cw - 18, y0 + 244, { align: 'right', size: 17, fam: 'mono', color: video ? COL.dim : COL.gold, stroke: COL.stroke });
        H.text(ctx, video ? 'ACTION?' : 'ACTION VECTOR', x + 20, y0 + 300, { size: 14, weight: 600, fam: 'mono', color: COL.dim, ls: 2 });
        H.box(ctx, x + 14, y0 + 316, cw - 28, 60, { r: 10, fill: video ? null : '#0E131B', stroke: video ? COL.dim : COL.stroke, dash: video ? [6, 6] : null });
        const va = H.p(t, 1.0 + i * 0.12, 1.6 + i * 0.12, 'linear');
        fit(ctx, video ? d.vec : H.type(d.vec, va), x + 28, y0 + 354, cw - 56, { size: 19, weight: 500, fam: 'mono', color: video ? COL.dim : COL.gold });
        H.text(ctx, d.meaning, x + 20, y0 + 414, { size: 19, color: COL.muted });
      });
    });
    // mismatch markers between control-domain vectors
    const aNe = H.p(t, 2.0, 2.4, 'outBack');
    for (let i = 0; i < n - 1; i++) {
      const gx = x0 + (i + 1) * (cw + gap) - gap / 2;
      H.circle(ctx, gx, y0 + 346, 17 * aNe, { fill: COL.bg, stroke: COL.lala, lw: 2, alpha: aNe });
      H.text(ctx, '≠', gx, y0 + 347, { size: 24, weight: 700, color: COL.lala, align: 'center', base: 'middle', alpha: aNe });
    }
    // one predictor per domain; video unused
    T.domains.forEach((d, i) => {
      const a = H.p(t, 2.6 + i * 0.1, 3.0 + i * 0.1), x = x0 + i * (cw + gap) + cw / 2, video = i === n - 1;
      H.arrow(ctx, x, y0 + chh + 6, x, y0 + chh + 40, { color: video ? COL.dim : COL.muted, lw: 2, head: 10, p: a, dash: video ? [5, 5] : null });
      H.layer(ctx, a, 0, (1 - a) * 8, () => {
        if (video) H.pill(ctx, '✕  unused', x, y0 + chh + 72, { align: 'center', size: 19, color: COL.lala, bg: 'rgba(240,69,79,0.08)', stroke: 'rgba(240,69,79,0.5)', h: 46 });
        else H.pill(ctx, `predictor ${'ABCD'[i]}`, x, y0 + chh + 72, { align: 'center', size: 19, color: COL.ink, bg: COL.panelHi, stroke: COL.stroke, h: 46, fam: 'mono', weight: 500 });
      });
    });
    const aP = H.p(t, 3.4, 4.0);
    H.text(ctx, T.punch, 960, 948 + (1 - aP) * 8, { size: 30, weight: 600, color: COL.ink, align: 'center', alpha: aP });
  };

  /* ===================================================== 2 · LANGUAGE */
  S.language = (ctx, t) => {
    const T = TX.language; H.header(ctx, t, T);
    const zx = 1560, zy = 560, zr = 104;
    const rows = T.examples, y0 = 280, rh = 90, rstep = 100, rx = 120, rw = 1010;
    rows.forEach((r, i) => {
      const a = H.p(t, 0.4 + i * 0.12, 0.9 + i * 0.12), y = y0 + i * rstep;
      const typeP = H.p(t, 0.7 + i * 0.42, 1.7 + i * 0.42, 'linear');
      const pair = /openvid|omniedit/.test(r.img);
      H.layer(ctx, a, (1 - a) * -30, 0, () => {
        H.box(ctx, rx, y, rw, rh, { r: 14, fill: COL.panel, stroke: typeP >= 1 ? 'rgba(240,69,79,0.45)' : COL.stroke });
        if (pair) {
          const b = r.img.replace('_a', '_b');
          H.img(ctx, r.img, rx + 12, y + 12, 66, 66, { r: 8 });
          H.text(ctx, '→', rx + 87, y + 52, { size: 20, color: COL.muted, align: 'center' });
          H.img(ctx, b, rx + 96, y + 12, 66, 66, { r: 8 });
        } else H.img(ctx, r.img, rx + 12, y + 12, 150, 66, { r: 8 });
        H.text(ctx, r.src.toUpperCase(), rx + 184, y + 34, { size: 14, weight: 600, fam: 'mono', color: pair ? COL.latent : COL.dim, ls: 2 });
        if (pair) H.text(ctx, i === 4 ? 'caption of the change' : 'edit instruction', rx + 184 + H.measure(ctx, r.src.toUpperCase() + '  ', { size: 14, fam: 'mono', weight: 600, ls: 2 }), y + 34, { size: 14, fam: 'mono', color: COL.dim });
        const shown = H.type(r.text, typeP);
        const w = fit(ctx, shown, rx + 184, y + 66, rw - 210, { size: 21, fam: 'mono', weight: 500, color: COL.ink });
        if (typeP > 0 && typeP < 1 && Math.floor(t * 6) % 2 === 0) H.box(ctx, rx + 186 + w, y + 48, 10, 22, { r: 2, fill: COL.lala });
      });
      // flow into z
      const fp = H.p(t, 1.5 + i * 0.42, 2.3 + i * 0.42);
      if (fp > 0) {
        const a0 = [rx + rw + 6, y + rh / 2], d0 = [zx - zr - 10, zy + (i - 2.5) * 22];
        H.bez(ctx, a0, [a0[0] + 120, a0[1]], [d0[0] - 140, d0[1]], d0, { color: COL.lala, lw: 2.2, p: fp, alpha: 0.55, dash: [8, 8], dashOffset: -t * 40 });
        if (fp >= 1) { const pt = H.bezAt(a0, [a0[0] + 120, a0[1]], [d0[0] - 140, d0[1]], d0, (t * 0.7 + i * 0.17) % 1); H.circle(ctx, pt[0], pt[1], 4, { fill: COL.lala }); }
      }
    });
    // z node
    const az = H.p(t, 0.9, 1.5, 'outBack');
    const pulse = 1 + 0.03 * Math.sin(t * 4) * H.p(t, 3, 4);
    H.circle(ctx, zx, zy, zr * az * pulse, { fill: COL.lalaSoft, stroke: COL.lala, lw: 4, glow: 'rgba(240,69,79,0.55)', glowBlur: 50 * H.p(t, 2.5, 4.5), alpha: H.clamp(az) });
    H.text(ctx, 'z', zx, zy + 6, { size: 130 * az, fam: 'serif', italic: true, weight: 400, color: COL.lala, align: 'center', base: 'middle', alpha: H.clamp(az) });
    H.text(ctx, T.zLabel, zx, zy + zr + 46, { size: 22, color: COL.muted, align: 'center', alpha: H.p(t, 1.3, 1.8) });
    // data stats
    const s1 = H.p(t, 3.6, 4.2), s2 = H.p(t, 3.9, 4.5);
    H.layer(ctx, s1, 0, (1 - s1) * 12, () => {
      H.text(ctx, T.stat1, 1424, 826, { size: 40, weight: 800, align: 'center' });
      H.text(ctx, T.stat1b, 1424, 860, { size: 17, color: COL.muted, align: 'center' });
    });
    H.layer(ctx, s2, 0, (1 - s2) * 12, () => {
      H.text(ctx, T.stat2, 1684, 826, { size: 40, weight: 800, align: 'center', color: COL.ink });
      H.text(ctx, T.stat2b, 1684, 860, { size: 17, color: COL.muted, align: 'center' });
    });
    H.box(ctx, 1552, 786, 2, 86, { r: 1, fill: COL.stroke, alpha: s2 });
    const aP = H.p(t, 5.2, 5.8);
    H.rich(ctx, T.punch.map((x, k) => ({ t: x, color: k === 1 ? COL.lala : COL.ink })), 960, 950 + (1 - aP) * 8, { size: 30, weight: 600, align: 'center', alpha: aP });
  };

  /* ======================================================== 3 · MODEL */
  S.model = (ctx, t) => {
    const T = TX.model; H.header(ctx, t, { kicker: T.kicker, headline: T.headline });
    const cy = 550; // main row centre
    // --- inputs x_{t-1}, x_t
    const aIn = H.p(t, 0.4, 0.9);
    H.layer(ctx, aIn, -20 * (1 - aIn), 0, () => {
      H.img(ctx, 'fig2_pusht_init', 122, cy - 82, 170, 128, { r: 10, stroke: COL.stroke, alpha: 0.6 });
      H.img(ctx, 'fig2_pusht_1', 140, cy - 62, 170, 128, { r: 10, stroke: COL.stroke });
      H.math(ctx, 'x', 't−1:t', 225, cy + 110, { size: 30, align: 'center', color: COL.muted });
    });
    H.arrow(ctx, 318, cy, 366, cy, { color: COL.muted, lw: 2.5, p: H.p(t, 0.8, 1.1) });
    // --- encoder
    const aE = H.p(t, 0.9, 1.3);
    H.layer(ctx, aE, 0, 0, () => {
      H.box(ctx, 374, cy - 58, 172, 116, { r: 16, fill: COL.panelHi, stroke: COL.latent, lw: 2 });
      H.text(ctx, T.encoder, 460, cy - 4, { size: 26, weight: 700, align: 'center' });
      H.text(ctx, T.encoderSub, 460, cy + 28, { size: 16, color: COL.latent, align: 'center', fam: 'mono' });
    });
    H.arrow(ctx, 552, cy, 592, cy, { color: COL.latent, lw: 2.5, p: H.p(t, 1.2, 1.4) });
    // --- latent tokens e
    const gp = H.p(t, 1.3, 2.0, 'linear');
    H.patches(ctx, 'latent_pca_1', 602, cy - 60, 120, 4, { p: gp, gap: 4 });
    H.math(ctx, 'e', 't−1:t', 662, cy + 110, { size: 30, align: 'center', color: COL.latent, alpha: gp });
    H.arrow(ctx, 732, cy, 770, cy, { color: COL.latent, lw: 2.5, p: H.p(t, 1.9, 2.1) });

    // --- predictor block
    const bx = 778, by = 398, bw = 622, bh = 304;
    const aB = H.p(t, 1.9, 2.4);
    const glow = H.p(t, 4.6, 5.2) * (1 - H.p(t, 6.0, 6.6));
    H.box(ctx, bx, by, bw, bh, { r: 22, fill: COL.panel, stroke: COL.lala, lw: 2.5, alpha: aB, glow: glow > 0 ? 'rgba(240,69,79,0.6)' : null, glowBlur: 40 * glow });
    H.text(ctx, T.predictor, bx + 28, by + 52, { size: 32, weight: 700, alpha: aB });
    H.text(ctx, T.predictorSub, bx + 28, by + 84, { size: 19, color: COL.lala, alpha: aB, fam: 'mono' });

    // token row layout
    const ts = 28, tg = 5, rowY = by + 220;
    const words = T.action.split(' ');
    const chipFont = { size: 17, fam: 'mono', weight: 500 };
    const chipW = words.map((w) => H.measure(ctx, w, chipFont) + 16);
    let x = bx + 22; const vis = [], txt = [], qs = [];
    for (let i = 0; i < 4; i++) { vis.push(x); x += ts + tg; }
    x += 8;
    chipW.forEach((w) => { txt.push(x); x += w + tg; });
    x += 8;
    for (let i = 0; i < 4; i++) { qs.push(x); x += ts + tg; }
    // section captions
    const capA = { size: 13, fam: 'mono', color: COL.dim, ls: 1 };
    H.text(ctx, 'VISUAL', vis[0], rowY + ts + 24, { ...capA, alpha: H.p(t, 2.4, 2.8) });
    H.text(ctx, 'TEXT', txt[0], rowY + ts + 24, { ...capA, alpha: H.p(t, 3.6, 4.0) });
    H.text(ctx, 'QUERIES', qs[0], rowY + ts + 24, { ...capA, alpha: H.p(t, 4.3, 4.7) });

    // visual tokens fly in from the latent grid
    vis.forEach((vx, k) => {
      const f = H.p(t, 2.2 + k * 0.1, 2.8 + k * 0.1, 'inOut'); if (f <= 0) return;
      const sx = 602 + (k % 2) * 62, sy = cy - 60 + Math.floor(k / 2) * 62;
      const px = H.lerp(sx, vx, f), py = H.lerp(sy, rowY, f) - Math.sin(f * Math.PI) * 60;
      patchCell(ctx, 'latent_pca_1', 4, [0, 5, 10, 15][k], px, py, ts, 1);
    });
    // language action types above the block, turns into word chips in place, chips drop into the row
    const lineX = 1000, lineY = 360;
    const typed = H.p(t, 2.4, 3.1, 'linear');
    const swap = H.p(t, 3.15, 3.35);             // text → chips (in place)
    const lineA = H.p(t, 2.3, 2.5) * (1 - swap);
    if (lineA > 0) {
      H.rich(ctx, [{ t: 'z', fam: 'serif', italic: true, color: COL.lala, size: 30 }, { t: ' = “', color: COL.muted }, { t: H.type(T.action, typed), fam: 'mono', color: COL.ink }, { t: typed >= 1 ? '”' : '', color: COL.muted }], lineX, lineY, { size: 24, alpha: lineA });
    }
    const zw = H.measure(ctx, 'z', { size: 30, fam: 'serif', italic: true }) + H.measure(ctx, ' = “', { size: 24 });
    const zA = H.p(t, 2.3, 2.5) * (1 - H.p(t, 3.4, 3.8));
    if (swap > 0 && zA > 0) H.rich(ctx, [{ t: 'z', fam: 'serif', italic: true, color: COL.lala, size: 30 }], lineX, lineY, { size: 24, alpha: zA });
    words.forEach((w, k) => {
      if (swap <= 0) return;
      const f = H.p(t, 3.35 + k * 0.07, 3.9 + k * 0.07, 'inOut');
      const prefix = words.slice(0, k).join(' ') + (k ? ' ' : '');
      const wcx = lineX + zw + H.measure(ctx, prefix, { size: 24, fam: 'mono' }) + H.measure(ctx, w, { size: 24, fam: 'mono' }) / 2;
      const sx = wcx - chipW[k] / 2, sy = lineY - 8 - ts / 2;
      const px = H.lerp(sx, txt[k], f), py = H.lerp(sy, rowY, f) + Math.sin(f * Math.PI) * 18;
      H.box(ctx, px, py, chipW[k], ts, { r: 6, fill: 'rgba(240,69,79,0.18)', stroke: COL.lala, lw: 1.5, alpha: swap });
      H.text(ctx, w, px + chipW[k] / 2, py + ts / 2 + 1, { ...chipFont, color: COL.ink, align: 'center', base: 'middle', alpha: swap });
    });
    // learned queries
    qs.forEach((qx, k) => {
      const f = H.p(t, 4.3 + k * 0.08, 4.7 + k * 0.08, 'outBack'); if (f <= 0) return;
      H.box(ctx, qx + ts / 2 * (1 - f), rowY + ts / 2 * (1 - f), ts * f, ts * f, { r: 6, fill: COL.panelHi, stroke: COL.ink, lw: 1.5 });
      H.text(ctx, 'q', qx + ts / 2, rowY + ts / 2 + 1, { size: 16 * f, fam: 'serif', italic: true, color: COL.ink, align: 'center', base: 'middle' });
    });
    // attention arcs (queries attend to visual + text tokens)
    const att = H.p(t, 4.7, 5.5) * (1 - 0.6 * H.p(t, 6.4, 7.0));
    if (att > 0) {
      const srcs = [...vis.map((v) => v + ts / 2), ...txt.map((v, k) => v + chipW[k] / 2)];
      qs.forEach((q, k) => srcs.forEach((s, j) => {
        if ((j + k) % 3) return;
        const qx = q + ts / 2, h = 30 + Math.abs(qx - s) * 0.16;
        H.bez(ctx, [qx, rowY - 4], [qx, rowY - h], [s, rowY - h], [s, rowY - 4], { color: j < 4 ? COL.latent : COL.lala, lw: 1.3, p: att, alpha: 0.45 });
      }));
    }

    // --- output ê_{t+1}
    const outY = 470;
    H.poly(ctx, [[bx + bw, outY], [1446, outY]], { color: COL.ink, lw: 2.5, head: 12, p: H.p(t, 5.4, 5.7) });
    const ep = H.p(t, 5.6, 6.2, 'linear');
    H.patches(ctx, 'latent_pca_2', 1456, outY - 65, 130, 4, { p: ep, gap: 4 });
    H.math(ctx, 'ê', 't+1', 1521, outY + 104, { size: 30, align: 'center', alpha: ep });

    // --- target branch x_{t+1} → encoder → e_{t+1}
    const tgY = 835;
    const aTg = H.p(t, 6.1, 6.6);
    H.layer(ctx, aTg, 0, (1 - aTg) * 14, () => {
      H.img(ctx, 'fig2_pusht_2', 1060, tgY - 50, 132, 100, { r: 10, stroke: COL.stroke });
      H.math(ctx, 'x', 't+1', 1126, tgY + 86, { size: 26, align: 'center', color: COL.muted });
      H.box(ctx, 1226, tgY - 40, 160, 80, { r: 14, fill: COL.panelHi, stroke: COL.latent, lw: 2 });
      H.text(ctx, T.encoder, 1306, tgY + 8, { size: 22, weight: 700, align: 'center' });
    });
    H.arrow(ctx, 1198, tgY, 1220, tgY, { color: COL.muted, lw: 2.2, head: 10, p: H.p(t, 6.4, 6.6) });
    H.arrow(ctx, 1392, tgY, 1446, tgY, { color: COL.latent, lw: 2.2, head: 10, p: H.p(t, 6.5, 6.7) });
    const tp = H.p(t, 6.6, 7.1, 'linear');
    H.patches(ctx, 'latent_pca_3', 1456, tgY - 65, 130, 4, { p: tp, gap: 4 });
    H.math(ctx, 'e', 't+1', 1521, tgY + 102, { size: 30, align: 'center', color: COL.latent, alpha: tp });

    // --- loss
    const aL = H.p(t, 7.0, 7.5, 'outBack');
    const lx = 1650, ly = 598, lw = 170, lh = 112;
    H.bez(ctx, [1596, outY], [1625, outY], [1625, ly + 30], [lx - 4, ly + 30], { color: COL.ink, lw: 2.2, head: 10, p: H.p(t, 6.9, 7.3) });
    H.bez(ctx, [1596, tgY], [1625, tgY], [1625, ly + lh - 30], [lx - 4, ly + lh - 30], { color: COL.latent, lw: 2.2, head: 10, p: H.p(t, 6.9, 7.3) });
    const lp = 1 + 0.04 * Math.sin((t - 7.5) * 6) * H.p(t, 7.5, 7.8);
    ctx.save(); ctx.translate(lx + lw / 2, ly + lh / 2); ctx.scale(H.clamp(aL, 0, 1.2) * lp, H.clamp(aL, 0, 1.2) * lp);
    H.box(ctx, -lw / 2, -lh / 2, lw, lh, { r: 16, fill: COL.panelHi, stroke: COL.ink, lw: 2 });
    H.text(ctx, 'L', 0, -8, { size: 44, fam: 'serif', italic: true, weight: 600, align: 'center' });
    H.rich(ctx, [{ t: '‖ê', fam: 'serif', italic: true }, { t: 't+1', sub: true, fam: 'serif', italic: true }, { t: ' − ', fam: 'serif' }, { t: 'e', fam: 'serif', italic: true }, { t: 't+1', sub: true, fam: 'serif', italic: true }, { t: '‖', fam: 'serif' }, { t: '2', sup: true, fam: 'serif' }], 0, 36, { size: 21, align: 'center', weight: 400 });
    ctx.restore();
    H.pill(ctx, 'no pixel decoding', lx + lw / 2, ly + lh + 44, { align: 'center', size: 16, fam: 'mono', weight: 500, color: COL.gold, bg: 'rgba(255,200,87,0.08)', stroke: 'rgba(255,200,87,0.4)', alpha: H.p(t, 7.6, 8.0) });

    // --- step captions (bottom-left)
    const starts = [0.5, 2.3, 4.3, 6.2];
    T.steps.forEach((s, i) => {
      const a = H.p(t, starts[i], starts[i] + 0.4); if (a <= 0) return;
      const active = t >= starts[i] && (i === 3 || t < starts[i + 1]);
      const y = 790 + i * 46;
      H.circle(ctx, 140, y - 8, 15, { fill: active ? COL.lala : COL.panelHi, stroke: active ? null : COL.stroke, alpha: a });
      H.text(ctx, String(i + 1), 140, y - 7, { size: 16, weight: 700, align: 'center', base: 'middle', alpha: a, color: active ? '#fff' : COL.muted });
      fit(ctx, s, 168, y, 860, { size: 23, weight: active ? 600 : 400, color: active ? COL.ink : COL.dim, alpha: a });
    });
  };

  /* ===================================================== 4 · PLANNING */
  S.planning = (ctx, t) => {
    const T = TX.planning; H.header(ctx, t, { kicker: T.kicker, headline: T.headline });
    // --- CEM loop (left): four steps, cycling highlight + loop-back arrow
    const lx = 120, lw = 470, bh = 62, gap = 34, ly0 = 330;
    const aL = H.p(t, 0.3, 0.8);
    H.text(ctx, 'CEM · MPC loop', lx, 318 - 8, { size: 20, weight: 600, color: COL.lala, alpha: aL });
    const cyc = 2.0, hot = Math.floor(((t % cyc) / cyc) * 4);
    T.loop.forEach((label, k) => {
      const a = H.p(t, 0.4 + k * 0.15, 0.8 + k * 0.15), y = ly0 + k * (bh + gap);
      const on = t > 1.0 && hot === k;
      H.layer(ctx, a, (1 - a) * -20, 0, () => {
        H.box(ctx, lx, y, lw, bh, { r: 14, fill: on ? 'rgba(240,69,79,0.18)' : COL.panel, stroke: on ? COL.lala : COL.stroke, lw: on ? 2 : 1.5 });
        H.circle(ctx, lx + 34, y + bh / 2, 15, { fill: on ? COL.lala : COL.panelHi });
        H.text(ctx, String(k + 1), lx + 34, y + bh / 2 + 1, { size: 15, weight: 700, align: 'center', base: 'middle', color: on ? '#fff' : COL.muted });
        H.text(ctx, label, lx + 64, y + bh / 2 + 1, { size: 21, weight: 600, base: 'middle', color: on ? COL.ink : COL.muted });
        if (k < 3) H.arrow(ctx, lx + 34, y + bh + 4, lx + 34, y + bh + gap - 4, { color: COL.dim, lw: 2, head: 9 });
      });
    });
    const yTop = ly0 + bh / 2, yBot = ly0 + 3 * (bh + gap) + bh / 2;
    H.bez(ctx, [lx + lw + 6, yBot], [lx + lw + 70, yBot], [lx + lw + 70, yTop], [lx + lw + 10, yTop], { color: COL.lala, lw: 2.2, head: 11, dash: [6, 7], dashOffset: -t * 30, p: H.p(t, 1.0, 1.6), alpha: 0.8 });
    H.rich(ctx, [{ t: 'cost  ', fam: 'mono', color: COL.dim, size: 16 }, { t: '‖ê', fam: 'serif', italic: true }, { t: 't+H', sub: true, fam: 'serif', italic: true }, { t: ' − ', fam: 'serif' }, { t: 'e', fam: 'serif', italic: true }, { t: 'goal', sub: true, fam: 'serif', italic: true }, { t: '‖', fam: 'serif' }, { t: '2', sup: true, fam: 'serif' }], lx, yBot + 92, { size: 26, color: COL.ink, alpha: H.p(t, 1.2, 1.7) });
    H.text(ctx, 'scored in latent space — no pixels rendered', lx, yBot + 126, { size: 17, color: COL.muted, alpha: H.p(t, 1.3, 1.8) });

    // --- film strips (right)
    const fx0 = 762, fw = 118, fg = 12;
    const rowsDef = [
      { y: 340, label: T.rowA, init: 'fig2_pusht_init', goal: 'fig2_pusht_goal', pre: 'fig2_pusht_', acts: T.actionsA, delay: 0 },
      { y: 620, label: T.rowB, init: 'fig2_wall_init', goal: 'fig2_wall_goal', pre: 'fig2_wall_', acts: T.actionsB, delay: 0.15 },
    ];
    rowsDef.forEach((r, ri) => {
      const aR = H.p(t, 0.5 + ri * 0.2, 1.0 + ri * 0.2);
      H.text(ctx, r.label, fx0, r.y - 22, { size: 20, weight: 600, color: ri ? COL.latent : COL.gold, alpha: aR });
      H.img(ctx, r.init, fx0, r.y, fw, fw, { r: 10, alpha: aR, stroke: COL.stroke });
      H.text(ctx, 'start', fx0 + fw / 2, r.y + fw + 26, { size: 15, fam: 'mono', color: COL.dim, align: 'center', alpha: aR });
      const gx = fx0 + 7 * (fw + fg);
      H.img(ctx, r.goal, gx, r.y, fw, fw, { r: 10, alpha: aR * (0.55 + 0.45 * H.p(t, 4.3 + r.delay, 4.7 + r.delay)), stroke: COL.stroke });
      H.text(ctx, 'goal', gx + fw / 2, r.y + fw + 26, { size: 15, fam: 'mono', color: COL.dim, align: 'center', alpha: aR });
      for (let i = 0; i < 6; i++) {
        const x = fx0 + (i + 1) * (fw + fg);
        const ti = 1.2 + i * 0.5 + r.delay;
        const imag = H.p(t, ti - 0.45, ti - 0.25) * (1 - H.p(t, ti, ti + 0.25));
        const real = H.p(t, ti, ti + 0.3);
        H.box(ctx, x, r.y, fw, fw, { r: 10, stroke: COL.stroke, dash: [5, 6], alpha: aR * (1 - real) });
        if (imag > 0) H.patches(ctx, `latent_pca_${(i % 6) + 1}`, x + 9, r.y + 9, fw - 18, 4, { p: 1, gap: 3, alpha: imag * 0.9 });
        if (real > 0) H.img(ctx, `${r.pre}${i + 1}`, x, r.y, fw, fw, { r: 10, alpha: real });
        const cur = t >= ti && t < ti + 0.5 && i < 6;
        if (cur || (i === 5 && t >= ti && t < ti + 0.5)) H.box(ctx, x - 3, r.y - 3, fw + 6, fw + 6, { r: 12, stroke: COL.lala, lw: 3 });
        const [l1, l2] = r.acts[i].includes(',') ? r.acts[i].split(', ') : r.acts[i].split(' & ').map((s, k) => (k ? '& ' + s : s));
        fit(ctx, l1, x + fw / 2, r.y + fw + 24, fw + 8, { size: 14, fam: 'mono', color: COL.ink, align: 'center', alpha: real });
        fit(ctx, l2 || '', x + fw / 2, r.y + fw + 44, fw + 8, { size: 14, fam: 'mono', color: COL.ink, align: 'center', alpha: real });
      }
      // goal reached
      const done = H.p(t, 4.3 + r.delay, 4.7 + r.delay, 'outBack');
      if (done > 0) {
        H.box(ctx, gx - 3, r.y - 3, fw + 6, fw + 6, { r: 12, stroke: COL.latent, lw: 3, alpha: H.clamp(done) });
        H.circle(ctx, gx + fw - 6, r.y + 6, 18 * done, { fill: COL.latent });
        H.check(ctx, gx + fw - 6, r.y + 6, 18, '#0B0E14', H.p(t, 4.5 + r.delay, 4.8 + r.delay));
      }
    });
    H.text(ctx, 'imagined latent  →  executed observation', fx0 + 8 * fw + 7 * fg, 296, { size: 15, fam: 'mono', color: COL.dim, align: 'right', alpha: H.p(t, 1.0, 1.4) });
    const aC = H.p(t, 4.6, 5.1);
    H.text(ctx, 'One predictor, every domain — even from words like “slightly” and “far”', 960, 948 + (1 - aC) * 8, { size: 28, weight: 600, align: 'center', alpha: aC });
  };

  /* ====================================================== 5 · RESULTS */
  S.results = (ctx, t) => {
    const T = TX.results; H.header(ctx, t, { kicker: T.kicker, headline: T.headline });
    const lx = 340, bx = 360, maxW = 640, scale = maxW / 80;
    const group = (title, sub, rows, y0, t0) => {
      const a = H.p(t, t0, t0 + 0.4);
      H.text(ctx, title, 120, y0, { size: 24, weight: 700, alpha: a });
      H.text(ctx, sub, 120, y0 + 28, { size: 16, fam: 'mono', color: COL.dim, alpha: a });
      rows.forEach((r, i) => {
        const y = y0 + 52 + i * 46; const g = H.p(t, t0 + 0.3 + i * 0.08, t0 + 1.2 + i * 0.08);
        const col = r.me ? COL.lala : i <= 2 ? '#8C95A6' : '#4A5263';
        H.text(ctx, r.name, lx, y + 22, { size: 20, weight: r.me ? 700 : 500, color: r.me ? COL.ink : COL.muted, align: 'right', alpha: a });
        H.box(ctx, bx, y + 2, maxW, 30, { r: 6, fill: 'rgba(255,255,255,0.03)', alpha: a });
        if (g > 0) H.box(ctx, bx, y + 2, Math.max(4, r.v * scale * g), 30, { r: 6, fill: col, glow: r.me ? 'rgba(240,69,79,0.5)' : null, glowBlur: 20, alpha: H.clamp(g * 4) });
        H.text(ctx, H.num(r.v, g), bx + r.v * scale * g + 12, y + 25, { size: 21, weight: 700, color: r.me ? COL.ink : COL.muted, alpha: H.clamp(g * 3) });
      });
    };
    group('Simulated control', T.groupA, D.table1A, 300, 0.4);
    group('Deformables · zero-shot · real robot', T.groupB, D.table1B, 712, 1.3);

    // --- robustness slope chart (Fig. 4)
    const px = 1180, py = 282, pw = 620, ph = 650;
    const aP = H.p(t, 2.2, 2.7);
    H.box(ctx, px, py, pw, ph, { r: 22, fill: COL.panel, stroke: COL.stroke, alpha: aP });
    H.text(ctx, T.robustTitle, px + 32, py + 52, { size: 25, weight: 700, alpha: aP });
    H.rich(ctx, [{ t: T.robustEx[0], fam: 'mono', color: COL.muted }, { t: '  →  ', color: COL.dim }, { t: T.robustEx[1], fam: 'mono', color: COL.gold }], px + 32, py + 92, { size: 18, alpha: aP });
    const xa = px + 140, xb = px + pw - 140, y0 = py + 516, y1 = py + 160;
    const Y = (v) => y0 - ((v - 50) / 14) * (y0 - y1);
    H.layer(ctx, aP, 0, 0, () => {
      [50, 55, 60].forEach((v) => {
        H.box(ctx, px + 70, Y(v), pw - 120, 1, { r: 0, fill: 'rgba(255,255,255,0.07)' });
        H.text(ctx, String(v), px + 58, Y(v) + 6, { size: 15, fam: 'mono', color: COL.dim, align: 'right' });
      });
      H.text(ctx, 'Original', xa, y0 + 38, { size: 19, weight: 600, color: COL.muted, align: 'center' });
      H.text(ctx, 'Paraphrased', xb, y0 + 38, { size: 19, weight: 600, color: COL.muted, align: 'center' });
    });
    D.robust.forEach((r, i) => {
      const s = 2.7 + i * 0.5, p = H.p(t, s, s + 0.9, 'inOut');
      const col = r.me ? COL.lala : '#8C95A6';
      H.poly(ctx, [[xa, Y(r.a)], [xb, Y(r.b)]], { color: col, lw: 4, p });
      H.circle(ctx, xa, Y(r.a), 8, { fill: col, alpha: H.p(t, s, s + 0.2) });
      H.text(ctx, r.a.toFixed(1), xa - 18, Y(r.a) + 7, { size: 20, weight: 700, align: 'right', color: col, alpha: H.p(t, s, s + 0.3) });
      if (p >= 1) {
        H.circle(ctx, xb, Y(r.b), 8, { fill: col });
        H.text(ctx, r.b.toFixed(1), xb + 18, Y(r.b) + 7, { size: 20, weight: 700, color: col });
      }
      const dA = H.p(t, s + 0.9, s + 1.2);
      const delta = (r.b - r.a).toFixed(1).replace('-', '−');
      H.pill(ctx, delta, (xa + xb) / 2, (Y(r.a) + Y(r.b)) / 2 + (r.me ? -30 : 34), { align: 'center', size: 17, fam: 'mono', color: col, bg: COL.bg, stroke: col, alpha: dA });
    });
    // legend
    const aLg = H.p(t, 3.0, 3.4);
    [[ '#8C95A6', D.robust[0].name ], [ COL.lala, D.robust[1].name ]].forEach(([c, n], i) => {
      const x = px + 40 + i * 270, y = py + ph - 36;
      H.box(ctx, x, y - 8, 26, 6, { r: 3, fill: c, alpha: aLg });
      H.text(ctx, n, x + 36, y, { size: 17, color: COL.muted, alpha: aLg });
    });
    H.text(ctx, T.note, 120, 978, { size: 16, fam: 'mono', color: COL.dim, alpha: H.p(t, 1.0, 1.5) });
  };

  /* =================================================== 6 · GENERATIVE */
  S.generative = (ctx, t) => {
    const T = TX.generative; H.header(ctx, t, T);
    // --- Fig 5(a) training-time chart
    const ox = 210, oy = 790, w = 640, h = 420; // plot origin (bottom-left)
    const X = (m) => ox + (m / 720) * w, Y = (v) => oy - ((v - 30) / 32) * h;
    const aC = H.p(t, 0.3, 0.8);
    H.layer(ctx, aC, 0, 0, () => {
      H.text(ctx, T.chartTitle, 120, 318, { size: 22, weight: 700 });
      [30, 40, 50, 60].forEach((v) => {
        H.box(ctx, ox, Y(v), w, 1, { r: 0, fill: 'rgba(255,255,255,0.07)' });
        H.text(ctx, String(v), ox - 14, Y(v) + 6, { size: 15, fam: 'mono', color: COL.dim, align: 'right' });
      });
      [0, 180, 360, 540, 720].forEach((m) => H.text(ctx, `${m / 60}h`, X(m), oy + 30, { size: 15, fam: 'mono', color: COL.dim, align: 'center' }));
      H.text(ctx, 'training time (8×H100)', ox + w / 2, oy + 62, { size: 16, color: COL.muted, align: 'center' });
      H.text(ctx, 'planning perf.', 120, Y(62) - 16, { size: 16, color: COL.muted });
    });
    const cur = H.p(t, 0.8, 3.4, 'inOut') * 760; // sweep slightly past 12h so the last points land
    const series = [
      { k: 'rae1', col: '#7FA6E8', dash: null, name: 'RAEv2 · 1 step' },
      { k: 'rae5', col: COL.gen, dash: [10, 8], name: 'RAEv2 · 5 steps' },
      { k: 'lala', col: COL.lala, dash: null, name: 'LaLa-World' },
    ];
    ctx.save(); ctx.beginPath(); ctx.rect(ox - 20, Y(64), X(cur) - ox + 30, h + 60); ctx.clip();
    series.forEach((s) => {
      const pts = D.trainCurve[s.k].map(([m, v]) => [X(m), Y(v)]);
      H.poly(ctx, pts, { color: s.col, lw: s.k === 'lala' ? 4.5 : 3.5, dash: s.dash });
    });
    ctx.restore();
    series.forEach((s) => D.trainCurve[s.k].forEach(([m, v], i) => {
      const a = H.clamp((cur - m) / 40); if (a <= 0) return;
      H.circle(ctx, X(m), Y(v), 7, { fill: s.col, stroke: COL.bg, lw: 2, alpha: a });
      if (s.k === 'lala' || i === 3) H.text(ctx, v.toFixed(1), X(m) + (s.k === 'lala' ? -4 : 0), Y(v) + (s.k === 'lala' ? -16 : 28), { size: 16, weight: 700, color: s.col, align: 'center', alpha: a });
    }));
    // legend
    series.slice().reverse().forEach((s, i) => {
      const a = H.p(t, 0.9 + i * 0.1, 1.3 + i * 0.1), x = ox + w - 210, y = oy - 92 + i * 28;
      H.poly(ctx, [[x, y - 6], [x + 30, y - 6]], { color: s.col, lw: 3.5, dash: s.dash, alpha: a });
      H.text(ctx, s.name, x + 42, y, { size: 16, color: COL.muted, alpha: a });
    });
    // 6× callout
    const c6 = H.p(t, 3.6, 4.3, 'inOut');
    const [m0, v0] = D.trainCurve.rae5[3], [m1, v1] = D.trainCurve.lala[0];
    H.poly(ctx, [[X(m0) - 10, Y(v0)], [X(m1) + 12, Y(v0)]], { color: COL.lala, lw: 2.5, dash: [4, 6], head: 12, p: c6 });
    H.text(ctx, '6×', (X(m0) + X(m1)) / 2, Y(v0) - 14, { size: 34, weight: 800, color: COL.lala, align: 'center', alpha: H.p(t, 4.0, 4.4) });
    H.pill(ctx, T.badge1, ox + w / 2, 936, { align: 'center', size: 22, color: '#fff', bg: COL.lala, h: 52, alpha: H.p(t, 4.2, 4.7) });

    // --- DROID planning race (Fig. 6)
    const rx = 990;
    const aR = H.p(t, 0.6, 1.1);
    H.layer(ctx, aR, 0, 0, () => {
      H.text(ctx, T.raceTitle, rx, 318, { size: 22, weight: 700 });
      H.img(ctx, 'fig6_init', rx, 340, 96, 96, { r: 10, stroke: COL.stroke });
      H.text(ctx, '→', rx + 117, 395, { size: 26, color: COL.muted, align: 'center' });
      H.img(ctx, 'fig6_goal', rx + 138, 340, 96, 96, { r: 10, stroke: COL.latent });
      H.text(ctx, 'start → goal  ·  same language actions,', rx + 256, 380, { size: 16, color: COL.muted });
      H.text(ctx, 'same encoder, same data', rx + 256, 404, { size: 16, color: COL.muted });
    });
    const r0 = 4.4, r1 = 8.2; // race window (s) maps 0 → planTime.rae5
    const simT = H.clamp((t - r0) / (r1 - r0)) * D.planTime.rae5;
    const keys = ['lala', 'rae1', 'rae5'], pre = { lala: 'fig6_lala_', rae1: 'fig6_rae1_', rae5: 'fig6_rae5_' };
    keys.forEach((k, ri) => {
      const y = 470 + ri * 140, col = k === 'lala' ? COL.lala : COL.gen;
      const T0 = D.planTime[k], el = Math.min(simT, T0), f = el / T0, done = simT >= T0 && t > r0;
      H.layer(ctx, aR, 0, 0, () => {
        H.text(ctx, T.rows[ri], rx, y + 40, { size: 22, weight: 700, color: k === 'lala' ? COL.lala : COL.ink });
        if (done) H.text(ctx, `avg. perf ${D.finalPerf[k].toFixed(1)}`, rx, y + 70, { size: 16, fam: 'mono', color: COL.muted, alpha: H.p(t, r0 + (T0 / D.planTime.rae5) * (r1 - r0), r0 + (T0 / D.planTime.rae5) * (r1 - r0) + 0.3) });
        for (let i = 0; i < 3; i++) {
          const x = rx + 196 + i * 120; const show = H.clamp((f - i / 3) * 6);
          H.box(ctx, x, y, 110, 110, { r: 10, stroke: COL.stroke, dash: [5, 6], alpha: 1 - show });
          if (show > 0) H.img(ctx, `${pre[k]}${i + 1}`, x, y, 110, 110, { r: 10, alpha: show });
        }
        const tx = rx + 570, tw = 240;
        H.box(ctx, tx, y + 78, tw, 8, { r: 4, fill: 'rgba(255,255,255,0.07)' });
        H.box(ctx, tx, y + 78, Math.max(0.001, tw * (el / D.planTime.rae5)), 8, { r: 4, fill: col });
        H.text(ctx, H.fmtClock(el), tx + tw, y + 52, { size: 30, weight: 700, fam: 'mono', color: done ? col : COL.ink, align: 'right' });
        if (done && k !== 'lala') H.text(ctx, `${D.planFactor[k]} slower`, tx + tw, y + 112, { size: 16, fam: 'mono', color: COL.muted, align: 'right' });
        if (done && k === 'lala') H.check(ctx, tx + 12, y + 44, 22, COL.lala, H.p(t, r0 + 0.3, r0 + 0.6));
      });
    });
    H.text(ctx, T.note, 120, 990, { size: 15, fam: 'mono', color: COL.dim, alpha: H.p(t, 1.0, 1.5) });
    H.pill(ctx, T.badge2, rx + 405, 936, { align: 'center', size: 22, color: '#fff', bg: COL.lala, h: 52, alpha: H.p(t, r1 - 0.1, r1 + 0.4) });
  };

  /* ======================================================= 7 · POLICY */
  S.policy = (ctx, t) => {
    const T = TX.policy; H.header(ctx, t, T);
    // --- architecture (left column, Fig. 1b right / Fig. L)
    const lx = 130, lw = 490;
    const a1 = H.p(t, 0.3, 0.8), a2 = H.p(t, 0.6, 1.1), a3 = H.p(t, 0.9, 1.4);
    H.layer(ctx, a3, 0, (1 - a3) * 10, () => {
      H.box(ctx, lx, 300, 236, 80, { r: 14, fill: 'rgba(240,69,79,0.12)', stroke: COL.lala });
      H.math(ctx, 'â', 't:t+N−1', lx + 118, 336, { size: 26, align: 'center' });
      H.text(ctx, 'action chunk', lx + 118, 364, { size: 15, color: COL.muted, align: 'center' });
      H.box(ctx, lx + 254, 300, 236, 80, { r: 14, fill: COL.latentSoft, stroke: COL.latent });
      H.math(ctx, 'ê', 't+N', lx + 372, 336, { size: 26, align: 'center' });
      H.text(ctx, 'future latent', lx + 372, 364, { size: 15, color: COL.muted, align: 'center' });
    });
    H.arrow(ctx, lx + 118, 448, lx + 118, 388, { color: COL.lala, lw: 2.5, p: H.p(t, 1.0, 1.3) });
    H.arrow(ctx, lx + 372, 448, lx + 372, 388, { color: COL.latent, lw: 2.5, p: H.p(t, 1.0, 1.3) });
    H.layer(ctx, a2, 0, (1 - a2) * 10, () => {
      H.box(ctx, lx, 452, lw, 130, { r: 18, fill: COL.panel, stroke: COL.lala, lw: 2.5 });
      H.text(ctx, 'Predictor', lx + 24, 500, { size: 28, weight: 700 });
      H.text(ctx, '+ action queries → DiT action head', lx + 24, 532, { size: 16, fam: 'mono', color: COL.muted });
      H.text(ctx, '+ future queries', lx + 24, 558, { size: 16, fam: 'mono', color: COL.muted });
      H.pill(ctx, 'init: LaLa-World', lx + lw - 18, 488, { align: 'right', size: 15, color: '#fff', bg: COL.lala, weight: 700 });
    });
    H.arrow(ctx, lx + 118, 652, lx + 118, 590, { color: COL.muted, lw: 2.5, p: H.p(t, 0.8, 1.1) });
    H.arrow(ctx, lx + 372, 690, lx + 372, 590, { color: COL.muted, lw: 2.5, p: H.p(t, 0.8, 1.1) });
    H.layer(ctx, a1, 0, (1 - a1) * 10, () => {
      H.box(ctx, lx, 656, 236, 70, { r: 14, fill: COL.panelHi, stroke: COL.stroke });
      H.text(ctx, 'Encoder', lx + 118, 699, { size: 22, weight: 700, align: 'center' });
      H.img(ctx, 'fig7_libero_init', lx + 38, 768, 160, 120, { r: 10, stroke: COL.stroke });
      H.math(ctx, 'x', 't', lx + 118, 918, { size: 24, align: 'center', color: COL.muted });
      H.box(ctx, lx + 254, 694, 236, 194, { r: 14, fill: COL.panelHi, stroke: COL.stroke });
      H.math(ctx, 'ℓ', '', lx + 274, 730, { size: 26, color: COL.lala });
      H.para(ctx, T.instruction, lx + 274, 764, 200, { size: 17, fam: 'mono', color: COL.ink, lh: 24 });
    });
    H.arrow(ctx, lx + 118, 764, lx + 118, 732, { color: COL.muted, lw: 2.2, head: 10, p: H.p(t, 0.6, 0.9) });

    // --- Fig. 7 rollout (right)
    const fx = 690, fw = 176, fg = 10, gy = 300, py = gy + fw + 12;
    const aF = H.p(t, 0.5, 1.0);
    for (let k = 0; k < 6; k++) {
      const x = fx + k * (fw + fg); const s = H.p(t, 1.0 + k * 0.38, 1.35 + k * 0.38);
      H.box(ctx, x, gy, fw, fw, { r: 10, stroke: COL.stroke, dash: [5, 6], alpha: aF * (1 - s) });
      H.box(ctx, x, py, fw, fw, { r: 10, stroke: COL.stroke, dash: [5, 6], alpha: aF * (1 - s) });
      H.img(ctx, `fig7_libero_gt_${k + 1}`, x, gy, fw, fw, { r: 10, alpha: s });
      H.img(ctx, `fig7_libero_pred_${k + 1}`, x, py, fw, fw, { r: 10, alpha: s, stroke: s >= 1 ? 'rgba(53,208,186,0.5)' : null });
      H.text(ctx, `+${k + 1}N`, x + fw - 10, gy + fw - 12, { size: 14, fam: 'mono', weight: 600, color: '#fff', align: 'right', alpha: s * 0.9 });
    }
    H.pill(ctx, T.gtLabel, fx + 10, gy + 22, { size: 15, color: COL.ink, bg: 'rgba(11,14,20,0.75)', alpha: aF, h: 30 });
    H.pill(ctx, T.predLabel, fx + 10, py + 22, { size: 15, color: COL.latent, bg: 'rgba(11,14,20,0.75)', alpha: aF, h: 30 });

    // --- stat cards (Tables 2–4)
    const cy = 696, ch = 238, cg = 18, cw = (1110 - 2 * cg) / 3;
    const cards = [
      { title: 'LIBERO success', big: `${D.policy[0].lala}%`, bars: [[D.policy[0].lala, 100, 'LaLa-Policy'], [D.policy[0].cosmos, 100, 'Cosmos Policy']], unit: '%' },
      { title: 'RoboCasa success · 50 demos', big: `${D.policy[1].lala}%`, bars: [[D.policy[1].lala, 100, 'LaLa-Policy'], [D.policy[1].cosmos, 100, 'Cosmos Policy']], unit: '%' },
      { title: 'Inference / trajectory · RoboCasa', big: `${D.infer[1].x} faster`, bars: [[D.infer[1].lala, D.infer[1].cosmos, 'LaLa-Policy'], [D.infer[1].cosmos, D.infer[1].cosmos, 'Cosmos Policy']], unit: ' s' },
    ];
    cards.forEach((c, i) => {
      const s = 3.6 + i * 0.25, a = H.p(t, s, s + 0.5), x = fx + i * (cw + cg);
      H.layer(ctx, a, 0, (1 - a) * 16, () => {
        H.box(ctx, x, cy, cw, ch, { r: 18, fill: COL.panel, stroke: COL.stroke });
        H.text(ctx, c.title, x + 22, cy + 38, { size: 17, weight: 600, color: COL.muted });
        H.text(ctx, c.big, x + 22, cy + 96, { size: 44, weight: 800, color: COL.lala });
        c.bars.forEach(([v, max, name], j) => {
          const y = cy + 130 + j * 48, g = H.p(t, s + 0.3 + j * 0.1, s + 1.1 + j * 0.1), bw = cw - 44;
          H.text(ctx, name, x + 22, y + 4, { size: 15, color: j ? COL.muted : COL.ink, weight: j ? 500 : 600 });
          H.text(ctx, `${v.toFixed(c.unit === '%' ? 1 : 2)}${c.unit}`, x + cw - 22, y + 4, { size: 15, fam: 'mono', color: j ? COL.muted : COL.ink, align: 'right', weight: 600 });
          H.box(ctx, x + 22, y + 14, bw, 9, { r: 4.5, fill: 'rgba(255,255,255,0.06)' });
          H.box(ctx, x + 22, y + 14, Math.max(0.001, bw * (v / max) * g), 9, { r: 4.5, fill: j ? COL.gen : COL.lala });
        });
      });
    });
    H.text(ctx, T.note, fx, 990, { size: 15, fam: 'mono', color: COL.dim, alpha: H.p(t, 3.6, 4.1) });
  };

  /* ======================================================== 8 · OUTRO */
  S.outro = (ctx, t) => {
    wordmark(ctx, 960, 340, 120, 0.1, t);
    const lines = TX.outro.lines, size = 30;
    const maxW = Math.max(...lines.map((l) => H.measure(ctx, l, { size, weight: 500 })));
    const x0 = 960 - (maxW + 40) / 2;
    lines.forEach((l, i) => {
      const a = H.p(t, 0.45 + i * 0.22, 0.95 + i * 0.22), y = 470 + i * 70;
      H.layer(ctx, a, (1 - a) * -20, 0, () => {
        H.circle(ctx, x0 + 8, y - 10, 7, { fill: i % 2 ? COL.latent : COL.lala });
        H.text(ctx, l, x0 + 40, y, { size, weight: 500 });
      });
    });
    H.pill(ctx, TX.venue, 960, 800, { align: 'center', size: 18, fam: 'mono', color: COL.muted, bg: 'rgba(255,255,255,0.04)', stroke: COL.stroke, weight: 500, alpha: H.p(t, 1.6, 2.1) });
  };
})();
