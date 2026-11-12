import * as THREE from './lib/three.module.js';
import { Builder, G, M, toonMat, inkMat, clamp, damp, angDiff, lerp } from './util.js';
import { HALF_WIDTH as HW, KERB, WALL, PERF } from './trackmath.js';

let _toon, _ink, _shadowMat, _flameMat;
const mats = () => {
  _toon ||= toonMat(); _ink ||= inkMat();
  _shadowMat ||= new THREE.MeshBasicMaterial({ color: '#141a3a', transparent: true, opacity: 0.28, depthWrite: false });
  _flameMat ||= new THREE.MeshBasicMaterial({ color: '#ffb02e' });
};

function wheelGeo(d, w, hub) {
  const b = new Builder();
  b.add(G.cyl, '#23242f', M(0, 0, 0, d, w, d, 0, 0, Math.PI / 2), 0.05);
  b.add(G.cyl, hub, M(0, 0, 0, d * 0.56, w * 1.08, d * 0.56, 0, 0, Math.PI / 2), 0);
  b.add(G.box, '#ffffff', M(0, 0, 0, w * 1.12, d * 0.5, d * 0.13), 0);
  b.add(G.box, '#ffffff', M(0, 0, 0, w * 1.12, d * 0.13, d * 0.5), 0);
  return b;
}

export function buildCarMesh(team, driver) {
  mats();
  const c1 = team.c1, c2 = team.c2, dark = '#2b2b3a', R = Math.PI / 2;
  const b = new Builder();
  b.add(G.box, dark, M(0, 0.33, -0.15, 1.5, 0.16, 3.7), 0.05);
  b.add(G.cap, c1, M(0, 0.64, -0.35, 1.3, 1.15, 0.92, R, 0, 0), 0.07);
  b.add(G.taper, c1, M(0, 0.52, 1.35, 0.9, 1.75, 0.62, R, 0, 0), 0.07);
  b.add(G.sph, c2, M(0, 0.5, 2.22, 0.56, 0.4, 0.5), 0.06);
  b.add(G.box, c2, M(0, 0.27, 2.2, 2.15, 0.1, 0.62), 0.06);
  for (const s of [-1, 1]) {
    b.add(G.box, c1, M(s * 1.07, 0.38, 2.2, 0.1, 0.38, 0.74), 0.05);
    b.add(G.cap, c1, M(s * 0.74, 0.52, -0.5, 0.62, 0.78, 0.56, R, 0, 0), 0.06);
    b.add(G.sph, dark, M(s * 0.74, 0.54, 0.42, 0.42, 0.34, 0.3), 0);
    b.add(G.box, c1, M(s * 0.97, 1.22, -2.05, 0.1, 0.78, 0.76), 0.05);
  }
  b.add(G.sph, c1, M(0, 0.98, -0.95, 0.66, 0.74, 1.6), 0.06);
  b.add(G.sph, dark, M(0, 1.25, -0.4, 0.34, 0.3, 0.24), 0);
  b.add(G.box, c2, M(0, 1.08, -1.3, 0.1, 0.6, 1.1), 0.05);
  b.add(G.box, dark, M(0, 0.95, -1.95, 0.16, 0.8, 0.34), 0);
  b.add(G.box, c2, M(0, 1.46, -2.05, 1.95, 0.13, 0.66), 0.06);
  b.add(G.sph, dark, M(0, 0.93, 0.12, 0.76, 0.34, 1.05), 0);
  b.add(G.sph, driver.helmet, M(0, 1.2, 0.1, 0.78), 0.06);
  b.add(G.sph, '#1b1b2f', M(0, 1.22, 0.34, 0.62, 0.27, 0.38), 0);
  b.add(G.box, '#ffffff', M(0.14, 1.27, 0.52, 0.14, 0.06, 0.04), 0);
  b.add(G.box, c2, M(0, 1.52, 0.02, 0.16, 0.2, 0.6), 0);

  const group = new THREE.Group();
  const body = b.build(_toon, _ink);
  group.add(body);
  const wheels = [];
  const fg = wheelGeo(1.04, 0.5, c2), rg = wheelGeo(1.16, 0.62, c2);
  const fgeo = [fg.geometry(), fg.inkGeometry()], rgeo = [rg.geometry(), rg.inkGeometry()];
  for (const [x, y, z, geo, front] of [[-0.98, 0.52, 1.38, fgeo, 1], [0.98, 0.52, 1.38, fgeo, 1], [-1.0, 0.58, -1.45, rgeo, 0], [1.0, 0.58, -1.45, rgeo, 0]]) {
    const pivot = new THREE.Group(), spin = new THREE.Group();
    spin.add(new THREE.Mesh(geo[0], _toon), new THREE.Mesh(geo[1], _ink));
    pivot.position.set(x, y, z); pivot.add(spin);
    group.add(pivot);
    wheels.push({ pivot, spin, front, r: y });
  }
  const shadow = new THREE.Mesh(G.disc, _shadowMat);
  shadow.scale.set(3.1, 1, 5.4); shadow.position.set(0.25, 0.05, -0.1); shadow.renderOrder = -39;
  group.add(shadow);
  const flame = new THREE.Mesh(G.cone, _flameMat);
  flame.rotation.x = -R; flame.position.set(0, 0.62, -2.7); flame.scale.set(0.55, 1.5, 0.55); flame.visible = false;
  group.add(flame);
  return { group, body, wheels, flame };
}

const NO_INPUT = { steer: 0, throttle: 0, brake: 0, boost: false };
export const SLIDE = 2.2, SPIN = 2.6; // decay rates of the crash slide / spin

export class Car {
  constructor(driver, team, T, opts = {}) {
    this.driver = driver; this.team = team; this.T = T;
    this.isPlayer = !!opts.isPlayer;
    this.auto = !this.isPlayer;         // AI controlled right now
    this.pace = opts.pace ?? 0.95;      // cornering pace factor for the AI
    this.power = opts.power ?? 1;       // top speed / acceleration factor
    this.mesh = buildCarMesh(team, driver);
    this.x = 0; this.z = 0; this.h = 0; this.v = 0; this.steer = 0;
    this.idx = 0; this.lat = 0; this.s = 0; this.laps = -1; this.prog = 0;
    this.boost = 0.5; this.boosting = false; this.slip = false; this.onTrack = true;
    this.finished = false; this.finishTime = 0; this.lapStart = 0; this.bestLap = Infinity; this.lastLap = 0;
    this.lane = 0; this.passSide = 0; this.passTarget = null; this.stuck = 0; this.react = 0;
    this.lapNoise = 1; this.wallCd = 0; this.wheelRot = 0; this.roll = 0; this.pitch = 0; this.skid = 0; this.wrongWay = 0;
    this.kx = 0; this.kz = 0; this.spinW = 0; this.spinT = 0; this.crashCd = 0; // crash: knock-back slide + spin
    this.pos = 0; this.phase = Math.random() * 6;
  }
  place(slot) {
    this.x = slot.x; this.z = slot.z; this.h = slot.h; this.v = 0; this.steer = 0;
    this.idx = slot.i; this.laps = -1; this.lane = 0;
    this.track();
    this.sync(0, 0);
  }
  // refresh track-relative state
  track() {
    const T = this.T, prev = this.idx;
    const i = (this.idx = T.nearest(this.x, this.z, this.idx));
    const dx = this.x - T.px[i], dz = this.z - T.pz[i];
    this.lat = dx * T.nx[i] + dz * T.nz[i];
    this.s = i * T.ds + dx * T.tx[i] + dz * T.tz[i];
    let crossed = 0;
    if (prev > T.n * 0.75 && i < T.n * 0.25) { this.laps++; crossed = 1; } else if (prev < T.n * 0.25 && i > T.n * 0.75) { this.laps--; crossed = -1; }
    this.prog = this.laps * T.length + this.s;
    this.onTrack = Math.abs(this.lat) <= HW + KERB + 0.3;
    return crossed;
  }
  // input: {steer, throttle, brake, boost}; returns events like 'wall'
  step(dt, input, draft) {
    const T = this.T;
    let ev = null;
    const spinning = this.spinT > 0;
    if (spinning) { this.spinT -= dt; input = NO_INPUT; this.v -= this.v * 1.3 * dt; }
    this.crashCd -= dt;
    const grip = this.onTrack ? 1 : 0.6;
    this.boosting = !!input.boost && this.boost > 0.02 && this.v > 5;
    if (this.boosting) this.boost = Math.max(0, this.boost - dt * 0.3);
    else this.boost = Math.min(1, this.boost + dt * (0.035 + (input.brake > 0.3 && this.v > 20 ? 0.09 : 0)));
    let vmax = PERF.vmax * this.power * (this.boosting ? 1.1 : 1) + (draft ? 4 : 0);
    if (!this.onTrack) vmax *= 0.5;
    let acc = 0;
    if (input.brake > 0) {
      if (this.v > 0.5) acc = -PERF.brake * input.brake * grip;
      else if (this.isPlayer && !this.auto) acc = this.v > -10 ? -12 : 0; // reverse
      else this.v = Math.max(0, this.v);
    } else if (input.throttle > 0) {
      acc = this.v < 0 ? 40 : PERF.acc * this.power * input.throttle * (this.boosting ? 1.5 : 1) * (draft ? 1.2 : 1) * Math.max(0, 1 - this.v / vmax) * 1.25;
    } else acc = -Math.sign(this.v) * 7;
    if (this.v > vmax) acc -= (this.v - vmax) * (this.onTrack ? 1.2 : 2.6);
    this.v += acc * dt;
    if (!input.throttle && !input.brake && Math.abs(this.v) < 0.3) this.v = 0;
    this.accel = acc;

    this.steer = damp(this.steer, clamp(input.steer, -1, 1), this.isPlayer && !this.auto ? 9 : 14, dt);
    const av = Math.abs(this.v);
    const yaw = this.steer * Math.min(PERF.maxYaw, (PERF.aLat * grip) / Math.max(av, 6)) * Math.min(1, av / 5) * Math.sign(this.v || 1);
    this.h += yaw * dt;
    this.skid = Math.abs(this.steer) > 0.82 && av > 30 ? 1 : input.brake > 0.6 && av > 35 ? 0.6 : 0;
    if (spinning) this.skid = 1;
    this.x += Math.sin(this.h) * this.v * dt;
    this.z += Math.cos(this.h) * this.v * dt;
    // crash momentum: slide sideways and spin, both fading out
    if (this.kx || this.kz || this.spinW) {
      this.x += this.kx * dt; this.z += this.kz * dt; this.h += this.spinW * dt;
      const f = Math.exp(-SLIDE * dt);
      this.kx *= f; this.kz *= f; this.spinW *= Math.exp(-SPIN * dt);
      if (Math.abs(this.kx) + Math.abs(this.kz) < 0.2) this.kx = this.kz = 0;
      if (Math.abs(this.spinW) < 0.05) this.spinW = 0;
    }

    this.track();
    // barriers
    const lim = WALL - 1.25;
    if (Math.abs(this.lat) > lim) {
      const i = this.idx, sg = Math.sign(this.lat), over = Math.abs(this.lat) - lim;
      this.x -= T.nx[i] * sg * over; this.z -= T.nz[i] * sg * over;
      const into = (Math.sin(this.h) * T.nx[i] + Math.cos(this.h) * T.nz[i]) * sg * this.v;
      if (into > 7 && this.wallCd <= 0) { this.v *= 0.62; this.wallCd = 0.6; ev = 'wall'; } else this.v *= 1 - 0.9 * dt;
      const along = Math.atan2(T.tx[i], T.tz[i]);
      const fwd = Math.cos(angDiff(this.h, along)) >= 0 ? along : along + Math.PI;
      if (!this.spinW) this.h += angDiff(fwd, this.h) * Math.min(1, 7 * dt);
      this.kx *= 0.5; this.kz *= 0.5; // the barrier soaks up a slide
      this.lat = sg * lim;
    }
    this.wallCd -= dt;
    return ev;
  }
  // Knock the car away along (dx, dz) (unit vector) after a hit of closing speed `rel`.
  // Light taps only shove and wobble; hard hits send the car sliding with one or two full spins,
  // which always end facing the original way so nobody is left tangled up.
  crash(dx, dz, rel, spinDir) {
    const mag = Math.min(26, rel * 0.55);
    this.kx += dx * mag; this.kz += dz * mag;
    const turns = rel > 32 ? 2 : rel > 15 ? 1 : 0;
    const angle = turns ? turns * Math.PI * 2 : Math.min(0.5, rel * 0.035);
    this.spinW = spinDir * angle * SPIN;
    if (turns) { this.spinT = 0.7 + turns * 0.45; this.v *= 0.55; }
    else if (rel > 8) { this.spinT = 0.25; this.v *= 0.85; }
    this.crashCd = 0.5;
    this.lane = 0; this.passTarget = null;
  }
  // visual sync
  sync(dt, time) {
    const m = this.mesh, g = m.group;
    g.position.set(this.x, 0, this.z);
    g.rotation.y = this.h + this.steer * Math.min(1, Math.abs(this.v) / 50) * 0.1;
    this.roll = damp(this.roll, this.steer * Math.min(1, this.v / 60) * 0.09, 8, dt || 0.016);
    this.pitch = damp(this.pitch, clamp(-(this.accel || 0) * 0.0011, -0.05, 0.06), 8, dt || 0.016);
    m.body.rotation.z = this.roll; m.body.rotation.x = this.pitch;
    m.body.position.y = Math.sin(time * 30 + this.phase) * 0.012 + (this.onTrack ? 0 : Math.sin(time * 47 + this.phase) * 0.05 * Math.min(1, Math.abs(this.v) / 15));
    this.wheelRot += (this.v * dt) / 0.55;
    for (const w of m.wheels) {
      w.spin.rotation.x = this.wheelRot;
      if (w.front) w.pivot.rotation.y = this.steer * 0.42;
    }
    m.flame.visible = this.boosting;
    if (this.boosting) m.flame.scale.set(0.5 + Math.random() * 0.2, 1.2 + Math.random() * 0.9, 0.5 + Math.random() * 0.2);
  }
}

// ---------- AI driver ----------
const _in = { steer: 0, throttle: 0, brake: 0, boost: false };
export function aiDrive(car, cars, dt, raceOn) {
  const T = car.T, L = T.length, maxLat = HW - 1.5;
  const k = Math.max(2, Math.round((10 + car.v * 0.2) / T.ds));
  const j = T.wrap(car.idx + k);
  let pace = car.pace * car.lapNoise;
  if (car.finished) pace *= 0.55;

  // traffic
  let laneWant = 0, vcap = Infinity, blocker = null, bd = 1e9, nudge = 0, yieldTo = false;
  for (const o of cars) {
    if (o === car) continue;
    let d = o.s - car.s;
    if (d > L / 2) d -= L; else if (d < -L / 2) d += L;
    const dl = o.lat - car.lat;
    if (d > 1 && d < 12 + car.v * 0.5 && Math.abs(dl) < 2.6 && d < bd) { bd = d; blocker = o; }
    else if (Math.abs(d) <= 5 && Math.abs(dl) < 3.1) {
      // alongside: give room (lane target plus a direct steering nudge)
      laneWant += (dl > 0 ? -1 : 1) * (3.1 - Math.abs(dl)) * 0.9;
      nudge += (dl > 0 ? 1 : -1) * clamp(2.7 - Math.abs(dl), 0, 1) * 0.3;
      if (d > 0.5) yieldTo = true; // the car behind lifts a little through corners
    }
  }
  if (blocker) {
    if (car.passTarget !== blocker || !car.passSide) {
      car.passTarget = blocker;
      car.passSide = blocker.lat > 0.6 ? -1 : blocker.lat < -0.6 ? 1 : (T.k[j] > 0 ? 1 : -1);
    }
    if (Math.abs(blocker.lat + car.passSide * 3.2) > maxLat + 0.4) car.passSide = -car.passSide;
    laneWant += blocker.lat + car.passSide * 3.2 - T.off[j];
    // stay able to stop behind a slower car that is still in the way
    if (Math.abs(blocker.lat - car.lat) < 2.1) vcap = Math.max(6, Math.sqrt(blocker.v * blocker.v + 80 * Math.max(0, bd - 5.6)) + Math.min(0, bd - 5.6) * 3);
  } else car.passTarget = null;
  laneWant = clamp(laneWant, -2 * maxLat, 2 * maxLat) * clamp(car.v / 28, 0.35, 1); // calm at low speed (starts)
  car.lane = damp(car.lane, laneWant, blocker ? 2.6 : 1.5, dt);

  const latT = clamp(T.off[j] + car.lane, -maxLat, maxLat);
  const tx = T.px[j] + T.nx[j] * latT, tz = T.pz[j] + T.nz[j] * latT;
  const err = angDiff(Math.atan2(tx - car.x, tz - car.z), car.h);
  if ((nudge > 0 && car.lat < -maxLat + 0.6) || (nudge < 0 && car.lat > maxLat - 0.6)) nudge = 0; // never nudge off the road
  _in.steer = clamp(err * 2.8 + nudge, -1, 1);

  // corner speed depends on the radius actually driven: tighter on the inside, wider outside
  const i1 = T.wrap(car.idx + 3), kk = T.rk[i1], rad = 1 / Math.max(Math.abs(kk), 0.002);
  const lineF = Math.sqrt(clamp((rad - Math.sign(kk) * (car.lat - T.off[car.idx])) / rad, 0.55, 1.05));
  let vt = Math.min(T.vp[T.wrap(car.idx + 1)] * pace * lineF, vcap);
  if (yieldTo && Math.abs(kk) > 0.008) vt *= 0.95;
  if (Math.abs(err) > 0.5) vt = Math.min(vt, 22);
  if (!car.onTrack) vt = Math.min(vt, 30);
  _in.throttle = car.v < vt - 0.4 ? 1 : car.v < vt + 0.4 ? 0.35 : 0;
  _in.brake = car.v > vt + 1.2 ? clamp((car.v - vt) / 7, 0.25, 1) : 0;
  if (_in.brake) _in.throttle = 0;
  // boost on the straights
  if (car.aiBoost) { if (car.boost < 0.12 || vt < car.v + 2) car.aiBoost = false; } else if (car.boost > 0.7 && vt > car.v + 6 && car.v > 38 && Math.abs(T.k[j]) < 0.004 && !car.finished) car.aiBoost = true;
  _in.boost = car.aiBoost;
  if (!raceOn) { _in.throttle = 0; _in.brake = 1; _in.boost = false; }
  if (car.react > 0) { car.react -= dt; _in.throttle = 0; }
  return _in;
}
