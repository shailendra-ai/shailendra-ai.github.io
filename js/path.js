/* Path: build a winding route through the node anchors, draw it with scroll, ride a comet on its tip,
   and light nodes up as the line passes them. */
(function () {
  'use strict';
  const stage = document.querySelector('.path-stage');
  if (!stage) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const svg = stage.querySelector('.path-svg');
  const track = svg.querySelector('.path-track');
  const line = svg.querySelector('.path-line');
  const glow = svg.querySelector('.path-line-glow');
  const comet = svg.querySelector('.path-comet');
  const halo = svg.querySelector('.path-comet-halo');
  const nodes = Array.from(stage.querySelectorAll('.path-node'));
  let anchors = [], total = 0, nodeLen = [], trigger = null;

  function wide() { return window.innerWidth > 800; }

  function geometry() {
    const sr = stage.getBoundingClientRect();
    const W = sr.width, H = sr.height;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    const cx = wide() ? W / 2 : 24;
    const amp = wide() ? 54 : 10;
    anchors = nodes.map((n, i) => {
      const r = n.getBoundingClientRect();
      const y = r.top - sr.top + r.height / 2;
      const x = cx + (i % 2 === 0 ? -amp : amp);
      const m = n.querySelector('.path-marker');
      m.style.left = (x - (r.left - sr.left)) + 'px';
      m.style.top = (y - (r.top - sr.top)) + 'px';
      return { x, y };
    });
    // Smooth winding route: start above the first node, end below the last, vertical tangents.
    const pts = [{ x: cx, y: 0 }, ...anchors, { x: cx, y: H }];
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dy = (b.y - a.y) * 0.5;
      d += ` C ${a.x} ${a.y + dy}, ${b.x} ${b.y - dy}, ${b.x} ${b.y}`;
    }
    track.setAttribute('d', d); line.setAttribute('d', d); glow.setAttribute('d', d);
    total = line.getTotalLength();
    line.style.strokeDasharray = total; glow.style.strokeDasharray = total;
    // length along the path at which each anchor sits (sample)
    nodeLen = anchors.map((p) => {
      let best = 0, bd = Infinity;
      for (let s = 0; s <= total; s += 6) {
        const q = line.getPointAtLength(s);
        const dd = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
        if (dd < bd) { bd = dd; best = s; }
      }
      return best;
    });
  }

  function setProgress(p) {
    const len = total * p;
    line.style.strokeDashoffset = total - len; glow.style.strokeDashoffset = total - len;
    const pt = line.getPointAtLength(len);
    comet.setAttribute('cx', pt.x); comet.setAttribute('cy', pt.y);
    halo.setAttribute('cx', pt.x); halo.setAttribute('cy', pt.y);
    stage.classList.toggle('is-drawing', p > 0.01 && p < 0.995);
    nodes.forEach((n, i) => n.classList.toggle('is-active', len >= nodeLen[i] - 2));
  }

  // gradient + halo colours from the theme tokens
  (function theme() {
    const css = getComputedStyle(document.documentElement);
    const t = (n) => (css.getPropertyValue(n) || '').trim();
    const stops = svg.querySelectorAll('#path-grad stop');
    [t('--c1'), t('--c2'), t('--c3')].forEach((c, i) => { if (c && stops[i]) stops[i].setAttribute('stop-color', c); });
    svg.querySelectorAll('#path-halo stop').forEach((st, i) => { if (i > 0 && t('--c1')) st.setAttribute('stop-color', t('--c1')); });
  })();

  function build() {
    geometry();
    if (trigger) { trigger.kill(); trigger = null; }
    if (!hasGsap || reduced) { setProgress(1); stage.classList.remove('is-drawing'); return; }
    trigger = ScrollTrigger.create({
      trigger: stage, start: 'top 72%', end: 'bottom 62%', scrub: 0.6,
      onUpdate: (self) => setProgress(self.progress)
    });
    setProgress(trigger.progress);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { threshold: 0.2 });
  nodes.forEach((n) => io.observe(n));

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (hasGsap) ScrollTrigger.refresh(); }, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { build(); if (hasGsap) ScrollTrigger.refresh(); });
  window.addEventListener('load', () => { build(); if (hasGsap) ScrollTrigger.refresh(); });
  build();
})();
