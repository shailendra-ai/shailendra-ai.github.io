/* Stack: place chips evenly around each orbit ring. */
(function () {
  'use strict';
  document.querySelectorAll('.stack-ring').forEach((ring) => {
    const items = (ring.dataset.items || '').split(',').map((s) => s.trim()).filter(Boolean);
    const n = items.length;
    items.forEach((label, i) => {
      const sat = document.createElement('div');
      sat.className = 'stack-sat';
      sat.style.setProperty('--a', (i / n * 360) + 'deg');
      sat.style.setProperty('--r', '50%');
      const s = document.createElement('span');
      s.textContent = label;
      sat.appendChild(s);
      ring.appendChild(sat);
    });
    // --r in % of the satellite's own size would be wrong; set it in px from the ring radius.
    function size() {
      const r = ring.getBoundingClientRect().width / 2;
      ring.querySelectorAll('.stack-sat').forEach((sat) => sat.style.setProperty('--r', r + 'px'));
    }
    size();
    window.addEventListener('resize', size);
  });
})();
