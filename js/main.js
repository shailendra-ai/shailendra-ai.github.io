/* Global behaviour: smooth scroll, scroll reveals, nav state and progress, copy-email, LinkedIn config. */
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* Smooth scroll (Lenis) synced with GSAP ScrollTrigger */
  let lenis = null;
  if (!reduced && typeof window.Lenis === 'function') {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }
  // Anchor links scroll smoothly through Lenis (or natively)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#' ? null : document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -20, duration: 1.3 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', id);
  });

  /* Reveals */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const d = Number(en.target.dataset.delay || 0) * 1000;
        setTimeout(() => en.target.classList.add('is-in'), reduced ? 0 : d);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* Nav: active section + progress bar */
  const links = Array.from(document.querySelectorAll('.nav-link'));
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    sections.forEach((s) => io.observe(s));
  }
  const bar = document.querySelector('.nav-progress i');
  function progress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + '%';
  }
  window.addEventListener('scroll', progress, { passive: true });
  progress();

  /* Copy email */
  document.querySelectorAll('.contact-copy').forEach((btn) => {
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.email);
        btn.textContent = 'Copied';
        btn.classList.add('is-done');
        setTimeout(() => { btn.textContent = label; btn.classList.remove('is-done'); }, 1800);
      } catch (e) {
        location.href = 'mailto:' + btn.dataset.email;
      }
    });
  });

  /* Footer year */
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());

  /* LinkedIn: set your URL once here. Until then the link stays hidden. */
  const LINKEDIN = '';
  document.querySelectorAll('[data-linkedin]').forEach((li) => {
    if (LINKEDIN) { li.href = LINKEDIN; li.hidden = false; } else { li.remove(); }
  });

  /* Refresh ScrollTrigger once fonts and images settle */
  if (hasGsap) {
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
