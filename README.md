# Toon Prix

A cute comic-style 3D grand prix game for the browser (desktop, iPhone, foldables). No build step, no assets:
everything is generated in code with three.js (vendored in `js/lib`).

Run: serve this folder over HTTP (ES modules need it), e.g. `python3 -m http.server 8765`, then open
`http://localhost:8765/`. On iPhone use Share → Add to Home Screen for true full screen.

- Modes: Quick Race, Championship (6 rounds, 3 save slots), fully automatic "Watch a Race"; autopilot toggle while driving.
- Cameras: Chase, Onboard, TV, Helicopter, Drone, Mini Circuit (tilt-shift model-railway view), Director.
- Saving: localStorage. Championships auto-save after each race; a race in progress is saved on "Save & quit" or when the page is hidden.
- Sound: synthesised engines and procedural background music; optionally paste a Spotify playlist/album/track link in Settings to use the Spotify embed player instead.
- Keys: arrows/WASD, Space boost, C camera, T autopilot, R reset, P pause, M mute.

Code map: `data.js` (teams, drivers, circuits) · `trackmath.js` (spline, racing line, speed profile) · `world.js`/`props.js` (scenery) ·
`car.js` (model, physics, AI) · `race.js` (rules, collisions, save/restore) · `cameras.js` · `ui.js` (menus, HUD) · `main.js`.
`node tools/check-tracks.mjs` validates circuit layouts.
