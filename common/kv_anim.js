/* Part 1 animations: KVzip and Fast KVzip.
   Each block draws into one <svg id="..."> on a slide and registers an animation with DeckAnim.add(name, ...).
   The slide plays it on entry via data-anim="name". Timings are in seconds; numbers marked ≈ are read off
   the papers' plots. Illustrative toy data (token lists, scores) is labelled as such on the slides. */
(function () {
'use strict';
if (!window.DeckAnim) return;
const { E, T, rng, clamp, p, lin, mix, arrow, head, C } = DeckAnim.svg;
const $ = (id) => document.getElementById(id);
const line = (par, x1, y1, x2, y2, a) => E('line', Object.assign({ x1, y1, x2, y2, stroke: C.mut, 'stroke-width': 2 }, a || {}), par);
const op = (el, v) => el.setAttribute('opacity', v.toFixed(3));
const blueScale = (v) => mix('#D6E2F7', '#1C4CA6', clamp(v));

/* ============================================================== 1. KV cache grows with context */
(function () {
  const s = $('ch-kvmem'); if (!s) return;
  const L = 88, R = 680, Tp = 24, B = 380, xm = 200000, ym = 28, FS = 24.5;   // drawn at ≈0.95×, so 24.5 ≈ 23 px
  const X = (v) => L + v / xm * (R - L), Y = (v) => B - v / ym * (B - Tp);
  const perTok = 131072 / 1e9, wts = 16.06, xc = wts / perTok, x170 = 170000;   // Llama-3-8B fp16: 128 KB / token
  [0, 8, 16, 24].forEach((v) => { line(s, L, Y(v), R, Y(v), { stroke: C.grid, 'stroke-width': 1 }); T(s, L - 10, Y(v) + 8, v + ' GB', { 'text-anchor': 'end', 'font-size': FS, fill: C.mut }); });
  [0, 50000, 100000, 150000, 200000].forEach((v) => T(s, X(v), B + 30, v ? v / 1000 + 'K' : '0', { 'text-anchor': 'middle', 'font-size': FS, fill: C.mut }));
  T(s, (L + R) / 2, B + 66, 'Context length (tokens)', { 'text-anchor': 'middle', 'font-size': FS, fill: C.ink });
  line(s, X(0), Y(wts), R, Y(wts), { stroke: '#777', 'stroke-dasharray': '7 6' });
  T(s, L + 8, Y(wts) - 10, 'Model weights ≈ 16 GB', { 'font-size': FS, fill: '#555' });
  const area = E('path', { fill: C.blueSoft, 'fill-opacity': 0.35 }, s);
  const ln = E('line', { x1: X(0), y1: Y(0), stroke: C.blue, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, s);
  const dot = E('circle', { r: 7, fill: C.blue }, s);
  const lbl = T(s, 0, 0, '', { 'text-anchor': 'end', 'font-size': FS, 'font-weight': 700, fill: C.blue, 'font-variant-numeric': 'tabular-nums' });
  const kvL = T(s, X(xm) - 6, Y(xm * perTok) - 14, 'KV cache', { 'text-anchor': 'end', 'font-size': FS, 'font-weight': 700, fill: C.blue });
  const cross = E('g', {}, s);
  E('circle', { cx: X(xc), cy: Y(wts), r: 8, fill: C.red }, cross);
  T(cross, X(xc) + 14, Y(wts) + 34, '≈123K tokens:', { 'font-size': FS, 'font-weight': 700, fill: C.red });
  T(cross, X(xc) + 14, Y(wts) + 63, 'KV cache = model', { 'font-size': FS, 'font-weight': 700, fill: C.red });
  const k170 = E('g', {}, s);
  E('circle', { cx: X(x170), cy: Y(x170 * perTok), r: 6, fill: C.ink }, k170);
  T(k170, X(x170) - 12, Y(x170 * perTok) - 12, '170K → 22.3 GB', { 'text-anchor': 'end', 'font-size': FS, fill: C.ink });
  line(s, L, B, R, B, { stroke: '#333', 'stroke-width': 1.5 }); line(s, L, Tp, L, B, { stroke: '#333', 'stroke-width': 1.5 });
  DeckAnim.add('kvgrow', { dur: 3.6, render(t) {
    const xv = xm * lin(t, 0.2, 3.0), yv = xv * perTok;
    area.setAttribute('d', `M${X(0)} ${Y(0)} L${X(xv)} ${Y(yv)} L${X(xv)} ${Y(0)}Z`);
    ln.setAttribute('x2', X(xv)); ln.setAttribute('y2', Y(yv));
    dot.setAttribute('cx', X(xv)); dot.setAttribute('cy', Y(yv)); op(dot, 1 - p(t, 3.1, 3.5));
    lbl.setAttribute('x', X(xv) - 12); lbl.setAttribute('y', Y(yv) - 14);
    lbl.textContent = `${Math.round(xv / 1000)}K tokens · ${yv.toFixed(1)} GB`; op(lbl, (xv > 9000 ? 1 : 0) * (1 - p(t, 3.1, 3.5)));
    op(kvL, p(t, 3.1, 3.5)); op(cross, clamp((xv - xc) / 6000)); op(k170, clamp((xv - x170) / 6000) * p(t, 3.1, 3.5));
  } });
})();

/* ============================================================== 2. Query-aware vs query-agnostic (no timeline: → reveals one step at a time) */
(function () {
  const s = $('ch-qaware'); if (!s) return;
  const step = (n) => E('g', { class: 'f', 'data-f': n }, s);   // deck.js turns class "f" into click steps
  const FS = 23;                                        // ideal-compression text matches the deck’s body type
  const W = 240, Hh = 118, P = 20;                      // 12 × 6 cache cells of 18 px on a 20 px pitch
  const cell = (g, x, y, i, j, fill) => E('rect', { x: x + j * P, y: y + i * P, width: 18, height: 18, rx: 2, fill }, g);
  const cache = (g, x, y) => { for (let i = 0; i < 6; i++) for (let j = 0; j < 12; j++) cell(g, x, y, i, j, C.blueSoft); };
  const evict = (g, x, y, seed) => {                    // grey out ~2/3 of the cells in place
    const r = rng(seed);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 12; j++) if (r() >= 0.33) cell(g, x, y, i, j, C.grayL);
  };
  const query = (g, x, y, label) => {                   // query tokens appended after the cache
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) cell(g, x, y, i, j, '#EFA59D');
    T(g, x + 19, y - 10, label, { 'text-anchor': 'middle', 'font-size': FS, 'font-weight': 700, fill: C.red });
  };
  const answer = (g, cx, y, label, w = 126) => {        // pill centred on cx
    E('rect', { x: cx - w / 2, y: y - 18, width: w, height: 36, rx: 18, fill: '#E7F4EC', stroke: C.green, 'stroke-width': 1.5 }, g);
    T(g, cx, y + 8, label, { 'text-anchor': 'middle', 'font-size': FS, 'font-weight': 700, fill: C.green });
  };
  const note = (g, x, y, lines, cover) => {             // caption under a cache; a later step paints over the earlier one
    if (cover) E('rect', { x: x - 2, y: y - 22, width: 320, height: 30 * lines.length, fill: '#fff' }, g);
    lines.forEach((str, i) => T(g, x, y + i * 28, str, { 'font-size': FS, fill: C.mut }));
  };
  const count = (g, x, str, cover) => {
    if (cover) E('rect', { x: x - 2, y: 476, width: 440, height: 32, fill: '#fff' }, g);
    T(g, x, 500, str, { 'font-size': FS, fill: C.ink, 'font-weight': 600 });
  };

  // left: query-aware. Evict for this query, answer it, then start over for the next query
  T(s, 10, 30, 'Query-aware eviction', { 'font-size': 26, 'font-weight': 700, fill: C.ink });
  T(s, 10, 64, 'score KV pairs with attention from the current query', { 'font-size': FS, fill: C.mut });
  const qx = 10 + W + 8, y1 = 104, y2 = 290;
  cache(s, 10, y1); note(s, 10, y1 + Hh + 30, ['prefilled KV cache']);
  query(step(1), qx, y1, 'query 1');                    // → 1: query 1 arrives
  const b1 = step(2);                                   // → 2: the cache is evicted for it, then it is answered
  evict(b1, 10, y1, 11); note(b1, 10, y1 + Hh + 30, ['evicted for query 1'], true);
  arrow(b1, qx + 50, y1 + Hh / 2, qx + 92, y1 + Hh / 2, '#777', 2); answer(b1, qx + 162, y1 + Hh / 2, 'answer 1', 124);
  count(b1, 10, 'prefill + eviction passes: 1');
  const a2 = step(3);                                   // → 3: query 2 needs the full cache again
  cache(a2, 10, y2); query(a2, qx, y2, 'query 2');
  const b2 = step(4);                                   // → 4: evict again, answer
  evict(b2, 10, y2, 23); note(b2, 10, y2 + Hh + 30, ['evicted for query 2']);
  arrow(b2, qx + 50, y2 + Hh / 2, qx + 92, y2 + Hh / 2, '#777', 2); answer(b2, qx + 162, y2 + Hh / 2, 'answer 2', 124);
  count(b2, 10, 'prefill + eviction passes: 2', true);
  T(b2, 10, 540, '✗ every new query → prefill and evict again', { 'font-size': FS, fill: C.red });
  const c2 = step(3);                                   // drawn last so it stays above the greyed cells
  E('rect', { x: 4, y: y2 - 6, width: W + 12, height: Hh + 12, rx: 6, fill: 'none', stroke: C.red, 'stroke-width': 3 }, c2);
  E('rect', { x: 40, y: y2 + Hh / 2 - 18, width: 180, height: 36, rx: 18, fill: C.red }, c2);
  T(c2, 130, y2 + Hh / 2 + 8, 'prefill again', { 'text-anchor': 'middle', 'font-size': FS, 'font-weight': 700, fill: '#fff' });

  // right: query-agnostic. Compress once, then attach any number of queries to the same cache
  line(s, 676, 40, 676, 540, { stroke: '#DDD', 'stroke-width': 1.5 });
  const ox = 706;
  T(s, ox, 30, 'Query-agnostic (KVzip)', { 'font-size': 26, 'font-weight': 700, fill: C.ink });
  T(s, ox, 64, 'compress once, reuse the cache for any future query', { 'font-size': FS, fill: C.mut });
  cache(s, ox, y1); note(s, ox, y1 + Hh + 30, ['prefilled KV cache']);
  const z = step(5);                                    // → 5: evicted once, before any query is known
  evict(z, ox, y1, 7); note(z, ox, y1 + Hh + 30, ['compressed once,', 'before any query'], true);
  count(z, ox, 'prefill + compression passes: 1');
  const q = step(6);                                    // → 6: every query attaches to the same compressed cache
  [1, 2, 3].forEach((k, i) => {
    const x = ox + W + 6 + i * 130, cx = x + 19;
    query(q, x, y1, 'query ' + k);
    arrow(q, cx, y1 + Hh + 6, cx, y1 + Hh + 36, '#777', 2);
    answer(q, cx, y1 + Hh + 58, 'answer ' + k);
  });
  T(q, ox, 540, '✓ one compressed cache serves every query', { 'font-size': FS, fill: C.green });
})();

/* ============================================================== 2b. KVzip idea: ideal zip → unzip, then the one-pass proxy (static; → reveals each step) */
(function () {
  const s = $('ch-kvzipidea'); if (!s) return;
  const step = (n) => (n ? E('g', { class: 'f', 'data-f': n }, s) : E('g', {}, s));
  const FS = 23;                                        // ideal-compression text matches the deck’s body type
  const toks = ['The', 'Eiffel', 'Tower', 'in', 'Paris', 'was', 'completed', 'in', '1889', '.'];
  // toy scores: max attention each context token's KV pair receives from the copy
  const w = [0.3, 0.9, 0.8, 0.15, 0.95, 0.2, 0.6, 0.15, 0.95, 0.1];
  const NT = toks.length, NH = 6, r = rng(3), flat = [];
  for (let h = 0; h < NH; h++) for (let c = 0; c < NT; c++) flat.push({ h, c, v: w[c] * (0.45 + 0.75 * r()) });
  const vmax = Math.max(...flat.map((f) => f.v));
  [...flat].sort((a, b) => b.v - a.v).forEach((f, i) => { f.keep = i < Math.round(flat.length * 0.3); });
  const MW = NT * 17 - 3, MH = NH * 14 - 3;           // a compressed cache: 10 tokens × 6 heads, evicted cells dashed
  const mini = (g, x, y, kept) => flat.forEach((f) => E('rect', Object.assign({ x: x + f.c * 17, y: y + f.h * 14, width: 14, height: 11, rx: 2 },
    f.keep ? { fill: kept(f) } : { fill: '#fff', stroke: '#C8C8C8', 'stroke-dasharray': '3 2' }), g));
  const txt = (g, x, y, str, a) => T(g, x, y, str, Object.assign({ 'text-anchor': 'middle', 'font-size': FS, fill: C.ink }, a || {}));
  const rich = (g, y, parts) => {                       // one line of text with bold / colored runs: [[str, attrs], ...]
    const t = E('text', { x: 0, y, 'font-size': FS, fill: C.mut }, g);
    parts.forEach(([str, a]) => { E('tspan', a || {}, t).textContent = str; });
  };
  const RY = 96, RH = 82, AY = RY + RH / 2, CY = RY + RH + 30;   // the ideal row: boxes, arrows, captions
  const card = (g, x) => {
    E('rect', { x, y: RY, width: 300, height: RH, rx: 8, fill: '#fff', stroke: '#9a9a9a', 'stroke-width': 1.5 }, g);
    ['The Eiffel Tower in Paris', 'was completed in 1889.'].forEach((str, i) => txt(g, x + 150, RY + 34 + i * 30, str));
  };
  const llm = (g, x, sub) => {
    E('rect', { x, y: RY + 17, width: 100, height: 48, rx: 8, fill: '#E8E8E8', stroke: '#9a9a9a', 'stroke-width': 1.5 }, g);
    txt(g, x + 50, RY + 49, 'LLM', { 'font-weight': 700 });
    txt(g, x + 50, CY, sub, { fill: C.mut });
  };
  const right = (g, x1, x2, y = AY) => arrow(g, x1, y, x2, y, '#888', 2);
  const pill = (g, cx, y, wd, label) => {
    E('rect', { x: cx - wd / 2, y, width: wd, height: 34, rx: 17, fill: '#FBE3E0', stroke: C.red, 'stroke-width': 1.5 }, g);
    txt(g, cx, y + 25, label, { 'font-weight': 700, fill: C.red });
  };

  // 0 · Ideal: the LLM zips the context into a small cache and unzips it back from that cache alone
  const a0 = step(0), MX = 524, L2 = 774;              // caption centres sit ≥ 20 px apart at 23 px
  rich(a0, 26, [['Ideal compression', { 'font-weight': 700, fill: C.ink }], [':  the compressed cache alone reconstructs the original context (zip → unzip)']]);
  card(a0, 0); txt(a0, 150, CY, 'context', { 'font-weight': 700, fill: C.green });
  right(a0, 308, 344); llm(a0, 352, 'encode ≈ zip');
  right(a0, 460, 516);
  mini(a0, MX, RY, () => C.kv);
  txt(a0, MX + MW / 2, CY, 'compressed KV cache', { 'font-weight': 700 });
  txt(a0, MX + MW / 2, CY + 28, 'the “zipped” context', { fill: C.mut });
  right(a0, MX + MW + 8, L2 - 8); llm(a0, L2, 'decode ≈ unzip');
  pill(a0, L2 + 50, 46, 350, 'Repeat the previous context:');
  arrow(a0, L2 + 50, 82, L2 + 50, RY + 15, C.red, 1.5);
  right(a0, L2 + 108, 916); card(a0, 924);
  txt(a0, 1074, CY, '✓ identical to the original', { 'font-weight': 700, fill: C.green });

  // 1 · …but searching for that subset directly is hard
  const a1 = step(1);
  E('rect', { x: MX - 9, y: RY - 9, width: MW + 18, height: MH + 18, rx: 8, fill: 'none', stroke: C.red, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, a1);
  E('circle', { cx: MX - 9, cy: RY - 9, r: 15, fill: C.red }, a1);
  txt(a1, MX - 9, RY - 1, '?', { 'font-weight': 700, fill: '#fff' });
  rich(a1, 274, [['✗ Hard to optimize directly: ', { 'font-weight': 700, fill: C.red }], ['choosing k of n ≈ 30M KV pairs is combinatorial,', { fill: C.ink }]]);
  rich(a1, 304, [['and checking each candidate takes a forward pass.', { fill: C.ink }]]);

  // 2 · Restore the earlier proxy layout: context → repeat prompt → copy on one row.
  // Vertical spacing fits below the unchanged ideal-compression explanation above.
  const Y = v => 326 + (v - 252) * 0.88;
  const widths = [44, 51, 59, 31, 52, 45, 85, 31, 51, 24], tx = [];
  widths.reduce((x, wd) => { tx.push(x); return x + wd + 4; }, 0);
  const CW = tx[NT - 1] + widths[NT - 1], PX = CW + 14, PW = 216, COPY = PX + PW + 14;
  const TY = Y(388), TH = 30, GY = Y(460), GH = NH * 12 - 3;
  const label = (g, x, y, str, a) => txt(g, x, y, str, Object.assign({ 'font-size': 16 }, a || {}));
  const b2 = step(2);
  line(b2, 0, 326, 1312, 326, { stroke: C.grid, 'stroke-width': 1.5 });
  rich(b2, 362, [['KVzip: a tractable proxy', { 'font-weight': 700, fill: C.ink }], [' — one forward pass over the context, the repeat prompt and a copy']]);
  toks.forEach((t, i) => {
    E('rect', { x: tx[i], y: TY, width: widths[i], height: TH, rx: 5, fill: '#E9F3E2', stroke: C.kvD, 'stroke-width': 1.5 }, b2);
    label(b2, tx[i] + widths[i] / 2, TY + 21, t);
    E('rect', { x: COPY + tx[i], y: TY, width: widths[i], height: TH, rx: 5, fill: '#FFF8F7', stroke: C.red, 'stroke-width': 1.5 }, b2);
    label(b2, COPY + tx[i] + widths[i] / 2, TY + 21, t);
  });
  E('rect', { x: PX, y: TY, width: PW, height: TH, rx: 5, fill: '#FBE3E0', stroke: C.red, 'stroke-width': 1.5 }, b2);
  label(b2, PX + PW / 2, TY + 21, 'Repeat the previous context:', { 'font-size': 15, 'font-weight': 700, fill: C.red });
  label(b2, CW / 2, TY + 52, 'context', { 'font-weight': 700, fill: C.green });
  label(b2, PX + PW / 2, TY + 52, 'repeat prompt', { fill: C.red });
  label(b2, COPY + CW / 2, TY + 52, 'copy of the context (teacher-forced)', { fill: C.red });

  // 3 · Curved attention paths point back from the copy; show a separate score for every head/token.
  const b3 = step(3), AY2 = TY - 4, APEX = TY - 104;
  toks.forEach((t, c) => {
    const top = Math.max(...flat.filter(f => f.c === c).map(f => f.v)) / vmax;
    const x = tx[c] + widths[c] / 2, from = COPY + x, mid = (from + x) / 2;
    const col = mix('#F4B6AE', C.red, top), sw = 1 + 3 * top;
    E('path', { d: `M${from} ${AY2} Q${mid} ${APEX} ${x} ${AY2}`, fill: 'none', stroke: col, 'stroke-width': sw }, b3);
    head(b3, x, AY2, Math.atan2(AY2 - APEX, x - mid), 7 + sw, col);
  });
  T(b3, 1312, Y(330), '← the copy attends back to the context', { 'font-size': 16, fill: C.red, 'text-anchor': 'end' });
  flat.forEach(f => E('rect', { x: tx[f.c], y: GY + f.h * 12, width: widths[f.c], height: 9, rx: 2, fill: blueScale(f.v / vmax) }, b3));
  label(b3, CW / 2, Y(569), 'importance = max attention a KV pair gets from the copy', { 'font-weight': 700 });
  label(b3, CW / 2, Y(589), 'one row per head · darker = more attention', { 'font-size': 15, fill: C.mut });

  // 4 · Evict the low-scoring KV pairs, then reuse this cache for different future queries.
  const b4 = step(4), gx = CW + 78, gy = GY, qx = 864, cy = gy + GH / 2;
  arrow(b4, CW + 8, cy, gx - 8, cy, '#888', 2);
  label(b4, (CW + gx) / 2, cy - 10, 'evict', { fill: C.mut });
  flat.forEach(f => E('rect', Object.assign({ x: gx + f.c * 17, y: gy + f.h * 12, width: 14, height: 9, rx: 2 },
    f.keep ? { fill: blueScale(f.v / vmax) } : { fill: '#fff', stroke: '#C8C8C8', 'stroke-dasharray': '3 2' }), b4));
  label(b4, gx + MW / 2, Y(569), 'compressed KV cache', { 'font-weight': 700 });
  label(b4, gx + MW / 2, Y(589), 'keep the top 30%', { 'font-size': 15, fill: C.mut });
  ['query 1', 'query 2', 'query 3'].forEach((text, i) => {
    const qy = gy + i * 26;
    arrow(b4, qx - 4, qy + 12, gx + MW + 8, cy, C.red, 1.5);
    E('rect', { x: qx, y: qy, width: 94, height: 24, rx: 12, fill: '#FBE3E0', stroke: C.red, 'stroke-width': 1.5 }, b4);
    label(b4, qx + 47, qy + 17, text, { 'font-weight': 700, fill: C.red });
  });
  label(b4, qx + 90, Y(569), '✓ one cache serves any future query', { 'font-weight': 700, fill: C.green });
  label(b4, qx + 90, Y(589), 'no new prefill or scoring per query', { 'font-size': 15, fill: C.mut });
})();

/* ============================================================== 3. KVzip in motion (illustrative toy example) */
(function () {
  const s = $('ch-kvzipflow'); if (!s) return;
  const toks = ['The', 'Eiffel', 'Tower', 'in', 'Paris', 'was', 'completed', 'in', '1889', 'and', 'is', '330 m', 'tall'];
  const NT = toks.length, NH = 6, x0 = 120, cw = 60, st = 66, ch = 34, rs = 40, gy = 98, ty = 26, ry = 394;
  const cx = (c) => x0 + c * st, cy = (h) => gy + h * rs;
  // importance = max attention a KV pair receives while the model repeats the context (toy values)
  const w = [0.35, 0.9, 0.85, 0.15, 0.95, 0.2, 0.6, 0.15, 0.95, 0.12, 0.18, 0.95, 0.7];
  const r = rng(5), I = [];
  for (let h = 0; h < NH; h++) { I.push(w.map((v) => v * (0.45 + 0.75 * r()))); }
  I[0][0] = 1.0;
  [[4, [1, 3]], [8, [2, 4]], [11, [0, 5]], [12, [3]]].forEach(([c, hs]) => hs.forEach((h) => { I[h][c] = Math.max(I[h][c], 0.92); }));
  const flat = []; for (let h = 0; h < NH; h++) for (let c = 0; c < NT; c++) flat.push({ h, c, v: I[h][c] });
  const Imax = Math.max(...flat.map((f) => f.v));
  const keepN = Math.round(flat.length * 0.3);
  const sorted = [...flat].sort((a, b) => b.v - a.v); sorted.forEach((f, i) => { f.keep = i < keepN; });
  const evictOrder = flat.filter((f) => !f.keep).sort((a, b) => a.v - b.v); evictOrder.forEach((f, i) => { f.ev = i / (evictOrder.length - 1); });
  const kern = (d) => (d === 0 ? 1 : Math.abs(d) === 1 ? 0.45 : Math.abs(d) === 2 ? 0.15 : 0);
  const PH = [0, 2.6, 7.6, 9.6, 14.2];                 // phase starts: prefill, reconstruct, evict, reuse, end
  const at = (i) => 0.25 + 0.16 * i, bt = (j) => 3.0 + 0.33 * j, et = (f) => 7.8 + 1.4 * f.ev, qt = (q) => 9.8 + 1.3 * q;

  // labels
  T(s, 0, ty + 23, 'Context', { 'font-size': 17, 'font-weight': 700, fill: C.ink });
  T(s, 0, gy + 104, 'KV cache', { 'font-size': 17, 'font-weight': 700, fill: C.ink });
  T(s, 0, gy + 126, '6 heads ×', { 'font-size': 14, fill: C.mut }); T(s, 0, gy + 144, '13 tokens', { 'font-size': 14, fill: C.mut });
  const promptG = E('g', {}, s);
  T(promptG, 0, ry + 14, 'Repeat the', { 'font-size': 14, 'font-weight': 700, fill: C.red });
  T(promptG, 0, ry + 31, 'context:', { 'font-size': 14, 'font-weight': 700, fill: C.red });
  const pill = (x, y, label, g) => { const r0 = E('rect', { x, y, width: cw, height: ch, rx: 7, fill: '#fff', stroke: '#9a9a9a', 'stroke-width': 1.5 }, g); T(g, x + cw / 2, y + 22, label, { 'text-anchor': 'middle', 'font-size': label.length > 7 ? 12 : 14, fill: C.ink }); return r0; };
  const ctxT = toks.map((tk, c) => { const g = E('g', {}, s); const rr = pill(cx(c), ty, tk, g); return { g, rr }; });
  const cells = flat.map((f) => { const el = E('rect', { x: cx(f.c), y: cy(f.h), width: cw, height: ch, rx: 4 }, s); return Object.assign(f, { el }); });
  const recT = toks.map((tk, j) => { const g = E('g', {}, s); const rr = pill(cx(j), ry, tk, g); return { g, rr }; });
  // attention lines: each repeated token attends to its own KV column (and its neighbour)
  const att = toks.map((_, j) => {
    const own = flat.filter((f) => f.c === j).sort((a, b) => b.v - a.v).slice(0, 2);
    const nb = j > 0 ? flat.filter((f) => f.c === j - 1).sort((a, b) => b.v - a.v).slice(0, 1) : [];
    const g = E('g', {}, s);
    [...own, ...nb].forEach((f, k) => E('path', { d: `M${cx(j) + cw / 2} ${ry - 2} C ${cx(j) + cw / 2} ${ry - 40}, ${cx(f.c) + cw / 2} ${cy(f.h) + ch + 40}, ${cx(f.c) + cw / 2} ${cy(f.h) + ch / 2}`, fill: 'none', stroke: C.red, 'stroke-width': k < 2 ? 2.4 : 1.4, 'stroke-opacity': k < 2 ? 0.85 : 0.45 }, g));
    return g;
  });
  // right panel: phase text + queries
  const px = 1010;
  const phTitle = T(s, px, 40, '', { 'font-size': 21, 'font-weight': 700, fill: C.ink });
  const phLines = [0, 1, 2, 3].map((i) => T(s, px, 68 + i * 22, '', { 'font-size': 16, fill: '#444' }));
  const counter = T(s, px, 170, '', { 'font-size': 17, 'font-weight': 700, fill: C.blue, 'font-variant-numeric': 'tabular-nums' });
  const PT = [
    ['1 · Prefill', ['Encode the context once.', 'Each token writes a key and', 'a value in every head.']],
    ['2 · Reconstruct', ['Prompt “Repeat the previous', 'context” and feed it again', '(one teacher-forced pass).', 'Keep each KV pair’s max attention.']],
    ['3 · Evict', ['Drop the KV pairs that', 'reconstruction barely used.', 'Here: keep 30%.']],
    ['4 · Reuse', ['Any later question reads the', 'same compressed cache.']],
  ];
  const QS = [['Where is the Eiffel Tower?', 'Paris', [4]], ['When was it completed?', '1889', [8]], ['How tall is it?', '330 m', [11, 12]]];
  const qEls = QS.map(([q, a, cols], i) => {
    const y = 214 + i * 84, g = E('g', {}, s);
    E('rect', { x: px, y, width: 296, height: 64, rx: 10, fill: '#FFF8F7', stroke: C.red, 'stroke-width': 1.5 }, g);
    T(g, px + 14, y + 26, 'Q: ' + q, { 'font-size': 15, fill: C.ink });
    const ans = E('g', {}, g); T(ans, px + 14, y + 50, '→ ' + a, { 'font-size': 17, 'font-weight': 700, fill: C.red });
    const rings = E('g', {}, s);
    cols.forEach((c) => flat.filter((f) => f.c === c && f.keep).forEach((f) => E('rect', { x: cx(c) - 3, y: cy(f.h) - 3, width: cw + 6, height: ch + 6, rx: 6, fill: 'none', stroke: C.red, 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke' }, rings)));
    return { g, ans, rings, cols };
  });
  const chips = [...document.querySelectorAll('#kvz-chips [data-seek]')];

  DeckAnim.add('kvzip', { dur: 14.2, render(t) {
    const ph = t < PH[1] ? 0 : t < PH[2] ? 1 : t < PH[3] ? 2 : 3;
    phTitle.textContent = PT[ph][0]; phLines.forEach((el, i) => { el.textContent = PT[ph][1][i] || ''; });
    chips.forEach((b, i) => b.setAttribute('aria-pressed', String(i === ph)));
    ctxT.forEach((o, c) => { op(o.g, p(t, at(c), at(c) + 0.25)); const hot = qEls.some((q, qi) => QS[qi][2].includes(c) && t >= qt(qi)); o.rr.setAttribute('stroke', hot ? C.red : '#9a9a9a'); o.rr.setAttribute('stroke-width', hot ? 2.5 : 1.5); });
    op(promptG, p(t, 2.6, 3.0));
    recT.forEach((o, j) => { op(o.g, p(t, bt(j), bt(j) + 0.2)); const act = t >= bt(j) && t < bt(j) + 0.45; o.rr.setAttribute('stroke', act ? C.red : '#9a9a9a'); o.rr.setAttribute('stroke-width', act ? 2.5 : 1.5); });
    att.forEach((g, j) => op(g, p(t, bt(j), bt(j) + 0.12) * (1 - lin(t, bt(j) + 0.35, bt(j) + 0.75))));
    let kept = 0;
    cells.forEach((f) => {
      const shown = p(t, at(f.c) + 0.1, at(f.c) + 0.4);
      let sc = 0, started = false;
      for (let j = Math.max(0, f.c - 2); j <= Math.min(NT - 1, f.c + 2); j++) { if (t >= bt(j)) { started = true; sc = Math.max(sc, f.v * kern(j - f.c) * lin(t, bt(j), bt(j) + 0.25)); } }
      let fill = started ? blueScale(sc / Imax) : C.kv;
      const gone = f.keep ? 0 : p(t, et(f), et(f) + 0.3);
      if (!f.keep && t >= et(f)) fill = mix(fill, '#FFFFFF', gone);
      f.el.setAttribute('fill', fill); op(f.el, shown);
      f.el.setAttribute('stroke', gone > 0.5 ? '#C8C8C8' : 'none'); f.el.setAttribute('stroke-dasharray', '4 3');
      if (gone < 0.5) kept++;
    });
    counter.textContent = t < PH[2] ? '' : `${kept} / ${flat.length} KV pairs kept`;
    qEls.forEach((q, i) => { op(q.g, p(t, qt(i), qt(i) + 0.3)); const pulse = 1 + 0.6 * Math.sin(Math.PI * lin(t, qt(i) + 0.2, qt(i) + 1.0)); op(q.rings, p(t, qt(i) + 0.2, qt(i) + 0.5)); q.rings.setAttribute('stroke-width', pulse.toFixed(2)); op(q.ans, p(t, qt(i) + 0.6, qt(i) + 0.9)); });
  } });
})();

/* ============================================================== 4. Importance heat map (budget sweep) */
(function () {
  const s = $('ch-kvheat'); if (!s) return;
  const toks = ['The', 'Eiffel', 'Tower', ',', 'completed', 'in', '1889', ',', 'is', '330', 'm', 'tall', 'and', 'stands', 'on', 'the', 'Champ', 'de', 'Mars', 'in', 'Paris', '.'];
  const w = [0.55, 0.95, 0.9, 0.15, 0.5, 0.2, 0.95, 0.15, 0.25, 0.95, 0.6, 0.7, 0.15, 0.45, 0.2, 0.2, 0.85, 0.55, 0.85, 0.2, 0.95, 0.35];
  const H = 8, N = toks.length, L = 96, top = 26, cwid = (1312 - L - 16) / N, chh = 38;
  const r = rng(42), S = [];
  for (let h = 0; h < H; h++) { const sharp = 0.5 + r() * 1.2, sinky = h % 3 === 0;
    for (let t = 0; t < N; t++) { let v = Math.pow(w[t], sharp) * (0.55 + 0.9 * r()); if (sinky && t === 0) v += 0.9; if (h === 5 && (toks[t] === ',' || toks[t] === '.')) v += 0.6; S.push({ h, t, v }); } }
  const order = [...S].sort((a, b) => b.v - a.v); const vmax = order[0].v;
  order.forEach((c, i) => { c.rank = i; });
  S.forEach((c) => { c.el = E('rect', { x: L + c.t * cwid + 1, y: top + c.h * chh + 1, width: cwid - 3, height: chh - 3, rx: 3 }, s); });
  for (let h = 0; h < H; h++) T(s, L - 12, top + h * chh + chh / 2 + 5, 'head ' + (h + 1), { 'text-anchor': 'end', 'font-size': 15, fill: C.mut });
  toks.forEach((tk, i) => { const x = L + i * cwid + cwid / 2, y = top + H * chh + 16; T(s, x, y, tk, { 'text-anchor': 'end', 'font-size': 16, fill: C.ink, transform: `rotate(-40 ${x} ${y})` }); });
  const inp = $('kv-budget'), out = $('kv-budget-v'), txt = $('kv-budget-txt');
  function draw(ratio) {
    const keep = Math.round(ratio * S.length);
    S.forEach((c) => { const k = c.rank < keep; c.el.setAttribute('fill', k ? blueScale(0.15 + 0.85 * Math.min(1, c.v / vmax)) : '#F0F0F0'); c.el.setAttribute('stroke', k ? 'none' : '#E0E0E0'); });
    out.textContent = Math.round(ratio * 100) + '%'; txt.textContent = `Keeping ${keep} of ${S.length} KV pairs · gray = evicted`;
  }
  inp.addEventListener('input', () => { DeckAnim.stop('kvheat', false); draw(+inp.value / 100); });
  DeckAnim.add('kvheat', { dur: 3.4, render(t) { const v = 100 - 70 * p(t, 0.4, 3.2); inp.value = String(Math.round(v / 5) * 5); draw(v / 100); } });
})();

/* ============================================================== 5. KVPress leaderboard (bars grow): first without Fast KVzip, then the full board */
(function () {
  const ALL = [['KVzip', 92.24, 'k'], ['FastKVzip', 88.78, 'f'], ['ExpectedAttention', 72.78], ['Finch (query-aware)', 61.68], ['ChunkKV (query-aware)', 61.19], ['AdaSnapKV (query-aware)', 57.27], ['SnapKV (query-aware)', 55.51], ['AdaKVCompactor', 55.06], ['LagKV', 46.52], ['KeyDiff', 45.51], ['TOVA', 33.32], ['StreamingLLM', 26.99], ['ObservedAttention', 24.83], ['SnapKV', 22.02], ['PyramidKV', 21.97], ['CUR', 15.61], ['Knorm', 8.90], ['Random', 4.23]];
  // grow(row) picks the bars that animate; the rest are drawn at full length from the start
  const board = (id, name, D, grow) => {
    const s = $(id); if (!s) return;
    const FS = 23, x0 = 330, x1 = 880, X = (v) => x0 + v / 100 * (x1 - x0), top = 44, rh = 30, all = D.every(grow);
    [0, 20, 40, 60, 80, 100].forEach((v) => { line(s, X(v), top - 8, X(v), top + D.length * rh, { stroke: C.grid, 'stroke-width': 1 }); T(s, X(v), top + D.length * rh + 26, String(v), { 'text-anchor': 'middle', 'font-size': FS, fill: C.mut }); });
    const bars = D.map((d, i) => {
      const [n, v, o] = d, y = top + i * rh, col = o === 'k' ? C.red : o === 'f' ? C.orange : C.gray, qa = n.indexOf(' (query-aware)');
      const tl = T(s, x0 - 10, y + 22, qa > 0 ? n.slice(0, qa) : n, { 'text-anchor': 'end', 'font-size': FS, fill: o ? C.ink : '#444', 'font-weight': o ? 700 : 400 });
      if (qa > 0) { const ts = E('tspan', { fill: '#999' }, tl); ts.textContent = ' query-aware'; }
      const b = E('rect', { x: x0, y: y + 3, width: X(v) - x0, height: 25, rx: 2, fill: col }, s);
      const inside = v > 85;
      const lb = T(s, inside ? X(v) - 6 : X(v) + 6, y + 23, v.toFixed(2), { 'text-anchor': inside ? 'end' : 'start', 'font-size': FS, fill: inside ? '#fff' : C.mut, 'font-weight': o ? 700 : 400, 'font-variant-numeric': 'tabular-nums' });
      return { b, lb, v, i, g: grow(d) };
    }).filter((r) => r.g);
    const ref = E('g', {}, s);
    line(ref, X(95.32), top - 14, X(95.32), top + D.length * rh, { stroke: C.ink, 'stroke-dasharray': '6 5' });
    T(ref, X(95.32), top - 18, 'no compression 95.32', { 'text-anchor': 'end', 'font-size': FS, fill: C.ink });
    T(s, x0 - 10, top + D.length * rh + 26, 'score', { 'text-anchor': 'end', 'font-size': FS, fill: C.mut });
    DeckAnim.add(name, { dur: all ? 2.2 : 1.2, render(t) {
      if (all) op(ref, p(t, 0, 0.4));
      bars.forEach(({ b, lb, v, i }) => { const a = all ? 0.15 + 0.06 * i : 0.3, k = p(t, a, a + 0.7); b.setAttribute('width', Math.max(0, (X(v) - x0) * k)); op(lb, lin(k, 0.8, 1)); });
    } });
  };
  board('ch-kvpress', 'kvpress', ALL.filter((d) => d[2] !== 'f'), () => true);
  board('ch-kvpressfull', 'kvpressfull', ALL, (d) => d[2] === 'f');   // only the Fast KVzip bar grows in
})();

/* race chart used by the two prefill slides: lanes fill in proportion to real seconds */
function race(s, o) {
  const { x0, W, max, lanes, top, gap, laneH, ticks } = o, fs = o.fs || 18;
  const X = (v) => x0 + v / max * W;
  ticks.forEach((v) => { line(s, X(v), top - 14, X(v), top + lanes.length * gap - gap + laneH + 6, { stroke: C.grid, 'stroke-width': 1 }); T(s, X(v), top + lanes.length * gap - gap + laneH + fs + 12, v + ' s', { 'text-anchor': 'middle', 'font-size': fs, fill: C.mut }); });
  const clock = T(s, X(max), top - 26, '', { 'text-anchor': 'end', 'font-size': fs, 'font-weight': 700, fill: C.ink, 'font-variant-numeric': 'tabular-nums' });
  const L = lanes.map((ln, i) => {
    const y = top + i * gap;
    T(s, x0 - 14, y + laneH / 2 + fs * 0.35, ln.name, { 'text-anchor': 'end', 'font-size': fs, 'font-weight': ln.bold ? 700 : 500, fill: ln.nameColor || C.ink });
    E('rect', { x: x0, y, width: W, height: laneH, rx: 4, fill: '#F6F6F6' }, s);
    const segs = ln.segs.map((sg) => { const r = E('rect', { x: X(sg.from), y, height: laneH, rx: 3, fill: sg.color }, s); const tx = sg.label ? T(s, X(sg.from) + 10, y + laneH / 2 + fs * 0.35, sg.label, { 'font-size': fs, fill: '#fff', 'font-weight': 600 }) : null; return { sg, r, tx }; });
    const end = ln.segs[ln.segs.length - 1].to;
    const fin = T(s, X(end) + 10, y + laneH / 2 + fs * 0.35, ln.finish, { 'font-size': fs, 'font-weight': 700, fill: ln.finishColor || C.ink });
    return { segs, end, fin };
  });
  return { X, render(sim) {
    if (!o.noClock) clock.textContent = `t = ${Math.round(Math.min(sim, max))} s`;   // static slides pass noClock
    L.forEach(({ segs, end, fin }) => {
      segs.forEach(({ sg, r, tx }) => { const wv = clamp(sim - sg.from, 0, sg.to - sg.from); r.setAttribute('width', Math.max(0, X(sg.from + wv) - X(sg.from))); if (tx) op(tx, clamp((wv - (sg.to - sg.from) * 0.55) / 8)); });
      op(fin, clamp((sim - end) / 4));
    });
  } };
}

/* ============================================================== 6. KVzip's prefill cost (race) */
(function () {
  const s = $('ch-prefill'); if (!s) return;
  const FS = 21.7;   // the 640-wide chart is drawn 680 px wide, so 21.7 ≈ 23 px
  T(s, 0, 22, 'Prefill at 170K tokens', { 'font-size': FS, 'font-weight': 700, fill: C.ink });
  const R = race(s, { x0: 190, W: 316, max: 160, top: 80, gap: 100, laneH: 50, fs: FS, ticks: [0, 40, 80, 120, 160], lanes: [
    { name: 'No compression', segs: [{ from: 0, to: 48, color: '#8A929B' }], finish: '≈48 s' },
    { name: 'KVzip', bold: true, nameColor: C.green, segs: [{ from: 0, to: 48, color: '#8A929B' }, { from: 48, to: 150, color: C.green, label: 'reconstruction' }], finish: '≈150 s (≈3×)', finishColor: C.green },
  ] });
  T(s, 190, 326, 'Peak KV memory ≈33 GB in both runs', { 'font-size': FS, fill: C.mut });
  const speed = 5; // Presentation playback only; benchmark times on the chart stay unchanged.
  DeckAnim.add('kvprefill', { dur: 4.8 / speed, render(t) { R.render(160 * lin(t * speed, 0.3, 4.3)); } });
})();

/* ============================================================== 6b. Fast KVzip motivation: drop early (MoD), read sparsely, or evict after a full-depth pass (static; → reveals each step) */
(function () {
  const s = $('ch-fkvwhy'); if (!s) return;
  const FS = 23, step = (n) => (n ? E('g', { class: 'f', 'data-f': n }, s) : E('g', {}, s));
  const toks = ['The', 'Eiffel', 'Tower', 'in', 'Paris', 'was', 'completed', 'in', '1889', '.'];
  const TW = [54, 66, 78, 32, 66, 55, 120, 32, 65, 24];   // token boxes sized for 23 px words
  const GX = 120, NL = 4, CH = 16, CG = 4, GH = NL * (CH + CG) - CG;   // toy cache: 10 tokens × 4 layers, layer 1 at the bottom
  const tx = []; TW.reduce((x, wd) => { tx.push(GX + x); return x + wd + 4; }, 0);
  const GW = tx[9] + TW[9] - GX, QX = GX + GW + 16, TX = QX + 66, RY = [44, 232, 420];
  const cx = (c) => tx[c] + TW[c] / 2, gy = (r) => RY[r] + 70, ny = (r) => gy(r) + GH + 26;
  const ly = (r, l) => gy(r) + (NL - 1 - l) * (CH + CG);
  const txt = (g, x, y, str, a) => T(g, x, y, str, Object.assign({ 'font-size': FS, fill: C.ink }, a || {}));
  const KV = { fill: C.blueSoft }, NONE = { fill: '#fff', stroke: '#C8C8C8', 'stroke-dasharray': '3 2' }, LOST = { fill: '#FDECEA', stroke: C.red, 'stroke-dasharray': '3 2' };
  const cell = (g, r, l, c, a) => E('rect', Object.assign({ x: tx[c] + 1, y: ly(r, l), width: TW[c] - 2, height: CH, rx: 3 }, a), g);
  const cache = (g, r, has) => { for (let l = 0; l < NL; l++) for (let c = 0; c < 10; c++) cell(g, r, l, c, has(l, c) ? KV : NONE); };
  const axis = (g, r) => {                               // layer axis: layer 1 at the bottom, deeper layers above
    const x = GX - 14;
    arrow(g, x, gy(r) + GH, x, gy(r) - 2, '#999', 1.5);
    T(g, 0, 0, 'layer', { 'font-size': FS, fill: '#888', 'text-anchor': 'middle', transform: `translate(${x - 10} ${gy(r) + GH / 2}) rotate(-90)` });
    T(g, x + 6, gy(r) + GH + 20, 'layer 1', { 'font-size': FS, fill: '#999', 'text-anchor': 'end' });
    T(g, x + 6, gy(r) - 10, 'layer 4', { 'font-size': FS, fill: '#999', 'text-anchor': 'end' });
  };
  const count = (g, r, n, col) => txt(g, GX, ny(r), 'KV pairs in memory: ' + n + ' / 40', { fill: col || C.mut });
  const label = (g, r, name, sub, col) => {               // method name above its cache, source in gray after it
    const t = txt(g, 14, RY[r] + 24, name, { 'font-weight': 700, fill: col || C.ink });
    E('tspan', { 'font-weight': 400, fill: C.mut }, t).textContent = '   ' + sub;
  };
  const say = (g, r, rows) => rows.forEach(([dy, str, a]) => txt(g, TX, RY[r] + dy, str, a));
  const ok = { fill: C.green, 'font-weight': 600 }, bad = { fill: C.red, 'font-weight': 600 }, aside = { fill: C.mut };
  const query = (g, r) => { for (let l = 0; l < NL; l++) for (let j = 0; j < 2; j++) E('rect', { x: QX + j * 21, y: ly(r, l), width: 18, height: CH, rx: 3, fill: '#EFA59D' }, g); };
  const read = (g, r, c) => {                            // the later query attends back to token c in every layer
    const x1 = QX + 19, x2 = cx(c), y = gy(r) - 5, top = gy(r) - 42;
    E('path', { d: `M${x1} ${y} Q${(x1 + x2) / 2} ${top} ${x2} ${y}`, fill: 'none', stroke: C.red, 'stroke-width': 2 }, g);
    head(g, x2, y, Math.atan2(y - top, (x2 - x1) / 2), 10, C.red);
    E('rect', { x: tx[c] - 2, y: gy(r) - 3, width: TW[c] + 4, height: GH + 6, rx: 4, fill: 'none', stroke: C.red, 'stroke-width': 2 }, g);
  };

  // 0 · the context, as a strip of tokens; each cache below has one column per token and one row per layer
  const a0 = step(0);
  txt(a0, 14, 29, 'context', { fill: C.mut });
  toks.forEach((t, i) => {
    E('rect', { x: tx[i], y: 4, width: TW[i], height: 34, rx: 5, fill: '#E9F3E2', stroke: C.kvD, 'stroke-width': 1.5 }, a0);
    txt(a0, tx[i] + TW[i] / 2, 29, t, { 'text-anchor': 'middle' });
  });

  // 1 · Mixture-of-Depths: a token dropped at an early layer has no KV in any layer above it
  const a1 = step(1), depth = [2, 4, 3, 1, 4, 1, 2, 1, 1, 1];   // layers each token reaches before it is dropped
  label(a1, 0, 'Mixture-of-Depths', 'Raposo et al., 2024');
  axis(a1, 0); cache(a1, 0, (l, c) => l < depth[c]);
  count(a1, 0, 20);
  say(a1, 0, [[28, 'Dropped tokens skip all later layers'], [56, '✓ Fewer FLOPs and a smaller KV cache', ok]]);

  // 2 · Sparse attention: store everything, let each query read a few
  const a2 = step(2);
  line(a2, 14, RY[1] - 10, 1312, RY[1] - 10, { stroke: C.grid, 'stroke-width': 1.5 });
  const qh = E('text', { x: QX, y: 29, 'font-size': FS, fill: C.mut }, a2);
  E('tspan', {}, qh).textContent = 'later query: ';
  E('tspan', { fill: C.red, 'font-weight': 700 }, qh).textContent = '“When was it completed?”';
  label(a2, 1, 'Sparse attention', 'MoBA · DeepSeek Sparse Attention');
  axis(a2, 1); cache(a2, 1, () => true);
  count(a2, 1, 40);
  query(a2, 1); read(a2, 1, 6); read(a2, 1, 8);
  txt(a2, (cx(6) + cx(8)) / 2, ny(1), 'reads only these', { fill: C.red, 'text-anchor': 'middle' });
  say(a2, 1, [[28, 'All KV pairs stored; queries read a few'], [56, '✓ Less attention compute → faster', ok]]);

  // 3 · MoD's catch: the later query needs 1889, but it was dropped after layer 1
  const a3 = step(3);
  query(a3, 0); read(a3, 0, 8);
  for (let l = depth[8]; l < NL; l++) cell(a3, 0, l, 8, LOST);
  txt(a3, cx(8), ny(0), '1889: dropped after layer 1', { fill: C.red, 'text-anchor': 'middle' });
  say(a3, 0, [[104, '✗ Unneeded now ≠ unneeded later', bad], [132, 'no KV for it in any later layer', aside]]);

  // 4 · sparse attention's catch: nothing leaves memory
  const a4 = step(4);
  E('rect', { x: GX - 7, y: gy(1) - 8, width: GW + 14, height: GH + 16, rx: 6, fill: 'none', stroke: C.red, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, a4);
  E('rect', { x: GX - 2, y: ny(1) - 22, width: 330, height: 30, fill: '#fff' }, a4);
  count(a4, 1, 40, C.red);
  say(a4, 1, [[104, '✗ Every KV pair still sits in memory', bad], [132, 'the cache keeps growing with the context', aside]]);

  // 5 · Fast KVzip: every token runs through all layers, as in a normal prefill
  const a5 = step(5);
  E('rect', { x: 0, y: RY[2] - 6, width: 1312, height: 192, rx: 10, fill: '#FDF3F1' }, a5);
  label(a5, 2, 'Fast KVzip', 'ours', C.red);
  axis(a5, 2); cache(a5, 2, () => true);
  say(a5, 2, [[28, 'Every token runs through all layers']]);

  // 6 · …then the gate evicts, layer by layer, the KV pairs no later query will need (in place)
  const a6 = step(6), keep = ['0100100010', '0010001000', '0100100010', '0000101010'];   // per layer, layer 1 first
  for (let l = 0; l < NL; l++) for (let c = 0; c < 10; c++) if (keep[l][c] === '0') cell(a6, 2, l, c, NONE);
  count(a6, 2, 11);
  say(a6, 2, [[56, 'then a lightweight gate evicts'], [84, 'the KV pairs no later query will need']]);

  // 7 · the cache is small, and the later query still finds 1889
  const a7 = step(7);
  query(a7, 2); read(a7, 2, 8);
  txt(a7, cx(8), ny(2), '1889: kept', { fill: C.green, 'font-weight': 700, 'text-anchor': 'middle' });
  say(a7, 2, [[126, '✓ A small KV cache, chosen per layer', ok], [154, '✓ What later queries need is kept', ok]]);
})();

/* ============================================================== 6c. Fast KVzip gate (static; two detail reveals) */
(function () {
  const s = $('ch-fkvgate'); if (!s) return;
  const step = (n) => E('g', n ? { class: 'f', 'data-f': n } : {}, s);
  const txt = (g, x, y, str, a) => T(g, x, y, str, Object.assign({ 'font-size': 23, fill: C.mut }, a || {}));
  const ctr = { 'text-anchor': 'middle' };
  const box = (g, x, y, w, h, red) => E('rect', {
    x, y, width: w, height: h, rx: 8,
    fill: red ? '#FDF3F1' : '#F5F5F5', stroke: red ? C.red : '#B8B8B8', 'stroke-width': 1.5,
  }, g);

  // The whole inference path is visible first; arrows reveal only the two explanations below.
  const a = step(0);
  txt(a, 0, 24, 'At every attention layer, during the normal forward pass');
  [
    [0, 224, 'Hidden state', 'already available', false],
    [304, 232, 'Small gate', 'low-rank module', true],
    [616, 260, 'Importance score', 'per token, per KV head', true],
    [956, 356, 'Keep / evict KV pairs', 'within the cache budget', false],
  ].forEach(([x, w, title, caption, red]) => {
    box(a, x, 58, w, 90, red);
    txt(a, x + w / 2, 112, title, Object.assign({ 'font-size': 26, 'font-weight': 600, fill: red ? C.red : C.ink }, ctr));
    txt(a, x + w / 2, 186, caption, ctr);
  });
  [[224, 294], [536, 606], [876, 946]].forEach(([x1, x2]) => arrow(a, x1 + 8, 103, x2, 103, '#777', 2));

  // One attention allocation replaces projection branches, individual sinks and the equation.
  const b = step(1);
  line(b, 0, 228, 1312, 228, { stroke: '#DDD', 'stroke-width': 1.5 });
  txt(b, 0, 273, 'Inside the gate', { 'font-size': 26, 'font-weight': 700, fill: C.ink });
  txt(b, 0, 315, 'Token key competes with learned sink keys.');
  E('rect', { x: 0, y: 338, width: 596, height: 36, rx: 5, fill: '#D9D9D9' }, b);
  E('path', { d: 'M5 338 H190 V374 H5 Q0 374 0 369 V343 Q0 338 5 338 Z', fill: C.red }, b);
  txt(b, 0, 410, 'token’s share', { fill: C.red, 'font-weight': 600 });
  txt(b, 304, 410, 'learned sinks (grouped)');
  txt(b, 0, 458, 'Larger token share → higher importance score.');

  const c = step(2), X = 706;
  line(c, 654, 258, 654, 490, { stroke: '#DDD', 'stroke-width': 1.5 });
  txt(c, X, 273, 'Learn from KVzip, use at inference', { 'font-size': 26, 'font-weight': 700, fill: C.ink });
  txt(c, X, 315, 'Distill KVzip’s reconstruction scores.');
  txt(c, X, 351, 'Train only the gate; keep the LLM frozen.');
  txt(c, X, 414, '≈1% of forward latency', { 'font-size': 28, 'font-weight': 600, fill: C.red });
  txt(c, X, 458, 'Prefill and decoding; no reconstruction pass.');
})();

/* ============================================================== 7. Fast KVzip in motion (illustrative) */
(function () {
  const s = $('ch-fkvstream'); if (!s) return;
  const N = 32, CHK = 4, x0 = 190, stp = 34, cwid = 30, ya = 46, yb = 204, hh = 40, budget = 0.3;
  const X = (i) => x0 + i * stp;
  const r = rng(17), sc = [];
  for (let i = 0; i < N; i++) sc.push(clamp(0.08 + (i % 7 === 2 || i % 11 === 5 ? 0.6 : 0) + r() * 0.5, 0.05, 1));
  // KVzip: store all, then one reconstruction pass, then evict
  const keepA = new Set([...sc.keys()].sort((a, b) => sc[b] - sc[a]).slice(0, Math.ceil(N * budget)));
  const evA = [...sc.keys()].filter((i) => !keepA.has(i)).sort((a, b) => sc[a] - sc[b]);
  const arr = (k) => 0.3 + 0.4 * k;                                // chunk k arrives (prefill)
  const sweep = [3.5, 5.5], evStart = 5.7, evEnd = 6.5;
  const evAt = {}; evA.forEach((i, k) => { evAt[i] = evStart + (evEnd - evStart) * k / (evA.length - 1); });
  // Fast KVzip: gate scores arrive with each chunk; keep the top 30% of tokens seen so far
  const evB = {}; let kept = [];
  const stepsB = [];
  for (let k = 0; k < N / CHK; k++) {
    const add = [...Array(CHK).keys()].map((j) => k * CHK + j), pool = kept.concat(add), keepN = Math.ceil((k + 1) * CHK * budget);
    const nk = [...pool].sort((a, b) => sc[b] - sc[a]).slice(0, keepN);
    pool.filter((i) => !nk.includes(i)).forEach((i) => { evB[i] = arr(k) + 0.25; });
    stepsB.push({ t: arr(k), before: kept.length + CHK, after: nk.length }); kept = nk;
  }
  const doneB = arr(N / CHK - 1) + 0.4;
  // rows
  T(s, 0, ya + 26, 'KVzip', { 'font-size': 20, 'font-weight': 700, fill: C.green });
  const stA = T(s, 0, ya + 50, '', { 'font-size': 13, fill: C.mut });
  T(s, 0, yb + 26, 'Fast KVzip', { 'font-size': 20, 'font-weight': 700, fill: C.red });
  const stB = T(s, 0, yb + 50, '', { 'font-size': 13, fill: C.mut });
  T(s, x0 - 10, yb - 18, 'gate score', { 'text-anchor': 'end', 'font-size': 13, fill: C.mut });
  const band = E('rect', { y: ya - 8, width: 70, height: hh + 16, rx: 8, fill: C.green, 'fill-opacity': 0.16 }, s);
  const A = sc.map((v, i) => E('rect', { x: X(i), y: ya, width: cwid, height: hh, rx: 4 }, s));
  const Bc = sc.map((v, i) => E('rect', { x: X(i), y: yb, width: cwid, height: hh, rx: 4 }, s));
  const Bb = sc.map((v, i) => E('rect', { x: X(i) + 6, width: cwid - 12, rx: 2 }, s));
  // memory over time
  const my0 = 444, my1 = 316, mx = (tt) => x0 + tt / 7 * (X(N - 1) + cwid - x0), my = (v) => my0 - v / N * (my0 - my1);
  T(s, 0, 340, 'KV entries', { 'font-size': 15, 'font-weight': 700, fill: C.ink }); T(s, 0, 360, 'in memory', { 'font-size': 15, 'font-weight': 700, fill: C.ink });
  [0, 16, 32].forEach((v) => { line(s, x0, my(v), mx(7), my(v), { stroke: C.grid, 'stroke-width': 1 }); T(s, x0 - 8, my(v) + 5, String(v), { 'text-anchor': 'end', 'font-size': 13, fill: C.mut }); });
  [0, 1, 2, 3, 4, 5, 6, 7].forEach((v) => T(s, mx(v), my0 + 20, v + ' s', { 'text-anchor': 'middle', 'font-size': 12, fill: '#999' }));
  const pA = E('polyline', { fill: 'none', stroke: C.green, 'stroke-width': 3 }, s), pB = E('polyline', { fill: 'none', stroke: C.red, 'stroke-width': 3 }, s);
  const mkA = E('g', {}, s), mkB = E('g', {}, s);
  line(mkB, mx(doneB), my1 - 6, mx(doneB), my0, { stroke: C.red, 'stroke-dasharray': '4 4', 'stroke-width': 1.5 });
  T(mkB, mx(doneB) + 8, my0 - 8, 'Fast KVzip done · no extra pass', { 'font-size': 14, 'font-weight': 700, fill: C.red });
  line(mkA, mx(evEnd), my1 - 6, mx(evEnd), my0, { stroke: C.green, 'stroke-dasharray': '4 4', 'stroke-width': 1.5 });
  T(mkA, mx(evEnd) + 8, my1 - 2, 'KVzip done', { 'font-size': 14, 'font-weight': 700, fill: C.green });
  const pkA = T(s, mx(sweep[0]), my(N) - 8, 'peak 32', { 'text-anchor': 'middle', 'font-size': 13, fill: C.green, 'font-weight': 700 });
  const peakB = Math.max(...stepsB.map((q) => q.before));
  const pkB = T(s, mx(stepsB[stepsB.length - 1].t), my(peakB) - 8, 'peak ' + peakB, { 'text-anchor': 'middle', 'font-size': 13, fill: C.red, 'font-weight': 700 });
  const memA = (tt) => { let n = 0; for (let k = 0; k < N / CHK; k++) if (tt >= arr(k)) n += CHK; if (tt >= evStart) n -= evA.filter((i) => tt >= evAt[i]).length; return n; };
  const memB = (tt) => { let n = 0; stepsB.forEach((q) => { if (tt >= q.t) n = q.before; if (tt >= q.t + 0.25) n = q.after; }); return n; };
  DeckAnim.add('fkvstream', { dur: 7.2, render(t) {
    stA.textContent = t < 3.4 ? 'prefill: store every KV pair' : t < sweep[1] ? 'extra pass: reconstruct to score' : t < evEnd ? 'evict to 30%' : 'done';
    stB.textContent = t < doneB ? 'prefill: gates score each chunk, evict on the fly' : 'done · cache never held everything';
    const bx = x0 - 70 + (X(N - 1) + cwid - x0 + 70) * lin(t, sweep[0], sweep[1]);
    band.setAttribute('x', bx); op(band, t > sweep[0] && t < sweep[1] ? 1 : 0);
    sc.forEach((v, i) => {
      const k = Math.floor(i / CHK), shown = p(t, arr(k), arr(k) + 0.25);
      const scored = t >= sweep[0] + (sweep[1] - sweep[0]) * (X(i) - x0) / (X(N - 1) - x0);
      let fa = scored ? blueScale(0.15 + 0.85 * v) : '#C9D3DE'; const goneA = keepA.has(i) ? 0 : p(t, evAt[i], evAt[i] + 0.25);
      fa = mix(fa, '#FFFFFF', goneA); A[i].setAttribute('fill', fa); op(A[i], shown); A[i].setAttribute('stroke', goneA > 0.5 ? '#CCC' : 'none'); A[i].setAttribute('stroke-dasharray', '4 3');
      const goneB = evB[i] != null ? p(t, evB[i], evB[i] + 0.2) : 0;
      Bc[i].setAttribute('fill', mix(blueScale(0.15 + 0.85 * v), '#FFFFFF', goneB)); op(Bc[i], shown); Bc[i].setAttribute('stroke', goneB > 0.5 ? '#CCC' : 'none'); Bc[i].setAttribute('stroke-dasharray', '4 3');
      const bh = 40 * v * p(t, arr(k), arr(k) + 0.2);
      Bb[i].setAttribute('y', yb - 4 - bh); Bb[i].setAttribute('height', Math.max(0, bh)); Bb[i].setAttribute('fill', goneB > 0.5 ? '#C9C9C9' : C.red);
    });
    const pts = (f) => { const a = []; for (let tt = 0; tt <= Math.min(t, 7) + 1e-6; tt += 0.02) a.push(mx(tt).toFixed(1) + ',' + my(f(tt)).toFixed(1)); return a.join(' '); };
    pA.setAttribute('points', pts(memA)); pB.setAttribute('points', pts(memB));
    op(mkB, p(t, doneB, doneB + 0.3)); op(mkA, p(t, evEnd, evEnd + 0.3)); op(pkA, p(t, 3.2, 3.5)); op(pkB, p(t, doneB, doneB + 0.3));
  } });
})();

/* ============================================================== 8. Fast KVzip at 170K tokens (race + memory) */
(function () {
  const s = $('ch-fkvrace'); if (!s) return;
  T(s, 0, 22, 'Prefill time', { 'font-size': 23, 'font-weight': 700, fill: C.ink });
  const R = race(s, { x0: 210, W: 520, max: 160, top: 84, gap: 112, laneH: 62, fs: 23, ticks: [0, 40, 80, 120, 160], noClock: true, lanes: [
    { name: 'No compression', segs: [{ from: 0, to: 48, color: '#8A929B' }], finish: '≈48 s' },
    { name: 'KVzip', nameColor: C.green, segs: [{ from: 0, to: 48, color: '#8A929B' }, { from: 48, to: 150, color: C.green, label: 'reconstruction' }], finish: '≈150 s', finishColor: C.green },
    { name: 'Fast KVzip', bold: true, nameColor: C.red, segs: [{ from: 0, to: 25, color: C.red }], finish: '≈25 s · ≈6× faster than KVzip', finishColor: C.red },
  ] });
  // peak memory bars
  const mx0 = 1000, mW = 220, MX = (v) => mx0 + v / 36 * mW;
  T(s, 840, 22, 'Peak KV memory', { 'font-size': 23, 'font-weight': 700, fill: C.ink });
  const M = [['No compression', 33, '#8A929B'], ['KVzip', 33, C.green], ['Fast KVzip', 12, C.red]].map(([n, v, c], i) => {
    const y = 84 + i * 112;
    T(s, mx0 - 12, y + 39, n, { 'text-anchor': 'end', 'font-size': 23, fill: '#444' });
    const b = E('rect', { x: mx0, y: y + 6, height: 50, rx: 3, fill: c }, s);
    const l = T(s, MX(v) + 8, y + 39, '≈' + v + ' GB', { 'font-size': 23, 'font-weight': 700, fill: c === C.red ? C.red : C.ink });
    return { b, l, v };
  });
  DeckAnim.add('fkvrace', { dur: 6.0, render(t) {
    R.render(160 * lin(t, 0.3, 4.3));
    M.forEach(({ b, l, v }, i) => { const k = p(t, 4.4 + 0.15 * i, 5.2 + 0.15 * i); b.setAttribute('width', Math.max(0, (MX(v) - mx0) * k)); op(l, lin(k, 0.8, 1)); });
  } });
})();
})();
