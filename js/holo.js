/* Holo: a Three.js (r128, global THREE) holographic "neural core" — wireframe icosahedron,
   a sphere of glowing points, thin orbit rings with satellites, mouse parallax.
   API: window.Holo.mount(container) -> { destroy() } */
(function () {
  'use strict';

  function glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,.8)');
    grd.addColorStop(0.6, 'rgba(255,255,255,.15)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }

  function mount(container) {
    if (typeof THREE === 'undefined') return { destroy() {} };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const group = new THREE.Group();
    scene.add(group);

    const css = getComputedStyle(document.documentElement);
    const tok = (n, fb) => (css.getPropertyValue(n) || '').trim() || fb;
    const CYAN = new THREE.Color(tok('--c1', '#FF6B2C')), VIOLET = new THREE.Color(tok('--c2', '#FF3D7F')), MAGENTA = new THREE.Color(tok('--c3', '#22D3EE')), ORANGE = new THREE.Color(tok('--cta', '#FF6B2C'));

    // Outer wireframe icosahedron
    const ico = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.2, 1),
      new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending })
    );
    group.add(ico);
    // Inner solid-ish core
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.9, 2),
      new THREE.MeshBasicMaterial({ color: VIOLET, wireframe: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })
    );
    group.add(core);

    // Point sphere
    const N = 900;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N);
    const tmp = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const u = Math.random(), v = Math.random();
      const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
      const r = 1.3 + Math.pow(Math.random(), 0.5) * 0.85;
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
      tmp.copy(VIOLET).lerp(MAGENTA, (pos[i * 3 + 1] + 2.2) / 4.4).lerp(CYAN, Math.random() * 0.35);
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
      sz[i] = 0.5 + Math.random();
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const tex = glowTexture();
    const points = new THREE.Points(pg, new THREE.PointsMaterial({
      size: 0.09, map: tex, vertexColors: true, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    }));
    group.add(points);

    // Orbit rings + satellites
    const rings = [];
    const ringSpecs = [
      { r: 2.9, tilt: [1.2, 0.3, 0], speed: 0.25, color: CYAN },
      { r: 3.3, tilt: [0.4, 1.1, 0.5], speed: -0.18, color: MAGENTA },
      { r: 2.6, tilt: [2.0, 0.8, 1.2], speed: 0.32, color: VIOLET }
    ];
    ringSpecs.forEach((s, idx) => {
      const pivot = new THREE.Group();
      pivot.rotation.set(s.tilt[0], s.tilt[1], s.tilt[2]);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(s.r, 0.008, 6, 160),
        new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })
      );
      pivot.add(ring);
      // satellites riding the ring
      const sats = [];
      const count = idx === 1 ? 3 : 2;
      for (let k = 0; k < count; k++) {
        const sg = new THREE.BufferGeometry();
        sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([s.r, 0, 0]), 3));
        const sat = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.28, map: tex, color: k === 0 ? ORANGE : s.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        sat.userData.phase = (k / count) * Math.PI * 2;
        pivot.add(sat); sats.push(sat);
      }
      group.add(pivot);
      rings.push({ pivot, speed: s.speed, sats, r: s.r });
    });

    // Parallax
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    const onMove = (e) => {
      const r = container.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const onLeave = () => { target.x = 0; target.y = 0; };
    if (!coarse && !reduced) {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerleave', onLeave);
    }

    let raf = 0, alive = true, visible = true;
    const t0 = performance.now();
    function resize() {
      const r = container.getBoundingClientRect();
      const w = Math.max(1, r.width), h = Math.max(1, r.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    let last = 0;
    function frame(now) {
      if (!alive) return;
      if (now - last < 30) { raf = requestAnimationFrame(frame); return; }   // ~30fps cap
      last = now;
      const t = (now - t0) / 1000;
      cur.x += (target.x - cur.x) * 0.05; cur.y += (target.y - cur.y) * 0.05;
      group.rotation.y = t * 0.12 + cur.x * 0.35;
      group.rotation.x = Math.sin(t * 0.2) * 0.08 + cur.y * 0.25;
      const breathe = 1 + Math.sin(t * 0.9) * 0.03;
      group.scale.setScalar(breathe);
      ico.rotation.y = -t * 0.08; ico.rotation.z = t * 0.05;
      core.rotation.x = t * 0.5; core.rotation.y = -t * 0.35;
      points.rotation.y = t * 0.06; points.rotation.z = -t * 0.03;
      rings.forEach((rg) => {
        rg.pivot.rotation.z += rg.speed * 0.004;
        rg.sats.forEach((sat) => {
          const a = t * rg.speed * 1.6 + sat.userData.phase;
          sat.position.set(Math.cos(a) * rg.r, Math.sin(a) * rg.r, 0);
        });
      });
      renderer.render(scene, camera);
      if (!reduced && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function kick() { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }

    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { resize(); if (reduced) kick(); }) : null;
    if (ro) ro.observe(container); else window.addEventListener('resize', resize);
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) kick(); }) : null;
    if (io) io.observe(container);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener('visibilitychange', onVis);

    resize(); kick();
    return {
      destroy() {
        alive = false; cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); if (io) io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('pointermove', onMove);
        renderer.dispose(); container.removeChild(renderer.domElement);
      }
    };
  }

  window.Holo = { mount };
})();
