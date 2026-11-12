import { Car, aiDrive } from './car.js';
import { gridSlot } from './world.js';
import { DIFFICULTY, teamOf, driverById } from './data.js';
import { lerp, clamp } from './util.js';
import { PERF } from './trackmath.js';

const R = 1.05, CO = 1.15; // collision circle radius / offset along the car

export class Race {
  // entries: [{driverId, isPlayer}] in grid order
  constructor(world, entries, opts) {
    this.world = world; this.T = world.T;
    this.laps = opts.laps; this.difficulty = opts.difficulty || 'normal';
    this.aids = opts.aids || 'none';
    this.onEvent = opts.onEvent || (() => {});
    this.entries = entries;
    const diff = DIFFICULTY[this.difficulty];
    this.cars = entries.map((e, j) => {
      const d = driverById(e.driverId);
      const car = new Car(d, teamOf(d), this.T, {
        isPlayer: e.isPlayer,
        pace: e.isPlayer ? 0.975 : diff.pace * (0.93 + 0.07 * d.skill),
        power: e.isPlayer ? 1 : lerp(0.93, 1, clamp((diff.pace - 0.86) / 0.14, 0, 1)) * (0.975 + 0.025 * d.skill),
      });
      car.place(gridSlot(this.T, j));
      car.grid = j; car.maxLaps = -1; car.react = 0.05 + Math.random() * 0.35;
      car.lapNoise = 0.985 + Math.random() * 0.03;
      return car;
    });
    this.player = this.cars.find((c) => c.isPlayer) || null;
    this.state = 'intro'; this.clock = 0; this.time = 0; this.lightCount = 0; this.hold = 0;
    this.order = [...this.cars]; this.fastest = null; this.leaderDone = false; this.doneTimer = 0; this.bonkCd = 0;
    this.results = null;
    this.rank();
  }
  ev(type, data) { this.onEvent(type, data); }

  update(dt, playerInput) {
    this.clock += dt;
    if (this.state === 'intro') {
      if (this.clock > 3.2) { this.state = 'lights'; this.clock = 0; }
    } else if (this.state === 'lights') {
      const nLit = Math.min(5, Math.floor(this.clock / 0.75) + 1);
      if (nLit !== this.lightCount) { this.lightCount = nLit; this.world.setLights(nLit); this.ev('light', nLit); if (nLit === 5) this.hold = 0.75 * 5 + 0.5 + Math.random() * 0.9; }
      if (this.lightCount === 5 && this.clock > this.hold) {
        this.state = 'racing'; this.clock = 0; this.world.setLights(0); this.ev('go');
      }
    }
    const racing = this.state === 'racing' || this.state === 'done';
    if (racing) this.time += dt;
    const sub = 2, h = dt / sub;
    for (let s = 0; s < sub; s++) {
      for (const car of this.cars) {
        let input;
        if (car.isPlayer && !car.auto && !car.finished) {
          input = racing ? this.assist(car, playerInput) : { steer: playerInput.steer, throttle: 0, brake: 0, boost: false };
        } else input = aiDrive(car, this.cars, h, racing);
        const before = car.laps;
        const e = car.step(h, input, racing && this.draft(car));
        if (!racing) car.v = 0;
        if (e === 'wall') this.ev('wall', car);
        if (car.laps > before && car.laps > car.maxLaps) this.crossed(car);
        // stuck / lost recovery
        if (racing && (car.auto || car.finished)) {
          car.stuck = car.v < 2.5 && car.spinT <= 0 ? car.stuck + h : 0;
          if (car.stuck > 2.5) this.reset(car);
        }
      }
      this.collide();
    }
    this.bonkCd -= dt;
    this.rank();
    if (this.state === 'racing') {
      const p = this.player;
      const allDone = this.cars.every((c) => c.finished);
      if (p ? p.finished : allDone || (this.leaderDone && this.time - this.winTime > 25)) {
        this.doneTimer += dt;
        if (this.doneTimer > (p ? 3 : 2)) this.finish();
      }
    }
  }
  // driving aids for the human player
  assist(car, inp) {
    if (this.aids === 'none') return inp;
    const out = { steer: inp.steer, throttle: inp.brake > 0 ? 0 : 1, brake: inp.brake, boost: inp.boost };
    if (this.aids === 'full' && car.onTrack) {
      const vt = this.T.vp[this.T.wrap(car.idx + 1)] * 0.99;
      if (car.v > vt + 1) { out.brake = Math.max(out.brake, clamp((car.v - vt) / 7, 0.25, 1)); out.throttle = 0; }
    }
    return out;
  }
  draft(car) {
    if (car.v < 34) return false;
    const L = this.T.length;
    for (const o of this.cars) {
      if (o === car) continue;
      let d = o.s - car.s;
      if (d > L / 2) d -= L; else if (d < -L / 2) d += L;
      if (d > 3.5 && d < 24 && Math.abs(o.lat - car.lat) < 1.9) return true;
    }
    return false;
  }
  crossed(car) {
    car.maxLaps = car.laps;
    if (car.finished) return;
    if (car.laps >= 1) {
      car.lastLap = this.time - car.lapStart;
      if (car.lastLap < car.bestLap) car.bestLap = car.lastLap;
      if (!this.fastest || car.lastLap < this.fastest.time) {
        this.fastest = { time: car.lastLap, driverId: car.driver.id };
        if (car.laps > 1 || this.cars.length === 1) this.ev('fastest', car);
      }
    }
    car.lapStart = this.time;
    car.lapNoise = 0.985 + Math.random() * 0.03;
    if (car.laps >= this.laps || (this.leaderDone && car.laps >= 1)) {
      car.finished = true; car.finishTime = this.time; car.finishLaps = car.laps;
      if (!this.leaderDone) { this.leaderDone = true; this.winTime = this.time; }
      this.rank();
      this.ev('finish', car);
    } else {
      if (car.laps === this.laps - 1 && (car === this.player || (!this.player && car === this.order[0]))) this.ev('finalLap', car);
      if (car.laps >= 1) this.ev('lap', car);
    }
  }
  reset(car) {
    const T = this.T, i = car.idx;
    car.x = T.px[i]; car.z = T.pz[i]; car.h = Math.atan2(T.tx[i], T.tz[i]); car.v = 12; car.steer = 0; car.lane = 0; car.stuck = 0;
    car.track();
  }
  collide() {
    const cs = this.cars;
    for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) {
      const A = cs[a], B = cs[b];
      const dx = B.x - A.x, dz = B.z - A.z;
      if (dx * dx + dz * dz > 30) continue;
      const fax = Math.sin(A.h), faz = Math.cos(A.h), fbx = Math.sin(B.h), fbz = Math.cos(B.h);
      for (const sa of [CO, -CO]) for (const sb of [CO, -CO]) {
        const ex = B.x + fbx * sb - (A.x + fax * sa), ez = B.z + fbz * sb - (A.z + faz * sa);
        const d = Math.hypot(ex, ez);
        if (d >= R * 2 || d < 1e-4) continue;
        const nx = ex / d, nz = ez / d, push = (R * 2 - d) / 2;
        A.x -= nx * push; A.z -= nz * push; B.x += nx * push; B.z += nz * push;
        const va = A.v * (fax * nx + faz * nz), vb = B.v * (fbx * nx + fbz * nz), rel = va - vb;
        if (rel > 0) {
          // inelastic along the contact normal: both end up with the average normal speed
          const ca = fax * nx + faz * nz, cb = fbx * nx + fbz * nz, vn = (va + vb) / 2;
          if (Math.abs(ca) > 0.35) A.v += clamp(((vn - va) / ca) * 0.9, -rel, rel);
          if (Math.abs(cb) > 0.35) B.v += clamp(((vn - vb) / cb) * 0.9, -rel, rel);
          A.v = Math.max(A.v, 0); B.v = Math.max(B.v, 0);
          if (rel > 4 && A.crashCd <= 0 && B.crashCd <= 0) {
            // crash: both cars are flung apart sideways (and a little along the contact), harder hits fly further
            // side = across A's heading, pointing away from B; a dead-centre rear-end picks the roomier side
            let side = -(faz * nx - fax * nz) >= 0 ? 1 : -1;
            if (Math.abs(faz * nx - fax * nz) < 0.15) side = A.lat > B.lat ? -1 : 1;
            const px = faz * side, pz = -fax * side;
            const ax = px * 0.85 - nx * 0.35, az = pz * 0.85 - nz * 0.35, bx = -px * 0.85 + nx * 0.35, bz = -pz * 0.85 + nz * 0.35;
            const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
            A.crash(ax / la, az / la, rel, side); B.crash(bx / lb, bz / lb, rel, -side);
            if (this.bonkCd <= 0) { this.bonkCd = 0.4; this.ev('bonk', { x: (A.x + B.x) / 2, z: (A.z + B.z) / 2, cars: [A, B], rel }); }
          }
        }
      }
    }
  }
  rank() {
    const cap = this.laps;
    this.order.sort((a, b) => {
      if (a.finished && b.finished) return b.finishLaps - a.finishLaps || a.finishTime - b.finishTime;
      if (a.finished !== b.finished) {
        const f = a.finished ? a : b, u = a.finished ? b : a;
        const ahead = Math.min(u.laps, cap) > f.finishLaps ? u : f;
        return ahead === a ? -1 : 1;
      }
      return b.prog - a.prog;
    });
    this.order.forEach((c, i) => { c.pos = i + 1; });
  }
  finish() {
    this.state = 'done';
    this.rank();
    const lead = this.order[0];
    this.results = this.order.map((c, i) => ({
      pos: i + 1, driverId: c.driver.id, isPlayer: c.isPlayer, finished: c.finished,
      time: c.finished ? c.finishTime : null,
      gap: i === 0 ? 0 : c.finished && c.finishLaps === lead.finishLaps ? c.finishTime - lead.finishTime : null,
      lapsDown: Math.max(0, (lead.finishLaps ?? this.laps) - Math.max(0, c.finished ? c.finishLaps : c.laps)),
      best: isFinite(c.bestLap) ? c.bestLap : null,
      fastest: this.fastest && this.fastest.driverId === c.driver.id,
    }));
    this.ev('done', this.results);
  }
  lapOf(car) { return clamp(car.laps + 1, 1, this.laps); }
  // gap (seconds, approx) to the car ahead in the order
  gapAhead(i) {
    if (i === 0) return 0;
    const a = this.order[i - 1], b = this.order[i];
    return Math.max(0, (a.prog - b.prog) / Math.max(30, (a.v + b.v) / 2 || PERF.vmax * 0.7));
  }

  serialize() {
    return {
      trackId: this.world.def.id, laps: this.laps, difficulty: this.difficulty, aids: this.aids, entries: this.entries,
      time: this.time, fastest: this.fastest, leaderDone: this.leaderDone, winTime: this.winTime,
      cars: this.cars.map((c) => ({
        x: c.x, z: c.z, h: c.h, v: c.v, idx: c.idx, laps: c.laps, maxLaps: c.maxLaps, lapStart: c.lapStart, bestLap: isFinite(c.bestLap) ? c.bestLap : null,
        lastLap: c.lastLap, boost: c.boost, finished: c.finished, finishTime: c.finishTime, finishLaps: c.finishLaps, auto: c.auto,
      })),
    };
  }
  restore(s) {
    this.time = s.time; this.fastest = s.fastest; this.leaderDone = s.leaderDone; this.winTime = s.winTime;
    s.cars.forEach((d, i) => {
      const c = this.cars[i];
      Object.assign(c, d, { bestLap: d.bestLap ?? Infinity, react: 0 });
      c.track(); c.laps = d.laps; c.prog = c.laps * this.T.length + c.s;
    });
    this.state = 'racing'; this.world.setLights(0);
    this.rank();
  }
}
