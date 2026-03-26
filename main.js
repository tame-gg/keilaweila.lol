// ── Cursor
const cur = document.getElementById('cur'), ring = document.getElementById('cur-ring');
let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
(function tick() {
  rx += (mx - rx) * .14; ry += (my - ry) * .14;
  cur.style.left = mx + 'px'; cur.style.top = my + 'px';
  ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
  requestAnimationFrame(tick);
})();
document.querySelectorAll('a,button').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
});

// ── Theme
const html = document.documentElement, btn = document.getElementById('themeBtn'), disc = document.getElementById('discordWidget');
function applyTheme(t) {
  html.setAttribute('data-theme', t);
  try { localStorage.setItem('tame-theme', t); } catch (e) { }
  if (disc) disc.src = 'https://discord.com/widget?id=1012876825573204048&theme=' + (t === 'dark' ? 'dark' : 'light');
}
const saved = (() => { try { return localStorage.getItem('tame-theme'); } catch (e) { return null; } })();
applyTheme(saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
btn.addEventListener('click', () => applyTheme(html.getAttribute('data-theme') === 'light' ? 'dark' : 'light'));

// ── Mobile Menu
const hamburgerBtn = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const mmOverlay = document.getElementById('mmOverlay');
hamburgerBtn.addEventListener('click', () => {
  hamburgerBtn.classList.toggle('active');
  mobileMenu.classList.toggle('open');
  document.body.classList.toggle('locked');
});
mmOverlay.addEventListener('click', () => {
  hamburgerBtn.classList.remove('active');
  mobileMenu.classList.remove('open');
  document.body.classList.remove('locked');
});
document.querySelectorAll('.mm-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburgerBtn.classList.remove('active');
    mobileMenu.classList.remove('open');
    document.body.classList.remove('locked');
  });
});

// ── Scroll reveal
const obs = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('on'); obs.unobserve(e.target); }
}), { threshold: 0.12 });
document.querySelectorAll('.rv').forEach(el => obs.observe(el));

// ── Parallax
const heroEl = document.getElementById('hero');
const gridEl = document.querySelector('.grid-lines');
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (y > heroEl.offsetHeight) return;
  if (gridEl) gridEl.style.transform = `translateY(${y * 0.12}px)`;
  heroEl.style.setProperty('--prlx', `${y * 0.22}px`);
}, { passive: true });

// ── Last.fm API + LRCLIB Synced Lyrics
const LFM_KEY = 'b3ba5d7e74e6393d681b81d161003177';
const LFM_USER = 'pursian';

// Lyrics state
let currentLyrics = null;   // parsed LRC array [{time, text}, ...]
let lyricsSyncRAF = null;    // requestAnimationFrame ID
let lyricsHidden = false;    // user manually closed

// Spotify sync state
let spotifyProgress = null;  // last known progress_ms from Spotify
let spotifyPollTime = null;  // Date.now() when we last polled Spotify
let spotifyTrackKey = null;  // "song|||artist" for Spotify track detection
let spotifyInterval = null;  // polling interval ID

// LRC parser — handles [mm:ss.xx] and [mm:ss.xxx] formats
function parseLRC(lrc) {
  const lines = lrc.split('\n');
  const parsed = [];
  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (match) {
      const mins = parseInt(match[1]);
      const secs = parseInt(match[2]);
      const ms = parseInt(match[3].padEnd(3, '0'));
      const time = mins * 60 + secs + ms / 1000;
      const text = match[4].trim();
      if (text) parsed.push({ time, text });
    }
  }
  return parsed;
}

// Fetch lyrics from LRCLIB
async function fetchLyrics(song, artist) {
  try {
    // Try exact match first
    const res = await fetch(`https://lrclib.net/api/get?track_name=${encodeURIComponent(song)}&artist_name=${encodeURIComponent(artist)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.syncedLyrics) return { type: 'synced', data: parseLRC(data.syncedLyrics) };
      if (data.plainLyrics) return { type: 'plain', data: data.plainLyrics };
      if (data.instrumental) return { type: 'instrumental' };
    }
    // Fallback to search
    const res2 = await fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(song)}&artist_name=${encodeURIComponent(artist)}`);
    if (res2.ok) {
      const results = await res2.json();
      const best = results.find(r => r.syncedLyrics) || results.find(r => r.plainLyrics) || results[0];
      if (best?.syncedLyrics) return { type: 'synced', data: parseLRC(best.syncedLyrics) };
      if (best?.plainLyrics) return { type: 'plain', data: best.plainLyrics };
      if (best?.instrumental) return { type: 'instrumental' };
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Render lyrics lines into the panel
function renderLyrics(result) {
  const container = document.getElementById('lyricsLines');
  const panel = document.getElementById('lyricsPanel');
  container.innerHTML = '';

  if (result.type === 'synced') {
    result.data.forEach((line, i) => {
      const div = document.createElement('div');
      div.className = 'lyrics-line upcoming';
      div.textContent = line.text;
      div.dataset.index = i;
      container.appendChild(div);
    });
    currentLyrics = result.data;
  } else if (result.type === 'plain') {
    const div = document.createElement('div');
    div.className = 'lyrics-plain';
    div.textContent = result.data;
    container.appendChild(div);
    currentLyrics = null;
  } else if (result.type === 'instrumental') {
    container.innerHTML = '<div class="lyrics-instrumental">♪ Instrumental ♪</div>';
    currentLyrics = null;
  }

  if (!lyricsHidden) {
    panel.classList.add('visible');
    panel.classList.add('live');
  }
}

// Sync loop — runs at ~60fps, uses Spotify progress + interpolation
function lyricsSyncLoop() {
  if (!currentLyrics) { lyricsSyncRAF = requestAnimationFrame(lyricsSyncLoop); return; }

  let elapsed;
  if (spotifyProgress !== null && spotifyPollTime !== null) {
    // Interpolate: last known progress + time since poll
    elapsed = (spotifyProgress + (Date.now() - spotifyPollTime)) / 1000;
  } else {
    lyricsSyncRAF = requestAnimationFrame(lyricsSyncLoop);
    return;
  }

  const container = document.getElementById('lyricsLines');
  const lines = container.querySelectorAll('.lyrics-line');
  if (!lines.length) { lyricsSyncRAF = requestAnimationFrame(lyricsSyncLoop); return; }

  let activeIdx = -1;
  for (let i = 0; i < currentLyrics.length; i++) {
    if (elapsed >= currentLyrics[i].time) activeIdx = i;
  }

  lines.forEach((line, i) => {
    line.classList.remove('active', 'past', 'upcoming');
    if (i === activeIdx) {
      line.classList.add('active');
    } else if (i < activeIdx) {
      line.classList.add('past');
    } else {
      line.classList.add('upcoming');
    }
  });

  // Auto-scroll active line into view
  if (activeIdx >= 0 && lines[activeIdx]) {
    const scroll = document.getElementById('lyricsScroll');
    const line = lines[activeIdx];
    const scrollTop = line.offsetTop - scroll.offsetHeight / 2 + line.offsetHeight / 2;
    scroll.scrollTop = scrollTop;
  }

  lyricsSyncRAF = requestAnimationFrame(lyricsSyncLoop);
}

function startLyricsSync() {
  stopLyricsSync();
  lyricsSyncRAF = requestAnimationFrame(lyricsSyncLoop);
}

function stopLyricsSync() {
  if (lyricsSyncRAF) {
    cancelAnimationFrame(lyricsSyncRAF);
    lyricsSyncRAF = null;
  }
}

function hideLyricsPanel() {
  const panel = document.getElementById('lyricsPanel');
  panel.classList.remove('visible', 'live');
  stopLyricsSync();
  currentLyrics = null;
}

// Close / Resync buttons
document.getElementById('lyricsClose').addEventListener('click', () => {
  lyricsHidden = true;
  hideLyricsPanel();
});
document.getElementById('lyricsResync').addEventListener('click', () => {
  // Force immediate re-poll from Spotify
  spotifyProgress = null;
  spotifyPollTime = null;
  pollSpotify();
});

// ── Shared widget updater (called from both Spotify and Last.fm)
function updateLfmWidget({ song, artist, artUrl, isLive }) {
  document.getElementById('lfmSong').textContent = song || 'Unknown';
  document.getElementById('lfmArtist').textContent = artist || 'Unknown Artist';
  const dot = document.getElementById('lfmDot');
  const status = document.getElementById('lfmStatusTxt');
  const lfmCard = document.querySelector('.lfm-card');
  const lfmBars = document.getElementById('lfmBars');
  const navLogo = document.querySelector('nav .logo');
  const statusLinks = document.querySelectorAll('a[href="#music"]');
  if (isLive) {
    dot.classList.add('live');
    status.textContent = 'Now Playing';
    if (lfmCard) lfmCard.classList.add('live');
    if (lfmBars) lfmBars.classList.add('active');
    if (navLogo) navLogo.classList.add('live-active');
    statusLinks.forEach(l => l.classList.add('live-pulse'));
  } else {
    dot.classList.remove('live');
    status.textContent = 'Last Played';
    if (lfmCard) lfmCard.classList.remove('live');
    if (lfmBars) lfmBars.classList.remove('active');
    if (navLogo) navLogo.classList.remove('live-active');
    statusLinks.forEach(l => l.classList.remove('live-pulse'));
  }
  if (artUrl && !artUrl.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
    const artEl = document.getElementById('lfmArt');
    if (artEl && artEl.src !== artUrl) {
      artEl.outerHTML = `<img class="lfm-art" id="lfmArt" src="${artUrl}" alt="album art"/>`;
    }
  }
}

// ── Spotify Polling for lyrics sync + live widget updates
async function pollSpotify() {
  try {
    const res = await fetch('/api/spotify');
    if (!res.ok) return;
    const data = await res.json();

    if (data.is_playing && data.progress_ms !== undefined) {
      spotifyProgress = data.progress_ms;
      spotifyPollTime = Date.now();

      // Always update widget from Spotify when playing (catches song skips immediately)
      updateLfmWidget({
        song: data.track,
        artist: data.artist,
        artUrl: data.album_art,
        isLive: true,
      });

      // Detect track change → fetch new lyrics
      const trackKey = `${data.track}|||${data.artist}`;
      if (trackKey !== spotifyTrackKey) {
        spotifyTrackKey = trackKey;
        lyricsHidden = false;
        const result = await fetchLyrics(data.track, data.artist);
        if (result) {
          renderLyrics(result);
          if (result.type === 'synced') startLyricsSync();
        } else {
          hideLyricsPanel();
        }
      }
    } else {
      spotifyProgress = null;
      spotifyPollTime = null;
      spotifyTrackKey = null;
      hideLyricsPanel();
      // Fall through to Last.fm for the "last played" state
    }
  } catch (e) {
    // Spotify unavailable
  }
}

function startSpotifyPolling() {
  stopSpotifyPolling();
  pollSpotify();
  spotifyInterval = setInterval(pollSpotify, 5000);
}

function stopSpotifyPolling() {
  if (spotifyInterval) {
    clearInterval(spotifyInterval);
    spotifyInterval = null;
  }
}

// Start Spotify polling immediately
startSpotifyPolling();

async function fetchLastFm() {
  try {
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LFM_USER}&api_key=${LFM_KEY}&format=json&limit=1`);
    const data = await res.json();
    const track = data.recenttracks?.track?.[0];
    if (!track) return;
    const isLive = track['@attr']?.nowplaying === 'true';
    // Only update widget from Last.fm when Spotify isn't driving it
    if (!isLive && !spotifyTrackKey) {
      const song = track.name || 'Unknown';
      const artist = track.artist?.['#text'] || 'Unknown Artist';
      const artUrl = track.image?.find(i => i.size === 'large')?.['#text'] || '';
      updateLfmWidget({ song, artist, artUrl, isLive: false });
    }
  } catch (e) {
    // silently fail — Spotify is the primary source
  }
}
fetchLastFm();
setInterval(fetchLastFm, 30000);

// ── Discord Presence via Lanyard
const DISCORD_ID = '1120238252125868136';
const STATUS_LABELS = { online: 'Online', idle: 'Away', dnd: 'Do Not Disturb', offline: 'Offline' };
function updatePresence(data) {
  const { discord_status, discord_user, activities } = data;
  const avatarHash = discord_user?.avatar;
  if (avatarHash) {
    const avatarEl = document.getElementById('presenceAvatar');
    avatarEl.src = `https://cdn.discordapp.com/avatars/${DISCORD_ID}/${avatarHash}.png?size=128`;
    avatarEl.style.display = 'block';
  }
  const dot = document.getElementById('presenceDot');
  dot.className = 'presence-sdot ' + (discord_status || 'offline');
  document.getElementById('presenceSub').textContent = STATUS_LABELS[discord_status] || 'Offline';
  const act = activities?.find(a => a.type !== 4);
  const actEl = document.getElementById('presenceAct');
  if (act) {
    actEl.style.display = 'block';
    document.getElementById('presenceActName').textContent = act.name || '';
    const detail = [act.details, act.state].filter(Boolean).join(' · ');
    document.getElementById('presenceActDetail').textContent = detail;
  } else {
    actEl.style.display = 'none';
  }
}
function connectLanyard() {
  const ws = new WebSocket('wss://api.lanyard.rest/socket');
  let heartbeat;
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.op === 1) {
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
      heartbeat = setInterval(() => ws.send(JSON.stringify({ op: 3 })), msg.d.heartbeat_interval);
    }
    if (msg.op === 0) {
      if (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE') {
        updatePresence(msg.d);
      }
    }
  };
  ws.onclose = () => { clearInterval(heartbeat); setTimeout(connectLanyard, 5000); };
  ws.onerror = () => ws.close();
}
connectLanyard();

// ── GitHub Activity
async function fetchGitHub() {
  try {
    const userRes = await fetch('https://api.github.com/users/notasianrizz');
    if (userRes.ok) {
      const user = await userRes.json();
      document.getElementById('ghFollowers').textContent = `${user.followers} followers · ${user.public_repos} repos`;
    }
    const evtRes = await fetch('https://api.github.com/users/notasianrizz/events/public?per_page=1');
    if (evtRes.ok) {
      const events = await evtRes.json();
      if (events.length > 0) {
        const ev = events[0];
        document.getElementById('ghAct').style.display = 'block';
        let type = ev.type.replace('Event', '');
        if (type === 'Push') type = 'Pushed code';
        if (type === 'Watch') type = 'Starred a repo';
        if (type === 'Create') type = 'Created a repo';
        document.getElementById('ghActType').textContent = type;
        document.getElementById('ghActRepo').textContent = ev.repo.name;
      }
    }
  } catch (e) {
    // silently fail
  }
}
fetchGitHub();

// ── Start screen enter
const startScreen = document.getElementById('start-screen');
const ssLoader = document.getElementById('ss-loader');
const enterBtn = document.getElementById('enterBtn');

document.body.classList.add('locked');

enterBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  ssLoader.classList.add('visible');
  window.scrollTo({ top: 0, behavior: 'instant' });
  setTimeout(() => {
    ssLoader.classList.add('fade-out');
    setTimeout(() => {
      ssLoader.classList.remove('visible');
      ssLoader.classList.remove('fade-out');
      document.body.classList.remove('locked');
    }, 450);
  }, 1800);
});
