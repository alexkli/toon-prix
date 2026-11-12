// Race replay: records every car a few times per second while racing, then plays the race back
// (with any camera) by interpolating between the recorded frames.
import { lerp, angDiff } from './util.js';

const REC = 1 / 15, F = 8; // sample interval, floats per car: x z h v steer flags prog pos
const KEEP = ['x', 'z', 'h', 'v', 'steer', 'idx', 'lat', 's', 'laps', 'maxLaps', 'prog', 'pos', 'finished', 'finishTime', 'finishLaps', 'boosting', 'onTrack', 'skid', 'kx', 'kz', 'spinW', 'spinT', 'lane'];

export class Recorder {
  constructor(race) { this.race = race; this.frames = []; this.times = []; this.events = []; this.acc = REC; }
  tick(dt) {
    const r = this.race;
    if (r.state !== 'racing') return;
    this.acc += dt;
    if (this.acc < REC) return;
    this.acc %= REC;
    const f = new Float32Array(r.cars.length * F);
    r.cars.forEach((c, k) => {
      const o = k * F;
      f[o] = c.x; f[o + 1] = c.z; f[o + 2] = c.h; f[o + 3] = c.v; f[o + 4] = c.steer;
      f[o + 5] = (c.boosting ? 1 : 0) | (c.onTrack ? 0 : 2) | (c.skid ? 4 : 0) | (c.finished ? 8 : 0);
      f[o + 6] = c.prog; f[o + 7] = c.pos;
    });
    this.frames.push(f); this.times.push(r.time);
  }
  bonk(x, z) { if (this.race.state === 'racing') this.events.push({ i: this.frames.length, x, z }); }
  get ok() { return this.frames.length > 15; }
}

export class Replay {
  constructor(race, rec, onBonk) {
    this.race = race; this.rec = rec; this.onBonk = onBonk;
    this.t = 0; this.speed = 1; this.playing = true; this.dur = (rec.frames.length - 1) * REC; this.seeked = true;
    // remember the live state so the race can carry on untouched afterwards
    this.saved = race.cars.map((c) => Object.fromEntries(KEEP.map((k) => [k, c[k]])));
    this.savedRace = { time: race.time, state: race.state, leaderDone: race.leaderDone, order: [...race.order] };
    race.state = 'racing';
    for (const c of race.cars) { c.finished = false; c.kx = c.kz = c.spinW = c.spinT = 0; c.accel = 0; }
    this.apply();
  }
  seek(frac) { this.t = Math.max(0, Math.min(1, frac)) * this.dur; this.seeked = true; this.apply(); }
  update(dt) {
    if (this.playing) {
      const before = this.t;
      this.t = Math.min(this.dur, this.t + dt * this.speed);
      if (this.t >= this.dur) this.playing = false;
      for (const e of this.rec.events) { const et = e.i * REC; if (et > before && et <= this.t) this.onBonk(e.x, e.z); }
    }
    this.apply();
  }
  apply() {
    const { frames, times } = this.rec, n = frames.length, race = this.race, T = race.T, L = T.length;
    const f = Math.max(0, Math.min(n - 1, this.t / REC)), i = Math.min(n - 2, Math.floor(f)), a = f - i;
    const A = frames[i], B = frames[i + 1];
    race.time = lerp(times[i], times[i + 1], a);
    let anyFin = false;
    race.cars.forEach((c, k) => {
      const o = k * F, fl = A[o + 5];
      c.x = lerp(A[o], B[o], a); c.z = lerp(A[o + 1], B[o + 1], a);
      c.h = A[o + 2] + angDiff(B[o + 2], A[o + 2]) * a;
      c.v = lerp(A[o + 3], B[o + 3], a); c.steer = lerp(A[o + 4], B[o + 4], a);
      c.boosting = !!(fl & 1); c.onTrack = !(fl & 2); c.skid = fl & 4 ? 1 : 0;
      c.prog = lerp(A[o + 6], B[o + 6], a); c.pos = A[o + 7];
      c.laps = Math.floor(c.prog / L + 1e-6); c.s = c.prog - c.laps * L;
      c.idx = T.nearest(c.x, c.z, this.seeked ? -1 : c.idx, 20);
      const fin = !!(fl & 8);
      if (fin && !c.finished) { c.finishTime = race.time; c.finishLaps = c.laps; }
      c.finished = fin; anyFin ||= fin;
    });
    race.leaderDone = anyFin;
    race.order.sort((p, q) => p.pos - q.pos);
    this.seeked = false;
  }
  // put the live race back exactly as it was
  restore() {
    this.race.cars.forEach((c, k) => Object.assign(c, this.saved[k]));
    Object.assign(this.race, this.savedRace);
  }
}
