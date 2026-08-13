/**
 * particles.js — Floating Dust Particle Canvas
 */

class DustParticleSystem {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'dustParticleCanvas';
    this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:1;opacity:0.6;';
    document.body.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.resize();
    this.init();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  init() {
    const count = Math.floor((this.width * this.height) / 35000);
    this.particles = Array.from({ length: Math.min(count, 40) }, () => this.spawn());
    this.loop();
  }

  spawn() {
    const colors = [
      'rgba(184, 92, 56, ',   // Terracotta
      'rgba(196, 135, 42, ',  // Amber
      'rgba(90, 125, 95, '    // Sage
    ];
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      r: Math.random() * 2.2 + 0.6,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2 - 0.05,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.25 + 0.08,
    };
  }

  loop() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color + p.opacity + ')';
      this.ctx.fill();
    });
    requestAnimationFrame(() => this.loop());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new DustParticleSystem();
});
