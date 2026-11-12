import { TRACKS, DRIVERS, TEAMS, DIFFICULTY, POINTS, teamOf, driverById, trackById } from './data.js';
import { buildTrackMath } from './trackmath.js';
import { CAM_MODES } from './cameras.js';
import { fmtTime } from './util.js';
import { store, standings, champDone, newChampionship } from './store.js';
import { parseSpotify } from './spotify.js';

const $ = (s) => document.querySelector(s);
export function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style') e.style.cssText = v; else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
const mathCache = {};
export const trackMath = (id) => (mathCache[id] ||= buildTrackMath(trackById(id)));
export function drawTrack(cv, T, opts = {}) {
  const g = cv.getContext('2d'), w = cv.width, h = cv.height, pad = opts.pad ?? 0.12;
  const sc = Math.min((w * (1 - 2 * pad)) / (T.maxX - T.minX), (h * (1 - 2 * pad)) / (T.maxZ - T.minZ));
  const X = (x) => w / 2 + (x - T.cx) * sc, Y = (z) => h / 2 + (z - T.cz) * sc;
  g.clearRect(0, 0, w, h);
  if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, w, h); }
  g.beginPath();
  for (let i = 0; i < T.n; i += 2) g.lineTo(X(T.px[i]), Y(T.pz[i]));
  g.closePath(); g.lineJoin = 'round';
  g.strokeStyle = opts.edge || '#1b1b2f'; g.lineWidth = opts.lw ? opts.lw * 1.9 : w * 0.075; g.stroke();
  g.strokeStyle = opts.road || '#fff'; g.lineWidth = opts.lw || w * 0.04; g.stroke();
  g.fillStyle = '#ee3344'; g.fillRect(X(T.px[0]) - w * 0.012, Y(T.pz[0]) - w * 0.04, w * 0.024, w * 0.08);
  return { X, Y };
}
const seg = (opts, cur, on) => el('div', { class: 'seg' }, opts.map(([v, label]) => el('button', { class: v === cur ? 'on' : '', onclick: () => on(v) }, label)));
const chip = (c) => el('i', { class: 'chip', style: `background:${c}` });
const ord = (n) => n + (['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th');
const AIDS = [['full', 'Auto gas + brake'], ['gas', 'Auto gas'], ['none', 'Manual']];
const MUSIC = [['on', '🎵 Built-in'], ['spotify', '🟢 Spotify'], ['off', 'Off']];

export class Menus {
  constructor(app) { this.app = app; this.root = $('#screen'); }
  set(node, dim = false) {
    this.root.replaceChildren(node);
    this.root.className = 'on' + (dim ? ' dim' : '');
    document.body.classList.add('menu');
  }
  hide() { this.root.className = ''; this.root.replaceChildren(); document.body.classList.remove('menu'); }
  // music source picker; Spotify takes a pasted playlist/album/track link
  musicPicker(re) {
    const s = store.data.settings;
    const inp = el('input', { class: 'txt', type: 'url', inputmode: 'url', placeholder: 'Paste a Spotify playlist, album or track link', value: s.spotifyUrl });
    const load = () => {
      if (!parseSpotify(inp.value)) { inp.value = ''; inp.placeholder = 'That is not a Spotify link — try again'; return; }
      s.spotifyUrl = inp.value.trim(); re();
    };
    return el('div', {}, seg(MUSIC, s.music, (v) => { s.music = v; re(); }),
      s.music === 'spotify' && el('div', { class: 'row nw', style: 'margin-top:.5em' }, inp, this.btn('Load', 'mint small', load)),
      s.music === 'spotify' && el('p', { class: 'note', style: 'margin:.4em 0 0' }, parseSpotify(s.spotifyUrl) ? 'Press play in the green Spotify player (bottom left). It tucks away once music is playing and stays reachable from any menu. Log in to Spotify in this browser for full tracks.' : 'Share → Copy link in Spotify, paste it here and press Load.'));
  }
  get open() { return this.root.classList.contains('on'); }
  btn(label, cls, fn) { return el('button', { class: 'btn ' + cls, onclick: () => { this.app.sound.init(); this.app.sound.click(); fn(); } }, label); }

  main() {
    const a = this.app, d = store.data;
    this.set(el('div', { class: 'scr main' }, el('div', { class: 'main-wrap' },
      el('div', { style: 'text-align:center' }, el('div', { class: 'logo' }, el('span', {}, 'TOON'), el('span', {}, 'PRIX')), el('div', {}, el('span', { class: 'tagline' }, 'Grand prix racing, but adorable'))),
      el('div', { class: 'col' },
        d.resume && this.btn('▶ Continue race', 'mint big', () => a.resume()),
        this.btn('🏁 Quick Race', d.resume ? '' : 'big', () => this.quick()),
        this.btn('🏆 Championship', 'red', () => this.slots()),
        this.btn('📺 Watch a Race', 'blue', () => { d.quick.mode = 'watch'; this.quick(); }),
        el('div', { class: 'row c nw' }, this.btn('⚙ Settings', 'white small', () => this.settings(() => this.main())),
          document.fullscreenEnabled && this.btn('⛶ Fullscreen', 'white small', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {})))),
      ))));
  }

  driverPicker(cur, on, withNone) {
    return el('div', { class: 'drivers' },
      withNone && el('button', { class: 'dchip' + (cur == null ? ' on' : ''), onclick: () => on(null) }, el('i', { style: 'background:#fff' }), el('span', {}, 'Just watch', el('small', {}, 'all cars are AI'))),
      DRIVERS.map((dr) => {
        const t = teamOf(dr);
        return el('button', { class: 'dchip' + (dr.id === cur ? ' on' : ''), onclick: () => on(dr.id) }, el('i', { style: `background:linear-gradient(135deg, ${t.c1} 55%, ${t.c2} 56%)` }), el('span', {}, dr.name, el('small', {}, t.name)));
      }));
  }
  trackPicker(cur, on) {
    return el('div', { class: 'tracks' }, TRACKS.map((t) => {
      const cv = el('canvas', { width: 180, height: 120 });
      drawTrack(cv, trackMath(t.id), { bg: t.themeDef.ground, road: t.themeDef.asphalt, edge: '#fff' });
      const rec = store.data.records[t.id];
      return el('button', { class: 'tcard' + (t.id === cur ? ' on' : ''), onclick: () => on(t.id) }, cv, t.name, el('small', {}, rec ? `⏱ ${fmtTime(rec.time)} ${rec.tag}` : t.blurb));
    }));
  }

  quick() {
    const a = this.app, q = store.data.quick;
    const re = () => { store.save(); this.quick(); };
    a.preview(q.track);
    this.set(el('div', { class: 'scr quick' },
      el('div', { class: 'row sb nw' }, el('h2', { class: 'title' }, q.mode === 'watch' ? 'Watch a Race' : 'Quick Race'),
        el('div', { class: 'row nw' }, this.btn('Back', 'white small', () => { a.preview(); this.main(); }), this.btn(q.mode === 'watch' ? '📺 Watch!' : '🏁 Race!', 'red', () => a.startQuick()))),
      el('div', { class: 'panel' }, el('div', { class: 'cols' },
        el('div', {},
          el('div', { class: 'label', style: 'margin-top:0' }, 'Circuit'), this.trackPicker(q.track, (v) => { q.track = v; re(); }),
          el('div', { class: 'label' }, 'Laps'), seg([[3, '3'], [5, '5'], [8, '8'], [12, '12']], q.laps, (v) => { q.laps = v; re(); }),
          el('div', { class: 'label' }, 'Rivals'), seg(Object.entries(DIFFICULTY).map(([k, v]) => [k, v.label]), q.difficulty, (v) => { q.difficulty = v; re(); })),
        el('div', {},
          el('div', { class: 'label', style: 'margin-top:0' }, 'Mode'), seg([['drive', '🎮 I drive'], ['watch', '📺 Fully automatic']], q.mode, (v) => { q.mode = v; re(); }),
          q.mode === 'drive' && [
            el('div', { class: 'label' }, 'Your driver'), this.driverPicker(q.driver, (v) => { q.driver = v; re(); }),
            el('div', { class: 'label' }, 'Start from'), seg([['front', 'Pole'], ['mid', 'Midfield'], ['back', 'Last']], q.grid, (v) => { q.grid = v; re(); }),
            el('div', { class: 'label' }, 'Driving aids'), seg(AIDS, store.data.settings.aids, (v) => { store.data.settings.aids = v; re(); }),
          ],
          q.mode === 'watch' && el('p', { class: 'note' }, 'Sit back: all 16 cars race themselves. Tap a driver in the timing tower to follow them and use 🎥 to switch between TV, helicopter, drone and the miniature whole-circuit view.')),
      ))));
  }

  slots() {
    const a = this.app, d = store.data;
    a.preview();
    this.set(el('div', { class: 'scr', style: 'width:min(40em,100%)' },
      el('div', { class: 'row sb nw' }, el('h2', { class: 'title' }, 'Championship'), this.btn('Back', 'white small', () => this.main())),
      el('div', { class: 'panel col' }, d.slots.map((c, i) => {
        if (!c) return el('div', { class: 'slot' }, el('div', {}, `Save slot ${i + 1}`, el('small', {}, 'Empty')), this.btn('New season', 'small', () => this.champNew(i)));
        const st = standings(c), me = c.driverId && st.findIndex((s) => s.d.id === c.driverId);
        const who = c.driverId ? driverById(c.driverId).name : 'Spectator season';
        const info = champDone(c) ? `Finished · Champion: ${st[0].d.name}` : `Round ${c.round + 1}/${TRACKS.length} · next: ${TRACKS[c.round].name}`;
        return el('div', { class: 'slot' }, el('div', {}, who, c.driverId && el('span', { class: 'badge', style: 'margin-left:.5em' }, `${ord(me + 1)} · ${st[me].pts} pts`), el('small', {}, `${info} · ${DIFFICULTY[c.difficulty].label} · saved ${new Date(c.updated).toLocaleDateString()}`)),
          el('div', { class: 'row nw' }, this.btn('Open', 'mint small', () => this.hub(i)), this.btn('🗑', 'white small', () => { if (confirm('Delete this championship save?')) { d.slots[i] = null; store.save(); this.slots(); } })));
      }), el('p', { class: 'note' }, 'Championships are saved automatically after every race. A race in progress is saved when you pick “Save & quit” or leave the page.'))));
  }
  champNew(slot) {
    const st = (this._new ||= { driver: 'pip', difficulty: 'normal', laps: 5 });
    const re = () => this.champNew(slot);
    this.set(el('div', { class: 'scr', style: 'width:min(46em,100%)' },
      el('div', { class: 'row sb nw' }, el('h2', { class: 'title' }, 'New Season'),
        el('div', { class: 'row nw' }, this.btn('Back', 'white small', () => this.slots()), this.btn('Start season', 'red', () => { store.data.slots[slot] = newChampionship(st.driver, st.difficulty, st.laps); store.save(); this.hub(slot); }))),
      el('div', { class: 'panel' },
        el('div', { class: 'label', style: 'margin-top:0' }, 'Your driver'), this.driverPicker(st.driver, (v) => { st.driver = v; re(); }, true),
        el('div', { class: 'row' }, el('div', {}, el('div', { class: 'label' }, 'Rivals'), seg(Object.entries(DIFFICULTY).map(([k, v]) => [k, v.label]), st.difficulty, (v) => { st.difficulty = v; re(); })),
          el('div', {}, el('div', { class: 'label' }, 'Laps per race'), seg([[3, '3'], [5, '5'], [8, '8'], [12, '12']], st.laps, (v) => { st.laps = v; re(); }))),
        el('p', { class: 'note' }, `${TRACKS.length} rounds · points ${POINTS.join('-')} · +1 for fastest lap · grid is reverse championship order from round 2.`))));
  }
  standingsTable(c, gained) {
    const st = standings(c);
    return el('table', { class: 'res' }, el('tr', {}, el('th', {}, ''), el('th', {}, 'Driver'), el('th', {}, 'Team'), el('th', {}, 'Wins'), el('th', {}, 'Pts')),
      st.map((s, i) => el('tr', { class: s.d.id === c.driverId ? 'me' : '' }, el('td', {}, i + 1), el('td', {}, chip(teamOf(s.d).c1), s.d.name), el('td', {}, teamOf(s.d).name), el('td', { class: 'n' }, s.wins || ''),
        el('td', { class: 'n' }, s.pts, gained && gained[s.d.id] ? el('small', { style: 'opacity:.6' }, ` +${gained[s.d.id]}`) : ''))));
  }
  teamTable(c) {
    const rows = TEAMS.map((t) => ({ t, pts: DRIVERS.filter((d) => d.team === t.id).reduce((s, d) => s + (c.points[d.id] || 0), 0) })).sort((a, b) => b.pts - a.pts);
    return el('table', { class: 'res' }, el('tr', {}, el('th', {}, ''), el('th', {}, 'Team'), el('th', {}, 'Pts')), rows.map((r, i) => el('tr', {}, el('td', {}, i + 1), el('td', {}, chip(r.t.c1), r.t.name), el('td', { class: 'n' }, r.pts))));
  }
  hub(slot) {
    const a = this.app, c = store.data.slots[slot], done = champDone(c), st = standings(c);
    const next = !done && TRACKS[c.round];
    a.preview(next ? next.id : TRACKS[TRACKS.length - 1].id);
    const cal = el('table', { class: 'res' }, TRACKS.map((t, i) => {
      const h = c.history[i];
      return el('tr', { class: i === c.round ? 'me' : '' }, el('td', {}, `R${i + 1}`), el('td', {}, t.name), el('td', {}, h ? `🥇 ${driverById(h.order[0]).name}` : i === c.round ? 'Next!' : ''));
    }));
    let head;
    if (done) {
      const champ = st[0].d, t = teamOf(champ);
      head = el('div', { style: 'text-align:center' }, el('div', { class: 'label', style: 'margin-top:0' }, 'World champion'), el('h2', { style: 'font-size:1.8rem;margin:.2em 0' }, '🏆 ', champ.name),
        el('div', { class: 'note' }, chip(t.c1), t.name, c.driverId ? ` · you finished ${ord(st.findIndex((s) => s.d.id === c.driverId) + 1)}` : ''));
      if (!this._celebrated) { this._celebrated = true; a.confetti(); a.sound.fanfare(); }
    } else {
      const cv = el('canvas', { width: 240, height: 150, style: 'width:11em;border-radius:.8em;border:.2em solid var(--ink)' });
      drawTrack(cv, trackMath(next.id), { bg: next.themeDef.ground, road: next.themeDef.asphalt, edge: '#fff' });
      head = el('div', { class: 'row nw' }, cv, el('div', {}, el('div', { class: 'label', style: 'margin-top:0' }, `Round ${c.round + 1} of ${TRACKS.length} · ${next.country}`), el('h2', { style: 'font-size:1.5rem' }, next.name), el('div', { class: 'note' }, `${c.laps} laps · ${next.blurb}`)));
    }
    this.set(el('div', { class: 'scr', style: 'width:min(64em,100%)' },
      el('div', { class: 'row sb nw' }, el('h2', { class: 'title' }, 'Season'),
        el('div', { class: 'row nw' }, this.btn('Back', 'white small', () => { this._celebrated = false; this.slots(); }),
          done ? this.btn('New season', 'red', () => { this._celebrated = false; this.champNew(slot); }) : this.btn(c.driverId ? '🏁 Race!' : '📺 Watch!', 'red', () => a.startChamp(slot)))),
      el('div', { class: 'panel' }, el('div', { class: 'two' },
        el('div', {}, head, el('div', { class: 'label' }, 'Calendar'), cal, el('div', { class: 'label' }, 'Teams'), this.teamTable(c)),
        el('div', {}, el('div', { class: 'label', style: 'margin-top:0' }, 'Drivers'), this.standingsTable(c))))));
  }

  results(race, ses, gained) {
    const a = this.app, res = race.results, champ = ses.kind === 'champ' ? store.data.slots[ses.slot] : null;
    const top = res.slice(0, 3).map((r) => driverById(r.driverId));
    const pod = el('div', { class: 'podium' }, [1, 0, 2].map((k) => top[k] && el('div', { style: `background:${teamOf(top[k]).c1};height:${[4.6, 3.6, 3][k]}em` }, el('b', {}, ['🥇', '🥈', '🥉'][k]), top[k].name)));
    const table = el('table', { class: 'res' }, el('tr', {}, el('th', {}, ''), el('th', {}, 'Driver'), el('th', {}, 'Time'), el('th', {}, 'Best lap'), champ && el('th', {}, 'Pts')),
      res.map((r) => {
        const d = driverById(r.driverId);
        const t = r.pos === 1 ? fmtTime(r.time) : r.gap != null ? `+${r.gap.toFixed(2)}` : r.lapsDown > 0 ? `+${r.lapsDown} lap${r.lapsDown > 1 ? 's' : ''}` : 'running';
        return el('tr', { class: r.isPlayer ? 'me' : '' }, el('td', {}, r.pos), el('td', {}, chip(teamOf(d).c1), d.name), el('td', { class: 'n' }, t), el('td', { class: 'n' }, r.best ? fmtTime(r.best) : '', r.fastest ? ' ⏱' : ''), champ && el('td', { class: 'n' }, gained[r.driverId] ? `+${gained[r.driverId]}` : ''));
      }));
    const me = res.find((r) => r.isPlayer);
    this.set(el('div', { class: 'scr', style: 'width:min(60em,100%)' },
      el('div', { class: 'row sb nw' }, el('h2', { class: 'title' }, me ? `You finished ${ord(me.pos)}!` : `${top[0].name} wins!`),
        el('div', { class: 'row nw' }, !champ && this.btn('Again', 'white small', () => a.restart()), this.btn(champ ? 'Standings' : 'Menu', 'red', () => (champ ? this.hub(ses.slot) : (a.preview(), this.main()))))),
      el('div', { class: 'panel' }, champ ? el('div', { class: 'two' }, el('div', {}, pod, table), el('div', {}, el('div', { class: 'label', style: 'margin-top:0' }, 'Championship'), this.standingsTable(champ, gained))) : el('div', {}, pod, table))));
  }

  pause() {
    const a = this.app, s = store.data.settings, ses = a.session;
    const re = () => { store.save(); a.applySettings(); this.pause(); };
    this.set(el('div', { class: 'scr', style: 'width:min(30em,100%)' }, el('h2', { class: 'title' }, 'Paused'),
      el('div', { class: 'panel col' },
        this.btn('▶ Resume', 'mint big', () => a.setPaused(false)),
        el('div', {}, el('div', { class: 'label', style: 'margin-top:0' }, 'Camera'), seg(CAM_MODES.map((m) => [m.id, `${m.icon} ${m.name}`]), a.rig.mode, (v) => { a.setCam(v); this.pause(); })),
        a.race.player && el('div', {}, el('div', { class: 'label', style: 'margin-top:0' }, 'Driving aids'), seg(AIDS, s.aids, (v) => { s.aids = v; re(); })),
        el('div', {}, el('div', { class: 'label', style: 'margin-top:0' }, 'Music'), this.musicPicker(re)),
        el('div', { class: 'row' }, this.btn(s.sound ? '🔊 Sound on' : '🔇 Sound off', 'white small', () => { s.sound = !s.sound; re(); }), this.btn('↺ Restart', 'white small', () => a.restart())),
        el('div', { class: 'row' }, this.btn('💾 Save & quit', 'blue small', () => a.quit(true)), this.btn('Quit', 'red small', () => a.quit(false))),
        el('p', { class: 'note' }, ses.kind === 'champ' ? 'Quitting without saving keeps your championship at the start of this round.' : 'Keys: arrows/WASD drive · Space boost · C camera · T autopilot · R reset · P pause'))), true);
  }

  settings(back) {
    const a = this.app, s = store.data.settings;
    const re = () => { store.save(); a.applySettings(); this.settings(back); };
    this.set(el('div', { class: 'scr', style: 'width:min(34em,100%)' },
      el('div', { class: 'row sb nw' }, el('h2', { class: 'title' }, 'Settings'), this.btn('Done', 'red small', back)),
      el('div', { class: 'panel' },
        el('div', { class: 'label', style: 'margin-top:0' }, 'Sound effects'), seg([[true, '🔊 On'], [false, '🔇 Off']], s.sound, (v) => { s.sound = v; re(); }),
        el('div', { class: 'label' }, 'Music'), this.musicPicker(re),
        el('div', { class: 'label' }, 'Driving aids'), seg(AIDS, s.aids, (v) => { s.aids = v; re(); }),
        el('div', { class: 'label' }, 'Default driving camera'), seg(CAM_MODES.slice(0, 5).map((m) => [m.id, `${m.icon} ${m.name}`]), s.cam, (v) => { s.cam = v; re(); }),
        el('div', { class: 'label' }, 'Graphics'), seg([['auto', 'Auto'], ['high', 'Sharp'], ['low', 'Fast']], s.quality, (v) => { s.quality = v; re(); }),
        el('div', { class: 'label' }, 'Controls'),
        el('p', { class: 'note', style: 'margin:0' }, 'Touch: ◀ ▶ steer, BRAKE, ⚡ boost (GAS appears in Manual). Keyboard: arrows/WASD, Space boost, C camera, T autopilot, R reset, P pause. In the Mini Circuit view drag to rotate and pinch/scroll to zoom.'),
        el('div', { class: 'label' }, 'Saved data'), this.btn('Erase everything', 'white small', () => { if (confirm('Erase all championships, records and settings?')) { store.wipe(); re(); } }))));
  }
}

export class Hud {
  constructor(app) {
    this.app = app; this.root = $('#hud'); this.tower = $('#tower'); this.rows = new Map(); this.t = 0; this.mm = $('#minimap');
    this.bg = document.createElement('canvas'); this.bg.width = this.bg.height = 220;
  }
  show(v) { this.root.classList.toggle('hidden', !v); }
  setup(race) {
    this.tower.replaceChildren(); this.rows.clear();
    for (const c of race.cars) {
      const gap = el('em', {}, '');
      const r = el('div', { class: 'r' + (c.isPlayer ? ' me' : ''), onclick: () => this.app.pickFocus(c) }, el('b', {}, ''), el('i', { style: `background:${c.team.c1}` }), el('span', {}, c.driver.tag), gap);
      this.rows.set(c, { r, pos: r.firstChild, gap });
      this.tower.append(r);
    }
    this.tower.style.height = race.cars.length * 1.62 + 'em';
    this.map = drawTrack(this.bg, race.T, { pad: 0.14, lw: 7, edge: '#1b1b2f', road: '#fff' });
    $('#lights').className = '';
    this.update(race, race.cars[0], 1);
  }
  lights(n) { const L = $('#lights'); L.className = 'on'; [...L.children].forEach((i, k) => i.classList.toggle('lit', k < n)); }
  go() { const L = $('#lights'); L.className = 'on go'; setTimeout(() => { L.className = ''; }, 1200); }
  update(race, focus, dt) {
    // minimap every frame, the rest a few times per second
    const g = this.mm.getContext('2d');
    g.clearRect(0, 0, 220, 220); g.drawImage(this.bg, 0, 0);
    for (const c of race.cars) {
      if (c === focus) continue;
      g.fillStyle = c.team.c1; g.beginPath(); g.arc(this.map.X(c.x), this.map.Y(c.z), 5, 0, 7); g.fill();
    }
    g.fillStyle = focus.team.c1; g.strokeStyle = '#fff'; g.lineWidth = 3.5;
    g.beginPath(); g.arc(this.map.X(focus.x), this.map.Y(focus.z), 8, 0, 7); g.fill(); g.stroke();
    $('#speed').textContent = Math.round(Math.abs(focus.v) * 4);
    $('#boostfill').style.width = focus.boost * 100 + '%';
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 0.2;
    race.order.forEach((c, i) => {
      const row = this.rows.get(c);
      row.r.style.transform = `translateY(${i * 1.62}em)`;
      row.pos.textContent = i + 1;
      row.gap.textContent = c.finished ? '🏁' : i === 0 ? 'LEAD' : race.state === 'racing' && race.time > 2 ? '+' + race.gapAhead(i).toFixed(1) : '';
      row.r.classList.toggle('focus', c === focus && !c.isPlayer);
    });
    const lead = race.player || race.order[0];
    $('#lap').textContent = lead.finished ? 'FINISH' : `LAP ${race.lapOf(lead)}/${race.laps}`;
    $('#clock').textContent = fmtTime(race.time);
    $('#posbig').textContent = 'P' + focus.pos;
    const fn = $('#focusname');
    fn.classList.toggle('hidden', focus.isPlayer && !focus.auto);
    fn.textContent = (focus.isPlayer ? '🤖 Autopilot · ' : '🎥 ') + focus.driver.name + ' · ' + focus.team.name;
  }
}

let bannerT, toastT;
export function banner(text) {
  const b = $('#banner');
  b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 1700);
}
export function toast(text, ms = 1800) {
  const t = $('#toast');
  t.textContent = text; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}
export function confetti() {
  const box = $('#confetti'), cols = ['#ee3344', '#2f6fed', '#ffd93b', '#35d6a4', '#ff6fae', '#8b4de0', '#fff'];
  for (let i = 0; i < 70; i++) {
    const p = el('i', { style: `left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-duration:${2 + Math.random() * 2.5}s;animation-delay:${Math.random() * 1.2}s` });
    box.append(p);
    setTimeout(() => p.remove(), 6000);
  }
}
export { ord };
