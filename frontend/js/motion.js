/**
 * motion.js — Motion Engine (Lenis smooth scroll, GSAP ScrollTrigger, 3D Tilt, Custom Cursor, Scroll Progress)
 */

const Motion = (() => {
  let lenisInstance = null;

  function initLenis() {
    if (typeof Lenis === 'undefined') return;
    lenisInstance = new Lenis({
      duration: 1.2,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
    });

    function raf(time) {
      lenisInstance.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      lenisInstance.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenisInstance.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  function initScrollProgress() {
    const bar = document.createElement('div');
    bar.id = 'scrollProgressBar';
    document.body.prepend(bar);

    window.addEventListener('scroll', () => {
      const totalH = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalH > 0 ? (window.scrollY / totalH) * 100 : 0;
      bar.style.width = `${progress}%`;
    });
  }

  function initScrollReveal() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // .reveal-up & directional reveals
    gsap.utils.toArray('.reveal-up, .reveal-left, .reveal-right').forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 96%', toggleActions: 'play none none none' }
        }
      );
    });

    // .reveal-scale
    gsap.utils.toArray('.reveal-scale').forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 96%' }
        }
      );
    });

    // .stagger-grid
    gsap.utils.toArray('.stagger-grid').forEach(grid => {
      const children = grid.querySelectorAll(':scope > *');
      if (!children.length) return;
      gsap.fromTo(children,
        { opacity: 0, y: 20, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out',
          stagger: { amount: 0.2, from: 'start' },
          scrollTrigger: { trigger: grid, start: 'top 96%' }
        }
      );
    });

    // Fail-safe: ensure opacity: 1 after 350ms so no card ever remains hidden
    setTimeout(() => {
      ScrollTrigger.refresh();
      document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
        el.style.opacity = '1';
      });
    }, 350);
  }

  function initCardTilt() {
    const cards = document.querySelectorAll('.kpi-card, .panel, .clay-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        card.style.transform = `perspective(1000px) rotateX(${dy * -5}deg) rotateY(${dx * 5}deg) translateY(-4px)`;
        card.style.transition = 'transform 0.1s ease-out';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
        card.style.transition = 'transform 0.4s var(--ease-spring)';
      });
    });
  }

  function initMagneticCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;

    window.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function loop() {
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    document.addEventListener('mouseover', e => {
      const target = e.target.closest('a, button, input, select, .kpi-card, .panel, .cmd-item');
      if (target) {
        cursor.classList.add('hovering');
      } else {
        cursor.classList.remove('hovering');
      }
    });
  }

  function initRipple() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn-primary, .btn-outline, .btn-push, .sidebar-nav a');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    });
  }

  function initAll() {
    initLenis();
    initScrollProgress();
    initScrollReveal();
    initCardTilt();
    initMagneticCursor();
    initRipple();
  }

  document.addEventListener('DOMContentLoaded', initAll);

  return { initLenis, initScrollReveal, initCardTilt };
})();
