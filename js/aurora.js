/* Aurora: a raw-WebGL fragment shader background. Flowing nebula in the site palette,
   a faint perspective floor grid, film grain, and a pointer that warps the field.
   API: window.Aurora.mount(canvas) -> { destroy() } */
(function () {
  'use strict';

  const VERT = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;
  const FRAG = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_mouse;   // 0..1, y up
    uniform float u_mouseOn;
    uniform vec3 u_c1, u_c2, u_c3;

    // hash / noise / fbm
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 3; i++) { v += a * noise(p); p = r * p * 2.03; a *= 0.5; }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_res;
      vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
      float t = u_time * 0.045;

      // pointer warp
      vec2 m = (u_mouse - 0.5) * vec2(u_res.x / u_res.y, 1.0);
      float md = length(p - m);
      float pull = u_mouseOn * smoothstep(0.55, 0.0, md);
      vec2 q = p + (p - m) * pull * 0.25;

      // domain-warped fbm (one warp level: 3 fbm evaluations per pixel)
      vec2 w1 = vec2(fbm(q * 1.5 + t), fbm(q * 1.5 - t * 0.7 + 3.1));
      float n = fbm(q * 1.3 + 2.0 * w1);

      vec3 deep = vec3(0.024, 0.031, 0.051);
      vec3 col = deep;
      col = mix(col, u_c1 * 0.45, smoothstep(0.35, 0.75, n) * 0.8);
      col = mix(col, u_c2 * 0.45, smoothstep(0.55, 0.9, w1.x) * 0.55);
      col = mix(col, u_c3 * 0.5, smoothstep(0.6, 0.95, w1.y) * 0.5);
      // bright filaments
      float fil = smoothstep(0.48, 0.5, n) * smoothstep(0.52, 0.5, n);
      col += (u_c1 * 0.5 + u_c3 * 0.5) * fil * 0.8;
      // pointer glow
      col += (u_c1 * 0.5 + u_c2 * 0.5) * pull * 0.3;

      // vertical falloff: darker at the bottom so text stays readable there
      col *= mix(0.55, 1.0, smoothstep(0.0, 0.7, uv.y));

      // perspective floor grid in the bottom third
      float horizon = 0.34;
      if (uv.y < horizon) {
        float depth = (horizon - uv.y) / horizon;          // 0 at horizon, 1 at bottom
        float z = 1.0 / max(depth, 0.02);
        float gx = abs(fract((p.x * z * 0.9)) - 0.5);
        float gz = abs(fract((z * 0.6 - u_time * 0.25)) - 0.5);
        float lines = smoothstep(0.48, 0.5, gx) + smoothstep(0.48, 0.5, gz);
        float fade = smoothstep(0.0, 0.5, depth) * (1.0 - smoothstep(0.75, 1.0, depth));
        col += mix(u_c3, u_c1, uv.x) * lines * fade * 0.12;
      }

      // vignette + grain
      float vig = smoothstep(1.35, 0.35, length(p * vec2(0.8, 1.2)));
      col *= 0.65 + 0.35 * vig;
      float grain = hash(gl_FragCoord.xy + fract(u_time)) * 0.035;
      col += grain - 0.0175;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function mount(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' })
            || canvas.getContext('experimental-webgl');
    if (!gl) return { destroy() {} };

    function sh(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('aurora shader:', gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return { destroy() {} };
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('aurora link:', gl.getProgramInfoLog(prog)); return { destroy() {} }; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');
    const uMouseOn = gl.getUniformLocation(prog, 'u_mouseOn');
    // colours from the CSS theme tokens
    const css = getComputedStyle(document.documentElement);
    const hex = (name, fb) => { const v = (css.getPropertyValue(name) || '').trim() || fb; const n = parseInt(v.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
    const c1 = hex('--c1', '#FF6B2C'), c2 = hex('--c2', '#FF3D7F'), c3 = hex('--c3', '#22D3EE');
    gl.uniform3f(gl.getUniformLocation(prog, 'u_c1'), c1[0], c1[1], c1[2]);
    gl.uniform3f(gl.getUniformLocation(prog, 'u_c2'), c2[0], c2[1], c2[2]);
    gl.uniform3f(gl.getUniformLocation(prog, 'u_c3'), c3[0], c3[1], c3[2]);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    let W = 1, H = 1, raf = 0, visible = true, alive = true;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, ton: 0 };
    const t0 = performance.now();

    function resize() {
      const r = canvas.parentElement.getBoundingClientRect();
      const dpr = 0.5; // soft nebula: half-resolution is invisible, four times cheaper
      W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
      canvas.width = W; canvas.height = H;
      gl.viewport(0, 0, W, H);
    }
    let last = 0;
    function frame(now) {
      if (!alive) return;
      if (now - last < 30) { raf = requestAnimationFrame(frame); return; }   // ~30fps cap
      last = now;
      mouse.x += (mouse.tx - mouse.x) * 0.08; mouse.y += (mouse.ty - mouse.y) * 0.08;
      mouse.on += (mouse.ton - mouse.on) * 0.08;
      gl.uniform2f(uRes, W, H);
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uMouseOn, mouse.on);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!reduced && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function kick() { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }

    let rt; const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (reduced) kick(); }, 120); };
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width; mouse.ty = 1 - (e.clientY - r.top) / r.height; mouse.ton = 1;
    };
    const onLeave = () => { mouse.ton = 0; };
    const onVis = () => { if (!document.hidden) kick(); };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    if (!coarse && !reduced) {
      canvas.parentElement.addEventListener('pointermove', onMove, { passive: true });
      canvas.parentElement.addEventListener('pointerleave', onLeave);
    }
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) kick(); }) : null;
    if (io) io.observe(canvas);

    resize(); kick();
    return {
      destroy() {
        alive = false; cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis);
        if (io) io.disconnect();
      }
    };
  }

  window.Aurora = { mount };
})();
