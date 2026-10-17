/* Stats: counters and ring gauges fire once when a tile scrolls in; spotlight follows the cursor. */
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tiles = document.querySelectorAll('.stats-tile');
  if (!tiles.length) return;

  function fmt(n, el) {
    let s = String(Math.round(n));
    if (el.dataset.format === 'comma') s = Number(s).toLocaleString('en-US');
    return s;
  }
  function run(tile) {
    tile.querySelectorAll('.stats-ring__fill').forEach((c) => {
      const pct = Number(c.dataset.pct || 100);
      c.style.setProperty('--dash', String(326.7 * (1 - pct / 100)));
    });
    tile.querySelectorAll('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count);
      if (reduced) { el.textContent = fmt(target, el); return; }
      const t0 = performance.now(), dur = 1500;
      (function step(now) {
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * e, el);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const tile = en.target;
      const delay = Number(tile.dataset.delay || 0) * 1000;
      setTimeout(() => { tile.classList.add('is-in'); run(tile); }, reduced ? 0 : delay);
      io.unobserve(tile);
    });
  }, { threshold: 0.35 });
  tiles.forEach((t) => io.observe(t));

  if (!window.matchMedia('(pointer: coarse)').matches) {
    tiles.forEach((tile) => {
      tile.addEventListener('pointermove', (e) => {
        const r = tile.getBoundingClientRect();
        tile.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        tile.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }
})();
