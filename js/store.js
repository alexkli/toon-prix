import { TRACKS, DRIVERS, POINTS } from './data.js';

const KEY = 'toonprix.save.v1';
const touch = typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);
const defaults = () => ({
  settings: { sound: true, sfxVol: 0.8, musicVol: 0.6, spotifyVol: 0.4, music: 'on', spotifyUrl: '', aids: touch ? 'full' : 'none', quality: 'auto', cam: 'chase' },
  quick: { track: 'meadows', laps: 3, difficulty: 'normal', driver: 'pip', mode: 'drive', grid: 'mid', cam: 'director' },
  records: {}, slots: [null, null, null], resume: null,
});

export const store = {
  data: defaults(),
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d) {
        const def = defaults();
        this.data = { ...def, ...d, settings: { ...def.settings, ...d.settings }, quick: { ...def.quick, ...d.quick } };
      }
    } catch (e) { console.warn('save data unreadable', e); }
    return this.data;
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); return true; } catch (e) { console.warn('could not save', e); return false; }
  },
  wipe() { this.data = defaults(); this.save(); },
};

export function newChampionship(driverId, difficulty, laps) {
  return { driverId, difficulty, laps, round: 0, points: Object.fromEntries(DRIVERS.map((d) => [d.id, 0])), history: [], updated: Date.now() };
}
export const champDone = (c) => c.round >= TRACKS.length;
export function standings(c) {
  return DRIVERS.map((d, i) => ({ d, pts: c.points[d.id] || 0, wins: c.history.filter((h) => h.order[0] === d.id).length, i }))
    .sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.i - b.i);
}
export function applyResults(c, trackId, results) {
  const gained = {};
  results.forEach((r, i) => {
    let p = POINTS[i] || 0;
    if (r.fastest && i < 10) p += 1;
    gained[r.driverId] = p;
    c.points[r.driverId] = (c.points[r.driverId] || 0) + p;
  });
  c.history.push({ trackId, order: results.map((r) => r.driverId) });
  c.round++; c.updated = Date.now();
  return gained;
}
// grid: shuffled for round one, reverse championship order afterwards
export function champGrid(c) {
  if (c.round === 0) return quickGrid(c.driverId, 'mid');
  return standings(c).map((s) => s.d.id).reverse();
}
export function quickGrid(playerId, where) {
  const ids = DRIVERS.map((d) => d.id).filter((id) => id !== playerId);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  if (playerId) ids.splice(where === 'front' ? 0 : where === 'back' ? ids.length : 7, 0, playerId);
  return ids;
}
