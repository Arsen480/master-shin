/* ==========================================================================
   Мастер шин — UI + scroll-driven 3D scene (Three.js, procedural geometry)
   Classic script on purpose: works from file:// and any static host.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
  const TAU = Math.PI * 2;
  const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => innerWidth < 820;

  root.classList.remove('no-js');

  /* ======================================================================
     UI (independent of WebGL)
     ====================================================================== */
  function initUI() {
    const nav = $('#nav');
    const bar = $('#progress');
    const menu = $('#menu');
    const burger = $('#burger');
    const sections = ['hero', 'services', 'why', 'process', 'prices', 'reviews', 'contacts']
      .map(id => document.getElementById(id)).filter(Boolean);
    const links = $$('.nav__links a, .rail a');

    const onScroll = () => {
      const y = scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      nav.classList.toggle('is-solid', y > 24);
      bar.style.setProperty('--p', clamp(y / max, 0, 1).toFixed(4));
      let cur = sections[0].id;
      for (const s of sections) if (s.getBoundingClientRect().top <= innerHeight * 0.45) cur = s.id;
      links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + cur));
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    onScroll();

    const setMenu = open => {
      burger.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
    };
    burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

    // Reveal on scroll
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach(el => io.observe(el));

    // Count-up numbers in the hero
    const counters = $$('[data-count]');
    const runCounters = () => {
      const t0 = performance.now();
      const tick = now => {
        const k = reduceMotion ? 1 : clamp((now - t0) / 1500, 0, 1);
        const e = 1 - Math.pow(1 - k, 3);
        counters.forEach(el => {
          const to = parseFloat(el.dataset.count);
          const dec = parseInt(el.dataset.dec || '0', 10);
          el.textContent = (to * e).toFixed(dec);
        });
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    setTimeout(runCounters, 700);
  }

  /* ======================================================================
     3D scene
     ====================================================================== */
  const BASE = {
    fx: .5, fy: 0, pz: 0, s: 1.5, rx: .14, ry: -.55, rz: 0,
    spin: 0, idle: .3, explode: 0, tire: 1, disc: 1,
    nail: 0, slash: 0, patch: 0, torch: 0, weld: 0, set: 0,
    alpha: 1, glow: 1
  };
  const NUM = Object.keys(BASE);
  const P = o => Object.assign({}, BASE, o);

  // Scroll storyboard: each key pins a pose to a point in the page.
  // `sel` + `t` = the moment the viewport centre is at fraction t of that element.
  const S2 = { fx: -.47, fy: -.03, s: 1.28, rx: .58, ry: .42, spin: 2.4, idle: 0 };
  const S3 = { fx: .47, s: 1.42, rx: .12, ry: -.38, spin: 3.6, idle: 0 };
  const S4 = { fx: -.47, fy: -.05, s: 1.85, rx: .2, ry: .28, spin: 4.6, idle: 0, tire: 0, disc: 0 };
  const STORY = [
    { abs: () => 0, m: { fy: .5, k: .42 }, p: P({ fx: .5, s: 1.55, rx: .14, ry: -.55, spin: 0, idle: .32 }) },
    { abs: () => innerHeight * .16, m: { fy: .5, k: .42 }, p: P({ fx: .5, s: 1.55, rx: .14, ry: -.55, spin: .15, idle: .32 }) },
    { sel: '#step1', t: .38, p: P({ fx: .4, s: 1.06, rx: .2, ry: .85, spin: 1.3, idle: .08, explode: 1 }) },
    { sel: '#step1', t: .68, p: P({ fx: .4, s: 1.06, rx: .2, ry: .85, spin: 1.5, idle: .08, explode: 1 }) },
    { sel: '#step2', t: .3, p: P({ ...S2, nail: 1 }) },
    { sel: '#step2', t: .75, p: P({ ...S2, nail: 0 }) },
    { sel: '#step3', t: .3, p: P({ ...S3, slash: 1 }) },
    { sel: '#step3', t: .75, p: P({ ...S3, slash: 0, patch: 1 }) },
    { sel: '#step4', t: .3, p: P({ ...S4, torch: 1, weld: 0 }) },
    { sel: '#step4', t: .75, p: P({ ...S4, torch: 1, weld: 1 }) },
    { sel: '#step5', t: .38, p: P({ fx: .4, s: 1.0, rx: .1, ry: -.4, spin: 5.8, idle: .4, tire: 0, disc: 0, set: 1 }) },
    { sel: '#step5', t: .7, p: P({ fx: .4, s: 1.0, rx: .1, ry: -.4, spin: 6.3, idle: .4, tire: 0, disc: 0, set: 1 }) },
    { sel: '#why', t: .5, bg: 1, p: P({ fx: .64, s: 1.7, rx: .1, ry: -.9, spin: 7.8, idle: .9, glow: .7 }) },
    { sel: '#process', t: .5, bg: 1, p: P({ fx: -.55, s: 1.4, rx: .2, ry: .7, spin: 9.2, idle: .5 }) },
    { sel: '#prices', t: .5, bg: 1, p: P({ fx: .58, s: 1.2, rx: .12, ry: -.6, spin: 10.6, idle: .4 }) },
    { sel: '#reviews', t: .5, bg: 1, p: P({ fx: 0, s: 2.5, rx: .1, ry: -.2, spin: 11.6, idle: .2, alpha: .2 }) },
    { sel: '#contacts', t: .5, bg: 1, p: P({ fx: .62, fy: -.05, s: 1.3, rx: .12, ry: -.55, spin: 13, idle: .3, alpha: .5 }) }
  ];

  async function init3D() {
    const canvas = $('#scene');
    const THREE = await import('three');
    let RoomEnvironment = null;
    try { ({ RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js')); } catch (e) { /* optional */ }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 7);
    const camHalfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;

    if (RoomEnvironment) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.85;
    }
    const key = new THREE.DirectionalLight(0xfff1dc, 2.4); key.position.set(3.5, 4, 5);
    const back = new THREE.DirectionalLight(0xffb81c, 3.4); back.position.set(-5, 1.5, -3);
    const fill = new THREE.DirectionalLight(0x7aa7ff, 0.7); fill.position.set(-4, -2, 4);
    scene.add(key, back, fill, new THREE.AmbientLight(0xffffff, 0.2));

    await Promise.race([
      document.fonts ? document.fonts.load('800 40px Unbounded').catch(() => {}) : Promise.resolve(),
      new Promise(r => setTimeout(r, 1500))
    ]);

    /* ---------- helpers ---------- */
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const AX = V(1, 0, 0), AZ = V(0, 0, 1);
    const AMBER = 0xffb81c;

    const canvasTex = (w, h, draw) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    };
    const chaikin = (pts, n = 2) => {
      for (let k = 0; k < n; k++) {
        const out = [pts[0]];
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          out.push(a.clone().lerp(b, .25), a.clone().lerp(b, .75));
        }
        out.push(pts[pts.length - 1]);
        pts = out;
      }
      return pts;
    };

    /* ---------- textures ---------- */
    const sidewallTex = canvasTex(1024, 1024, (g, w, h) => {
      g.translate(w / 2, h / 2);
      const K = 512 / 0.95;
      const arcText = (text, r, size, color, center, spacing) => {
        g.save();
        g.fillStyle = color;
        g.font = `800 ${size}px Unbounded, "Arial Black", sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        const chars = [...text];
        const ws = chars.map(ch => g.measureText(ch).width + spacing);
        let a = center - ws.reduce((x, y) => x + y, 0) / r / 2;
        chars.forEach((ch, i) => {
          const step = ws[i] / r;
          a += step / 2;
          g.save(); g.rotate(a); g.translate(0, -r); g.fillText(ch, 0, 0); g.restore();
          a += step / 2;
        });
        g.restore();
      };
      g.strokeStyle = 'rgba(255,184,28,.85)'; g.lineWidth = 5;
      g.beginPath(); g.arc(0, 0, .915 * K, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, .71 * K, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 90; i++) {
        g.save(); g.rotate(i / 90 * Math.PI * 2);
        g.fillStyle = 'rgba(255,255,255,.28)';
        g.fillRect(-1.5, -.905 * K, 3, i % 5 === 0 ? 20 : 10);
        g.restore();
      }
      arcText('МАСТЕР ШИН', .81 * K, 46, 'rgba(236,233,226,.92)', 0, 6);
      arcText('ШИНОМОНТАЖ  ·  24/7', .81 * K, 40, 'rgba(255,184,28,.95)', Math.PI, 5);
    });

    const capTex = canvasTex(256, 256, (g, w, h) => {
      const gr = g.createRadialGradient(w * .4, h * .35, 10, w / 2, h / 2, w / 2);
      gr.addColorStop(0, '#ffd56a'); gr.addColorStop(1, '#e08a00');
      g.fillStyle = gr; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 8;
      g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 22, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#16120a'; g.font = '800 124px Unbounded, "Arial Black", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('М', w / 2, h / 2 + 8);
    });

    const slashTex = canvasTex(256, 96, (g, w, h) => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      const pts = []; for (let i = 0; i <= 12; i++) pts.push([14 + i * (w - 28) / 12, h / 2 + (i % 2 ? -1 : 1) * (4 + Math.sin(i * 2.1) * 6)]);
      const path = () => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); };
      g.strokeStyle = 'rgba(130,130,135,.6)'; g.lineWidth = 34; path(); g.stroke();
      g.strokeStyle = '#020202'; g.lineWidth = 20; path(); g.stroke();
      g.shadowColor = '#ff9d00'; g.shadowBlur = 20; g.strokeStyle = '#ffb81c'; g.lineWidth = 4; path(); g.stroke();
    });

    const patchTex = canvasTex(256, 256, (g, w, h) => {
      const gr = g.createRadialGradient(w * .4, h * .35, 10, w / 2, h / 2, w / 2);
      gr.addColorStop(0, '#ffd978'); gr.addColorStop(1, '#f08f00');
      g.fillStyle = gr; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(70,35,0,.8)'; g.lineWidth = 6; g.setLineDash([14, 10]);
      g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 28, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      g.strokeStyle = 'rgba(70,35,0,.35)'; g.lineWidth = 3;
      for (let i = -8; i < 12; i++) { g.beginPath(); g.moveTo(i * 24, 0); g.lineTo(i * 24 + h, h); g.stroke(); }
      g.globalCompositeOperation = 'destination-in';
      g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2); g.fill();
    });

    const dotTex = (inner, stops) => canvasTex(128, 128, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, inner, w / 2, h / 2, w / 2);
      stops.forEach(([o, c]) => gr.addColorStop(o, c));
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    const glowTex = dotTex(0, [[0, 'rgba(255,255,255,1)'], [.25, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]);
    const sparkTex = dotTex(0, [[0, 'rgba(255,255,255,1)'], [.4, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]);
    const markTex = canvasTex(128, 128, (g, w, h) => {
      g.strokeStyle = '#ffb81c'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, 46, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, 58, 0, Math.PI * 2); g.globalAlpha = .5; g.stroke();
    });

    /* ---------- rig hierarchy ---------- */
    const rig = new THREE.Group(); rig.rotation.order = 'YXZ';
    const wheel = new THREE.Group();      // spins about its own axis (z)
    rig.add(wheel); scene.add(rig);

    /* ---------- tire ---------- */
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x151517, roughness: .88, metalness: .02, side: THREE.DoubleSide });
    const treadMat = new THREE.MeshStandardMaterial({ color: 0x242428, roughness: .92 });
    const decalMat = new THREE.MeshStandardMaterial({ map: sidewallTex, transparent: true, roughness: .85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    decalMat.userData.alwaysT = true;

    const tireG = new THREE.Group();
    {
      const half = [[1.0, 0], [1.0, .13], [.985, .2], [.945, .245], [.9, .268], [.78, .275], [.7, .272], [.655, .255], [.625, .22], [.605, .17]];
      const prof = [
        ...half.slice().reverse().map(([r, z]) => new THREE.Vector2(r, -z)),
        ...half.slice(1).map(([r, z]) => new THREE.Vector2(r, z))
      ];
      const geo = new THREE.LatheGeometry(chaikin(prof, 2), 160);
      geo.rotateX(Math.PI / 2);
      tireG.add(new THREE.Mesh(geo, tireMat));

      const rows = [
        { z: -.15, phi: .55, off: 0, sc: [1, 1, 1] },
        { z: 0, phi: 0, off: .5, sc: [1, .8, .62] },
        { z: .15, phi: -.55, off: 0, sc: [1, 1, 1] }
      ];
      const N = 60;
      const tread = new THREE.InstancedMesh(new THREE.BoxGeometry(.04, .046, .12), treadMat, N * rows.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qz = new THREE.Quaternion(), qx = new THREE.Quaternion();
      const p = new THREE.Vector3(), s = new THREE.Vector3();
      let idx = 0;
      rows.forEach(r => {
        for (let i = 0; i < N; i++) {
          const a = (i + r.off) / N * Math.PI * 2;
          qz.setFromAxisAngle(AZ, a); qx.setFromAxisAngle(AX, r.phi); q.copy(qz).multiply(qx);
          p.set(Math.cos(a) * 1.012, Math.sin(a) * 1.012, r.z); s.set(r.sc[0], r.sc[1], r.sc[2]);
          m.compose(p, q, s); tread.setMatrixAt(idx++, m);
        }
      });
      tread.frustumCulled = false;
      tireG.add(tread);

      const dg = new THREE.CircleGeometry(.95, 96);
      const front = new THREE.Mesh(dg, decalMat); front.position.z = .2762;
      const rear = new THREE.Mesh(dg, decalMat); rear.position.z = -.2762; rear.rotation.y = Math.PI;
      tireG.add(front, rear);
    }
    wheel.add(tireG);

    /* ---------- rim (shared geometry, several instances for the rental set) ---------- */
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xc3c7ce, metalness: 1, roughness: .24 });
    const rimDark = new THREE.MeshStandardMaterial({ color: 0x1a1c20, metalness: .6, roughness: .5, side: THREE.DoubleSide });
    const accentMat = new THREE.MeshStandardMaterial({ color: AMBER, metalness: .6, roughness: .3, emissive: AMBER, emissiveIntensity: .35 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe8eaee, metalness: 1, roughness: .15 });
    const capSide = new THREE.MeshStandardMaterial({ color: 0xd98c00, metalness: .8, roughness: .3 });
    const capTop = new THREE.MeshStandardMaterial({ map: capTex, metalness: .5, roughness: .35 });

    const rimGeo = {};
    {
      const outer = [[.70, -.268], [.705, -.255], [.69, -.245], [.655, -.23], [.615, -.19], [.598, -.12], [.595, 0], [.598, .12], [.615, .19], [.655, .23], [.69, .245], [.705, .255], [.70, .268]];
      const pts = outer.map(([r, z]) => new THREE.Vector2(r, z));
      outer.slice().reverse().forEach(([r, z]) => pts.push(new THREE.Vector2(r - .032, z)));
      pts.push(pts[0].clone());
      rimGeo.barrel = new THREE.LatheGeometry(chaikin(pts, 1), 128).rotateX(Math.PI / 2);

      const sh = new THREE.Shape();
      sh.moveTo(.1, -.052); sh.lineTo(.6, -.034); sh.quadraticCurveTo(.64, 0, .6, .034); sh.lineTo(.1, .052); sh.closePath();
      rimGeo.spoke = new THREE.ExtrudeGeometry(sh, { depth: .05, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 2, curveSegments: 8 });
      rimGeo.spoke.translate(0, 0, -.025);
      rimGeo.hub = new THREE.CylinderGeometry(.19, .17, .13, 48).rotateX(Math.PI / 2);
      rimGeo.cap = new THREE.CylinderGeometry(.088, .088, .03, 48).rotateX(Math.PI / 2);
      rimGeo.nut = new THREE.CylinderGeometry(.022, .022, .04, 6).rotateX(Math.PI / 2);
      rimGeo.stripe = new THREE.TorusGeometry(.692, .007, 10, 160);
    }
    const SPOKES = 10;
    const makeRim = () => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(rimGeo.barrel, rimMat));
      for (let i = 0; i < SPOKES; i++) {
        const holder = new THREE.Group(); holder.rotation.z = i / SPOKES * Math.PI * 2;
        const sp = new THREE.Mesh(rimGeo.spoke, rimMat);
        sp.rotation.y = -.2; sp.position.z = -.03;
        holder.add(sp); g.add(holder);
      }
      g.add(new THREE.Mesh(rimGeo.hub, rimMat));
      const cap = new THREE.Mesh(rimGeo.cap, [capSide, capTop, rimDark]); cap.position.z = .075; g.add(cap);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + .3;
        const nut = new THREE.Mesh(rimGeo.nut, chromeMat); nut.position.set(Math.cos(a) * .135, Math.sin(a) * .135, .07); g.add(nut);
      }
      const s1 = new THREE.Mesh(rimGeo.stripe, accentMat); s1.position.z = .262; g.add(s1);
      const s2 = new THREE.Mesh(rimGeo.stripe, accentMat); s2.position.z = -.262; g.add(s2);
      return g;
    };
    const rimMain = makeRim();
    wheel.add(rimMain);

    // Rental set: three extra rims that live outside the spinning wheel
    const setG = new THREE.Group();
    const SET_OFF = [[1.5, 0, -.35], [0, -1.5, -.2], [1.5, -1.5, -.6]];
    const setRims = SET_OFF.map(() => { const r = makeRim(); r.visible = false; setG.add(r); return r; });
    rig.add(setG);

    /* ---------- brake disc + caliper ---------- */
    const discMat = new THREE.MeshStandardMaterial({ color: 0x8b8f96, metalness: .9, roughness: .42 });
    const slotMat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: .8 });
    const caliperMat = new THREE.MeshStandardMaterial({ color: AMBER, metalness: .35, roughness: .35 });
    const discG = new THREE.Group();
    {
      discG.add(new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .045, 72).rotateX(Math.PI / 2), discMat));
      discG.add(new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .1, 48).rotateX(Math.PI / 2), discMat));
      const slots = new THREE.InstancedMesh(new THREE.BoxGeometry(.15, .018, .008), slotMat, 30);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
      for (let i = 0; i < 30; i++) {
        const a = i / 30 * Math.PI * 2;
        q.setFromAxisAngle(AZ, a + .35); p.set(Math.cos(a) * .36, Math.sin(a) * .36, .0235);
        m.compose(p, q, one); slots.setMatrixAt(i, m);
      }
      slots.frustumCulled = false; discG.add(slots);
      discG.position.z = -.1;
    }
    wheel.add(discG);

    const caliperG = new THREE.Group();
    {
      const sh = new THREE.Shape();
      sh.absarc(0, 0, .57, -.5, .5, false); sh.absarc(0, 0, .4, .5, -.5, true); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: .12, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 3, curveSegments: 24 });
      geo.translate(0, 0, -.06);
      const mesh = new THREE.Mesh(geo, caliperMat); mesh.rotation.z = -.95;
      caliperG.add(mesh); caliperG.position.z = -.1;
    }
    rig.add(caliperG);

    /* ---------- exploded axis guide ---------- */
    const axisGeo = new THREE.BufferGeometry().setFromPoints([V(0, 0, -2.2), V(0, 0, 2.3)]);
    const axisMat = new THREE.LineDashedMaterial({ color: AMBER, dashSize: .1, gapSize: .08, transparent: true, opacity: 0 });
    const axisLine = new THREE.Line(axisGeo, axisMat); axisLine.computeLineDistances(); rig.add(axisLine);

    /* ---------- repair details (nail / sidewall cut / patch) ---------- */
    const details = new THREE.Group(); rig.add(details);

    const nailMat = new THREE.MeshStandardMaterial({ color: 0xb4b8bf, metalness: 1, roughness: .32, transparent: true });
    const nailG = new THREE.Group();
    {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.011, .006, .34, 12).rotateZ(-Math.PI / 2), nailMat); shaft.position.x = .05;
      const head = new THREE.Mesh(new THREE.CylinderGeometry(.036, .036, .014, 24).rotateZ(-Math.PI / 2), nailMat); head.position.x = .225;
      nailG.add(shaft, head);
    }
    const NAIL_A = 1.2;
    nailG.rotation.z = NAIL_A;
    nailG.scale.setScalar(1.6);
    details.add(nailG);
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex, transparent: true, depthTest: false, depthWrite: false }));
    mark.renderOrder = 5; mark.position.x = .1; nailG.add(mark);

    const slashMat = new THREE.MeshBasicMaterial({ map: slashTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const patchMat = new THREE.MeshStandardMaterial({ map: patchTex, transparent: true, roughness: .6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
    // CUT_A is picked for step 3's locked spin so the cut sits in a lettering-free part of the sidewall.
    const CUT_A = 2.8, CUT_R = .8;
    const cutX = Math.cos(CUT_A) * CUT_R, cutY = Math.sin(CUT_A) * CUT_R;
    const slash = new THREE.Mesh(new THREE.PlaneGeometry(.56, .21), slashMat);
    slash.position.set(cutX, cutY, .2775); slash.rotation.z = CUT_A + Math.PI / 2 - .12;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(.15, 48), patchMat);
    patch.position.set(cutX, cutY, .2782); patch.rotation.z = CUT_A + Math.PI / 2 - .12;
    details.add(slash, patch);

    /* ---------- argon welding ---------- */
    const torchDir = V(.55, .7, .45).normalize();
    const torchG = new THREE.Group();
    {
      const steel = new THREE.MeshStandardMaterial({ color: 0x23262b, metalness: .7, roughness: .4 });
      const ceramic = new THREE.MeshStandardMaterial({ color: 0xddd6c8, roughness: .6 });
      const electrode = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbfeeff, emissiveIntensity: 2 });
      const add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; torchG.add(m); return m; };
      add(new THREE.CylinderGeometry(.007, .007, .2, 8), electrode, .1);
      add(new THREE.CylinderGeometry(.058, .036, .17, 24), ceramic, .145);
      add(new THREE.CylinderGeometry(.05, .05, .7, 24), steel, .58);
      add(new THREE.CylinderGeometry(.06, .06, .14, 24), accentMat, .5);
      add(new THREE.CylinderGeometry(.024, .024, 1.4, 12), steel, 1.6);
      torchG.quaternion.setFromUnitVectors(V(0, 1, 0), torchDir);
    }
    rig.add(torchG);

    const beadN = 18;
    const beads = [];
    const beadGeo = new THREE.SphereGeometry(.018, 12, 10);
    for (let i = 0; i < beadN; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xcfd3d9, metalness: 1, roughness: .3, emissive: 0xff7a00, emissiveIntensity: 0 });
      const m = new THREE.Mesh(beadGeo, mat);
      const th = 2.15 - 1.3 * (i / (beadN - 1));
      m.position.set(Math.cos(th) * .672, Math.sin(th) * .672, .272);
      m.visible = false; rig.add(m); beads.push(m);
    }
    const weldSpot = (w, out) => { const th = 2.15 - 1.3 * w; return out.set(Math.cos(th) * .672, Math.sin(th) * .672, .275); };

    const arcLight = new THREE.PointLight(0x9be7ff, 0, 3.5, 2); rig.add(arcLight);
    const arcGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xaeeaff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    arcGlow.renderOrder = 6; rig.add(arcGlow);

    // sparks
    const SN = 300;
    const sPos = new Float32Array(SN * 3), sVel = new Float32Array(SN * 3), sCol = new Float32Array(SN * 3);
    const sLife = new Float32Array(SN), sMax = new Float32Array(SN);
    for (let i = 0; i < SN; i++) sPos[i * 3 + 1] = -99;
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: .075, map: sparkTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sparks.frustumCulled = false; rig.add(sparks);
    let sparkIdx = 0, sparkAcc = 0;

    /* ---------- backdrop: glow + tick ring + dust ---------- */
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: AMBER, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .4 }));
    glow.scale.setScalar(5.2); glow.position.z = -1.2; rig.add(glow);

    const ticks = new THREE.InstancedMesh(new THREE.PlaneGeometry(.012, .06), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 90);
    {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
      for (let i = 0; i < 90; i++) {
        const a = i / 90 * Math.PI * 2;
        q.setFromAxisAngle(AZ, a); p.set(Math.cos(a) * 1.48, Math.sin(a) * 1.48, -.5); s.set(1, i % 5 === 0 ? 1.8 : 1, 1);
        m.compose(p, q, s); ticks.setMatrixAt(i, m);
      }
      ticks.frustumCulled = false; ticks.position.z = 0; rig.add(ticks);
    }

    const DUST = isMobile() ? 110 : 240;
    const dustPos = new Float32Array(DUST * 3);
    const dustBase = [];
    for (let i = 0; i < DUST; i++) {
      dustBase.push([(Math.random() - .5) * 18, Math.random() * 12, -6 + Math.random() * 7.5]);
      dustPos[i * 3] = dustBase[i][0]; dustPos[i * 3 + 2] = dustBase[i][2];
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: .045, map: sparkTex, color: 0xffe0a8, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
    dust.frustumCulled = false; scene.add(dust);

    /* ---------- fade groups ---------- */
    const FADE_TIRE = [tireMat, treadMat, decalMat];
    const FADE_DISC = [discMat, slotMat, caliperMat];
    const fade = (mats, group, v) => {
      group.visible = v > .01;
      for (const m of mats) { m.opacity = v; m.transparent = !!m.userData.alwaysT || v < .995; }
    };

    /* ---------- tags (exploded view labels) ---------- */
    const tagEls = { tire: $('[data-tag="tire"]'), rim: $('[data-tag="rim"]'), brake: $('[data-tag="brake"]') };
    const tagPts = { tire: V(0, 1.02, 0), rim: V(0, .72, 1.15), brake: V(0, .52, -1.1) };
    const tmpV = V(0, 0, 0);

    /* ---------- storyboard anchors ---------- */
    let keys = [];
    const computeKeys = () => {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const mobile = isMobile();
      let prev = -1;
      keys = STORY.map(k => {
        let y;
        if (k.abs) y = k.abs();
        else {
          const el = $(k.sel);
          const r = el.getBoundingClientRect();
          // On phones the wheel sits in the top half and the text panel in the bottom half,
          // so every step is read within a narrow band around the middle of its block.
          const t = mobile && k.sel.startsWith('#step') ? lerp(.4, .6, clamp((k.t - .28) / .5, 0, 1)) : k.t;
          y = r.top + scrollY + r.height * t - innerHeight * .5;
        }
        const p = Object.assign({}, k.p);
        if (mobile) {
          p.fx = 0;
          if (k.bg) { p.alpha = Math.min(p.alpha, .2); p.fy = 0; p.s *= .9; p.glow *= .5; }
          else { p.fy = k.m ? k.m.fy : .4; p.s *= k.m ? k.m.k : .46; }
        }
        return { y, p };
      });
      keys.forEach((k, i) => {
        k.y = clamp(k.y, 0, maxScroll);
        if (i > 0 && k.y <= prev) k.y = prev + 1;
        prev = k.y;
      });
    };

    const out = Object.assign({}, BASE);
    const sample = y => {
      const K = keys;
      if (y <= K[0].y) return K[0].p;
      if (y >= K[K.length - 1].y) return K[K.length - 1].p;
      let i = 0;
      while (i < K.length - 2 && y > K[i + 1].y) i++;
      const a = K[i].p, b = K[i + 1].p;
      const t = smoother((y - K[i].y) / (K[i + 1].y - K[i].y));
      for (const n of NUM) out[n] = a[n] + (b[n] - a[n]) * t;
      return out;
    };

    /* ---------- resize ---------- */
    let aspect = 1;
    const resize = () => {
      const w = innerWidth, h = innerHeight;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, w < 820 ? 1.5 : 2));
      renderer.setSize(w, h, false);
      aspect = w / h;
      camera.aspect = aspect; camera.updateProjectionMatrix();
      computeKeys();
    };
    resize();
    addEventListener('resize', resize);
    let roRaf = 0;
    new ResizeObserver(() => { cancelAnimationFrame(roRaf); roRaf = requestAnimationFrame(computeKeys); }).observe(document.body);
    if (document.fonts) document.fonts.ready.then(computeKeys);
    addEventListener('load', computeKeys);

    /* ---------- pointer ---------- */
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    addEventListener('pointermove', e => { ptr.tx = (e.clientX / innerWidth) * 2 - 1; ptr.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

    /* ---------- loop ---------- */
    let sy = scrollY, lastSy = scrollY, vel = 0, tilt = 0;
    let idleAcc = 0, introT = reduceMotion ? 1 : 0, last = performance.now(), started = false, running = true;
    const tip = V(0, 0, 0), spot = V(0, 0, 0), tmp2 = V(0, 0, 0);

    const frame = now => {
      if (!running) return;
      requestAnimationFrame(frame);
      update(now);
    };

    const update = now => {
      const dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
      const t = now / 1000;

      sy = reduceMotion ? scrollY : damp(sy, scrollY, 7, dt);
      vel = damp(vel, (sy - lastSy) / dt, 8, dt); lastSy = sy;
      tilt = clamp(vel / 2600, -1, 1);
      ptr.x = damp(ptr.x, ptr.tx, 4, dt); ptr.y = damp(ptr.y, ptr.ty, 4, dt);
      if (introT < 1) introT = Math.min(1, introT + dt / 2.6);
      const ie = 1 - Math.pow(1 - introT, 3);

      const st = sample(sy);
      const halfW = camHalfH * aspect;
      const aK = isMobile() ? 1 : Math.min(1, aspect / 1.7);

      // pose
      rig.position.set(st.fx * halfW + (1 - ie) * halfW * .45, st.fy * camHalfH, st.pz);
      rig.scale.setScalar(st.s * aK * (.78 + .22 * ie));
      rig.rotation.set(st.rx - ptr.y * .08 + tilt * .05, st.ry + ptr.x * .14 + tilt * .16, st.rz);
      // In "hold" poses (idle ≈ 0) the wheel brakes to a whole number of turns,
      // so decals (cut, patch) always land in the same place on the sidewall.
      const lockW = clamp(1 - st.idle * 25, 0, 1);
      const turns = idleAcc / TAU, toLock = (Math.ceil(turns - 1e-6) - turns) * TAU;
      let stepA = dt * (st.idle + lockW * 3 * Math.min(toLock, .8));
      if (lockW > .01 && stepA >= toLock) stepA = toLock;
      idleAcc += stepA;
      const spin = st.spin + idleAcc + (1 - ie) * 7;
      wheel.rotation.z = -spin;
      canvas.style.opacity = root.classList.contains('is-ready') ? String(st.alpha) : '0';

      // exploded view
      const e = st.explode;
      const setK = st.set;
      rimMain.position.z = 1.15 * e;
      rimMain.rotation.z = -e * Math.sin(t * .6) * .25;
      discG.position.z = -.1 - 1.0 * e;
      caliperG.position.z = -.1 - 1.0 * e;
      axisMat.opacity = e * .75;
      axisLine.visible = e > .02;

      fade(FADE_TIRE, tireG, st.tire);
      fade(FADE_DISC, discG, st.disc);
      caliperG.visible = st.disc > .01;
      ticks.visible = st.tire > .05;
      ticks.material.opacity = .4 * st.tire * (1 - e * .6);
      ticks.rotation.z = t * .08;

      // rental set
      wheel.position.set(-.75 * setK, .75 * setK, 0);
      setG.position.set(-.75 * setK, .75 * setK, 0);
      setRims.forEach((r, i) => {
        r.visible = setK > .01;
        r.position.set(SET_OFF[i][0] * setK, SET_OFF[i][1] * setK, SET_OFF[i][2] * setK);
        r.scale.setScalar(.2 + .8 * setK);
        r.rotation.z = -(spin * (.7 + i * .17) + i);
      });

      // nail
      const n = st.nail;
      nailG.visible = n > .01;
      nailG.position.set(Math.cos(NAIL_A) * (1.02 + (1 - n) * .9), Math.sin(NAIL_A) * (1.02 + (1 - n) * .9), 0);
      nailMat.opacity = clamp(n * 3, 0, 1);
      mark.material.opacity = clamp(n * 2.2, 0, 1) * (.6 + .4 * Math.sin(t * 5));
      mark.scale.setScalar(.34 + .06 * Math.sin(t * 5));

      // sidewall cut + patch
      slash.visible = st.slash > .01; slashMat.opacity = st.slash;
      patch.visible = st.patch > .01; patchMat.opacity = clamp(st.patch * 1.5, 0, 1);
      { const k = .55 + .45 * smoother(st.patch); patch.scale.set(k * 1.9, k, 1); }

      // welding
      const tp = st.torch;
      weldSpot(st.weld, spot);
      tip.copy(spot).addScaledVector(torchDir, .03);
      torchG.visible = tp > .01;
      torchG.position.copy(tip).addScaledVector(torchDir, 1.3 * (1 - tp));
      beads.forEach((b, i) => {
        const laid = st.weld * (beadN - 1) + .001 - i;
        b.visible = tp > .02 && laid >= 0;
        b.scale.setScalar(clamp(tp * 1.5, 0, 1));
        b.material.emissiveIntensity = clamp(1 - laid / 3.5, 0, 1) * 3.2;
      });
      const flick = .6 + .4 * Math.sin(t * 47) * Math.sin(t * 31 + 1.3) + (Math.random() - .5) * .35;
      const arcOn = tp > .5 ? (tp - .5) * 2 : 0;
      arcLight.visible = arcOn > 0;
      arcLight.position.copy(tip).addScaledVector(torchDir, .14);
      arcLight.intensity = arcOn * (5 + 9 * flick);
      arcGlow.visible = arcOn > 0;
      arcGlow.position.copy(tip);
      arcGlow.scale.setScalar(.22 + .26 * Math.max(0, flick)); arcGlow.material.opacity = arcOn * (.55 + .4 * flick);

      // sparks
      if (!reduceMotion && arcOn > 0) {
        sparkAcc += dt * 140 * arcOn;
        while (sparkAcc >= 1) {
          sparkAcc -= 1;
          const i = sparkIdx; sparkIdx = (sparkIdx + 1) % SN;
          const sp = .9 + Math.random() * 2.2;
          sPos[i * 3] = tip.x; sPos[i * 3 + 1] = tip.y; sPos[i * 3 + 2] = tip.z;
          tmp2.set(spot.x, spot.y, 0).normalize();
          sVel[i * 3] = tmp2.x * sp + (Math.random() - .5) * 1.6;
          sVel[i * 3 + 1] = tmp2.y * sp + Math.random() * .9;
          sVel[i * 3 + 2] = .4 + Math.random() * 1.5;
          sMax[i] = sLife[i] = .3 + Math.random() * .7;
        }
      }
      for (let i = 0; i < SN; i++) {
        if (sLife[i] <= 0) { sCol[i * 3] = sCol[i * 3 + 1] = sCol[i * 3 + 2] = 0; continue; }
        sLife[i] -= dt;
        sVel[i * 3 + 1] -= 3.4 * dt;
        sPos[i * 3] += sVel[i * 3] * dt; sPos[i * 3 + 1] += sVel[i * 3 + 1] * dt; sPos[i * 3 + 2] += sVel[i * 3 + 2] * dt;
        const f = Math.max(0, sLife[i] / sMax[i]);
        sCol[i * 3] = 1; sCol[i * 3 + 1] = .55 + .45 * f; sCol[i * 3 + 2] = .15 + .75 * f * f;
        const fadeK = Math.pow(f, .8); sCol[i * 3] *= fadeK; sCol[i * 3 + 1] *= fadeK; sCol[i * 3 + 2] *= fadeK;
      }
      sparkGeo.attributes.position.needsUpdate = true; sparkGeo.attributes.color.needsUpdate = true;

      // backdrop colour: amber → arc-blue while welding
      glow.material.color.setHex(AMBER).lerp(new THREE.Color(0x66ccff), clamp(tp, 0, 1));
      glow.material.opacity = .42 * st.glow;
      back.intensity = 3.4 * (1 - .5 * tp);

      // dust parallax
      for (let i = 0; i < DUST; i++) {
        const b = dustBase[i];
        const y = ((b[1] + sy * .0016 * (1 + (b[2] + 6) * .12) + Math.sin(t * .3 + i) * .08) % 12 + 12) % 12 - 6;
        dustPos[i * 3 + 1] = y;
      }
      dustGeo.attributes.position.needsUpdate = true;

      // labels for the exploded view
      rig.updateMatrixWorld(true);
      const tagA = isMobile() ? 0 : clamp((e - .75) * 4, 0, 1);
      for (const k in tagEls) {
        const el = tagEls[k];
        if (!el) continue;
        if (tagA < .01) { el.style.opacity = '0'; continue; }
        tmpV.copy(tagPts[k]);
        if (k === 'rim') tmpV.z = 1.15 * e; else if (k === 'brake') tmpV.z = -.1 - 1.0 * e;
        rig.localToWorld(tmpV); tmpV.project(camera);
        const x = (tmpV.x * .5 + .5) * innerWidth, y = (-tmpV.y * .5 + .5) * innerHeight;
        el.style.opacity = String(tagA);
        el.style.transform = `translate(${x.toFixed(1)}px, ${(y - 8).toFixed(1)}px)`;
      }

      renderer.render(scene, camera);

      if (!started) {
        started = true;
        root.classList.add('is-ready');
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) running = false;
      else if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    });
    requestAnimationFrame(frame);
  }

  /* ======================================================================
     boot
     ====================================================================== */
  initUI();
  setTimeout(() => root.classList.add('is-ready'), 7000);   // never trap the visitor behind the loader
  init3D().catch(err => {
    console.warn('[Мастер шин] 3D scene disabled:', err);
    root.classList.add('no-3d');
  });
})();





