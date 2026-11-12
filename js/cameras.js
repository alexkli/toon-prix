import * as THREE from './lib/three.module.js';
import { damp, clamp, angDiff, lerp } from './util.js';

export const CAM_MODES = [
  { id: 'chase', name: 'Chase', icon: '🏎️' },
  { id: 'onboard', name: 'Onboard', icon: '🪖' },
  { id: 'tv', name: 'TV Cams', icon: '🎥' },
  { id: 'heli', name: 'Helicopter', icon: '🚁' },
  { id: 'drone', name: 'Drone', icon: '🛸' },
  { id: 'circuit', name: 'Mini Circuit', icon: '🚂' },
  { id: 'director', name: 'Director', icon: '🎬' },
];
const DIRECTOR_SHOTS = ['tv', 'heli', 'tv', 'drone', 'tv', 'chase', 'circuit', 'tv', 'drone', 'heli', 'onboard'];

export class CameraRig {
  constructor(camera) {
    this.cam = camera; this.mode = 'director'; this.sub = 'tv'; this.snap = true;
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3(); this.fov = 60;
    this.tp = new THREE.Vector3(); this.tl = new THREE.Vector3();
    this.ch = 0; this.heliA = 0.6; this.az = 0.5; this.el = 0.6; this.zoom = 1; this.dragT = 0;
    this.shotT = 0; this.shotI = 0; this.tv = null; this.tvT = 0; this.world = null;
    this.onShot = null; // director callback to choose a new focus car
    this.active = 'tv';
  }
  setWorld(w) { this.world = w; this.snap = true; this.tv = null; this.az = 0.5; this.el = 0.6; this.zoom = 1; this.shotT = 0; }
  setMode(m) { this.mode = m; this.snap = true; this.shotT = 0; }
  drag(dx, dy) {
    this.dragT = 4;
    this.az -= dx * 0.006; this.heliA += dx * 0.006;
    this.el = clamp(this.el + dy * 0.005, 0.2, 1.45);
  }
  zoomBy(f) { this.zoom = clamp(this.zoom * f, 0.22, 1.25); this.dragT = 4; }

  update(dt, time, car, aspect, intro) {
    const T = this.world.T, portrait = aspect < 1;
    let mode = this.mode;
    if (mode === 'director') {
      this.shotT -= dt;
      if (intro) this.shotT = 0;
      else {
        if (this.shotT <= 0) {
          this.shotI = (this.shotI + 1 + Math.floor(Math.random() * 2)) % DIRECTOR_SHOTS.length;
          this.sub = DIRECTOR_SHOTS[this.shotI];
          this.shotT = this.sub === 'circuit' ? 5 : this.sub === 'onboard' ? 5 : 6 + Math.random() * 5;
          this.snap = true;
          if (this.onShot) car = this.onShot() || car;
        }
        mode = this.sub;
      }
    }
    if (intro && mode !== 'circuit') mode = 'drone';
    if (mode !== this.active) { this.active = mode; this.snap = true; }
    const cx = car.x, cz = car.z, fx = Math.sin(car.h), fz = Math.cos(car.h);
    let fov = 60, near = 0.4, lp = 100, ll = 100;
    if (mode === 'chase') {
      this.ch = this.snap ? car.h : this.ch + angDiff(car.h, this.ch) * (1 - Math.exp(-6 * dt));
      const back = portrait ? 11.5 : 8.4, hgt = portrait ? 5 : 3.5;
      this.tp.set(cx - Math.sin(this.ch) * back, hgt, cz - Math.cos(this.ch) * back);
      this.tl.set(cx + fx * 5, 1.3, cz + fz * 5);
      fov = (portrait ? 80 : 62) + car.v * 0.16 + (car.boosting ? 6 : 0);
      ll = 14;
    } else if (mode === 'onboard') {
      // driver's eye: just in front of the visor, so the helmet is never in shot
      this.tp.set(cx + fx * 0.66, 1.27, cz + fz * 0.66);
      this.tl.set(cx + fx * 20, 0.85, cz + fz * 20);
      fov = portrait ? 95 : 82; near = 0.12; lp = ll = 1e6; // rigidly attached, no lag
    } else if (mode === 'tv') {
      this.tvT -= dt;
      if (!this.tv || this.tvT <= 0 || this.snap) {
        let best = null, bd = 1e9;
        for (const c of this.world.tvCams) {
          // prefer cameras the car is driving towards
          let ahead = c.i - car.idx; if (ahead < -T.n / 2) ahead += T.n; if (ahead > T.n / 2) ahead -= T.n;
          const d = Math.hypot(c.x - cx, c.z - cz) + (ahead < -4 ? 45 : 0);
          if (d < bd) { bd = d; best = c; }
        }
        if (best !== this.tv) { this.tv = best; this.snap = true; }
        this.tvT = 0.5;
      }
      this.tp.set(this.tv.x, this.tv.y, this.tv.z);
      this.tl.set(cx, 0.8, cz);
      const d = this.tp.distanceTo(this.tl);
      fov = clamp((2 * Math.atan((portrait ? 16 : 10) / d) * 180) / Math.PI, 7, 60);
      ll = 9;
    } else if (mode === 'heli') {
      if (this.dragT <= 0) this.heliA += dt * 0.1;
      this.tp.set(cx + Math.cos(this.heliA) * 36, 50 + Math.sin(time * 0.6) * 2, cz + Math.sin(this.heliA) * 36);
      this.tl.set(cx + fx * 4, 0, cz + fz * 4);
      fov = portrait ? 52 : 38; lp = 1.6; ll = 5;
    } else if (mode === 'drone') {
      const a = car.h + Math.PI + Math.sin(time * 0.21) * 2.7, rad = 13 + Math.sin(time * 0.33) * 5;
      this.tp.set(cx + Math.sin(a) * rad, Math.max(1.6, 5.5 + Math.sin(time * 0.43 + 1) * 3.4), cz + Math.cos(a) * rad);
      this.tl.set(cx + fx * 2, 1, cz + fz * 2);
      fov = portrait ? 82 : 66; lp = 2.6; ll = 8;
    } else { // circuit: model-railway overview
      if (this.dragT <= 0) this.az += dt * 0.035;
      const vf = 20, tv = Math.tan((vf * Math.PI) / 360), th = tv * aspect;
      const d = ((T.radius + 45) / Math.min(tv, th * 0.92)) * this.zoom * (portrait ? 0.8 : 0.62);
      const f = clamp((1 - this.zoom) * 1.4, 0, 1);
      this.tl.set(lerp(T.cx, cx, f), 0, lerp(T.cz, cz, f));
      const ce = Math.cos(this.el);
      this.tp.set(this.tl.x + Math.sin(this.az) * ce * d, Math.sin(this.el) * d, this.tl.z + Math.cos(this.az) * ce * d);
      fov = vf; near = 20; ll = 3;
    }
    this.dragT -= dt;
    if (this.snap) { this.pos.copy(this.tp); this.look.copy(this.tl); this.fov = fov; this.snap = false; }
    else {
      this.pos.lerp(this.tp, 1 - Math.exp(-lp * dt));
      this.look.lerp(this.tl, 1 - Math.exp(-ll * dt));
      this.fov = damp(this.fov, fov, 4, dt);
    }
    const cam = this.cam;
    cam.position.copy(this.pos); cam.lookAt(this.look);
    if (cam.fov !== this.fov || cam.near !== near) { cam.fov = this.fov; cam.near = near; cam.updateProjectionMatrix(); }
    return car;
  }
}
