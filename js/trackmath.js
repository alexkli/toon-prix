// Pure track maths (no rendering) so it can also run in Node for validation.

export const HALF_WIDTH = 8;       // asphalt half width
export const KERB = 1.7;           // kerb width outside the asphalt
export const WALL = HALF_WIDTH + 11; // barrier distance from the centre line
export const DS = 2;               // sample spacing

// Car performance envelope shared by physics and the AI speed profile.
export const PERF = { vmax: 80, acc: 27, brake: 58, aLat: 62, maxYaw: 2.3 };

function crPoint(p0, p1, p2, p3, t) {
  // Centripetal Catmull-Rom (Barry-Goldman)
  const d = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5) || 1e-4;
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  const tt = t1 + (t2 - t1) * t;
  const L = (a, b, ta, tb) => [
    ((tb - tt) * a[0] + (tt - ta) * b[0]) / (tb - ta),
    ((tb - tt) * a[1] + (tt - ta) * b[1]) / (tb - ta),
  ];
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
  const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}

function smoothCyclic(a, win, passes = 1) {
  const n = a.length;
  let src = a;
  for (let p = 0; p < passes; p++) {
    const out = new Float32Array(n);
    let sum = 0;
    for (let k = -win; k <= win; k++) sum += src[(k + n) % n];
    for (let i = 0; i < n; i++) {
      out[i] = sum / (2 * win + 1);
      sum += src[(i + win + 1) % n] - src[(i - win + n) % n];
    }
    src = out;
  }
  return src;
}

export function buildTrackMath(def) {
  const P = def.pts, m = P.length;
  // dense polyline
  const dense = [];
  const SUB = 24;
  for (let i = 0; i < m; i++) {
    const p0 = P[(i - 1 + m) % m], p1 = P[i], p2 = P[(i + 1) % m], p3 = P[(i + 2) % m];
    for (let k = 0; k < SUB; k++) dense.push(crPoint(p0, p1, p2, p3, k / SUB));
  }
  const dn = dense.length;
  const cum = [0];
  for (let i = 0; i < dn; i++) {
    const a = dense[i], b = dense[(i + 1) % dn];
    cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const length = cum[dn];
  const n = Math.round(length / DS);
  const ds = length / n;
  const px = new Float32Array(n), pz = new Float32Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = i * ds;
    while (cum[j + 1] < s) j++;
    const f = (s - cum[j]) / (cum[j + 1] - cum[j]);
    const a = dense[j], b = dense[(j + 1) % dn];
    px[i] = a[0] + (b[0] - a[0]) * f;
    pz[i] = a[1] + (b[1] - a[1]) * f;
  }
  const tx = new Float32Array(n), tz = new Float32Array(n), nx = new Float32Array(n), nz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n, b = (i + 1) % n;
    let dx = px[b] - px[a], dz = pz[b] - pz[a];
    const l = Math.hypot(dx, dz);
    dx /= l; dz /= l;
    tx[i] = dx; tz[i] = dz;
    nx[i] = -dz; nz[i] = dx; // tangent rotated +90deg (x -> z)
  }
  let k = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n, b = (i + 1) % n;
    k[i] = (tx[a] * tz[b] - tz[a] * tx[b]) / (2 * ds);
  }
  k = smoothCyclic(k, 2);

  // Racing line: drift towards the inside of corners.
  const maxOff = HALF_WIDTH - 2.4;
  let off = new Float32Array(n);
  const ks = smoothCyclic(k, 9, 2);
  for (let i = 0; i < n; i++) off[i] = Math.max(-maxOff, Math.min(maxOff, ks[i] * 190));
  off = smoothCyclic(off, 5, 2);
  const rx = new Float32Array(n), rz = new Float32Array(n);
  for (let i = 0; i < n; i++) { rx[i] = px[i] + nx[i] * off[i]; rz[i] = pz[i] + nz[i] * off[i]; }
  // racing line curvature (Menger, wide stencil)
  let rk = new Float32Array(n);
  const st = 3;
  for (let i = 0; i < n; i++) {
    const a = (i - st + n) % n, b = (i + st) % n;
    const ax = rx[a], az = rz[a], bx = rx[i], bz = rz[i], cx = rx[b], cz = rz[b];
    const area2 = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    const d1 = Math.hypot(bx - ax, bz - az), d2 = Math.hypot(cx - bx, cz - bz), d3 = Math.hypot(cx - ax, cz - az);
    rk[i] = (2 * area2) / (d1 * d2 * d3 || 1);
  }
  rk = smoothCyclic(rk, 3);
  // Speed profile
  const vp = new Float32Array(n);
  for (let i = 0; i < n; i++) vp[i] = Math.min(PERF.vmax * 1.12, Math.sqrt((PERF.aLat * 0.9) / Math.max(Math.abs(rk[i]), 1e-4)));
  const dec = PERF.brake * 0.78;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = n - 1; i >= 0; i--) {
      const nxt = vp[(i + 1) % n];
      vp[i] = Math.min(vp[i], Math.sqrt(nxt * nxt + 2 * dec * ds));
    }
  }
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, px[i]); maxX = Math.max(maxX, px[i]);
    minZ = Math.min(minZ, pz[i]); maxZ = Math.max(maxZ, pz[i]);
  }
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  let radius = 0;
  for (let i = 0; i < n; i++) radius = Math.max(radius, Math.hypot(px[i] - cx, pz[i] - cz));

  const T = { def, n, ds, length, px, pz, tx, tz, nx, nz, k, off, rx, rz, rk, vp, minX, maxX, minZ, maxZ, cx, cz, radius };

  // Nearest sample; local search around a hint, or global when hint < 0.
  T.nearest = (x, z, hint = -1, span = 12) => {
    let best = 0, bd = 1e18;
    if (hint < 0) {
      for (let i = 0; i < n; i += 2) {
        const d = (px[i] - x) ** 2 + (pz[i] - z) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      hint = best; span = 3; bd = 1e18;
    }
    for (let o = -span; o <= span; o++) {
      const i = (hint + o + n) % n;
      const d = (px[i] - x) ** 2 + (pz[i] - z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  // Distance from the centre line (coarse, for scenery placement).
  T.distTo = (x, z) => {
    let bd = 1e18;
    for (let i = 0; i < n; i += 2) {
      const d = (px[i] - x) ** 2 + (pz[i] - z) ** 2;
      if (d < bd) bd = d;
    }
    return Math.sqrt(bd);
  };
  T.wrap = (i) => ((i % n) + n) % n;
  return T;
}
