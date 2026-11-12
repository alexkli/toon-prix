// Game data: teams, drivers, circuits. All names and layouts are original.

export const TEAMS = [
  { id: 'radish', name: 'Rocket Radish', c1: '#ee3344', c2: '#ffffff' },
  { id: 'banana', name: 'Blue Banana', c1: '#2f6fed', c2: '#ffd93b' },
  { id: 'minty', name: 'Minty Fresh', c1: '#35d6a4', c2: '#17404a' },
  { id: 'tiger', name: 'Tangerine Tigers', c1: '#ff8a1f', c2: '#2b2b3a' },
  { id: 'grape', name: 'Grape Soda', c1: '#8b4de0', c2: '#ffb3e6' },
  { id: 'sardine', name: 'Silver Sardines', c1: '#cfd8e3', c2: '#16b6c9' },
  { id: 'bears', name: 'Bubblegum Bears', c1: '#ff6fae', c2: '#fff3a8' },
  { id: 'owls', name: 'Midnight Owls', c1: '#2a3670', c2: '#f5c542' },
];

// skill: 0..1 (1 = fastest). helmet = helmet colour.
export const DRIVERS = [
  { id: 'pip', name: 'Pip Turbo', tag: 'PIP', team: 'radish', skill: 1.0, helmet: '#ffd93b' },
  { id: 'lola', name: 'Lola Vroom', tag: 'LOL', team: 'radish', skill: 0.72, helmet: '#35d6a4' },
  { id: 'benny', name: 'Benny Split', tag: 'BEN', team: 'banana', skill: 0.9, helmet: '#ffffff' },
  { id: 'nana', name: 'Nana Peel', tag: 'NAN', team: 'banana', skill: 0.6, helmet: '#ff6fae' },
  { id: 'milo', name: 'Milo Breeze', tag: 'MIL', team: 'minty', skill: 0.8, helmet: '#ffffff' },
  { id: 'fern', name: 'Fern Frost', tag: 'FER', team: 'minty', skill: 0.66, helmet: '#ff8a1f' },
  { id: 'tara', name: 'Tara Stripes', tag: 'TAR', team: 'tiger', skill: 0.95, helmet: '#2f6fed' },
  { id: 'ziggy', name: 'Ziggy Roar', tag: 'ZIG', team: 'tiger', skill: 0.55, helmet: '#ffffff' },
  { id: 'gus', name: 'Gus Fizz', tag: 'GUS', team: 'grape', skill: 0.7, helmet: '#ffd93b' },
  { id: 'poppy', name: 'Poppy Bubbles', tag: 'POP', team: 'grape', skill: 0.5, helmet: '#35d6a4' },
  { id: 'finn', name: 'Finn Gill', tag: 'FIN', team: 'sardine', skill: 0.85, helmet: '#ee3344' },
  { id: 'sally', name: 'Sally Scales', tag: 'SAL', team: 'sardine', skill: 0.45, helmet: '#8b4de0' },
  { id: 'coco', name: 'Coco Chew', tag: 'COC', team: 'bears', skill: 0.62, helmet: '#2f6fed' },
  { id: 'bobo', name: 'Bobo Gum', tag: 'BOB', team: 'bears', skill: 0.35, helmet: '#ffffff' },
  { id: 'hoot', name: 'Hoot Nightly', tag: 'HOO', team: 'owls', skill: 0.76, helmet: '#f5c542' },
  { id: 'luna', name: 'Luna Wing', tag: 'LUN', team: 'owls', skill: 0.4, helmet: '#ff6fae' },
];

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export const DIFFICULTY = {
  easy: { label: 'Easy', pace: 0.86 },
  normal: { label: 'Normal', pace: 0.92 },
  hard: { label: 'Hard', pace: 0.97 },
  legend: { label: 'Legend', pace: 1.0 },
};

const THEMES = {
  meadow: {
    skyTop: '#3d9bff', skyBottom: '#d6f1ff', fog: '#d6f1ff',
    ground: '#7edb5a', ground2: '#6ccb4b', verge: '#a2e874', gravel: '#f3dfa2',
    asphalt: '#565b78', kerbA: '#ee3344', kerbB: '#ffffff', wallA: '#ffffff', wallB: '#2f6fed',
    sun: '#fff7e0', ambient: '#ffffff', ambientI: 1.25, sunI: 1.9, hill: '#58b84a', hillCap: '#8fe07a',
    props: { tree: 150, bush: 60, balloon: 6, flower: 90 },
  },
  beach: {
    skyTop: '#19a5f0', skyBottom: '#c9f6ff', fog: '#c9f6ff',
    ground: '#ffe39c', ground2: '#f9d683', verge: '#fff0c4', gravel: '#f6c978',
    asphalt: '#575d7a', kerbA: '#16b6c9', kerbB: '#ffffff', wallA: '#ffffff', wallB: '#ff8a1f',
    sun: '#fff7e0', ambient: '#ffffff', ambientI: 1.3, sunI: 1.9, hill: '#56c271', hillCap: '#9be88f',
    sea: '#2cc4e8', props: { palm: 110, rock: 30, boat: 12, umbrella: 40, balloon: 3 },
  },
  desert: {
    skyTop: '#ff9d5c', skyBottom: '#ffe9b8', fog: '#ffe2ae',
    ground: '#f4b56a', ground2: '#e9a257', verge: '#ffd08f', gravel: '#ffe3b0',
    asphalt: '#5b556e', kerbA: '#ff8a1f', kerbB: '#ffffff', wallA: '#fff3d6', wallB: '#c9442e',
    sun: '#fff0c0', ambient: '#fff0e0', ambientI: 1.2, sunI: 2.0, hill: '#d9783f', hillCap: '#f0a565',
    props: { cactus: 120, rock: 70, mesa: 14, balloon: 4 },
  },
  snow: {
    skyTop: '#5fb4ff', skyBottom: '#eaf7ff', fog: '#eaf7ff',
    ground: '#f6fcff', ground2: '#e3f1fb', verge: '#ffffff', gravel: '#cfe6f7',
    asphalt: '#59607f', kerbA: '#2f6fed', kerbB: '#ffffff', wallA: '#ee3344', wallB: '#ffffff',
    sun: '#ffffff', ambient: '#eef6ff', ambientI: 1.25, sunI: 1.7, hill: '#a9c9e8', hillCap: '#ffffff',
    props: { pine: 170, snowman: 22, rock: 24, balloon: 3 },
  },
  night: {
    skyTop: '#0d1240', skyBottom: '#7a4aa8', fog: '#4b3a86',
    ground: '#252c5c', ground2: '#202654', verge: '#343d78', gravel: '#4a548f',
    asphalt: '#50567f', kerbA: '#ff3fa4', kerbB: '#35e0ff', wallA: '#35e0ff', wallB: '#ff3fa4',
    sun: '#c8d0ff', ambient: '#c4caff', ambientI: 1.35, sunI: 1.3, hill: '#272d5e', hillCap: '#3a4285',
    night: true, props: { building: 70, lamp: 60, tree: 30, wheel: 1 },
  },
  candy: {
    skyTop: '#a68cff', skyBottom: '#ffe3f3', fog: '#ffe3f3',
    ground: '#ffc2df', ground2: '#ffb0d5', verge: '#fff0f8', gravel: '#fff6b8',
    asphalt: '#6a5a8c', kerbA: '#ff6fae', kerbB: '#ffffff', wallA: '#ffffff', wallB: '#35d6a4',
    sun: '#fff7e0', ambient: '#ffffff', ambientI: 1.3, sunI: 1.8, hill: '#ff9ccb', hillCap: '#fff6fb',
    props: { lollipop: 120, gumdrop: 70, cane: 40, balloon: 6 },
  },
};

// Control points [x, z] for closed Catmull-Rom splines. The start line is at the first point,
// which sits near the end of the main straight.
export const TRACKS = [
  {
    id: 'meadows', name: 'Sunny Meadows', country: 'Greenshire', theme: 'meadow', blurb: 'Fast, flowing and friendly.',
    pts: [[-20, -90], [70, -90], [135, -75], [168, -30], [150, 28], [95, 45], [45, 22], [0, 32], [-18, 85], [-85, 100], [-150, 78], [-180, 15], [-170, -50], [-125, -88]],
  },
  {
    id: 'coral', name: 'Coral Bay', country: 'Isla Splash', theme: 'beach', blurb: 'Seaside sweepers and switchbacks.',
    pts: [[-30, -110], [80, -110], [160, -100], [200, -60], [185, -10], [130, 0], [70, -30], [10, -25], [-10, 25], [40, 60], [120, 55], [185, 80], [195, 130], [140, 150], [40, 140], [-70, 145], [-150, 120], [-200, 60], [-205, -30], [-170, -90], [-110, -110]],
  },
  {
    id: 'cactus', name: 'Cactus Canyon', country: 'Dustbowl', theme: 'desert', blurb: 'Long straights, one nasty hairpin.',
    pts: [[-40, -120], [90, -120], [190, -115], [230, -75], [200, -30], [130, -35], [80, -5], [110, 45], [170, 70], [180, 120], [120, 145], [30, 120], [-40, 140], [-110, 115], [-150, 50], [-220, 30], [-240, -40], [-200, -100], [-130, -120]],
  },
  {
    id: 'frosty', name: 'Frosty Peaks', country: 'Brrrland', theme: 'snow', blurb: 'Twisty, technical and chilly.',
    pts: [[-20, -100], [60, -100], [120, -90], [150, -50], [120, -10], [60, -20], [20, 10], [50, 55], [110, 50], [160, 75], [170, 125], [120, 150], [60, 125], [0, 140], [-60, 120], [-70, 65], [-120, 40], [-175, 70], [-215, 30], [-200, -30], [-150, -45], [-135, -90], [-90, -105]],
  },
  {
    id: 'neon', name: 'Neon Harbor', country: 'Glow City', theme: 'night', blurb: 'A street circuit under the lights.',
    pts: [[-40, -100], [60, -100], [128, -100], [150, -78], [150, -42], [128, -20], [82, -20], [60, 2], [60, 38], [82, 60], [148, 60], [170, 82], [170, 108], [148, 130], [40, 130], [-78, 130], [-100, 108], [-100, 62], [-122, 40], [-168, 40], [-190, 18], [-190, -78], [-168, -100], [-120, -100]],
  },
  {
    id: 'candy', name: 'Lollipop Loop', country: 'Sugarland', theme: 'candy', blurb: 'Big, sweet, sweeping corners.',
    pts: [[-30, -130], [90, -130], [180, -110], [235, -55], [225, 15], [170, 50], [110, 30], [60, 60], [80, 115], [40, 155], [-40, 150], [-80, 100], [-140, 90], [-200, 125], [-250, 80], [-240, 10], [-190, -30], [-200, -90], [-150, -128]],
  },
];
for (const t of TRACKS) t.themeDef = THEMES[t.theme];

export const teamOf = (driver) => TEAMS.find((t) => t.id === driver.team);
export const driverById = (id) => DRIVERS.find((d) => d.id === id);
export const trackById = (id) => TRACKS.find((t) => t.id === id);
