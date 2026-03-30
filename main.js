document.addEventListener('DOMContentLoaded', () => {

  // Clean up any lingering hashes like #vibe from legacy cache
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  // ── Boot Sequence ──
  const startup = document.getElementById('startup');
  const enterBtn = document.getElementById('enterBtn');
  
  // Show enter button after boot sequence (approx 3.5s)
  setTimeout(() => {
    enterBtn.classList.remove('hidden');
  }, 3500);

  enterBtn.addEventListener('click', () => {
    startup.style.opacity = '0';
    setTimeout(() => {
      startup.style.display = 'none';
      initDesktop();
    }, 500);
    // Auto-play music on first interaction
    bgMusic.play().catch(e => console.log('Audio autoplay prevented:', e));
  });

  // ── Music Player ──
  const bgMusic = new Audio('music.mp3');
  bgMusic.loop = true;
  const timeDisplay = document.getElementById('winamp-time');

  bgMusic.addEventListener('timeupdate', () => {
    const mins = Math.floor(bgMusic.currentTime / 60);
    const secs = Math.floor(bgMusic.currentTime % 60);
    if (timeDisplay) {
      timeDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  });

  document.getElementById('btn-play')?.addEventListener('click', () => bgMusic.play());
  document.getElementById('btn-pause')?.addEventListener('click', () => bgMusic.pause());
  document.getElementById('btn-stop')?.addEventListener('click', () => {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  });
  // Simple previous/next just restart the song for now since it's a single track
  document.getElementById('btn-prev')?.addEventListener('click', () => bgMusic.currentTime = 0);
  document.getElementById('btn-next')?.addEventListener('click', () => bgMusic.currentTime = 0);

  function initDesktop() {
    updateClock();
    setInterval(updateClock, 1000);
  }

  // ── Clock ──
  function updateClock() {
    const clockIcon = document.getElementById('clock');
    const now = new Date();
    let hours = now.getHours();
    let mins = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    mins = mins < 10 ? '0' + mins : mins;
    clockIcon.innerText = `${hours}:${mins} ${ampm}`;
  }

  // ── Window Management ──
  const windows = document.querySelectorAll('.window');
  const taskbarApps = document.getElementById('taskbar-apps');
  let zIndexCounter = 1000;

  function createTaskbarItem(winId, title) {
    let taskApp = document.querySelector(`.task-app[data-target="${winId}"]`);
    if (!taskApp) {
      taskApp = document.createElement('div');
      taskApp.className = 'task-app active';
      taskApp.setAttribute('data-target', winId);
      taskApp.innerText = title;
      taskApp.addEventListener('click', () => {
        const win = document.getElementById(winId);
        if (win.classList.contains('hidden')) {
          win.classList.remove('hidden');
          bringToFront(win);
        } else if (win.style.zIndex == zIndexCounter) {
          // If already active at top, minimize it
          win.classList.add('hidden');
          taskApp.classList.remove('active');
        } else {
          bringToFront(win);
        }
      });
      taskbarApps.appendChild(taskApp);
    }
  }

  function bringToFront(win) {
    if (win.classList.contains('hidden')) return;
    zIndexCounter++;
    win.style.zIndex = zIndexCounter;
    // Update taskbar active state
    document.querySelectorAll('.task-app').forEach(app => app.classList.remove('active'));
    const taskId = win.id;
    const taskApp = document.querySelector(`.task-app[data-target="${taskId}"]`);
    if (taskApp) taskApp.classList.add('active');
  }

  windows.forEach(win => {
    // Determine initial taskbar state
    if (!win.classList.contains('hidden')) {
      const title = win.getAttribute('data-title') || win.id;
      createTaskbarItem(win.id, title);
    }

    win.addEventListener('mousedown', () => bringToFront(win));
    
    // Dragging logic
    const header = win.querySelector('.window-header');
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
      // Prevent drag if clicking a button
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = win.offsetLeft;
      initialTop = win.offsetTop;
      
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      bringToFront(win);
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      if (win.classList.contains('maximized')) return; // Disable drag if maximized
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      win.style.left = `${initialLeft + dx}px`;
      win.style.top = `${initialTop + dy}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = '';
    });
  });

  // ── Buttons ──
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-btn')) {
      const win = e.target.closest('.window');
      win.classList.add('hidden');
      const taskApp = document.querySelector(`.task-app[data-target="${win.id}"]`);
      if (taskApp) taskApp.remove();
    }
    
    if (e.target.classList.contains('min-btn')) {
      const win = e.target.closest('.window');
      win.classList.add('hidden');
      const taskApp = document.querySelector(`.task-app[data-target="${win.id}"]`);
      if (taskApp) taskApp.classList.remove('active');
    }

    if (e.target.classList.contains('max-btn')) {
      const win = e.target.closest('.window');
      win.classList.toggle('maximized');
    }
  });

  // ── Opening from Desktop Icons / Start Menu ──
  const openTargets = document.querySelectorAll('.desktop-icon, .sm-item[data-target]');
  openTargets.forEach(el => {
    el.addEventListener('click', () => {
      const targetId = el.getAttribute('data-target');
      if(targetId) {
        const win = document.getElementById(targetId);
        if(win) {
          win.classList.remove('hidden');
          const title = win.getAttribute('data-title') || targetId;
          createTaskbarItem(targetId, title);
          bringToFront(win);
        }
      }
    });
  });

  // ── Start Menu Toggle ──
  const startBtn = document.getElementById('start-btn');
  const startMenu = document.getElementById('start-menu');
  
  startBtn.addEventListener('click', (e) => {
    startMenu.classList.toggle('hidden');
    startBtn.classList.toggle('active');
    e.stopPropagation();
  });

  // ── Volume Control ──
  const volIcon = document.getElementById('vol-icon');
  const volPopup = document.getElementById('volume-popup');
  const volSlider = document.getElementById('vol-slider');

  if (volIcon && volPopup && volSlider) {
    volIcon.addEventListener('click', (e) => {
      volPopup.classList.toggle('hidden');
      e.stopPropagation();
    });

    volSlider.addEventListener('input', (e) => {
      if (typeof bgMusic !== 'undefined') {
        bgMusic.volume = e.target.value;
      }
    });
  }

  document.addEventListener('click', (e) => {
    if(!startMenu.contains(e.target) && !startBtn.contains(e.target)) {
      startMenu.classList.add('hidden');
      startBtn.classList.remove('active');
    }
    if(volPopup && !volPopup.contains(e.target) && !volIcon.contains(e.target)) {
      volPopup.classList.add('hidden');
    }
  });

  // Shut down feature (just reloads for fun)
  document.getElementById('shutDown')?.addEventListener('click', () => {
    document.body.innerHTML = '<div style="background:black; color:white; height:100vh; display:flex; align-items:center; justify-content:center; font-family:monospace; font-size:2rem;">It is now safe to turn off your computer.</div>';
  });

  // ── Sparkle Cursor ──
  const sparkleContainer = document.getElementById('sparkle-container');
  let lastSparkleTime = 0;

  document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastSparkleTime > 30) { // Limit sparkle creation rate
      createSparkle(e.clientX, e.clientY);
      lastSparkleTime = now;
    }
  });

  function createSparkle(x, y) {
    if(!sparkleContainer) return;
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    // Add small random offset
    sparkle.style.left = (x - 7 + (Math.random() * 10 - 5)) + 'px';
    sparkle.style.top = (y - 7 + (Math.random() * 10 - 5)) + 'px';
    
    sparkleContainer.appendChild(sparkle);
    
    // Clean up
    setTimeout(() => {
      if(sparkle.parentNode) {
        sparkle.parentNode.removeChild(sparkle);
      }
    }, 800);
  }

  // ── Quiz Games Logic ──
  function setupQuiz(formId, resId, checkMap, successMsg, okMsg, failMsg) {
    const form = document.getElementById(formId);
    if (!form) return;
    const res = document.getElementById(resId);
    
    // Pagination logic
    const blocks = Array.from(form.querySelectorAll('.q-block'));
    const prevBtn = form.querySelector('.prev-btn');
    const nextBtn = form.querySelector('.next-btn');
    const submitBtn = form.querySelector('.submit-btn');
    let currentIndex = 0;

    const updateView = () => {
      blocks.forEach((b, i) => {
        if (i === currentIndex) {
          b.classList.remove('hidden');
        } else {
          b.classList.add('hidden');
        }
      });
      
      if (prevBtn) prevBtn.classList.toggle('hidden', currentIndex === 0);
      
      if (currentIndex === blocks.length - 1) {
        if (nextBtn) nextBtn.classList.add('hidden');
        if (submitBtn) submitBtn.classList.remove('hidden');
      } else {
        if (nextBtn) nextBtn.classList.remove('hidden');
        if (submitBtn) submitBtn.classList.add('hidden');
      }
    };

    if (nextBtn) nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentIndex < blocks.length - 1) currentIndex++;
      updateView();
    });

    if (prevBtn) prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentIndex > 0) currentIndex--;
      updateView();
    });

    // Initialize first block visible, hide others
    updateView();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (currentIndex < blocks.length - 1) {
        currentIndex++;
        updateView();
        return;
      }
      let score = 0;
      const fd = new FormData(form);
      
      const checkText = (key, validArr) => {
        const val = (fd.get(key) || '').trim().toLowerCase();
        if (validArr.some(v => val.includes(v))) score++;
      };
      
      const checkRadio = (key, valid) => {
        if (fd.get(key) === valid) score++;
      };

      // Run specific checks
      checkMap(checkText, checkRadio);
      
      res.classList.remove('hidden');
      if (score === blocks.length) {
        res.innerHTML = `Score: ${score}/${blocks.length}<br>${successMsg}`;
      } else if (score >= Math.floor(blocks.length * 0.7)) {
        res.innerHTML = `Score: ${score}/${blocks.length}<br>${okMsg}`;
      } else {
        res.innerHTML = `Score: ${score}/${blocks.length}<br>${failMsg}`;
      }
      
      // Hide buttons so they can't submit repeatedly
      if (prevBtn) prevBtn.classList.add('hidden');
      if (nextBtn) nextBtn.classList.add('hidden');
      if (submitBtn) submitBtn.classList.add('hidden');
    });
  }

  setupQuiz('form-game1', 'res-game1', (checkText, checkRadio) => {
    checkText('g1q1', ['filipino', 'philippines', 'pinay']);
    checkRadio('g1q2', 'cbr');
    checkText('g1q3', ['19', 'nineteen']);
    checkRadio('g1q4', 'kardashians');
    checkText('g1q5', ['rn', 'registered nurse']);
    checkRadio('g1q6', 'going_out');
    checkRadio('g1q7', 'true');
    checkRadio('g1q8', 'nars');
    checkRadio('g1q9', 'brandy');
    checkText('g1q10', ['yo mama', 'yo momma']);
  }, "OMG you're my literal bestie!! ✨", "Pretty good! You definitely know me. 🎀", "Oof... we need to hang out more. 🥲");

  setupQuiz('form-game2', 'res-game2', (checkText, checkRadio) => {
    checkRadio('g2q1', 'lake');
    checkRadio('g2q2', 'kubota');
    checkRadio('g2q3', 'andrew');
    checkText('g2q4', ['1/16/2025', '01/16/2025', '1/16/25', '01/16/25', 'jan 16']);
    checkRadio('g2q5', 'dave');
    checkRadio('g2q6', 'keila');
    checkRadio('g2q7', 'charlotte');
    checkText('g2q8', ['lucifer']);
    checkText('g2q9', ['booyah']);
    checkText('g2q10', ['married', 'marriage']);
  }, "You guys are soulmates! 💖💍", "Aww, you got most of them right! 🥰", "Did you guys just meet?? 😭");

});
