// Validates circuit layouts and renders an SVG contact sheet.
import { writeFileSync } from 'node:fs';
import { TRACKS } from '../js/data.js';
import { buildTrackMath, WALL, HALF_WIDTH, PERF } from '../js/trackmath.js';
let svg = '', col = 0, row = 0, ok = true;
for (const def of TRACKS) {
  const T = buildTrackMath(def);
  let minSep = 1e9, at = 0;
  for (let i = 0; i < T.n; i += 2) for (let j = i + 2; j < T.n; j += 2) {
    const arc = Math.min(j - i, T.n - (j - i)) * T.ds;
    if (arc < 110) continue;
    const d = Math.hypot(T.px[i] - T.px[j], T.pz[i] - T.pz[j]);
    if (d < minSep) { minSep = d; at = i; }
  }
  let maxK = 0, lap = 0, vmin = 1e9;
  for (let i = 0; i < T.n; i++) { maxK = Math.max(maxK, Math.abs(T.k[i])); lap += T.ds / Math.min(T.vp[i], PERF.vmax); vmin = Math.min(vmin, T.vp[i]); }
  const good = minSep > 2 * WALL + 6 && 1 / maxK > HALF_WIDTH + 5;
  ok &&= good;
  console.log(`${good ? 'OK ' : 'BAD'} ${def.id.padEnd(8)} len=${T.length.toFixed(0)} minSep=${minSep.toFixed(1)} @${at} minR=${(1 / maxK).toFixed(1)} vmin=${vmin.toFixed(0)} lap~${lap.toFixed(1)}s`);
  const ox = col * 560 + 280, oz = row * 400 + 200;
  const path = (a, b, o = 0) => 'M' + Array.from({ length: T.n }, (_, i) => `${(ox + a[i] + T.nx[i] * o).toFixed(1)},${(oz + b[i] + T.nz[i] * o).toFixed(1)}`).join('L') + 'Z';
  svg += `<path d="${path(T.px, T.pz)}" fill="none" stroke="#ccc" stroke-width="${WALL * 2}" stroke-linejoin="round"/>`;
  svg += `<path d="${path(T.px, T.pz)}" fill="none" stroke="#556" stroke-width="${HALF_WIDTH * 2}" stroke-linejoin="round"/>`;
  svg += `<path d="${path(T.rx, T.rz)}" fill="none" stroke="#fd3" stroke-width="1"/>`;
  svg += `<circle cx="${ox + T.px[0]}" cy="${oz + T.pz[0]}" r="5" fill="red"/><text x="${ox - 260}" y="${oz - 175}" font-size="18">${def.name} (${T.length.toFixed(0)})</text>`;
  if (++col === 3) { col = 0; row++; }
}
writeFileSync(new URL('./tracks.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" width="1680" height="800" style="background:#8c6">${svg}</svg>`);
process.exit(ok ? 0 : 1);
