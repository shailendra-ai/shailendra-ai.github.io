/* Work: filter with FLIP re-flow, 3D tilt + spotlight on hover, detail dialog with focus management. */
(function () {
  'use strict';
  const section = document.getElementById('work');
  if (!section) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const grid = section.querySelector('.work-grid');
  const cards = Array.from(section.querySelectorAll('.work-card'));

  /* Reveal */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { threshold: 0.15 });
  cards.forEach((c) => io.observe(c));
  // Keep artwork animating only near the viewport
  const vis = new IntersectionObserver((entries) => {
    entries.forEach((en) => en.target.classList.toggle('is-visible', en.isIntersecting));
  }, { rootMargin: '120px 0px' });
  cards.forEach((c) => vis.observe(c));

  /* Tilt + spotlight */
  if (!coarse && !reduced) {
    cards.forEach((card) => {
      let raf = 0;
      card.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          card.style.setProperty('--mx', (px * 100) + '%');
          card.style.setProperty('--my', (py * 100) + '%');
          card.style.setProperty('--ry', ((px - 0.5) * 10) + 'deg');
          card.style.setProperty('--rx', ((0.5 - py) * 8) + 'deg');
        });
      });
      card.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* Filters with FLIP */
  const filters = Array.from(section.querySelectorAll('.work-filter'));
  function applyFilter(key) {
    const first = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
    cards.forEach((c) => {
      const show = key === 'all' || c.dataset.group === key;
      c.classList.toggle('is-hidden', !show);
      if (show) c.classList.add('is-in');
    });
    if (reduced) return;
    cards.forEach((c) => {
      if (c.classList.contains('is-hidden')) return;
      const a = first.get(c), b = c.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (!dx && !dy) return;
      c.style.transition = 'none';
      c.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        c.style.transition = '';
        c.style.transform = '';
      });
    });
  }
  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      applyFilter(btn.dataset.filter);
    });
  });

  /* Dialog */
  const dialog = section.querySelector('.work-dialog');
  const panel = dialog.querySelector('.work-dialog__panel');
  const media = dialog.querySelector('.work-dialog__media');
  const grp = dialog.querySelector('.work-dialog__group');
  const title = dialog.querySelector('.work-dialog__title');
  const metric = dialog.querySelector('.work-dialog__metric');
  const content = dialog.querySelector('.work-dialog__content');
  const closeBtn = dialog.querySelector('.work-dialog__close');
  let opener = null;

  function open(card) {
    const slug = card.dataset.slug;
    const tpl = document.getElementById('work-d-' + slug);
    media.innerHTML = '';
    const svg = card.querySelector('.work-art');
    if (svg) media.appendChild(svg.cloneNode(true));
    grp.textContent = card.querySelector('.work-group').textContent;
    title.textContent = card.querySelector('.work-title').textContent;
    metric.textContent = card.querySelector('.work-metric').textContent;
    content.innerHTML = '';
    if (tpl) content.appendChild(tpl.content.cloneNode(true));
    panel.dataset.group = card.dataset.group;
    opener = card.querySelector('.work-more');
    opener.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('work-lock');
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    closeBtn.focus();
  }
  function close() {
    if (!dialog.open) return;
    dialog.close();
  }
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('work-lock');
    if (opener) { opener.setAttribute('aria-expanded', 'false'); opener.focus(); opener = null; }
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  closeBtn.addEventListener('click', close);
  cards.forEach((card) => {
    card.querySelector('.work-more').addEventListener('click', (e) => { e.stopPropagation(); open(card); });
    card.addEventListener('click', (e) => { if (!e.target.closest('a, button')) open(card); });
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === card) open(card); });
  });
})();
