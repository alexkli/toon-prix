import * as THREE from './lib/three.module.js';
import { Builder, G, M, toonMat, inkMat, rng, gradientMap, disposeTree } from './util.js';
import { buildTrackMath, HALF_WIDTH as HW, KERB, WALL } from './trackmath.js';
import { scatter, balloon, boat } from './props.js';
import { TEAMS } from './data.js';

const UP = [0, 1, 0];
const BRIGHT = ['#ee3344', '#2f6fed', '#ffd93b', '#35d6a4', '#ff8a1f', '#8b4de0', '#ff6fae', '#ffffff'];
const SKIN = ['#ffd9b3', '#f2c49b', '#c98f62', '#8d5a3b', '#ffe4c9'];
const ADS = ['ZOOM COLA', 'BONK TYRES', 'MEGA NAP', 'WHEEE!', 'FIZZ FUEL', 'SNACK-O', 'VROOM!', 'PIZZA PIT'];
const AD_COL = [['#ee3344', '#fff'], ['#ffd93b', '#1b1b2f'], ['#2f6fed', '#fff'], ['#ff6fae', '#fff'], ['#35d6a4', '#1b1b2f'], ['#ff8a1f', '#fff'], ['#8b4de0', '#fff'], ['#ffffff', '#ee3344']];
const FONT = '"Arial Rounded MT Bold", "Helvetica Neue", Arial, sans-serif';

export function gridSlot(T, j) {
  const back = 7 + j * 5.5;
  const i = T.wrap(Math.round(-back / T.ds));
  const lat = (j % 2 ? -1 : 1) * 3.2;
  return { i, lat, x: T.px[i] + T.nx[i] * lat, z: T.pz[i] + T.nz[i] * lat, h: Math.atan2(T.tx[i], T.tz[i]) };
}

function adTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  ADS.forEach((t, k) => {
    g.fillStyle = AD_COL[k][0]; g.fillRect(0, k * 64, 512, 64);
    g.strokeStyle = '#1b1b2f'; g.lineWidth = 6; g.strokeRect(3, k * 64 + 3, 506, 58);
    g.fillStyle = AD_COL[k][1]; g.font = `bold 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(t, 256, k * 64 + 34);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
function bannerTexture(text, bg) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 96);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    g.fillStyle = (i + j) % 2 ? '#fff' : '#1b1b2f';
    g.fillRect(i * 24, j * 24, 24, 24); g.fillRect(1024 - 144 + i * 24, j * 24, 24, 24);
  }
  g.fillStyle = '#fff'; g.strokeStyle = '#1b1b2f'; g.lineWidth = 10; g.lineJoin = 'round';
  g.font = `bold 70px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeText(text, 512, 52); g.fillText(text, 512, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

export function buildWorld(def) {
  const T = buildTrackMath(def), th = def.themeDef, n = T.n;
  let seed = 7; for (const ch of def.id) seed = seed * 31 + ch.charCodeAt(0);
  const r = rng(seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const group = new THREE.Group();
  const anim = [];
  const col = (c) => new THREE.Color(c);
  const pt = (i, lat, y = 0) => [T.px[i] + T.nx[i] * lat, y, T.pz[i] + T.nz[i] * lat];

  // ---------- lights & sky ----------
  const sunDir = new THREE.Vector3(0.45, 0.8, 0.35).normalize();
  group.add(new THREE.AmbientLight(th.ambient, th.ambientI));
  const sun = new THREE.DirectionalLight(th.sun, th.sunI);
  sun.position.copy(sunDir).multiplyScalar(100);
  group.add(sun);

  const skyG = new THREE.SphereGeometry(3000, 24, 14);
  const top = col(th.skyTop), bot = col(th.skyBottom), sc = [];
  for (let i = 0; i < skyG.attributes.position.count; i++) {
    const t = THREE.MathUtils.clamp(skyG.attributes.position.getY(i) / 3000 * 1.9, 0, 1);
    const c = bot.clone().lerp(top, Math.pow(t, 0.75));
    sc.push(c.r, c.g, c.b);
  }
  skyG.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  const sky = new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.position.set(T.cx, -60, T.cz); sky.renderOrder = -100;
  group.add(sky);
  const disc = (rad, color, op) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(rad, 40), new THREE.MeshBasicMaterial({ color, fog: false, depthWrite: false, transparent: op < 1, opacity: op }));
    m.position.set(T.cx, 0, T.cz).addScaledVector(th.night ? new THREE.Vector3(-0.5, 0.55, -0.6).normalize() : new THREE.Vector3(-0.3, 0.42, -0.85).normalize(), 2700);
    m.lookAt(T.cx, 0, T.cz); m.renderOrder = -99;
    group.add(m);
  };
  disc(th.night ? 150 : 260, th.sun, 0.25);
  disc(th.night ? 110 : 170, th.night ? '#fff6d0' : '#fff3a0', 1);
  if (th.night) {
    const sp = [];
    for (let i = 0; i < 350; i++) {
      const a = r() * Math.PI * 2, e = 0.12 + r() * 1.3;
      sp.push(T.cx + Math.cos(a) * Math.cos(e) * 2800, Math.sin(e) * 2800, T.cz + Math.sin(a) * Math.cos(e) * 2800);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2.5, sizeAttenuation: false, fog: false, depthWrite: false }));
    stars.renderOrder = -98;
    group.add(stars);
  }

  // ---------- flat ground layers (painter's order, no depth) ----------
  const flat = () => toonMat({ side: THREE.DoubleSide, depthWrite: false, depthTest: false });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000).rotateX(-Math.PI / 2),
    new THREE.MeshToonMaterial({ color: th.ground, gradientMap: gradientMap(), depthWrite: false, depthTest: false }));
  ground.position.set(T.cx, 0, T.cz); ground.renderOrder = -90;
  group.add(ground);
  const L = { patches: new Builder(), verge: new Builder(), asphalt: new Builder(), paint: new Builder() };
  const ribbon = (bl, fa, fb, cf) => {
    const A = typeof fa === 'function' ? fa : () => fa, B = typeof fb === 'function' ? fb : () => fb;
    for (let i = 0; i < n; i++) {
      const c = cf(i);
      if (!c) continue;
      const j = (i + 1) % n;
      bl.quad(pt(i, A(i)), pt(i, B(i)), pt(j, B(j)), pt(j, A(j)), c, UP);
    }
  };
  const g2 = col(th.ground2);
  for (let i = 0; i < 110; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (T.radius + 420), s = 18 + r() * 60;
    L.patches.add(G.disc, g2, M(T.cx + Math.cos(a) * d, 0, T.cz + Math.sin(a) * d, s, 1, s * (0.5 + r() * 0.4), 0, r() * 3, 0), 0);
  }
  let seaZ = null;
  if (th.sea) {
    seaZ = T.minZ - WALL - 17;
    L.patches.quad([-6000, 0, seaZ + 5], [6000, 0, seaZ + 5], [6000, 0, seaZ], [-6000, 0, seaZ], '#fff7d6', UP);
    L.patches.quad([-6000, 0, seaZ], [6000, 0, seaZ], [6000, 0, seaZ - 4], [-6000, 0, seaZ - 4], '#ffffff', UP);
    L.patches.quad([-6000, 0, seaZ - 4], [6000, 0, seaZ - 4], [6000, 0, seaZ - 60], [-6000, 0, seaZ - 60], '#5fdcf2', UP);
    L.patches.quad([-6000, 0, seaZ - 60], [6000, 0, seaZ - 60], [6000, 0, -6000], [-6000, 0, -6000], th.sea, UP);
    for (let i = 0; i < 60; i++) {
      const x = T.cx + (r() - 0.5) * 1800, z = seaZ - 30 - r() * 900;
      L.patches.add(G.disc, '#8eeaf8', M(x, 0, z, 14 + r() * 30, 1, 2 + r() * 2), 0);
    }
  }
  // corner flags
  const corner = new Uint8Array(n), wide = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    for (let o = -4; o <= 4; o++) if (Math.abs(T.k[T.wrap(i + o)]) > 0.0085) corner[i] = 1;
    for (let o = -9; o <= 9; o++) if (Math.abs(T.k[T.wrap(i + o)]) > 0.013) wide[i] = 1;
  }
  const cVerge = col(th.verge), cGravel = col(th.gravel), cAsphalt = col(th.asphalt), cRubber = col(th.asphalt).multiplyScalar(0.8);
  const cWhite = col('#ffffff'), cKA = col(th.kerbA), cKB = col(th.kerbB);
  ribbon(L.verge, -WALL - 1.5, WALL + 1.5, () => cVerge);
  ribbon(L.verge, (i) => -Math.sign(T.k[i] || 1) * (HW + KERB - 0.2), (i) => -Math.sign(T.k[i] || 1) * (WALL - 1), (i) => (wide[i] ? cGravel : null));
  ribbon(L.asphalt, -HW, HW, () => cAsphalt);
  ribbon(L.asphalt, (i) => T.off[i] - 1.5, (i) => T.off[i] + 1.5, () => cRubber);
  for (const s of [-1, 1]) {
    ribbon(L.paint, s * (HW - 0.95), s * (HW - 0.5), () => cWhite);
    ribbon(L.paint, s * HW, s * (HW + KERB), (i) => (corner[i] ? ((i >> 1) % 2 ? cKA : cKB) : null));
  }
  // start line + grid boxes
  {
    const along = (i, lat, f) => [T.px[i] + T.nx[i] * lat + T.tx[i] * f, 0, T.pz[i] + T.nz[i] * lat + T.tz[i] * f];
    for (let c = 0; c < 16; c++) for (let rw = 0; rw < 3; rw++) {
      const l0 = -HW + c, f0 = rw - 1.5;
      L.paint.quad(along(0, l0, f0), along(0, l0 + 1, f0), along(0, l0 + 1, f0 + 1), along(0, l0, f0 + 1), (c + rw) % 2 ? '#ffffff' : '#1b1b2f', UP);
    }
    for (let j = 0; j < 16; j++) {
      const s = gridSlot(T, j), f = 2.9;
      L.paint.quad(along(s.i, s.lat - 1.5, f), along(s.i, s.lat + 1.5, f), along(s.i, s.lat + 1.5, f + 0.3), along(s.i, s.lat - 1.5, f + 0.3), cWhite, UP);
      for (const e of [-1.5, 1.2]) L.paint.quad(along(s.i, s.lat + e, f - 1.6), along(s.i, s.lat + e + 0.3, f - 1.6), along(s.i, s.lat + e + 0.3, f), along(s.i, s.lat + e, f), cWhite, UP);
    }
  }

  // ---------- 3D scenery ----------
  const b = new Builder(), glow = new Builder(), shadow = new Builder(), walls = new Builder();
  const blocked = [];
  const cWA = col(th.wallA), cWB = col(th.wallB);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, c = Math.floor(i / 3) % 2 ? cWA : cWB;
    for (const s of [-1, 1]) {
      const a = s * WALL, o = s * (WALL + 0.8), h = 1.25;
      walls.quad(pt(i, a), pt(j, a), pt(j, a, h), pt(i, a, h), c);
      walls.quad(pt(i, o), pt(j, o), pt(j, o, h), pt(i, o, h), c);
      walls.quad(pt(i, a, h), pt(j, a, h), pt(j, o, h), pt(i, o, h), c, UP);
    }
  }

  // advertising boards on the straights
  {
    const pos = [], uv = [];
    for (let i = 0; i + 4 < n; i += 5) {
      let straight = true;
      for (let o = 0; o <= 4; o++) if (Math.abs(T.k[i + o]) > 0.004) straight = false;
      if (!straight || r() < 0.25) continue;
      for (const s of [-1, 1]) {
        const lat = s * (WALL + 0.4), row = Math.floor(r() * 8), v0 = 1 - (row + 1) / 8, v1 = 1 - row / 8;
        const A = pt(i, lat, 1.25), B = pt(i + 4, lat, 1.25), C = pt(i + 4, lat, 3.1), D = pt(i, lat, 3.1);
        const u0 = s > 0 ? 1 : 0, u1 = 1 - u0;
        pos.push(...A, ...B, ...C, ...A, ...C, ...D);
        uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    group.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: adTexture(), side: THREE.DoubleSide })));
  }

  // start gantry with lights
  const lights = [];
  {
    const gi = 6, h = Math.atan2(T.tx[gi], T.tz[gi]), base = M(T.px[gi], 0, T.pz[gi], 1, 1, 1, 0, h, 0), span = HW + 3.4;
    b.base.copy(base);
    for (const s of [-1, 1]) b.add(G.box, '#2b2b3a', M(s * span, 4.6, 0, 0.9, 9.2, 0.9));
    b.add(G.box, '#2b2b3a', M(0, 8.7, 0, span * 2 + 1.8, 1.9, 1.1));
    b.add(G.box, '#2b2b3a', M(0, 7, -0.5, 10.4, 1.7, 0.5));
    b.base.identity();
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(span * 2, 1.7), new THREE.MeshBasicMaterial({ map: bannerTexture('TOON PRIX', th.kerbA === '#ffffff' ? '#ee3344' : th.kerbA) }));
    ban.position.set(0, 8.7, -0.58); ban.rotation.y = Math.PI;
    const holder = new THREE.Group();
    holder.applyMatrix4(base); holder.add(ban);
    for (let k = 0; k < 5; k++) {
      const l = new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color: '#40121c' }));
      l.position.set((k - 2) * 2, 7, -0.82); l.scale.setScalar(1.25);
      holder.add(l); lights.push(l);
    }
    group.add(holder);
  }

  // grandstands
  const stand = (i, side) => {
    i = T.wrap(i);
    const ox = side * T.nx[i], oz = side * T.nz[i], fx = T.px[i] + ox * (WALL + 3), fz = T.pz[i] + oz * (WALL + 3);
    const cx = fx + ox * 5, cz = fz + oz * 5;
    if (T.distTo(cx, cz) < WALL + 7.2) return false;
    for (const c of blocked) if ((c.x - cx) ** 2 + (c.z - cz) ** 2 < (c.r + 13) ** 2) return false;
    if (seaZ != null && cz < seaZ + 12) return false;
    b.base.copy(M(fx, 0, fz, 1, 1, 1, 0, Math.atan2(ox, oz), 0));
    for (let s = 0; s < 5; s++) {
      b.add(G.box, s % 2 ? '#eef1f8' : '#d6dcea', M(0, (s + 1) * 0.55, s * 1.7 + 0.85, 22, (s + 1) * 1.1, 1.7), 0.1);
      for (let x = -10.2; x <= 10.2; x += 1.02) {
        if (r() < 0.12) continue;
        const y = (s + 1) * 1.1, z = s * 1.7 + 1 + (r() - 0.5) * 0.3;
        b.add(G.box, pick(BRIGHT), M(x, y + 0.45, z, 0.72, 0.9, 0.6), 0);
        b.add(G.box, pick(SKIN), M(x, y + 1.15, z, 0.5, 0.5, 0.5), 0);
      }
    }
    b.add(G.box, '#c3cadc', M(0, 4.4, 8.8, 22, 8.8, 0.5), 0.1);
    b.add(G.box, th.kerbA, M(0, 9.3, 4.2, 23.5, 0.5, 10.8, 0.09, 0, 0), 0.14);
    for (const s of [-1, 1]) b.add(G.cyl, '#8892aa', M(s * 10.8, 4.4, 0.4, 0.35, 8.8, 0.35), 0);
    b.base.identity();
    shadow.add(G.disc, '#000', M(cx + 2, 0, cz + 1.5, 30, 1, 30), 0);
    blocked.push({ x: cx, z: cz, r: 13 });
    return true;
  };
  for (const o of [-9, -22, -35]) stand(o, 1);
  for (const f of [0.14, 0.26, 0.38, 0.5, 0.62, 0.74, 0.86]) {
    const i = Math.floor(f * n);
    if (Math.abs(T.k[i]) > 0.012) continue;
    stand(i, T.k[i] > 0 ? -1 : 1) || stand(i, T.k[i] > 0 ? 1 : -1);
  }

  // pit building
  {
    const i = T.wrap(-23), ox = -T.nx[i], oz = -T.nz[i], fx = T.px[i] + ox * (WALL + 3.5), fz = T.pz[i] + oz * (WALL + 3.5);
    const th0 = Math.atan2(ox, oz), ax = Math.cos(th0), az = -Math.sin(th0);
    let clear = true;
    for (const d of [-30, -15, 0, 15, 30]) if (T.distTo(fx + ax * d + ox * 5, fz + az * d + oz * 5) < WALL + 6.5) clear = false;
    if (clear) {
      b.base.copy(M(fx, 0, fz, 1, 1, 1, 0, th0, 0));
      b.add(G.box, '#f4f6fb', M(0, 2.5, 4.5, 66, 5, 9), 0.15);
      TEAMS.forEach((t, k) => {
        const x = (k - 3.5) * 8;
        b.add(G.box, '#2b2b3a', M(x, 1.7, 0.02, 6.2, 3.4, 0.3), 0);
        b.add(G.box, t.c1, M(x, 4.1, 0.02, 6.2, 0.9, 0.34), 0);
        b.add(G.box, t.c2, M(x, 3.5, 0.02, 6.2, 0.25, 0.36), 0);
        b.add(G.cyl, '#8892aa', M(x + 3.6, 8, 1, 0.18, 5, 0.18), 0);
        b.add(G.box, t.c1, M(x + 2.6, 9.8, 1, 1.9, 1.2, 0.12), 0.06);
      });
      b.add(G.box, '#2b2b3a', M(0, 5.3, 4.5, 68, 0.6, 10), 0.12);
      b.add(G.box, '#8fd3ff', M(0, 7.3, 5.6, 30, 3.4, 6), 0.12);
      b.add(G.box, th.kerbA, M(0, 9.3, 5.4, 32, 0.5, 7.6), 0.12);
      b.base.identity();
      for (const d of [-24, 0, 24]) {
        blocked.push({ x: fx + ax * d + ox * 5, z: fz + az * d + oz * 5, r: 15 });
        shadow.add(G.disc, '#000', M(fx + ax * d + ox * 6 + 2, 0, fz + az * d + oz * 6 + 1.5, 34, 1, 22, 0, th0, 0), 0);
      }
    }
  }

  // trackside TV cameras
  const tvCams = [];
  for (let c = 0; c < 9; c++) {
    const i = Math.floor(((c + 0.5) / 9) * n);
    let side = T.k[i] > 0 ? -1 : 1, lat = WALL + 5, x, z, okPos = false;
    for (let t = 0; t < 2 && !okPos; t++, side = -side) {
      x = T.px[i] + T.nx[i] * side * lat; z = T.pz[i] + T.nz[i] * side * lat;
      okPos = T.distTo(x, z) > WALL + 3 && !blocked.some((q) => (q.x - x) ** 2 + (q.z - z) ** 2 < (q.r + 2) ** 2) && (seaZ == null || z > seaZ + 3);
    }
    if (!okPos) { x = T.px[i] + T.nx[i] * (WALL + 1.6); z = T.pz[i] + T.nz[i] * (WALL + 1.6); }
    const y = 5.5 + r() * 4;
    b.add(G.box, '#8892aa', M(x, (y - 1.2) / 2, z, 0.5, y - 1.2, 0.5), 0.08);
    b.add(G.box, '#2b2b3a', M(x, y - 1.3, z, 2.6, 0.3, 2.6), 0.08);
    blocked.push({ x, z, r: 2.5 });
    tvCams.push({ x, y, z, i });
  }

  // finish-line camera: side-on just past the line, sees cars come down the straight and cross it
  let finishCam = null;
  for (const side of [1, -1]) {
    const i = 11, x = T.px[i] + T.nx[i] * side * (WALL + 5), z = T.pz[i] + T.nz[i] * side * (WALL + 5);
    if (finishCam || T.distTo(x, z) < WALL + 3 || blocked.some((q) => (q.x - x) ** 2 + (q.z - z) ** 2 < (q.r + 2) ** 2) || (seaZ != null && z < seaZ + 3)) continue;
    b.add(G.box, '#8892aa', M(x, 2.6, z, 0.5, 5.2, 0.5), 0.08);
    b.add(G.box, '#2b2b3a', M(x, 5.3, z, 2.6, 0.3, 2.6), 0.08);
    blocked.push({ x, z, r: 2.5 });
    finishCam = { x, y: 6.6, z, i };
  }
  if (!finishCam) finishCam = { x: T.px[11] + T.nx[11] * (WALL + 1.6), y: 6.6, z: T.pz[11] + T.nz[11] * (WALL + 1.6), i: 11 };

  // themed extras
  if (th.night) {
    for (let i = 0; i < n; i += 13) {
      const s = (i / 13) % 2 ? 1 : -1, [x, , z] = pt(i, s * (WALL + 2));
      if (T.distTo(x, z) < WALL + 1 || blocked.some((q) => (q.x - x) ** 2 + (q.z - z) ** 2 < q.r ** 2)) continue;
      const [ax, , az] = pt(i, s * (WALL - 0.4));
      b.add(G.cyl, '#20244a', M(x, 4.5, z, 0.3, 9, 0.3), 0);
      b.add(G.box, '#20244a', M((x + ax) / 2, 9, (z + az) / 2, 0.3, 0.3, 2.8, 0, Math.atan2(ax - x, az - z), 0), 0);
      glow.add(G.sphLo, (i / 13) % 4 < 2 ? '#fff4b0' : '#9ff3ff', M(ax, 8.7, az, 1.1, 0.7, 1.1), 0);
    }
  }
  const spot = (rad, near = 30, far = 90) => {
    for (let t = 0; t < 200; t++) {
      const i = Math.floor(r() * n), s = r() < 0.5 ? -1 : 1, d = WALL + near + r() * far;
      const x = T.px[i] + T.nx[i] * s * d, z = T.pz[i] + T.nz[i] * s * d;
      if (T.distTo(x, z) > WALL + rad + 4 && !blocked.some((q) => (q.x - x) ** 2 + (q.z - z) ** 2 < (q.r + rad) ** 2) && (seaZ == null || z > seaZ + rad + 4)) {
        blocked.push({ x, z, r: rad });
        return [x, z];
      }
    }
    return null;
  };
  if (th.props.wheel) {
    const p = spot(26, 10, 60);
    if (p) {
      const wb = new Builder(), wg = new Builder(), ry = r() * 3;
      wb.add(G.ring, '#ff3fa4', M(0, 0, 0, 44, 44, 60), 0);
      wb.add(G.ring, '#35e0ff', M(0, 0, 0, 30, 30, 50), 0);
      for (let k = 0; k < 6; k++) wb.add(G.box, '#c9d2ff', M(0, 0, 0, 44, 0.5, 0.5, 0, 0, (k / 6) * Math.PI), 0);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        wg.add(G.sphLo, BRIGHT[k % 7], M(Math.cos(a) * 22, Math.sin(a) * 22, 0, 3.4), 0);
      }
      const wheel = new THREE.Group();
      wheel.add(wb.build(toonMat()), wg.build(new THREE.MeshBasicMaterial({ vertexColors: true })));
      wheel.position.set(p[0], 27, p[1]); wheel.rotation.y = ry;
      group.add(wheel);
      anim.push((dt) => { wheel.rotation.z += dt * 0.12; });
      b.base.copy(M(p[0], 0, p[1], 1, 1, 1, 0, ry, 0));
      for (const s of [-1, 1]) for (const q of [-1, 1]) b.add(G.box, '#c9d2ff', M(q * 7, 13.5, s * 2.2, 1, 30, 1, 0, 0, q * 0.5), 0.1);
      b.add(G.cyl, '#ffd93b', M(0, 27, 0, 3, 5.5, 3, Math.PI / 2, 0, 0), 0.12);
      b.base.identity();
    }
  }
  if (def.theme === 'meadow') {
    for (let w = 0; w < 2; w++) {
      const p = spot(9, 6, 50);
      if (!p) continue;
      const ry = r() * 6;
      b.base.copy(M(p[0], 0, p[1], 1, 1, 1, 0, ry, 0));
      b.add(G.taper, '#fff6e6', M(0, 6, 0, 6.5, 12, 6.5), 0.15);
      b.add(G.cone, '#ee3344', M(0, 13.6, 0, 5.4, 3.4, 5.4), 0.15);
      b.add(G.box, '#8a5a3b', M(0, 1.4, 2.9, 1.6, 2.8, 0.3), 0);
      b.base.identity();
      const bb = new Builder();
      for (let k = 0; k < 4; k++) {
        bb.add(G.box, '#8a5a3b', M(0, 0, 0, 0.35, 15, 0.3, 0, 0, (k / 4) * Math.PI), 0);
      }
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 2;
        bb.add(G.box, '#ffffff', M(Math.cos(a) * 4.6 - Math.sin(a) * 0.8, Math.sin(a) * 4.6 + Math.cos(a) * 0.8, 0.1, 5.6, 1.7, 0.12, 0, 0, a), 0.1);
      }
      const blades = bb.build(toonMat(), inkMat());
      blades.position.set(p[0] + Math.sin(ry) * 3.5, 11.6, p[1] + Math.cos(ry) * 3.5); blades.rotation.y = ry;
      group.add(blades);
      const spin = 0.5 + r() * 0.4;
      anim.push((dt) => { blades.rotation.z += dt * spin; });
      shadow.add(G.disc, '#000', M(p[0] + 2, 0, p[1] + 1.2, 13, 1, 10), 0);
    }
  }
  if (seaZ != null) for (let k = 0; k < (th.props.boat || 0); k++) boat(b, r, T.cx + (r() - 0.5) * 900, seaZ - 30 - r() * 320);
  b.base.identity();

  scatter(T, th, { b, glow, shadow, r, theme: th, night: !!th.night }, blocked, seaZ);

  // far hills
  for (let k = 0; k < 34; k++) {
    const a = (k / 34) * Math.PI * 2 + r() * 0.15, d = T.radius + 780 + r() * 500, w = 280 + r() * 260, h = 110 + r() * 230;
    const x = T.cx + Math.cos(a) * d, z = T.cz + Math.sin(a) * d;
    if (seaZ != null && z < seaZ + 200 && r() < 0.7) continue;
    b.add(G.cone, th.hill, M(x, h / 2 - 6, z, w, h, w), 3);
    b.add(G.cone, th.hillCap, M(x, h * 0.81 - 4, z, w * 0.39, h * 0.39, w * 0.39), 0);
  }

  // clouds & balloons (slowly drifting groups)
  const cb = new Builder(), cc = th.night ? '#6b63b0' : '#ffffff';
  for (let k = 0; k < 18; k++) {
    const a = r() * Math.PI * 2, d = T.radius + 300 + r() * 700, y = 100 + r() * 90 + (d - T.radius - 300) * 0.25, s = 0.8 + r() * 0.9;
    cb.base.copy(M(Math.cos(a) * d, y, Math.sin(a) * d, s, s, s, 0, r() * 6, 0));
    const m = 3 + Math.floor(r() * 3);
    for (let q = 0; q < m; q++) cb.add(G.sph, cc, M((q - m / 2) * 17, r() * 5, (r() - 0.5) * 10, 28 + r() * 12, 15 + r() * 8, 22), 0.9);
    cb.add(G.sph, cc, M(-4, 9, 0, 26, 18, 20), 0.9);
  }
  const clouds = cb.build(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap(), fog: false }), inkMat());
  clouds.position.set(T.cx, 0, T.cz);
  group.add(clouds);
  anim.push((dt) => { clouds.rotation.y += dt * 0.006; });
  if (th.props.balloon) {
    const bb = new Builder();
    for (let k = 0; k < th.props.balloon; k++) {
      const a = r() * Math.PI * 2, d = T.radius * 0.5 + r() * (T.radius * 0.5 + 220);
      balloon(bb, r, Math.cos(a) * d, 70 + r() * 60, Math.sin(a) * d);
    }
    const bg = bb.build(toonMat(), inkMat());
    bg.position.set(T.cx, 0, T.cz);
    group.add(bg);
    anim.push((dt, t) => { bg.position.y = Math.sin(t * 0.4) * 4; bg.rotation.y += dt * 0.004; });
  }

  // ---------- assemble ----------
  const order = [['patches', -80], ['verge', -70], ['asphalt', -60], ['paint', -50]];
  for (const [k, ro] of order) {
    const m = new THREE.Mesh(L[k].geometry(), flat());
    m.renderOrder = ro; m.frustumCulled = false;
    group.add(m);
  }
  const sh = new THREE.Mesh(shadow.geometry(), new THREE.MeshBasicMaterial({ color: th.night ? '#0a0c2a' : '#20305a', transparent: true, opacity: th.night ? 0.3 : 0.2, depthWrite: false }));
  sh.position.y = 0.04; sh.renderOrder = -40;
  group.add(sh);
  group.add(new THREE.Mesh(walls.geometry(), toonMat({ side: THREE.DoubleSide })));
  group.add(b.build(toonMat(), inkMat()));
  if (glow.pos.length) group.add(glow.build(new THREE.MeshBasicMaterial({ vertexColors: true })));

  return {
    T, def, theme: th, group, lights, tvCams, finishCam, sunDir,
    update(dt, t) { for (const f of anim) f(dt, t); },
    setLights(count, green = false) {
      lights.forEach((l, k) => l.material.color.set(green ? '#3dff6a' : k < count ? '#ff2a2a' : '#40121c'));
    },
    dispose() { disposeTree(group); },
  };
}
