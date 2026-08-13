/**
 * preloader.js — Cinematic Entrance Preloader (Counter 0-100%, Clip-Path Exit)
 */

(() => {
  if (sessionStorage.getItem('airw_preloader_shown')) {
    return; // Show preloader once per session
  }

  const preloader = document.createElement('div');
  preloader.className = 'preloader';
  preloader.innerHTML = `
    <div class="preloader-logo-mark" style="display:flex;align-items:center;justify-content:center;color:#FAF7F2;font-weight:800;font-family:var(--font-heading);font-size:18px;">RW</div>
    <div class="preloader-counter" id="preloaderCounter">0%</div>
    <div class="preloader-line" id="preloaderLine"></div>
    <div class="preloader-label">AI RETAIL WAR ROOM · DECISION INTELLIGENCE</div>
  `;
  document.body.prepend(preloader);

  const counterEl = preloader.querySelector('#preloaderCounter');
  const lineEl = preloader.querySelector('#preloaderLine');

  let progress = 0;
  const startTime = performance.now();
  const duration = 1100;

  function step(now) {
    const elapsed = now - startTime;
    progress = Math.min(Math.floor((elapsed / duration) * 100), 100);
    counterEl.textContent = `${progress}%`;
    lineEl.style.width = `${progress * 2}px`;

    if (progress < 100) {
      requestAnimationFrame(step);
    } else {
      setTimeout(() => {
        preloader.classList.add('done');
        sessionStorage.setItem('airw_preloader_shown', 'true');
        setTimeout(() => preloader.remove(), 750);
      }, 150);
    }
  }

  requestAnimationFrame(step);
})();
