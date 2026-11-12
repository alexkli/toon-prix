// Spotify soundtrack: sign in with Spotify (OAuth PKCE, no server), then play through the
// Web Playback SDK in this browser, or fall back to remote-controlling a Spotify app (Spotify Connect).
// Needs Spotify Premium. The client id is public by design in the PKCE flow.
const CLIENT_ID = '1f5fcf0f083740de92b6f925db02ed74';
const SCOPES = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state';
const KEY = 'toonprix.spotify.v1', VKEY = 'toonprix.spotify.verifier';
const $ = (s) => document.querySelector(s);

let auth = null;
try { auth = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { auth = null; }
const saveAuth = () => { try { auth ? localStorage.setItem(KEY, JSON.stringify(auth)) : localStorage.removeItem(KEY); } catch { /* private mode */ } };

let player = null, sdkDevice = null, sdkP = null, remote = null, pollT = 0;
export const sp = {
  notify: () => {},          // (message) => void, set by the game for toasts
  get connected() { return !!auth; },
  get name() { return auth && auth.name; },
  now: { title: '', paused: true },
};

export function parseSpotify(url) {
  const s = (url || '').trim();
  const m = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/.exec(s) || /^spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]+)$/.exec(s);
  return m ? `spotify:${m[1]}:${m[2]}` : null;
}
// Must match a redirect URI registered for the Spotify app exactly.
export const redirectUri = () => location.origin + location.pathname.replace(/[^/]*$/, '');

// ---------- auth ----------
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function connect() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  localStorage.setItem(VKEY, verifier);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const q = new URLSearchParams({ client_id: CLIENT_ID, response_type: 'code', redirect_uri: redirectUri(), code_challenge_method: 'S256', code_challenge: challenge, scope: SCOPES });
  location.assign('https://accounts.spotify.com/authorize?' + q);
}
async function tokenRequest(params) {
  const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: CLIENT_ID, ...params }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.error || 'Spotify sign-in failed');
  auth = { access: j.access_token, refresh: j.refresh_token || (auth && auth.refresh), exp: Date.now() + (j.expires_in - 60) * 1000, name: auth && auth.name };
  saveAuth();
}
// Call once at startup: completes the sign-in when Spotify redirected back here. Returns true if just connected.
export async function handleRedirect() {
  const q = new URLSearchParams(location.search), code = q.get('code'), err = q.get('error');
  if (!code && !err) return false;
  history.replaceState(null, '', location.pathname);
  if (err) throw new Error(err === 'access_denied' ? 'Spotify sign-in was cancelled' : 'Spotify: ' + err);
  const verifier = localStorage.getItem(VKEY);
  localStorage.removeItem(VKEY);
  if (!verifier) throw new Error('Spotify sign-in expired, please try again');
  await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(), code_verifier: verifier });
  try { const me = await api('GET', '/me'); auth.name = me.display_name || me.id; auth.premium = me.product === 'premium'; saveAuth(); } catch { /* name is optional */ }
  return true;
}
async function token() {
  if (!auth) throw new Error('Not connected to Spotify');
  if (Date.now() > auth.exp) {
    try { await tokenRequest({ grant_type: 'refresh_token', refresh_token: auth.refresh }); } catch (e) { disconnect(); throw new Error('Spotify session expired, please connect again'); }
  }
  return auth.access;
}
export function disconnect() {
  if (player) { try { player.disconnect(); } catch { /* ignore */ } }
  player = null; sdkDevice = null; sdkP = null; remote = null; auth = null;
  saveAuth(); render();
}
async function api(method, path, body, retry = true) {
  const r = await fetch('https://api.spotify.com/v1' + path, { method, headers: { Authorization: 'Bearer ' + (await token()), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401 && retry) { auth.exp = 0; return api(method, path, body, false); }
  if (r.status === 204 || r.status === 202) return null;
  const text = await r.text();
  let j = null; try { j = JSON.parse(text); } catch { /* some endpoints return plain text */ }
  if (!r.ok) {
    const reason = j && j.error && (j.error.reason || j.error.message);
    if (r.status === 403 && /PREMIUM/i.test(reason || '')) throw new Error('Spotify Premium is required for playback');
    const e = new Error('Spotify: ' + (reason || r.status)); e.status = r.status; throw e;
  }
  return j;
}

// ---------- playback device ----------
// Starts the in-browser player (Web Playback SDK). Resolves to a device id, or null if unavailable here.
export function ensurePlayer() {
  if (!auth) return Promise.resolve(null);
  return (sdkP ||= new Promise((res) => {
    const give = (id) => { clearTimeout(timer); res(id); };
    const timer = setTimeout(() => give(null), 9000);
    const make = () => {
      player = new window.Spotify.Player({ name: 'Toon Prix', getOAuthToken: (cb) => token().then(cb).catch(() => {}), volume: 0.6 });
      player.addListener('ready', ({ device_id }) => { sdkDevice = device_id; give(device_id); });
      player.addListener('not_ready', () => { sdkDevice = null; });
      player.addListener('initialization_error', () => give(null));
      player.addListener('authentication_error', () => { sp.notify('Spotify sign-in problem, please connect again'); give(null); });
      player.addListener('account_error', () => { sp.notify('Spotify Premium is required for playback'); give(null); });
      player.addListener('player_state_changed', (st) => {
        if (!st) return;
        const t = st.track_window && st.track_window.current_track;
        sp.now = { title: t ? `${t.name} · ${t.artists.map((a) => a.name).join(', ')}` : '', paused: st.paused };
        render();
      });
      player.connect().then((ok) => { if (!ok) give(null); });
    };
    if (window.Spotify) return make();
    window.onSpotifyWebPlaybackSDKReady = make;
    const sc = document.createElement('script');
    sc.src = 'https://sdk.scdn.co/spotify-player.js'; sc.async = true; sc.onerror = () => give(null);
    document.head.append(sc);
  }));
}
async function device() {
  const id = await ensurePlayer();
  if (id && sdkDevice) { remote = null; return id; }
  // fall back to a Spotify app that is open somewhere on this account
  const d = (await api('GET', '/me/player/devices')).devices || [];
  const pick = d.find((x) => x.is_active) || d.find((x) => !x.is_restricted);
  if (!pick) throw new Error('Open the Spotify app on this device, then press play again');
  remote = pick.id;
  return pick.id;
}
async function refreshNow() {
  if (!remote) return;
  try {
    const st = await api('GET', '/me/player');
    const t = st && st.item;
    sp.now = { title: t ? `${t.name} · ${(t.artists || []).map((a) => a.name).join(', ')}` : '', paused: !(st && st.is_playing) };
    render();
  } catch { /* keep the old state */ }
}
const later = () => { clearTimeout(pollT); pollT = setTimeout(refreshNow, 1200); };

// Start playing. uri: spotify:playlist:… / album / track, or null to resume whatever was playing last.
export async function play(uri) {
  if (player && player.activateElement) player.activateElement(); // unlocks audio on iOS, must run inside the tap
  const id = await device();
  const body = !uri ? null : uri.startsWith('spotify:track:') || uri.startsWith('spotify:episode:') ? { uris: [uri] } : { context_uri: uri };
  const go = () => (body ? api('PUT', '/me/player/play?device_id=' + id, body) : api('PUT', '/me/player', { device_ids: [id], play: true }));
  try { await go(); } catch (e) {
    if (e.status !== 404 && e.status !== 502) throw e;
    await new Promise((r) => setTimeout(r, 1200)); // a freshly created device can take a moment to register
    await go();
  }
  sp.now.paused = false; render(); later();
}
export async function toggle(uri) {
  if (sp.now.paused && !sp.now.title) return play(uri);
  if (player && sdkDevice && !remote) { player.activateElement && player.activateElement(); await player.togglePlay(); return; }
  await api('PUT', sp.now.paused ? '/me/player/play' : '/me/player/pause');
  sp.now.paused = !sp.now.paused; render(); later();
}
export async function skip(dir) {
  if (player && sdkDevice && !remote) return dir > 0 ? player.nextTrack() : player.previousTrack();
  await api('POST', dir > 0 ? '/me/player/next' : '/me/player/previous'); later();
}
export async function pause() {
  try {
    if (player && sdkDevice && !remote) await player.pause(); else if (remote) await api('PUT', '/me/player/pause');
    sp.now.paused = true; render();
  } catch { /* nothing playing */ }
}

// ---------- dock UI ----------
let dockOn = false, currentUri = null;
export function showDock(on, uri) { dockOn = on && sp.connected; currentUri = uri || null; if (dockOn) ensurePlayer(); render(); }
function render() {
  const dock = $('#spotify');
  dock.classList.toggle('hidden', !dockOn);
  $('#sp-title').textContent = sp.now.title || (sp.name ? `Spotify · ${sp.name}` : 'Spotify');
  $('#sp-play').textContent = sp.now.paused ? '▶' : '⏸';
}
const act = (fn) => () => fn().catch((e) => sp.notify(e.message));
$('#sp-play').onclick = act(() => toggle(currentUri));
$('#sp-next').onclick = act(() => skip(1));
$('#sp-prev').onclick = act(() => skip(-1));
