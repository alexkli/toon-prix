// Synthesised sound: engines, effects and procedural background music (no audio assets).

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// ---- music data: each song is 8 bars of 16 steps. chords: [root midi, minor?]; lead: midi notes (0 = rest) ----
const SONGS = [
  {
    name: 'Sunday Drive', bpm: [108, 136], swing: 0.12, lead: 'square', stab: [2, 6, 10, 14],
    bass: [0, -1, 12, -1, 0, -1, 12, 7, 0, -1, 12, -1, 7, -1, 12, 7],
    chords: [[48, 0], [43, 0], [45, 1], [41, 0], [48, 0], [43, 0], [41, 0], [43, 0]],
    notes: [
      [76, 0, 79, 0, 76, 0, 72, 0, 74, 76, 0, 0, 79, 0, 0, 0],
      [74, 0, 79, 0, 74, 0, 71, 0, 72, 74, 0, 0, 67, 0, 0, 0],
      [72, 0, 76, 0, 72, 0, 69, 0, 71, 72, 0, 76, 0, 0, 81, 0],
      [77, 0, 0, 76, 0, 0, 72, 0, 74, 0, 72, 0, 69, 0, 0, 0],
      [76, 0, 79, 0, 84, 0, 79, 0, 76, 79, 0, 0, 84, 0, 83, 0],
      [79, 0, 0, 74, 0, 0, 79, 0, 83, 0, 81, 0, 79, 0, 74, 0],
      [77, 0, 81, 0, 84, 0, 81, 0, 77, 0, 76, 0, 72, 0, 74, 0],
      [74, 0, 0, 79, 0, 0, 83, 0, 86, 0, 0, 0, 79, 0, 83, 0],
    ],
  },
  {
    name: 'Pit Lane Ska', bpm: [116, 148], swing: 0, lead: 'triangle', stab: [2, 6, 10, 14],
    bass: [0, -1, -1, 0, 7, -1, -1, 7, 0, -1, -1, 0, 7, -1, 12, -1],
    chords: [[43, 0], [40, 1], [48, 0], [50, 0], [43, 0], [40, 1], [48, 0], [50, 0]],
    notes: [
      [79, 0, 0, 76, 0, 74, 0, 0, 71, 0, 74, 0, 76, 0, 0, 0],
      [76, 0, 0, 74, 0, 71, 0, 0, 67, 0, 71, 0, 74, 0, 0, 0],
      [72, 0, 76, 0, 79, 0, 76, 0, 72, 0, 0, 0, 76, 0, 79, 0],
      [78, 0, 0, 74, 0, 0, 78, 0, 81, 0, 0, 0, 78, 0, 74, 0],
      [79, 0, 83, 0, 79, 0, 76, 0, 74, 0, 76, 0, 79, 0, 0, 0],
      [76, 0, 79, 0, 76, 0, 71, 0, 67, 0, 0, 71, 0, 0, 76, 0],
      [72, 0, 0, 76, 0, 0, 79, 0, 84, 0, 83, 0, 79, 0, 76, 0],
      [74, 0, 78, 0, 81, 0, 0, 78, 0, 0, 74, 0, 78, 0, 81, 0],
    ],
  },
  {
    name: 'Night Chase', bpm: [104, 140], swing: 0, lead: 'sawtooth', stab: [0, 3, 6, 10, 12],
    bass: [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0, 0, 12, 7, 12],
    chords: [[45, 1], [41, 0], [48, 0], [43, 0], [45, 1], [41, 0], [48, 0], [43, 0]],
    notes: [
      [81, 0, 0, 0, 76, 0, 81, 0, 84, 0, 83, 0, 81, 0, 0, 0],
      [81, 0, 0, 0, 77, 0, 81, 0, 84, 0, 0, 81, 0, 0, 77, 0],
      [79, 0, 0, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 0, 0],
      [79, 0, 0, 74, 0, 0, 79, 0, 83, 0, 0, 0, 86, 0, 83, 0],
      [88, 0, 0, 84, 0, 0, 81, 0, 88, 0, 0, 84, 0, 0, 81, 0],
      [89, 0, 0, 84, 0, 0, 81, 0, 89, 0, 88, 0, 84, 0, 81, 0],
      [88, 0, 0, 84, 0, 0, 79, 0, 84, 0, 83, 0, 84, 0, 88, 0],
      [86, 0, 0, 83, 0, 0, 79, 0, 83, 0, 0, 0, 86, 0, 0, 0],
    ],
  },
  {
    name: 'Bubblegum Funk', bpm: [100, 128], swing: 0.2, lead: 'square', stab: [4, 7, 12, 15],
    bass: [0, -1, -1, 0, -1, 12, -1, 0, -1, 0, 10, -1, 12, -1, 7, -1],
    chords: [[41, 0], [38, 1], [46, 0], [48, 0], [41, 0], [38, 1], [46, 0], [48, 0]],
    notes: [
      [77, 0, 81, 77, 0, 0, 84, 0, 81, 0, 0, 77, 0, 0, 0, 0],
      [74, 0, 77, 74, 0, 0, 81, 0, 77, 0, 0, 74, 0, 0, 0, 0],
      [77, 0, 82, 77, 0, 0, 86, 0, 82, 0, 0, 77, 0, 0, 0, 0],
      [76, 0, 79, 76, 0, 0, 84, 0, 79, 0, 0, 0, 76, 0, 79, 0],
      [81, 0, 84, 81, 0, 0, 89, 0, 84, 0, 0, 81, 0, 0, 0, 0],
      [77, 0, 81, 77, 0, 0, 86, 0, 81, 0, 0, 77, 0, 74, 0, 0],
      [82, 0, 0, 81, 0, 0, 77, 0, 74, 0, 77, 0, 82, 0, 86, 0],
      [84, 0, 0, 0, 79, 0, 0, 0, 76, 0, 79, 0, 84, 0, 0, 0],
    ],
  },
  {
    name: 'Victory Lap', bpm: [112, 144], swing: 0.08, lead: 'triangle', stab: [2, 5, 10, 13],
    bass: [0, -1, 7, -1, 12, -1, 7, -1, 0, -1, 7, -1, 12, -1, 7, 4],
    chords: [[50, 0], [47, 1], [43, 0], [45, 0], [50, 0], [47, 1], [43, 0], [45, 0]],
    notes: [
      [74, 0, 78, 0, 81, 0, 0, 78, 0, 0, 81, 0, 86, 0, 0, 0],
      [74, 0, 78, 0, 83, 0, 0, 78, 0, 0, 83, 0, 86, 0, 0, 0],
      [79, 0, 0, 83, 0, 0, 86, 0, 83, 0, 79, 0, 78, 0, 74, 0],
      [76, 0, 0, 81, 0, 0, 85, 0, 88, 0, 0, 0, 85, 0, 81, 0],
      [86, 0, 0, 85, 86, 0, 81, 0, 78, 0, 81, 0, 86, 0, 0, 0],
      [86, 0, 0, 85, 86, 0, 83, 0, 78, 0, 83, 0, 90, 0, 0, 0],
      [91, 0, 90, 0, 86, 0, 83, 0, 79, 0, 83, 0, 86, 0, 90, 0],
      [88, 0, 0, 85, 0, 0, 81, 0, 85, 0, 88, 0, 93, 0, 0, 0],
    ],
  },
];
const LOOPS_PER_SONG = 3;

export class Sound {
  constructor() { this.sfxVol = 0.8; this.musicVol = 0.6; this.ctx = null; this.on = true; this.musicOn = true; this.musicMode = 'menu'; this.transpose = 0; this.step = 0; this.nextT = 0;
    // random playlist order, cycled through as the game goes on
    this.order = SONGS.map((_, i) => i).sort(() => Math.random() - 0.5); this.songI = 0; this.loops = 0;
  }
  get song() { return SONGS[this.order[this.songI]]; }

  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = (this.ctx = new AC());
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = 0.005; comp.release.value = 0.2;
    this.master = c.createGain(); this.master.gain.value = this.on ? this.sfxVol * 1.25 : 0;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 1; this.sfx.connect(this.master);
    this.music = c.createGain(); this.music.gain.value = this.musicOn ? this.musicVol * 1.1 : 0; this.music.connect(c.destination);
    // noise source shared by tyres, wind, drums
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    const loopNoise = () => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
    // tyre squeal: narrow band noise
    this.sqF = c.createBiquadFilter(); this.sqF.type = 'bandpass'; this.sqF.frequency.value = 1900; this.sqF.Q.value = 7;
    this.sqG = c.createGain(); this.sqG.gain.value = 0;
    loopNoise().connect(this.sqF); this.sqF.connect(this.sqG); this.sqG.connect(this.sfx);
    // wind rush at speed
    this.wF = c.createBiquadFilter(); this.wF.type = 'bandpass'; this.wF.frequency.value = 700; this.wF.Q.value = 0.6;
    this.wG = c.createGain(); this.wG.gain.value = 0;
    loopNoise().connect(this.wF); this.wF.connect(this.wG); this.wG.connect(this.sfx);
    // soft-clip curve gives the engine a warm growl instead of a raw buzz
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 511.5 - 1) * 2.2; curve[i] = Math.tanh(x); }
    this.curve = curve;
    this.eng = this.makeEngine(1);
    this.eng2 = this.makeEngine(0.8);
    setInterval(() => this.schedule(), 90);
  }

  // One engine voice: two detuned saws + sub + bright harmonic -> soft clip -> resonant low-pass
  makeEngine(bright) {
    const c = this.ctx, v = { rpm: 0.2, gear: 0, shift: 0 };
    const mk = (type, gain) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; g.gain.value = gain; o.connect(g); o.start(); return [o, g]; };
    v.osc = [mk('sawtooth', 0.34), mk('sawtooth', 0.3), mk('triangle', 0.5), mk('square', 0.1)];
    v.mult = [1, 1.012, 0.5, 2];
    v.shape = c.createWaveShaper(); v.shape.curve = this.curve; v.shape.oversample = '2x';
    v.lp = c.createBiquadFilter(); v.lp.type = 'lowpass'; v.lp.Q.value = 2.5; v.lp.frequency.value = 800;
    v.hp = c.createBiquadFilter(); v.hp.type = 'highpass'; v.hp.frequency.value = 70;
    v.out = c.createGain(); v.out.gain.value = 0;
    // idle/low-rev burble: gentle amplitude wobble
    v.lfo = c.createOscillator(); v.lfo.frequency.value = 23; v.lfoG = c.createGain(); v.lfoG.gain.value = 0;
    v.am = c.createGain(); v.am.gain.value = 1;
    v.lfo.connect(v.lfoG); v.lfoG.connect(v.am.gain); v.lfo.start();
    for (const [, g] of v.osc) g.connect(v.shape);
    v.shape.connect(v.lp); v.lp.connect(v.hp); v.hp.connect(v.am); v.am.connect(v.out); v.out.connect(this.sfx);
    v.bright = bright;
    return v;
  }
  // speed -> gear + revs with a little dip on each shift
  drive(v, speed, vmax, throttle, vol, pitch, dt) {
    const t = this.ctx.currentTime, x = Math.min(0.999, Math.max(0, Math.abs(speed) / (vmax * 1.12)));
    const GEARS = 6, pos = Math.pow(x, 0.8) * GEARS, gear = Math.min(GEARS - 1, Math.floor(pos));
    if (gear !== v.gear) { v.shift = gear > v.gear ? 0.16 : 0.1; v.gear = gear; }
    v.shift = Math.max(0, v.shift - dt);
    let rev = 0.3 + 0.7 * (pos - gear);            // 0.3..1 within a gear
    if (gear === 0) rev = 0.12 + 0.88 * pos;         // pull away from idle
    rev -= v.shift * 1.2;                            // lift during the shift
    v.rpm += (rev - v.rpm) * Math.min(1, dt * 14);
    const f = (88 + v.rpm * 250 + gear * 9) * pitch;
    v.osc.forEach(([o], i) => o.frequency.setTargetAtTime(f * v.mult[i], t, 0.03));
    v.lp.frequency.setTargetAtTime((500 + v.rpm * 2300 * (0.45 + 0.55 * throttle)) * v.bright, t, 0.05);
    v.lfoG.gain.setTargetAtTime(0.22 * Math.max(0, 1 - v.rpm * 1.6), t, 0.1);
    v.lfo.frequency.setTargetAtTime(14 + v.rpm * 30, t, 0.1);
    v.out.gain.setTargetAtTime(vol * (0.5 + 0.5 * throttle) * (v.shift > 0 ? 0.55 : 1), t, 0.04);
  }
  // me/other: {v, throttle, dist, vr}; other = nearest rival (or null)
  update(me, other, vmax, skid, active, dt) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (!active) {
      for (const v of [this.eng, this.eng2]) v.out.gain.setTargetAtTime(0, t, 0.08);
      this.sqG.gain.setTargetAtTime(0, t, 0.05); this.wG.gain.setTargetAtTime(0, t, 0.1);
      return;
    }
    const near = Math.max(0.12, Math.min(1, 1 - (me.dist - 12) / 260));
    this.drive(this.eng, me.v, vmax, me.throttle, 0.055 * near, 1, dt);
    if (other) this.drive(this.eng2, other.v, vmax, 0.9, 0.045 * Math.pow(Math.max(0, 1 - other.dist / 55), 1.6), Math.max(0.82, Math.min(1.22, 1 - other.vr / 160)) * 1.06, dt);
    else this.eng2.out.gain.setTargetAtTime(0, t, 0.1);
    const sp = Math.min(1, Math.abs(me.v) / vmax);
    this.sqG.gain.setTargetAtTime(skid * 0.035 * near, t, 0.05);
    this.sqF.frequency.setTargetAtTime(1500 + sp * 900, t, 0.1);
    this.wG.gain.setTargetAtTime(sp * sp * 0.05 * near, t, 0.15);
    this.wF.frequency.setTargetAtTime(400 + sp * 900, t, 0.15);
  }

  setOn(b) { this.on = b; if (this.master) this.master.gain.value = b ? this.sfxVol * 1.25 : 0; }
  // 0..1 sliders for effects and built-in music
  setVolumes(sfx, music) {
    this.sfxVol = sfx; this.musicVol = music;
    this.setOn(this.on);
    if (this.music) this.music.gain.value = this.musicOn ? music * 1.1 : 0;
  }
  setMusic(on, mode, transpose) {
    this.musicOn = on;
    if (mode && mode !== this.musicMode) { this.musicMode = mode; this.step = 0; this.loops = 0; this.songI = (this.songI + 1) % SONGS.length; }
    if (transpose != null) this.transpose = transpose;
    if (this.music) this.music.gain.setTargetAtTime(on ? this.musicVol * 1.1 : 0, this.ctx.currentTime, 0.15);
  }

  // ---- one-shots ----
  tone(freq, when, dur, type, vol, bus, glideTo) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, when);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, when + dur);
    g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(vol, when + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(bus || this.sfx); o.start(when); o.stop(when + dur + 0.03);
    return g;
  }
  noise(when, dur, type, freq, vol, bus) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    s.connect(f); f.connect(g); g.connect(bus || this.sfx); s.start(when, Math.random()); s.stop(when + dur + 0.03);
  }
  beep(freq, dur = 0.15, type = 'square', vol = 0.12, when = 0) { if (this.ctx) this.tone(freq, this.ctx.currentTime + when, dur, type, vol); }
  thud(vol = 0.3) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.2, 'lowpass', 700, vol);
    this.tone(150, t, 0.16, 'sine', vol * 0.9, null, 55);
  }
  fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.beep(f, 0.24, 'triangle', 0.14, i * 0.13)); }
  click() { this.beep(660, 0.05, 'triangle', 0.06); }

  // ---- background music sequencer ----
  schedule() {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    if (!this.musicOn) { this.nextT = 0; return; }
    const race = this.musicMode === 'race';
    if (this.nextT < c.currentTime) this.nextT = c.currentTime + 0.06;
    while (this.nextT < c.currentTime + 0.3) {
      const song = this.song, dur = 60 / song.bpm[race ? 1 : 0] / 4;
      this.playStep(song, this.step, this.nextT, dur, race);
      this.step = (this.step + 1) % 128;
      this.nextT += dur * (this.step % 2 ? 1 + song.swing : 1 - song.swing);
      if (this.step === 0 && ++this.loops >= LOOPS_PER_SONG) { this.loops = 0; this.songI = (this.songI + 1) % SONGS.length; }
    }
  }
  playStep(song, step, t, dur, race) {
    const bar = Math.floor(step / 16) % 8, s = step % 16, m = this.music, tr = this.transpose;
    const [root, minor] = song.chords[bar];
    // bass
    const b = song.bass[s];
    if (b >= 0) {
      this.tone(midi(root - 12 + b + tr), t, dur * 1.7, 'triangle', 0.3, m);
      this.tone(midi(root + b + tr), t, dur * 1.2, 'sawtooth', 0.035, m);
    }
    // chord stabs
    if (song.stab.includes(s)) for (const iv of [0, minor ? 3 : 4, 7]) this.tone(midi(root + 12 + iv + tr), t, dur * 1.6, 'triangle', 0.075, m);
    // lead melody (a second voice an octave down in the race for weight)
    const n = song.notes[bar][s];
    if (n) {
      this.tone(midi(n + tr), t, dur * 2.6, song.lead, song.lead === 'triangle' ? 0.12 : 0.045, m);
      this.tone(midi(n + tr) * 1.004, t, dur * 2.6, 'triangle', 0.09, m);
      if (race) this.tone(midi(n - 12 + tr), t, dur * 1.5, 'sawtooth', 0.02, m);
    }
    // drums
    const kick = race ? s % 4 === 0 || s === 14 : s === 0 || s === 8 || s === 10;
    if (kick) this.tone(140, t, 0.16, 'sine', 0.4, m, 42);
    if (s === 4 || s === 12) { this.noise(t, 0.12, 'bandpass', 1900, 0.16, m); this.tone(210, t, 0.07, 'triangle', 0.1, m, 120); }
    if (s % 2 === 0 || (race && s % 4 === 3)) this.noise(t, 0.035, 'highpass', 7500, s % 4 === 2 ? 0.07 : 0.04, m);
    if (bar === 7 && s >= 12) this.noise(t, 0.08, 'bandpass', 1400 + s * 150, 0.1, m); // fill
  }
}
