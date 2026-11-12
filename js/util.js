import * as THREE from './lib/three.module.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const angDiff = (a, b) => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const fmtTime = (t) => {
  if (!isFinite(t) || t == null) return '--:--.-';
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`;
};

let _grad;
export function gradientMap() {
  if (!_grad) {
    _grad = new THREE.DataTexture(new Uint8Array([120, 195, 255]), 3, 1, THREE.RedFormat);
    _grad.minFilter = _grad.magFilter = THREE.NearestFilter;
    _grad.generateMipmaps = false;
    _grad.needsUpdate = true;
  }
  return _grad;
}
export const INK = 0x1b1b2f;
export const toonMat = (opts = {}) => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap(), ...opts });
export const inkMat = () => new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

// Shared unit geometries (scaled through matrices).
export const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(0.5, 12, 8),
  sphLo: new THREE.IcosahedronGeometry(0.5, 1),
  rock: new THREE.IcosahedronGeometry(0.5, 0),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  cone: new THREE.ConeGeometry(0.5, 1, 10),
  cone4: new THREE.ConeGeometry(0.5, 1, 4),
  taper: new THREE.CylinderGeometry(0.3, 0.5, 1, 12),
  cap: new THREE.CapsuleGeometry(0.5, 1, 4, 10),
  dome: new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  disc: new THREE.CircleGeometry(0.5, 14).rotateX(-Math.PI / 2),
  hook: new THREE.TorusGeometry(0.5, 0.14, 6, 10, Math.PI),
  ring: new THREE.TorusGeometry(0.5, 0.02, 5, 28),
};

const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function M(x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.set(sx, sy, sz));
}

// Collects many coloured parts into one mesh plus one "ink" outline hull mesh.
export class Builder {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.ink = []; this.base = new THREE.Matrix4(); this.inkScale = 1; }
  add(geom, color, matrix, outline = 0.1) {
    const g = geom.index ? (geom._ni ||= geom.toNonIndexed()) : geom;
    const p = g.attributes.position, nr = g.attributes.normal;
    const m = new THREE.Matrix4().multiplyMatrices(this.base, matrix);
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const cf = typeof color === 'function' ? color : null;
    let c = cf ? null : color.isColor ? color : new THREE.Color(color);
    const v = new THREE.Vector3(), nn = new THREE.Vector3();
    let cx = 0, cy = 0, cz = 0, hx = 1, hy = 1, hz = 1, ox = 0, oy = 0, oz = 0;
    outline *= this.inkScale;
    if (outline > 0) {
      if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox;
      cx = (bb.min.x + bb.max.x) / 2; cy = (bb.min.y + bb.max.y) / 2; cz = (bb.min.z + bb.max.z) / 2;
      hx = Math.max((bb.max.x - bb.min.x) / 2, 1e-3); hy = Math.max((bb.max.y - bb.min.y) / 2, 1e-3); hz = Math.max((bb.max.z - bb.min.z) / 2, 1e-3);
      const e = m.elements;
      ox = 1 + outline / (hx * Math.hypot(e[0], e[1], e[2]));
      oy = 1 + outline / (hy * Math.hypot(e[4], e[5], e[6]));
      oz = 1 + outline / (hz * Math.hypot(e[8], e[9], e[10]));
    }
    for (let i = 0; i < p.count; i++) {
      if (cf && i % 3 === 0) {
        // per-triangle colour from the local-space centroid
        let ax = 0, ay = 0, az = 0;
        for (let q = 0; q < 3; q++) { ax += p.getX(i + q); ay += p.getY(i + q); az += p.getZ(i + q); }
        c = cf(ax / 3, ay / 3, az / 3);
        if (!c.isColor) c = new THREE.Color(c);
      }
      v.fromBufferAttribute(p, i);
      if (outline > 0) {
        nn.set(cx + (v.x - cx) * ox, cy + (v.y - cy) * oy, cz + (v.z - cz) * oz).applyMatrix4(m);
        this.ink.push(nn.x, nn.y, nn.z);
      }
      v.applyMatrix4(m);
      this.pos.push(v.x, v.y, v.z);
      nn.fromBufferAttribute(nr, i).applyMatrix3(nm).normalize();
      this.nor.push(nn.x, nn.y, nn.z);
      this.col.push(c.r, c.g, c.b);
    }
    return this;
  }
  // Flat quad a-b-c-d (counter clockwise seen from the front).
  quad(a, b, c, d, color, normal) {
    const col = color.isColor ? color : new THREE.Color(color);
    let n = normal;
    if (!n) {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      n = [n[0] / l, n[1] / l, n[2] / l];
    }
    for (const q of [a, b, c, a, c, d]) {
      this.pos.push(q[0], q[1], q[2]); this.nor.push(n[0], n[1], n[2]); this.col.push(col.r, col.g, col.b);
    }
    return this;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
  inkGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.ink, 3));
    return g;
  }
  // Returns a Group with the coloured mesh and (optionally) its outline.
  build(material, inkMaterial) {
    const grp = new THREE.Group();
    if (this.pos.length) grp.add(new THREE.Mesh(this.geometry(), material));
    if (inkMaterial && this.ink.length) grp.add(new THREE.Mesh(this.inkGeometry(), inkMaterial));
    return grp;
  }
}

export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry && !Object.values(G).includes(o.geometry)) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) { if (m.map) m.map.dispose(); m.dispose(); }
    }
  });
}
