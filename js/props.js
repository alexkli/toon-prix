import * as THREE from './lib/three.module.js';
import { G, M } from './util.js';
import { WALL } from './trackmath.js';

const pick = (r, a) => a[Math.floor(r() * a.length)];
const CANDY = ['#ff6fae', '#35d6a4', '#ffd93b', '#8b4de0', '#2f9bff', '#ff8a1f'];
const BRIGHT = ['#ee3344', '#2f6fed', '#ffd93b', '#35d6a4', '#ff8a1f', '#8b4de0', '#ff6fae', '#ffffff'];

// Each prop draws into ctx.b (toon), ctx.glow (unlit) around the local origin. ctx.r is a seeded rng.
export const PROPS = {
  tree({ b, r, night }) {
    const greens = night ? ['#2a6f6a', '#2f7f72', '#245f66'] : ['#3fae4a', '#58c456', '#2f9a48', '#79d25c'];
    b.add(G.cyl, '#8a5a3b', M(0, 1.3, 0, 0.8, 2.6, 0.8));
    b.add(G.sph, pick(r, greens), M(0, 4.3, 0, 4.6, 4.2, 4.6), 0.14);
    b.add(G.sph, pick(r, greens), M(1.5, 3.3, 0.7, 3, 2.8, 3), 0.14);
    b.add(G.sph, pick(r, greens), M(-1.3, 3.5, -0.6, 3.2, 3, 3.2), 0.14);
    return 2.6;
  },
  bush({ b, r }) {
    const c = pick(r, ['#3fae4a', '#58c456', '#2f9a48']);
    b.add(G.sph, c, M(0, 0.7, 0, 2.4, 1.8, 2.4));
    b.add(G.sph, c, M(1.1, 0.5, 0.3, 1.6, 1.3, 1.6));
    return 0;
  },
  flower({ b, r }) {
    const c = pick(r, ['#ffffff', '#ffd93b', '#ff6fae', '#ff8a1f', '#c7a6ff']);
    for (let i = 0; i < 4; i++) b.add(G.sphLo, c, M((r() - 0.5) * 2.4, 0.3, (r() - 0.5) * 2.4, 0.6, 0.45, 0.6), 0);
    return 0;
  },
  pine({ b, r, theme }) {
    const snow = theme.props.snowman != null;
    b.add(G.cyl, '#7a5236', M(0, 0.9, 0, 0.7, 1.8, 0.7));
    b.add(G.cone, '#2f8f5b', M(0, 3, 0, 4.6, 3.4, 4.6), 0.14);
    b.add(G.cone, '#3aa66a', M(0, 4.9, 0, 3.6, 3, 3.6), 0.14);
    b.add(G.cone, snow ? '#ffffff' : '#4dbb78', M(0, 6.6, 0, 2.5, 2.6, 2.5), 0.14);
    return 2.4;
  },
  palm({ b, r }) {
    b.add(G.taper, '#b98552', M(0.6, 3, 0, 0.9, 6.2, 0.9, 0, 0, -0.2));
    const tx = 1.25, ty = 6;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + r();
      b.add(G.sph, k % 2 ? '#35b85c' : '#4fd06c', M(tx + Math.cos(a) * 1.7, ty - 0.25, -Math.sin(a) * 1.7, 4, 0.4, 1.3, 0, a, -0.4), 0.1);
    }
    b.add(G.sphLo, '#6b4428', M(tx + 0.3, ty - 0.5, 0.3, 0.6));
    b.add(G.sphLo, '#6b4428', M(tx - 0.3, ty - 0.55, -0.2, 0.6));
    return 1.5;
  },
  umbrella({ b, r }) {
    const c1 = new THREE.Color(pick(r, BRIGHT)), c2 = new THREE.Color('#ffffff');
    b.add(G.cyl, '#ffffff', M(0, 1.3, 0, 0.14, 2.6, 0.14), 0);
    b.add(G.cone, (x, y, z) => (Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 10) % 2 ? c1 : c2), M(0, 2.8, 0, 3.6, 0.9, 3.6));
    b.add(G.box, pick(r, BRIGHT), M(1.6, 0.08, 0.4, 1, 0.12, 2.2, 0, r() * 3, 0), 0);
    return 1.4;
  },
  rock({ b, r, theme }) {
    const c = theme.props.cactus != null ? pick(r, ['#c96f3d', '#b9602f', '#de8a52']) : pick(r, ['#9aa3b5', '#858ea3', '#b3bccb']);
    b.add(G.rock, c, M(0, 0.7, 0, 2.2 + r() * 2.4, 1.6 + r() * 1.6, 2 + r() * 2.2, r(), r() * 6, 0), 0.12);
    return 0;
  },
  cactus({ b, r }) {
    const c = pick(r, ['#3faa6b', '#4dbd78', '#339660']);
    b.add(G.cyl, c, M(0, 2, 0, 1.1, 4, 1.1));
    b.add(G.sph, c, M(0, 4, 0, 1.1));
    for (const s of r() > 0.3 ? [-1, 1] : [1]) {
      const h = 1.5 + r() * 1.2;
      b.add(G.cyl, c, M(s * 0.9, h, 0, 0.7, 1.4, 0.7, 0, 0, Math.PI / 2));
      b.add(G.cyl, c, M(s * 1.45, h + 0.75, 0, 0.7, 1.6, 0.7));
      b.add(G.sph, c, M(s * 1.45, h + 1.55, 0, 0.7));
    }
    if (r() > 0.5) b.add(G.sphLo, '#ff6fae', M(0, 4.6, 0, 0.5), 0);
    return 1.2;
  },
  mesa({ b, r }) {
    const w = 12 + r() * 10, h = 7 + r() * 6;
    b.add(G.cyl6, '#d9783f', M(0, h / 2, 0, w, h, w * 0.8), 0.3);
    b.add(G.cyl6, '#e89358', M(w * 0.08, h + 1.5, 0, w * 0.62, 3, w * 0.5), 0.3);
    return w * 0.55;
  },
  snowman({ b }) {
    b.add(G.sph, '#ffffff', M(0, 0.9, 0, 2));
    b.add(G.sph, '#ffffff', M(0, 2.3, 0, 1.5));
    b.add(G.sph, '#ffffff', M(0, 3.4, 0, 1.1));
    b.add(G.cone, '#ff8a1f', M(0, 3.4, 0.7, 0.25, 0.8, 0.25, Math.PI / 2, 0, 0), 0);
    b.add(G.cyl, '#2b2b3a', M(0, 4.1, 0, 0.8, 0.6, 0.8));
    b.add(G.cyl, '#2b2b3a', M(0, 3.85, 0, 1.3, 0.1, 1.3), 0);
    b.add(G.box, '#ee3344', M(0, 2.9, 0, 1.25, 0.25, 1.25), 0);
    return 1.2;
  },
  building({ b, glow, r }) {
    const w = 8 + r() * 8, d = 8 + r() * 6, h = 12 + r() * 30;
    b.add(G.box, pick(r, ['#3a3f78', '#46408a', '#2f4a86', '#54407e', '#3b5590']), M(0, h / 2, 0, w, h, d), 0.25);
    b.add(G.box, '#262a55', M(0, h + 0.4, 0, w * 0.7, 0.8, d * 0.7), 0);
    const wc = pick(r, ['#ffe97a', '#8ff3ff', '#ffb3e6']);
    const cols = Math.floor(w / 2.6), rows = Math.floor(h / 3.4);
    for (let f = 0; f < 4; f++) {
      const span = f % 2 ? d : w, depth = f % 2 ? w : d, cn = f % 2 ? Math.floor(d / 2.6) : cols;
      for (let i = 0; i < cn; i++) for (let j = 0; j < rows; j++) {
        if (r() < 0.35) continue;
        const u = ((i + 0.5) / cn - 0.5) * span * 0.86, y = 2.6 + j * 3.3;
        const m = f === 0 ? M(u, y, depth / 2, 1.3, 1.7, 0.12) : f === 2 ? M(u, y, -depth / 2, 1.3, 1.7, 0.12) : f === 1 ? M(depth / 2, y, u, 0.12, 1.7, 1.3) : M(-depth / 2, y, u, 0.12, 1.7, 1.3);
        glow.add(G.box, wc, m, 0);
      }
    }
    if (r() > 0.6) glow.add(G.sphLo, '#ff3fa4', M(0, h + 2.2, 0, 1), 0);
    return Math.max(w, d) * 0.7;
  },
  lollipop({ b, r }) {
    const c1 = new THREE.Color(pick(r, CANDY)), c2 = new THREE.Color('#ffffff');
    const h = 4 + r() * 3;
    b.add(G.cyl, '#ffffff', M(0, h / 2, 0, 0.35, h, 0.35));
    b.add(G.cyl, (x, y, z) => (Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 8 + Math.hypot(x, z) * 4) % 2 ? c1 : c2), M(0, h + 1.5, 0, 3.6, 0.8, 3.6, Math.PI / 2, r() * 3, 0), 0.14);
    return 1;
  },
  gumdrop({ b, r }) {
    const s = 2.5 + r() * 3;
    b.add(G.dome, pick(r, CANDY), M(0, 0, 0, s, s * 1.5, s), 0.14);
    return s * 0.5;
  },
  cane({ b, r }) {
    const c1 = new THREE.Color('#ee3344'), c2 = new THREE.Color('#ffffff');
    const stripes = (x, y) => (Math.floor((y + 0.5) * 9 + x * 3) % 2 ? c1 : c2);
    b.add(G.cyl, stripes, M(0, 2.2, 0, 0.5, 4.4, 0.5));
    b.add(G.hook, (x, y) => (Math.floor(Math.atan2(y, x) * 3.2) % 2 ? c1 : c2), M(0.8, 4.4, 0, 1.6, 1.6, 1.8), 0.08);
    return 0.8;
  },
};

export function balloon(b, r, x, y, z) {
  const c1 = new THREE.Color(pick(r, BRIGHT)), c2 = new THREE.Color(pick(r, ['#ffffff', '#ffd93b', '#fff3a8']));
  const s = 0.8 + r() * 0.5;
  b.base.copy(M(x, y, z, s, s, s, 0, r() * 6, 0));
  b.add(G.sph, (px, py, pz) => (Math.floor(((Math.atan2(pz, px) + Math.PI) / (Math.PI * 2)) * 8) % 2 ? c1 : c2), M(0, 9, 0, 13, 15, 13), 0.3);
  b.add(G.taper, c1, M(0, 1.4, 0, 6, 3.4, 6, Math.PI, 0, 0), 0.3);
  b.add(G.box, '#a8703f', M(0, -3, 0, 2.6, 2, 2.6), 0.2);
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.add(G.cyl, '#5b4630', M(dx * 1.2, -1.2, dz * 1.2, 0.12, 2.6, 0.12), 0);
}

export function boat(b, r, x, z) {
  b.base.copy(M(x, 0, z, 1, 1, 1, 0, r() * 6, 0));
  const c = pick(r, BRIGHT);
  b.add(G.box, c, M(0, 0.5, 0, 2.4, 1.2, 6.5), 0.14);
  b.add(G.cone4, c, M(0, 0.5, 4.1, 1.7, 2.4, 1.2, Math.PI / 2, 0, 0), 0.14);
  b.add(G.cyl, '#ffffff', M(0, 4.5, 0.4, 0.2, 8, 0.2), 0);
  b.add(G.cone4, '#ffffff', M(0.05, 5, -1.3, 0.2, 6.6, 3.6, 0, 0, 0), 0.12);
  b.add(G.cone4, pick(r, BRIGHT), M(0.05, 4.3, 2, 0.2, 5, 2.6, 0, 0, 0), 0.12);
}

// Scatter the theme's props around the circuit, clustered close to the track.
export function scatter(T, theme, ctx, blocked, seaZ) {
  const { r, b, shadow } = ctx;
  const free = (x, z, rad) => {
    if (seaZ != null && z < seaZ + rad + 3) return false;
    for (const c of blocked) if ((c.x - x) ** 2 + (c.z - z) ** 2 < (c.r + rad) ** 2) return false;
    return T.distTo(x, z) > WALL + 3.5 + rad;
  };
  for (const [kind, count] of Object.entries(theme.props)) {
    const fn = PROPS[kind];
    if (!fn) continue;
    const big = kind === 'mesa' || kind === 'building';
    for (let c = 0, tries = 0; c < count && tries < count * 12; tries++) {
      const i = Math.floor(r() * T.n), side = r() < 0.5 ? -1 : 1;
      const d = WALL + (big ? 22 : 5) + r() * r() * (big ? 190 : 150);
      const x = T.px[i] + T.nx[i] * side * d, z = T.pz[i] + T.nz[i] * side * d;
      const rad = big ? 9 : kind === 'flower' || kind === 'bush' ? 0.5 : 2.2;
      if (!free(x, z, rad)) continue;
      const s = 0.8 + r() * 0.55;
      b.base.copy(M(x, 0, z, s, s, s, 0, r() * Math.PI * 2, 0));
      if (ctx.glow) ctx.glow.base.copy(b.base);
      const sr = fn(ctx);
      if (sr > 0) shadow.add(G.disc, '#000000', M(x + sr * s * 0.5, 0, z + sr * s * 0.3, sr * s * 2.6, 1, sr * s * 2), 0);
      if (big) blocked.push({ x, z, r: rad });
      c++;
    }
  }
  b.base.identity();
  if (ctx.glow) ctx.glow.base.identity();
}
