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
  try { localStorage.setItem('tame-theme', t); } catch(e) {}
  if (disc) disc.src = 'https://discord.com/widget?id=1012876825573204048&theme=' + (t === 'dark' ? 'dark' : 'light');
}
const saved = (() => { try { return localStorage.getItem('tame-theme'); } catch(e) { return null; } })();
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

// ── Last.fm API
const LFM_KEY = 'b3ba5d7e74e6393d681b81d161003177';
const LFM_USER = 'pursian';
async function fetchLastFm() {
  try {
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LFM_USER}&api_key=${LFM_KEY}&format=json&limit=1`);
    const data = await res.json();
    const track = data.recenttracks?.track?.[0];
    if (!track) return;
    const isLive = track['@attr']?.nowplaying === 'true';
    const song = track.name || 'Unknown';
    const artist = track.artist?.['#text'] || 'Unknown Artist';
    const artUrl = track.image?.find(i => i.size === 'large')?.['#text'] || '';
    document.getElementById('lfmSong').textContent = song;
    document.getElementById('lfmArtist').textContent = artist;
    const dot = document.getElementById('lfmDot');
    const status = document.getElementById('lfmStatusTxt');
    const lfmCard = document.querySelector('.lfm-card');
    const lfmBars = document.getElementById('lfmBars');
    if (isLive) {
      dot.classList.add('live');
      status.textContent = 'Now Playing';
      if (lfmCard) lfmCard.classList.add('live');
      if (lfmBars) lfmBars.classList.add('active');
    } else {
      dot.classList.remove('live');
      status.textContent = 'Last Played';
      if (lfmCard) lfmCard.classList.remove('live');
      if (lfmBars) lfmBars.classList.remove('active');
    }
    const artEl = document.getElementById('lfmArt');
    if (artUrl && !artUrl.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
      artEl.outerHTML = `<img class="lfm-art" id="lfmArt" src="${artUrl}" alt="album art"/>`;
    }
  } catch(e) {
    document.getElementById('lfmSong').textContent = 'Unavailable';
    document.getElementById('lfmStatusTxt').textContent = 'Error loading';
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

// ── Music Player
const audio = document.getElementById('bg-audio');
const plPlay = document.getElementById('plPlay');
const plPlayIcon = document.getElementById('plPlayIcon');
const plDisc = document.getElementById('plDisc');
const plFill = document.getElementById('plFill');
const plCur = document.getElementById('plCur');
const plDur = document.getElementById('plDur');
const plTrack = document.getElementById('plTrack');
const plVol = document.getElementById('plVol');
const plRestart = document.getElementById('plRestart');

const PLAY_ICON = '<path d="M6 4l15 8-15 8V4z"/>';
const PAUSE_ICON = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';

function fmtTime(s) {
  if (isNaN(s)) return '--:--';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
}

function setPlayState(playing) {
  plPlayIcon.innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
  plDisc.classList.toggle('spinning', playing);
}

audio.volume = 0.2;
setPlayState(false);

// ── Start screen enter
const startScreen = document.getElementById('start-screen');
const ssLoader = document.getElementById('ss-loader');
const enterBtn = document.getElementById('enterBtn');

document.body.classList.add('locked');

enterBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  ssLoader.classList.add('visible');
  window.scrollTo({ top: 0, behavior: 'instant' });
  audio.play().then(() => setPlayState(true)).catch(() => setPlayState(false));
  setTimeout(() => {
    ssLoader.classList.add('fade-out');
    setTimeout(() => {
      ssLoader.classList.remove('visible');
      ssLoader.classList.remove('fade-out');
      document.body.classList.remove('locked');
    }, 450);
  }, 1800);
});

plPlay.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    setPlayState(true);
  } else {
    audio.pause();
    setPlayState(false);
  }
});

plRestart.addEventListener('click', () => {
  audio.currentTime = 0;
  if (audio.paused) { audio.play(); setPlayState(true); }
});

audio.addEventListener('timeupdate', () => {
  const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  plFill.style.width = pct + '%';
  plCur.textContent = fmtTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  plDur.textContent = fmtTime(audio.duration);
});

plTrack.addEventListener('click', e => {
  const rect = plTrack.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  audio.currentTime = pct * audio.duration;
});

plVol.addEventListener('input', () => {
  audio.volume = plVol.value / 100;
});

document.querySelectorAll('.pl-btn, .pl-vol-slider, #plTrack').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
});
