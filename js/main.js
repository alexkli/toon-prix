import * as THREE from './lib/three.module.js';
import { TRACKS, DRIVERS, trackById } from './data.js';
import { PERF } from './trackmath.js';
import { buildWorld } from './world.js';
import { Race } from './race.js';
import { CameraRig, CAM_MODES } from './cameras.js';
import { Effects } from './effects.js';
import { Sound } from './audio.js';
import { store, applyResults, champGrid, quickGrid } from './store.js';
import { Menus, Hud, banner, toast, confetti, ord } from './ui.js';
import { G, INK, fmtTime } from './util.js';
import { parseSpotify, sp, handleRedirect, showDock, pause as spotifyPause, setVolume as spotifyVolume } from './spotify.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#gl');
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
store.load();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.4, 7000);
const rig = new CameraRig(camera);
const fx = new Effects();
scene.add(fx.group);
const sound = new Sound();
sound.on = store.data.settings.sound;

// focus marker (floating arrow above the followed car)
const marker = new THREE.Group();
marker.add(new THREE.Mesh(G.cone, new THREE.MeshBasicMaterial({ color: '#ffd93b' })), new THREE.Mesh(G.cone, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })));
marker.children[1].scale.setScalar(1.25);
marker.rotation.x = Math.PI;
scene.add(marker);

let world = null, race = null, session = null, focus = null, focusLock = false, paused = false, time = 0, pr = 1, slow = 0, wrongT = 0;

const app = {
  sound, rig, store,
  get race() { return race; }, get session() { return session; },
  preview(trackId) {
    // background "attract" race behind the menus
    if (trackId && session && session.kind === 'attract' && session.trackId === trackId) return;
    if (!trackId && session && session.kind === 'attract' && !session.picked) return;
    const id = trackId || TRACKS[Math.floor(Math.random() * TRACKS.length)].id;
    load({ kind: 'attract', picked: !!trackId, trackId: id, laps: 999, difficulty: 'hard', playerId: null, grid: quickGrid(null), cam: trackId ? 'circuit' : 'director' });
  },
  startQuick() {
    const q = store.data.quick, playerId = q.mode === 'drive' ? q.driver : null;
    store.data.resume = null; store.save();
    load({ kind: 'quick', trackId: q.track, laps: q.laps, difficulty: q.difficulty, playerId, grid: quickGrid(playerId, q.grid), cam: playerId ? undefined : q.cam });
    menus.hide();
  },
  startChamp(slot) {
    const c = store.data.slots[slot];
    store.data.resume = null; store.save();
    load({ kind: 'champ', slot, trackId: TRACKS[c.round].id, laps: c.laps, difficulty: c.difficulty, playerId: c.driverId, grid: champGrid(c) });
    menus.hide();
  },
  restart() { load({ ...session }); paused = false; menus.hide(); },
  resume() {
    const r = store.data.resume;
    if (!r) return;
    load(r.cfg, r.race);
    app.setPaused(true);
  },
  quit(save) {
    if (save && race.state === 'racing') { store.data.resume = { cfg: session, race: race.serialize() }; toast('Race saved'); } else store.data.resume = null;
    store.save();
    paused = false;
    app.preview(); menus.main();
  },
  setPaused(p) {
    paused = p;
    if (p) menus.pause(); else menus.hide();
  },
  setCam(id) {
    rig.setMode(id);
    const m = CAM_MODES.find((c) => c.id === id);
    toast(`${m.icon} ${m.name}${id === 'circuit' ? ' · drag to rotate, pinch to zoom' : ''}`);
  },
  pickFocus(car) {
    if (race.player && !race.player.auto && !race.player.finished) return;
    if (focusLock && focus === car) { focusLock = false; toast('🎬 Director picks the car'); return; }
    focus = car; focusLock = true; rig.snap = true;
    toast(`🎥 Following ${car.driver.name}`);
  },
  applySettings() {
    const s = store.data.settings;
    sound.setOn(s.sound);
    app.applyVolumes();
    sound.setMusic(s.music === 'on');
    if (s.music !== 'spotify' && wasSpotify) spotifyPause();
    wasSpotify = s.music === 'spotify';
    showDock(wasSpotify, parseSpotify(s.spotifyUrl));
    if (race) race.aids = s.aids;
    document.body.classList.toggle('nogas', s.aids !== 'none');
    pr = s.quality === 'low' ? 1 : Math.min(devicePixelRatio || 1, s.quality === 'high' ? 3 : 2);
    resize();
  },
  applyVolumes() {
    const s = store.data.settings;
    sound.setVolumes(s.sfxVol, s.musicVol);
    spotifyVolume(s.spotifyVol);
  },
  confetti, toast,
};
let wasSpotify = false;
const menus = new Menus(app), hud = new Hud(app);

function load(cfg, saved) {
  if (world) {
    scene.remove(world.group); world.dispose();
    for (const c of race.cars) { scene.remove(c.mesh.group); c.mesh.group.traverse((o) => { if (o.geometry && !Object.values(G).includes(o.geometry)) o.geometry.dispose(); }); }
  }
  const def = trackById(cfg.trackId);
  world = buildWorld(def);
  scene.add(world.group);
  scene.fog = new THREE.Fog(def.themeDef.fog, 700, 3300);
  scene.background = new THREE.Color(def.themeDef.fog);
  const attract = cfg.kind === 'attract';
  race = new Race(world, cfg.grid.map((id) => ({ driverId: id, isPlayer: id === cfg.playerId })), { laps: cfg.laps, difficulty: cfg.difficulty, aids: store.data.settings.aids, onEvent });
  for (const c of race.cars) scene.add(c.mesh.group);
  session = cfg; focusLock = false; wrongT = 0;
  focus = race.player || race.order[0];
  if (saved) race.restore(saved);
  if (attract) { race.state = 'racing'; for (const c of race.cars) c.react = Math.random() * 0.5; }
  rig.setWorld(world);
  rig.setMode(cfg.cam || (race.player ? store.data.settings.cam : 'director'));
  hud.show(!attract);
  if (!attract) hud.setup(race);
  $('#b-auto').classList.toggle('hidden', !race.player); $('#b-reset').classList.toggle('hidden', !race.player);
  $('#b-auto').classList.remove('on');
  document.body.classList.toggle('nogas', store.data.settings.aids !== 'none');
  sound.setMusic(store.data.settings.music === 'on', attract ? 'menu' : 'race', attract ? 0 : [0, 2, -3, 5, -2, 3][TRACKS.indexOf(def)] || 0);
}

function onEvent(type, d) {
  const attract = session.kind === 'attract';
  if (type === 'bonk') { fx.pop(d.x, d.z); if (!attract && (d.cars.includes(focus) || d.rel > 12)) sound.thud(d.cars.includes(focus) ? 0.3 : 0.1); return; }
  if (type === 'wall') { if (d === focus && !attract) { sound.thud(0.35); fx.pop(d.x, d.z); } return; }
  if (attract) return;
  if (type === 'light') { hud.lights(d); sound.beep(440, 0.18); }
  else if (type === 'go') { hud.go(); banner('GO!'); sound.beep(880, 0.6, 'square', 0.14); }
  else if (type === 'finalLap') banner('FINAL LAP!');
  else if (type === 'fastest') toast(`⏱ Fastest lap · ${d.driver.name} · ${fmtTime(d.lastLap)}`, 2600);
  else if (type === 'lap' && d === race.player) toast(`Lap ${fmtTime(d.lastLap)}${d.lastLap === d.bestLap && d.laps > 1 ? ' · personal best!' : ''}`);
  else if (type === 'finish') {
    if (d === race.player) { banner(d.pos === 1 ? 'YOU WIN!' : `${ord(d.pos)} PLACE!`); if (d.pos <= 3) { confetti(); sound.fanfare(); } else sound.beep(660, 0.4, 'triangle'); }
    else if (!race.player && d.pos === 1) { banner(`${d.driver.name.toUpperCase()} WINS!`); confetti(); sound.fanfare(); }
  } else if (type === 'done') finishSession(d);
}

function finishSession(results) {
  const rec = store.data.records, id = session.trackId, f = race.fastest;
  if (f && (!rec[id] || f.time < rec[id].time)) rec[id] = { time: f.time, tag: DRIVERS.find((x) => x.id === f.driverId).tag };
  let gained = null;
  if (session.kind === 'champ') gained = applyResults(store.data.slots[session.slot], id, results);
  store.data.resume = null;
  store.save();
  rig.setMode('director');
  hud.show(false);
  menus.results(race, session, gained);
}

// ---------- input ----------
const keys = {};
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', Space: 'boost', ShiftLeft: 'boost', ShiftRight: 'boost' };
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  sound.init();
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); return; }
  if (e.repeat || !session || session.kind === 'attract') return;
  if (e.code === 'KeyC' && !menus.open) cycleCam();
  else if (e.code === 'KeyP' || e.code === 'Escape') { if (paused) app.setPaused(false); else if (!menus.open) app.setPaused(true); }
  else if (e.code === 'KeyT') toggleAuto();
  else if (e.code === 'KeyR') resetPlayer();
  else if (e.code === 'KeyM') { store.data.settings.sound = !store.data.settings.sound; store.save(); app.applySettings(); toast(store.data.settings.sound ? '🔊 Sound on' : '🔇 Sound off'); }
});
addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
for (const b of document.querySelectorAll('#touch button')) {
  const k = b.dataset.k;
  const set = (v) => (e) => { e.preventDefault(); keys[k] = v; b.classList.toggle('down', v); if (v) sound.init(); };
  b.addEventListener('pointerdown', (e) => { b.setPointerCapture(e.pointerId); set(true)(e); });
  b.addEventListener('pointerup', set(false)); b.addEventListener('pointercancel', set(false)); b.addEventListener('lostpointercapture', set(false));
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
const input = { steer: 0, throttle: 0, brake: 0, boost: false };
function readInput() {
  input.steer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
  input.throttle = keys.gas ? 1 : 0; input.brake = keys.brake ? 1 : 0; input.boost = !!keys.boost;
  return input;
}
function cycleCam() {
  const i = CAM_MODES.findIndex((m) => m.id === rig.mode);
  app.setCam(CAM_MODES[(i + 1) % CAM_MODES.length].id);
}
function toggleAuto() {
  const p = race && race.player;
  if (!p || p.finished) return;
  p.auto = !p.auto;
  $('#b-auto').classList.toggle('on', p.auto);
  toast(p.auto ? '🤖 Autopilot on — sit back!' : '🎮 You have control');
}
function resetPlayer() {
  const p = race && race.player;
  if (p && race.state === 'racing' && !p.finished) { race.reset(p); p.v = 8; toast('↺ Back on track'); }
}
$('#b-cam').onclick = () => { sound.init(); cycleCam(); };
$('#b-pause').onclick = () => { sound.init(); app.setPaused(true); };
$('#b-auto').onclick = () => { sound.init(); toggleAuto(); };
$('#b-reset').onclick = () => { sound.init(); resetPlayer(); };

// camera orbit / zoom gestures on the canvas
const ptr = new Map();
let pinch = 0;
canvas.addEventListener('pointerdown', (e) => { sound.init(); ptr.set(e.pointerId, [e.clientX, e.clientY]); canvas.setPointerCapture(e.pointerId); pinch = 0; });
canvas.addEventListener('pointermove', (e) => {
  const p = ptr.get(e.pointerId);
  if (!p) return;
  if (ptr.size === 1) rig.drag(e.clientX - p[0], e.clientY - p[1]);
  p[0] = e.clientX; p[1] = e.clientY;
  if (ptr.size === 2) {
    const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (pinch) rig.zoomBy(pinch / d);
    pinch = d;
  }
});
for (const t of ['pointerup', 'pointercancel']) canvas.addEventListener(t, (e) => { ptr.delete(e.pointerId); pinch = 0; });
canvas.addEventListener('wheel', (e) => { e.preventDefault(); rig.zoomBy(Math.exp(e.deltaY * 0.0015)); }, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// ---------- lifecycle ----------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 200));
if (window.visualViewport) visualViewport.addEventListener('resize', resize);
function autosave() {
  if (session && session.kind !== 'attract' && race.state === 'racing') {
    store.data.resume = { cfg: session, race: race.serialize() };
    store.save();
    if (!paused && !menus.open) app.setPaused(true);
  }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) autosave(); });
addEventListener('pagehide', autosave);

// Race-finish TV direction (watch mode): cut to the finish-line camera for the winner taking the flag,
// then stay there and pick up each following car as it comes to the line.
function finishDirection() {
  rig.finishShot = false;
  if (race.player || session.kind === 'attract' || race.state !== 'racing' || !(rig.mode === 'director' || rig.mode === 'tv')) return;
  const L = race.T.length;
  let next = null, lastFin = null;
  for (const c of race.cars) {
    if (c.finished) { if (!lastFin || c.finishTime > lastFin.finishTime) lastFin = c; continue; }
    const flagLap = race.leaderDone ? c.laps >= 0 : c.laps === race.laps - 1;
    if (flagLap && c.s > L - 140 && (!next || c.s > next.s)) next = c;
  }
  const since = lastFin ? race.time - lastFin.finishTime : 99;
  let pick = null;
  if (next && (!lastFin || since > 1.1 || L - next.s < 40)) pick = next;
  else if (lastFin && since < 2.6) pick = lastFin;
  if (!pick) return;
  rig.finishShot = true;
  focus = pick;
  // Frame everyone who is around the line together, so the picture glides instead of hopping car to car.
  let n = 0, sx = 0, sz = 0;
  const group = [];
  for (const c of race.cars) {
    const rel = c.s < L / 2 ? c.s : c.s - L; // distance past (+) or before (-) the line
    const live = c === pick || (c.finished ? race.time - c.finishTime < 3 : race.leaderDone ? c.laps >= 0 : c.laps === race.laps - 1);
    if (live && rel > -75 && rel < 32) { group.push(c); sx += c.x; sz += c.z; n++; }
  }
  if (!n) { group.push(pick); sx = pick.x; sz = pick.z; n = 1; }
  const ft = rig.finishTarget;
  ft.x = sx / n; ft.z = sz / n; ft.spread = 0;
  for (const c of group) ft.spread = Math.max(ft.spread, Math.hypot(c.x - ft.x, c.z - ft.z));
}
function pickDirectorFocus() {
  if (race.player || focusLock || rig.finishShot) return focus;
  const o = race.order, rnd = Math.random();
  if (rnd < 0.35) focus = o[0];
  else {
    const battles = o.filter((c, i) => i > 0 && !c.finished && race.gapAhead(i) < 0.5);
    focus = battles.length && rnd < 0.9 ? battles[Math.floor(Math.random() * battles.length)] : o[Math.floor(Math.random() * o.length)];
  }
  return focus;
}
rig.onShot = pickDirectorFocus;

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - last) / 1000, dt = Math.min(0.05, raw);
  last = now;
  if (!race) return;
  const attract = session.kind === 'attract';
  if (!paused) {
    time += dt;
    race.update(dt, readInput());
    for (const c of race.cars) { c.sync(dt, time); fx.carFx(c, world.theme, dt); }
    fx.update(dt, camera);
    world.update(dt, time);
    const p = race.player;
    if (p && !p.auto && race.state === 'racing' && !p.finished) {
      const T = race.T, wrong = Math.sin(p.h) * T.tx[p.idx] + Math.cos(p.h) * T.tz[p.idx] < -0.3 && p.v > 4;
      wrongT = wrong ? wrongT + dt : 0;
      if (wrongT > 1.2) { banner('WRONG WAY!'); wrongT = -1.5; }
    }
  }
  finishDirection();
  focus = rig.update(dt, time, focus, camera.aspect, race.state === 'intro') || focus;
  const mini = rig.active === 'circuit';
  if (document.body.classList.contains('mini') !== mini) document.body.classList.toggle('mini', mini);
  const far = rig.active === 'circuit' || rig.active === 'heli' || rig.active === 'tv';
  marker.visible = far && !attract;
  if (marker.visible) {
    const s = camera.position.distanceTo(focus.mesh.group.position) * (camera.fov / 60) * 0.035;
    marker.scale.set(s, s * 1.5, s);
    marker.position.set(focus.x, 3.2 + s * (1.1 + Math.sin(time * 5) * 0.2), focus.z);
  }
  if (!attract) {
    hud.update(race, focus, dt);
    const p = race.player, drive = p && !p.auto && !p.finished && !menus.open;
    $('#touch').classList.toggle('hidden', !(isTouch && drive));
    $('#dash').style.bottom = isTouch && drive && innerWidth < 700 ? 'calc(var(--sb) + 7.5em)' : '';
  }
  // engine audio: the followed car plus the nearest rival (with a little doppler)
  let rival = null, rd = 55;
  for (const c of race.cars) {
    if (c === focus) continue;
    const d = Math.hypot(c.x - focus.x, c.z - focus.z);
    if (d < rd) { rd = d; rival = c; }
  }
  const camD = camera.position.distanceTo(focus.mesh.group.position);
  sound.update({ v: focus.v, throttle: (focus.accel || 0) > 0 ? 1 : 0, dist: camD },
    rival && { v: rival.v, dist: rd, vr: ((rival.x - focus.x) * (Math.sin(rival.h) * rival.v - Math.sin(focus.h) * focus.v) + (rival.z - focus.z) * (Math.cos(rival.h) * rival.v - Math.cos(focus.h) * focus.v)) / Math.max(rd, 1) },
    PERF.vmax, focus.skid, !attract && !paused && race.state !== 'done' && !menus.open, dt);
  renderer.render(scene, camera);
  // adaptive resolution
  if (store.data.settings.quality === 'auto' && !paused) {
    slow = raw > 0.028 ? slow + raw : Math.max(0, slow - raw * 0.5);
    if (slow > 2.5 && pr > 1) { pr = Math.max(1, pr - 0.25); slow = 0; resize(); }
  }
}

sp.notify = (m) => toast(m, 3500);
app.applySettings();
app.preview();
menus.main();
// returning from the Spotify sign-in page
handleRedirect().then((ok) => {
  if (!ok) return;
  store.data.settings.music = 'spotify'; store.save(); app.applySettings();
  menus.settings(() => menus.main());
  toast('Spotify connected — press ▶ Play', 4000);
}).catch((e) => toast(e.message, 4000));
requestAnimationFrame(frame);
requestAnimationFrame(() => $('#loading').classList.add('gone'));
window.__game = { app, get race() { return race; }, rig, get focus() { return focus; }, renderer };
