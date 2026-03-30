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
const html = document.documentElement, btn = document.getElementById('themeBtn');
function applyTheme(t) {
  html.setAttribute('data-theme', t);
  try { localStorage.setItem('keila-theme', t); } catch (e) { }
}
const saved = (() => { try { return localStorage.getItem('keila-theme'); } catch (e) { return null; } })();
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

// ── Canvas Background
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
let w, h, bgParticles = [];
function resizeBg() {
  w = bgCanvas.width = window.innerWidth;
  h = bgCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeBg);
resizeBg();

class BgParticle {
  constructor() {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.rad = Math.random() * 1.2 + 0.5;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    if (this.x < 0 || this.x > w) this.vx *= -1;
    if (this.y < 0 || this.y > h) this.vy *= -1;
  }
  draw() {
    bgCtx.beginPath();
    bgCtx.arc(this.x, this.y, this.rad, 0, Math.PI * 2);
    // Uses the soft taupe color 'rgba(169, 164, 159, 1)' from the palette
    bgCtx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(169, 164, 159, 0.4)';
    bgCtx.fill();
  }
}
for (let i = 0; i < 60; i++) bgParticles.push(new BgParticle());

function animateBg() {
  bgCtx.clearRect(0, 0, w, h);
  let isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  let cp = isDark ? '255,255,255' : '169, 164, 159'; // A9A49F mapped to RGB
  
  bgParticles.forEach(p => { p.update(); p.draw(); });
  
  for (let i = 0; i < bgParticles.length; i++) {
    for (let j = i + 1; j < bgParticles.length; j++) {
      let dx = bgParticles[i].x - bgParticles[j].x, dy = bgParticles[i].y - bgParticles[j].y;
      let dist = dx*dx + dy*dy;
      if (dist < 12000) {
        bgCtx.beginPath();
        bgCtx.strokeStyle = `rgba(${cp},${0.08 - dist/150000})`;
        bgCtx.lineWidth = 0.5;
        bgCtx.moveTo(bgParticles[i].x, bgParticles[i].y);
        bgCtx.lineTo(bgParticles[j].x, bgParticles[j].y);
        bgCtx.stroke();
      }
    }
    let dx = bgParticles[i].x - mx, dy = bgParticles[i].y - my;
    let dist = dx*dx + dy*dy;
    if (dist < 25000) {
      bgCtx.beginPath();
      bgCtx.strokeStyle = `rgba(${cp},${0.2 - dist/125000})`;
      bgCtx.lineWidth = 0.8;
      bgCtx.moveTo(bgParticles[i].x, bgParticles[i].y);
      bgCtx.lineTo(mx, my);
      bgCtx.stroke();
    }
  }
  requestAnimationFrame(animateBg);
}
animateBg();

// ── GSAP Animations
document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll('.rv').forEach(el => {
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
  });

  gsap.utils.toArray('section').forEach(sec => {
    const elems = sec.querySelectorAll('.rv');
    if (elems.length) {
      gsap.to(elems, {
        scrollTrigger: { trigger: sec, start: 'top 80%' },
        y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', overwrite: 'auto'
      });
    }
  });

  // Magnetic Buttons
  document.querySelectorAll('.ss-btn, .port-btn, .soc, .fsoc').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const bx = e.clientX - rect.left - rect.width / 2;
      const by = e.clientY - rect.top - rect.height / 2;
      gsap.to(btn, { x: bx * 0.3, y: by * 0.3, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)', overwrite: 'auto' });
    });
  });
});

// ── Parallax
const heroEl = document.getElementById('hero');
const gridEl = document.querySelector('.grid-lines');
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (y > heroEl.offsetHeight) return;
  if (gridEl) gridEl.style.transform = `translateY(${y * 0.12}px)`;
  heroEl.style.setProperty('--prlx', `${y * 0.22}px`);
}, { passive: true });

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
