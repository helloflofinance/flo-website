/* ============================================================================
   flo — HERO: FLOW-FIELD WAVES
   ----------------------------------------------------------------------------
   Layered sine ribbons of light streaming lower-left to upper-right across a
   deep navy field, with particles running along them. Nearer ribbons are
   bigger, brighter and warmer toward cyan; distant ones sink back into the
   navy. The upper-left stays dark and calm so the headline always has a
   quiet ground to sit on.

   One THREE.Points cloud, one custom shader, additive blending. No bloom
   pass, no post chain — the glow is faked by stacking soft sprites, which is
   what keeps this affordable on a phone.

   The composition is authored in SCREEN-PLANE units (the plane at z = 0) and
   then scaled out by distance, so a ribbon four units behind the camera plane
   still crosses the same share of the frame. Author in what you see; let the
   shader deal with perspective. Getting this wrong is what turns a set of
   ribbons into a cloud of fog: the lane spacing has to stay bigger on screen
   than the scatter inside each lane.

   House rules carried over from the previous hero:
     · nothing calls Math.random() at runtime — a seeded PRNG keeps the
       composition art-directed and identical on every load.
     · the headline is real HTML, never drawn into the canvas.
   ========================================================================== */

import * as THREE from './vendor/three.module.min.js';

const canvas = document.getElementById('hero-c');
const hero   = document.getElementById('hero');
if (canvas && hero) boot();

function boot() {

  /* ── seeded PRNG ────────────────────────────────────────────────────── */
  const rng = (a => () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  })(0x5f0a1b3d);

  /* ── device tier ────────────────────────────────────────────────────────
     Mobile is not a lesser hero — same ribbons, same palette, same motion.
     It runs fewer particles per ribbon and a capped DPR, which is invisible
     at phone size and is the difference between 60fps and a hot battery. */
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small  = (window.visualViewport ? window.visualViewport.width : innerWidth) < 900;

  const TIER = small
    ? { lanes:  7, per: 138, dprCap: 1.75, parallax: 0 }   //   966 points
    : { lanes: 14, per:1650, dprCap: 2.0,  parallax: 1 };  // 23100 points

  const COUNT = TIER.lanes * TIER.per;

  const FOV = 46, CAM_Z = 9.2;

  /* ── scene ──────────────────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: false, powerPreference: 'high-performance'
  });
  renderer.setClearAlpha(0);                       // the navy is CSS, not GL

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
  camera.position.set(0, 0, CAM_Z);

  /* ── the field ──────────────────────────────────────────────────────────
     aT     position along the ribbon, 0..1
     aLane  ribbon depth, 0 = furthest/dimmest .. 1 = nearest/brightest
     aJit   scatter around the ribbon's centreline, in screen-plane units
     aSeed  per-particle noise: drift, twinkle, size
     aKind  0 = the line itself · 1 = a bright traveller · 2 = soft mist

     The three kinds are what make this read as light rather than as dots:
     a dense tight line carries the shape, a few travellers give it sparkle,
     and a thin layer of wide dim mist supplies the halo a bloom pass would
     otherwise have to render. */
  const pos   = new Float32Array(COUNT * 3);       // placeholder; shader owns x/y/z
  const aT    = new Float32Array(COUNT);
  const aLane = new Float32Array(COUNT);
  const aJit  = new Float32Array(COUNT * 3);
  const aSeed = new Float32Array(COUNT);
  const aKind = new Float32Array(COUNT);

  let i = 0;
  for (let l = 0; l < TIER.lanes; l++) {
    const laneN = TIER.lanes === 1 ? 1 : l / (TIER.lanes - 1);
    for (let p = 0; p < TIER.per; p++) {
      aT[i]    = (p + rng() * 0.9) / TIER.per;
      aLane[i] = laneN;
      aSeed[i] = rng();

      const roll = rng();
      const kind = roll < 0.030 ? 1 : roll < 0.145 ? 2 : 0;
      aKind[i] = kind;

      // squaring the scatter keeps the core dense and the edges sparse, which
      // is the difference between a line of light and a band of fog
      const r = rng(), sgn = rng() < 0.5 ? -1 : 1;
      const spread = kind === 2 ? 0.115 : 0.028;
      aJit[i * 3]     = (rng() - 0.5) * 0.05;
      aJit[i * 3 + 1] = sgn * r * r * spread;
      aJit[i * 3 + 2] = (rng() - 0.5) * 0.18;
      i++;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aT',    new THREE.BufferAttribute(aT, 1));
  geo.setAttribute('aLane', new THREE.BufferAttribute(aLane, 1));
  geo.setAttribute('aJit',  new THREE.BufferAttribute(aJit, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
  geo.setAttribute('aKind', new THREE.BufferAttribute(aKind, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);   // never culled

  const uniforms = {
    uTime:   { value: 0 },
    uReveal: { value: 0 },
    uSpanX:  { value: 7 },      // half-width of the composition, screen plane
    uSpread: { value: 5 },      // total ribbon stack height, screen plane
    uAmp:    { value: 0.62 },   // wave amplitude, screen plane
    uScale:  { value: 72 },
    uDpr:    { value: 1 },
    uCamZ:   { value: CAM_Z },
    uShield: { value: new THREE.Vector2(1.0, 0.18) },
    uRamp:   { value: new THREE.Vector2(-0.58, 0.52) },
    uBias:   { value: 0.64 },   // where the ribbon stack sits in frame
    uMouse:  { value: new THREE.Vector2(0, 0) },
    // flo wave language: deep navy ground, electric blue body, teal/cyan crest
    uDeep:   { value: new THREE.Color(0x0e3a8c) },
    uBlue:   { value: new THREE.Color(0x046ad4) },
    uTeal:   { value: new THREE.Color(0x8ffbec) }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aT;
      attribute float aLane;
      attribute vec3  aJit;
      attribute float aSeed;
      attribute float aKind;

      uniform float uTime, uReveal, uSpanX, uSpread, uAmp, uScale, uDpr, uCamZ, uBias;
      uniform vec2  uShield, uMouse, uRamp;
      uniform vec3  uDeep, uBlue, uTeal;

      varying vec3  vCol;
      varying float vAlpha;
      varying float vSoft;

      void main() {
        float t = aT;

        // ── the flow field, authored on the screen plane ──────────────────
        // Two sines at incommensurate frequencies, phase-shifted per ribbon,
        // then tilted. The tilt is what sends the whole system lower-left to
        // upper-right the way the reference does.
        float x = (t - 0.5) * 2.0 * uSpanX;
        float ph = aLane * 3.4 + aSeed * 0.05;

        float w1 = sin(x * 0.52 + uTime * 0.28 + ph);
        float w2 = sin(x * 1.21 - uTime * 0.18 + ph * 1.7);
        float y  = (w1 + w2 * 0.38) * uAmp * mix(0.78, 1.28, aLane);

        y += (aLane - uBias) * uSpread;     // the ribbons, stacked
        y += x * 0.20;                      // the diagonal

        // breathing drift, so the field never looks like a frozen mesh
        y += sin(uTime * 0.5 + aSeed * 6.28) * 0.02;

        x += aJit.x;
        y += aJit.y;

        // desktop parallax — the field leans into the cursor, the copy does not
        x += uMouse.x * (0.30 + aLane * 0.45);
        y += uMouse.y * (0.20 + aLane * 0.30);

        // ── out into depth ────────────────────────────────────────────────
        // Scale by distance so a far ribbon still crosses the same share of
        // the frame: the composition keeps its shape, depth only changes how
        // big and how bright each ribbon is.
        float z = mix(-7.0, 2.6, aLane) + aJit.z;
        float k = (uCamZ - z) / uCamZ;
        vec4 mv = modelViewMatrix * vec4(x * k, y * k, z, 1.0);

        // ── light ─────────────────────────────────────────────────────────
        // Crest = where the ribbon is turning over. Crests go teal, troughs
        // sink to deep blue, and depth does the rest.
        float crest = w1 * 0.5 + 0.5;
        float warm  = clamp(crest * 0.60 + aLane * 0.52 - 0.22, 0.0, 1.0);
        vec3  col   = mix(uDeep, uBlue, clamp(aLane * 1.30, 0.0, 1.0));
        col = mix(col, uTeal, warm * warm * 0.9);

        float lum = mix(0.42, 1.25, aLane) * mix(0.70, 1.40, crest);

        // ── the draw-in ───────────────────────────────────────────────────
        // Waves assemble on load, sweeping along the flow and from the far
        // ribbons forward. This IS the fancy start: no gate, no interstitial,
        // and the copy is readable the whole way through.
        float order  = t * 0.70 + (1.0 - aLane) * 0.30;
        float appear = smoothstep(0.0, 0.26, uReveal * 1.40 - order);
        float edge   = smoothstep(0.14, 0.0, abs(uReveal * 1.40 - order))
                     * (1.0 - uReveal);
        lum += edge * 3.0;                  // a bright front rides the reveal

        // ── where the light is allowed to be ──────────────────────────────
        // Upper-left stays dark for the headline. uShield lets the layout
        // decide how hard that corner is held down (landscape: hard, because
        // the copy is on the left; portrait: from the top, because the copy
        // owns the whole width).
        float nx = clamp(x / uSpanX, -1.0, 1.0);
        float ny = clamp(y / max(uSpread, 0.001), -1.2, 1.2);
        float diag   = nx * uShield.x - ny * uShield.y;
        float shield = 0.05 + 0.95 * smoothstep(uRamp.x, uRamp.y, diag);

        // ends of each ribbon dissolve, so no terminus is ever visible
        float ends = smoothstep(0.0, 0.09, t) * smoothstep(1.0, 0.91, t);

        float twinkle = aKind > 0.5 && aKind < 1.5
          ? 0.45 + 0.55 * sin(uTime * 2.3 + aSeed * 40.0)
          : 1.0;

        // kind 0 line · 1 traveller · 2 mist
        float isSpark = step(0.5, aKind) * step(aKind, 1.5);
        float isMist  = step(1.5, aKind);
        float size    = mix(mix(0.9, 2.2, isSpark), 11.0, isMist) * (0.75 + aSeed * 0.5);
        float body    = mix(mix(1.0, 1.5, isSpark), 0.075, isMist);
        vSoft         = isMist;

        vCol   = col * lum * body;
        vAlpha = appear * ends * shield * twinkle * mix(0.55, 1.0, aLane);

        gl_PointSize = size * uScale * uDpr / max(-mv.z, 0.6);
        gl_Position  = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      precision mediump float;
      varying vec3  vCol;
      varying float vAlpha;
      varying float vSoft;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        // Line: tight core plus a short halo, so a row of them reads as one
        // continuous thread. Mist: broad and flat, so it adds glow instead of
        // another visible dot.
        float line = pow(core, 2.2) * 0.45 + pow(core, 8.0) * 0.75;
        float haze = pow(core, 1.25) * 0.55;
        gl_FragColor = vec4(vCol, mix(line, haze, vSoft) * vAlpha);
      }
    `
  });

  const points = new THREE.Points(geo, material);
  scene.add(points);

  /* ── layout ─────────────────────────────────────────────────────────────
     Everything is derived from the frustum rather than hard-coded, so the
     same composition holds from a 390px phone to an ultrawide — and across a
     foldable's hinge, where the pane can be almost any shape. */
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;

    const dpr = Math.min(window.devicePixelRatio || 1, TIER.dprCap);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    uniforms.uDpr.value = dpr;

    const portrait = h > w;
    camera.position.z = CAM_Z;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const halfH = CAM_Z * Math.tan(FOV * Math.PI / 360);
    const halfW = halfH * camera.aspect;

    uniforms.uCamZ.value   = CAM_Z;
    uniforms.uSpanX.value  = halfW * 1.40;      // overshoot both edges
    uniforms.uSpread.value = halfH * (portrait ? 1.05 : 1.30);
    uniforms.uAmp.value    = halfH * (portrait ? 0.20 : 0.16);
    // ~9px of core sprite at dpr 1, whatever the viewport is
    uniforms.uScale.value  = (h / 609) * 72 * (portrait ? 0.9 : 1);

    // Which way the dark runs. Landscape: a diagonal from the dark
    // upper-left, where the headline is, to the lit lower-right. Portrait:
    // the copy owns the full width, so the ramp runs top-to-bottom, the
    // stack sits lower in frame, and the lit band is given most of the
    // lower half to live in rather than a strip behind the buttons.
    uniforms.uShield.value.set(portrait ? 0.10 : 1.0,  portrait ? 0.80 : 0.18);
    uniforms.uRamp.value.set(  portrait ? -0.92 : -0.58, portrait ? 0.38 : 0.52);
    uniforms.uBias.value = portrait ? 0.80 : 0.64;
  }

  /* ── pointer parallax (desktop only) ────────────────────────────────── */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (TIER.parallax && !coarse) {
    window.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = hero.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      mouse.ty = -((e.clientY - r.top) / r.height - 0.5) * 2;
    }, { passive: true });
  }

  /* ── loop ───────────────────────────────────────────────────────────────
     Time only accumulates while the hero is actually on screen and the tab
     is visible, so scrolling past or switching tabs costs nothing and the
     reveal resumes where it left off rather than jumping. */
  let raf = 0, running = false, last = 0, t = 0, revealed = false;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    if (uniforms.uReveal.value < 1) {
      uniforms.uReveal.value = Math.min(1, uniforms.uReveal.value + dt / 2.4);
    }

    mouse.x += (mouse.tx - mouse.x) * 0.045;
    mouse.y += (mouse.ty - mouse.y) * 0.045;
    uniforms.uMouse.value.set(mouse.x * 0.40, mouse.y * 0.24);

    uniforms.uTime.value = t;
    renderer.render(scene, camera);

    // Hand off from the static frame only once the field has enough of
    // itself drawn in to carry the hero. Swapping on the first frame leaves
    // a beat where the static waves have faded and the live ones have barely
    // started — most visible on exactly the slow devices that can least
    // afford to show an empty hero.
    if (!revealed && uniforms.uReveal.value > 0.55) {
      revealed = true;
      hero.classList.add('hero-live');
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true; last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false; cancelAnimationFrame(raf);
  }

  resize();
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  // a foldable being spanned or unspanned changes segments, not always size
  if (window.matchMedia) {
    const seg = matchMedia('(horizontal-viewport-segments: 2)');
    if (seg.addEventListener) seg.addEventListener('change', resize);
    else if (seg.addListener) seg.addListener(resize);
  }

  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es[0].isIntersecting ? start() : stop(), { threshold: 0.01 })
      .observe(hero);
  } else {
    start();
  }

  // If the context is ever lost (phones do this under memory pressure), fall
  // back to the static wave frame rather than leaving a black rectangle.
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault(); stop(); hero.classList.remove('hero-live');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    revealed = false; resize(); start();
  });

  // Art-direction hook: the render is a pure function of these uniforms, so
  // any moment of the piece can be held still and judged.
  window.__floHero = { uniforms, stop, start, resize };
}
