/* Custom cursor: a sharp dot and a lagging ring that reacts to links, buttons and cards. */
(function () {
  'use strict';
  if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dot = document.createElement('div'); dot.className = 'cursor-dot';
  const ring = document.createElement('div'); ring.className = 'cursor-ring';
  document.body.append(dot, ring);
  document.documentElement.classList.add('has-cursor', 'cursor-hidden');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, shown = false;
  window.addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    if (!shown) { shown = true; rx = x; ry = y; document.documentElement.classList.remove('cursor-hidden'); }
  }, { passive: true });
  document.addEventListener('pointerleave', () => document.documentElement.classList.add('cursor-hidden'));
  document.addEventListener('pointerenter', () => document.documentElement.classList.remove('cursor-hidden'));
  window.addEventListener('pointerdown', () => ring.classList.add('is-down'));
  window.addEventListener('pointerup', () => ring.classList.remove('is-down'));
  const HOVER = 'a, button, [data-cursor="hover"], .work-card, .path-node, .stats-tile, .stack-sat span';
  document.addEventListener('pointerover', (e) => { if (e.target.closest(HOVER)) ring.classList.add('is-hover'); });
  document.addEventListener('pointerout', (e) => { if (e.target.closest(HOVER)) ring.classList.remove('is-hover'); });
  (function loop() {
    rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
    dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();
})();
