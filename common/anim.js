/* Slide animations.
   DeckAnim.add(name, {dur, render(t), delay?, onPhase?})  registers an animation; render(t) must draw the
   state at time t (seconds) so any moment can be shown. The final frame (t = dur) is drawn at load, so a
   slide looks complete before it plays. A slide lists its animations in data-anim="a b"; they play when
   the slide appears. Any element with data-replay="name" replays it; data-seek="name:3.5" jumps to 3.5 s. */
window.DeckAnim = (function () {
  'use strict';
  const reg = {}, raf = {};
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function add(name, a) {
    reg[name] = a;
    try { a.render(a.dur); } catch (e) { console.error('anim', name, e); }
  }
  function stop(name, toEnd) {
    cancelAnimationFrame(raf[name]); delete raf[name];
    if (toEnd && reg[name]) reg[name].render(reg[name].dur);
  }
  function play(name, from) {
    const a = reg[name]; if (!a) return;
    stop(name, false);
    if (reduce) { a.render(a.dur); return; }
    const t0 = performance.now() - (from || 0) * 1000;
    const delay = from ? 0 : (a.delay || 0);
    const tick = (now) => {
      const t = (now - t0) / 1000 - delay;
      if (t >= a.dur) { a.render(a.dur); delete raf[name]; return; }
      a.render(Math.max(0, t));
      raf[name] = requestAnimationFrame(tick);
    };
    a.render(Math.max(0, from || 0));
    raf[name] = requestAnimationFrame(tick);
  }
  const names = (s) => (s.dataset.anim || '').split(/[\s,]+/).filter(Boolean);

  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-replay]');
    if (r) { play(r.dataset.replay, 0); return; }
    const k = e.target.closest('[data-seek]');
    if (k) { const [n, t] = k.dataset.seek.split(':'); play(n, parseFloat(t) || 0); }
  });

  /* small SVG toolkit shared by the animation files */
  const NS = 'http://www.w3.org/2000/svg';
  const svg = {
    E(tag, attrs, parent) { const e = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; },
    T(parent, x, y, str, attrs) { const t = svg.E('text', Object.assign({ x, y }, attrs || {}), parent); t.textContent = str; return t; },
    rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
    clamp: (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)),
    /** eased progress of t through [a, b] */
    p(t, a, b) { const x = svg.clamp((t - a) / (b - a)); return 1 - Math.pow(1 - x, 3); },
    lin(t, a, b) { return svg.clamp((t - a) / (b - a)); },
    mix(c1, c2, k) { const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const A = h(c1), B = h(c2); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); },
    head(parent, x, y, ang, size, color) { return svg.E('path', { d: `M0 0 L${-size} ${-size * 0.55} L${-size} ${size * 0.55}Z`, fill: color, transform: `translate(${x} ${y}) rotate(${ang * 180 / Math.PI})` }, parent); },
    arrow(parent, x1, y1, x2, y2, color = '#777', w = 2) { const g = svg.E('g', {}, parent); svg.E('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': w }, g); svg.head(g, x2, y2, Math.atan2(y2 - y1, x2 - x1), 9 + w, color); return g; },
    C: { red: '#E03E2D', orange: '#E8794B', green: '#23825F', kv: '#93C47D', kvD: '#6AA84F', blue: '#3C78D8', blueSoft: '#A4C2F4', gray: '#B4BBC3', grayL: '#EDEDED', ink: '#222', mut: '#666', grid: '#E7E7E7' },
  };

  return { add, play, stop, svg, enter(s) { names(s).forEach((n) => play(n, 0)); }, leave(s) { names(s).forEach((n) => stop(n, true)); } };
})();
