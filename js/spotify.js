// Optional Spotify soundtrack through the official embed player (no API key needed).
// Full tracks play when the listener is logged in to Spotify in this browser; otherwise Spotify plays previews.
let apiP = null, controller = null, curUri = null;
const $ = (s) => document.querySelector(s);

export function parseSpotify(url) {
  const s = (url || '').trim();
  const m = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/.exec(s) || /^spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]+)$/.exec(s);
  return m ? `spotify:${m[1]}:${m[2]}` : null;
}
function api() {
  return (apiP ||= new Promise((res, rej) => {
    window.onSpotifyIframeApiReady = res;
    const sc = document.createElement('script');
    sc.src = 'https://open.spotify.com/embed/iframe-api/v1'; sc.async = true; sc.onerror = () => { apiP = null; rej(new Error('Spotify player could not be loaded')); };
    document.head.append(sc);
  }));
}
export async function spotifyShow(uri) {
  const dock = $('#spotify');
  dock.classList.remove('hidden', 'min');
  if (uri === curUri && controller) return;
  curUri = uri;
  const IFrameAPI = await api();
  if (controller) { controller.loadUri(uri); return; }
  await new Promise((done) => IFrameAPI.createController($('#sp-embed'), { uri, width: '100%', height: 152 }, (c) => {
    controller = c;
    c.addListener('playback_update', (e) => { if (e.data && !e.data.isPaused && e.data.position > 1500) dock.classList.add('min'); });
    done();
  }));
}
export function spotifyHide() {
  $('#spotify').classList.add('hidden');
  if (controller) controller.pause();
}
$('#sp-tab').onclick = () => $('#spotify').classList.toggle('min');
// After logging in to Spotify in another tab, reload the embed so it can pick up the session.
let wentToLogin = false;
$('#sp-login').addEventListener('click', () => { wentToLogin = true; });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && wentToLogin && controller && curUri) { wentToLogin = false; controller.loadUri(curUri); $('#spotify').classList.remove('min'); }
});
