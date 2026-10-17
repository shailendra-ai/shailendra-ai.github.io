/* Hero behaviour: scramble-decode the name, magnetic buttons, mount the aurora and holo scenes. */
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  /* ---------- Scramble decode ---------- */
  const GLYPHS = '01<>/\\|[]{}#%&*+=ΔΣΞλπ';
  function scramble(el, finalText, delay) {
    const chars = finalText.split('');
    const spans = chars.map((c) => {
      const s = document.createElement('span');
      s.textContent = c === ' ' ? ' ' : c;
      return s;
    });
    el.textContent = '';
    spans.forEach((s) => el.appendChild(s));
    el.setAttribute('data-text', finalText);
    if (reduced) return;
    const start = performance.now() + delay;
    const perChar = 70;
    const settleAt = chars.map((_, i) => start + 500 + i * perChar);
    function tick(now) {
      let done = true;
      spans.forEach((s, i) => {
        if (now < start) { s.textContent = ' '; done = false; return; }
        if (now < settleAt[i]) {
          done = false;
          if (Math.random() < 0.5) s.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          s.classList.add('hero-name__char--rnd');
        } else {
          s.textContent = chars[i] === ' ' ? ' ' : chars[i];
          s.classList.remove('hero-name__char--rnd');
        }
      });
      if (!done) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  document.querySelectorAll('[data-scramble]').forEach((el, i) => scramble(el, el.dataset.scramble, 150 + i * 350));

  /* ---------- Magnetic buttons ---------- */
  if (!coarse && !reduced) {
    document.querySelectorAll('.hero-magnet').forEach((btn) => {
      let raf = null;
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.28;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => { btn.style.transform = `translate(${dx}px, ${dy}px)`; });
      });
      btn.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        btn.style.transform = '';
      });
    });
  }

  /* ---------- Scenes ---------- */
  const aurora = document.getElementById('hero-aurora');
  if (aurora && window.Aurora && typeof window.Aurora.mount === 'function') {
    try { window.Aurora.mount(aurora); } catch (e) { console.warn('aurora failed', e); }
  }
  const holo = document.getElementById('hero-holo');
  if (holo && window.Holo && typeof window.Holo.mount === 'function') {
    try { window.Holo.mount(holo); } catch (e) { console.warn('holo failed', e); }
  }
})();
