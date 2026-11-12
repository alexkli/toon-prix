import * as THREE from './lib/three.module.js';
import { G } from './util.js';

const N = 180;
export class Effects {
  constructor() {
    this.group = new THREE.Group();
    this.mesh = new THREE.InstancedMesh(G.sphLo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), N);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.p = Array.from({ length: N }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1 }));
    this.next = 0;
    const c = new THREE.Color('#fff');
    for (let i = 0; i < N; i++) this.mesh.setColorAt(i, c);
    this.group.add(this.mesh);
    this.m4 = new THREE.Matrix4();
    this.col = new THREE.Color();
    // comic "BONK!" sprites
    this.pops = ['BONK!', 'POW!', 'BOOP!', 'OOF!'].map((w, k) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      const g = cv.getContext('2d');
      g.translate(128, 128);
      g.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2, rr = i % 2 ? 78 : 122;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
      g.fillStyle = ['#ffd93b', '#ff6fae', '#35e0ff', '#ffffff'][k]; g.fill();
      g.lineWidth = 9; g.strokeStyle = '#1b1b2f'; g.lineJoin = 'round'; g.stroke();
      g.rotate(-0.15);
      g.font = 'bold 54px "Arial Rounded MT Bold", "Helvetica Neue", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 10; g.strokeText(w, 0, 4);
      g.fillStyle = k === 3 ? '#ee3344' : '#ffffff'; g.fillText(w, 0, 4);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
      sp.visible = false; sp.renderOrder = 50; sp.userData.t = 0;
      this.group.add(sp);
      return sp;
    });
    this.popI = 0;
  }
  puff(x, y, z, color, size = 1, vx = 0, vy = 1.5, vz = 0, life = 0.7) {
    const i = this.next = (this.next + 1) % N, p = this.p[i];
    p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.s = size; p.life = p.max = life;
    this.mesh.setColorAt(i, this.col.set(color));
    this.mesh.instanceColor.needsUpdate = true;
  }
  pop(x, z) {
    const sp = this.pops[this.popI = (this.popI + 1) % this.pops.length];
    sp.position.set(x, 3.2, z); sp.userData.t = 0.75; sp.visible = true;
  }
  update(dt, camera) {
    const m = this.m4;
    for (let i = 0; i < N; i++) {
      const p = this.p[i];
      let s = 0;
      if (p.life > 0) {
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const t = 1 - Math.max(0, p.life) / p.max;
        s = p.s * (t < 0.25 ? t * 4 : 1 - (t - 0.25) / 0.75) * (0.6 + t);
      }
      m.makeScale(s, s, s).setPosition(p.x, p.y, p.z);
      this.mesh.setMatrixAt(i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    for (const sp of this.pops) {
      if (!sp.visible) continue;
      sp.userData.t -= dt;
      const t = 1 - sp.userData.t / 0.75;
      const size = camera ? Math.min(7, Math.max(1.6, camera.position.distanceTo(sp.position) * Math.tan((camera.fov * Math.PI) / 360) * 0.32)) : 6.5;
      const s = (t < 0.2 ? t * 5 * 1.25 : 1.25 - (t - 0.2) * 0.3) * size;
      sp.scale.set(s, s, 1); sp.material.opacity = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      sp.position.y += dt * 1.5;
      if (sp.userData.t <= 0) sp.visible = false;
    }
  }
  // per-frame car effects
  carFx(car, theme, dt) {
    const v = Math.abs(car.v);
    if (v < 8) return;
    const bx = car.x - Math.sin(car.h) * 1.6, bz = car.z - Math.cos(car.h) * 1.6;
    if (!car.onTrack && Math.random() < dt * 28) this.puff(bx + (Math.random() - 0.5) * 1.6, 0.3, bz + (Math.random() - 0.5) * 1.6, theme.gravel, 0.9 + Math.random() * 0.9, 0, 2, 0, 0.6);
    else if (car.skid && Math.random() < dt * 22 * car.skid) this.puff(bx + (Math.random() - 0.5) * 1.8, 0.3, bz + (Math.random() - 0.5) * 1.8, '#ffffff', 0.7 + Math.random() * 0.8, 0, 1.4, 0, 0.55);
    if (car.boosting && Math.random() < dt * 30) this.puff(bx - Math.sin(car.h) * 1.3, 0.65, bz - Math.cos(car.h) * 1.3, Math.random() < 0.5 ? '#ffd93b' : '#ff8a1f', 0.5 + Math.random() * 0.4, -Math.sin(car.h) * 6, 0.5, -Math.cos(car.h) * 6, 0.3);
  }
}
