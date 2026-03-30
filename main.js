document.addEventListener('DOMContentLoaded', () => {

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
  });

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
  let zIndexCounter = 1000;

  function bringToFront(win) {
    zIndexCounter++;
    win.style.zIndex = zIndexCounter;
    // Update taskbar active state
    document.querySelectorAll('.task-app').forEach(app => app.classList.remove('active'));
    const taskId = win.id;
    const taskApp = document.querySelector(`.task-app[data-target="${taskId}"]`);
    if(taskApp) taskApp.classList.add('active');
  }

  windows.forEach(win => {
    win.addEventListener('mousedown', () => bringToFront(win));
    
    // Dragging logic
    const header = win.querySelector('.window-header');
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
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

  // ── Closing & Minimizing ──
  document.querySelectorAll('.close-btn, #minimizePlayer').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Find parent window
      const win = e.target.closest('.window');
      win.classList.add('hidden');
      
      // Remove or dim from taskbar
      const targetId = win.id;
      const taskApp = document.querySelector(`.task-app[data-target="${targetId}"]`);
      if(taskApp) taskApp.style.opacity = '0.5';
    });
  });

  // ── Opening from Desktop Icons / Taskbar / Start Menu ──
  const openTargets = document.querySelectorAll('.desktop-icon, .task-app, .sm-item[data-target]');
  openTargets.forEach(el => {
    el.addEventListener('click', () => {
      const targetId = el.getAttribute('data-target');
      if(targetId) {
        const win = document.getElementById(targetId);
        if(win) {
          win.classList.remove('hidden');
          // Fix taskbar opacity if it was closed
          const taskApp = document.querySelector(`.task-app[data-target="${targetId}"]`);
          if(taskApp) {
            if(!taskApp.parentElement) {
              // Add to taskbar apps if it's missing (it wasn't missing in our HTML, just dimmed)
            }
            taskApp.style.opacity = '1';
          }
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

  document.addEventListener('click', (e) => {
    if(!startMenu.contains(e.target) && !startBtn.contains(e.target)) {
      startMenu.classList.add('hidden');
      startBtn.classList.remove('active');
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

});
