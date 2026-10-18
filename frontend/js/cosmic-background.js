/**
 * Cosmic Universe Background Engine
 * Renders an optimized, animated multi-layer starfield with twinkling stars,
 * cosmic dust particles, and handles smooth viewport resizing.
 */

(function () {
  'use strict';

  // Check reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initStarfield() {
    let canvas = document.getElementById('cosmic-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'cosmic-canvas';
      canvas.className = 'fixed inset-0 w-full h-full pointer-events-none z-0';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.prepend(canvas);
    }

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Star distribution settings
    const starCount = Math.min(220, Math.floor((width * height) / 6000));
    const stars = [];

    // Colors: Starlight white, Electric Cyan, Nebula Violet, Holographic Blue
    const starColors = [
      '#F8FAFC', // 60%
      '#F8FAFC',
      '#F8FAFC',
      '#00E5FF', // 15% Cyan
      '#7C3AED', // 15% Violet
      '#38BDF8', // 10% Holographic Blue
    ];

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.4,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        baseAlpha: Math.random() * 0.7 + 0.3,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: (Math.random() * 0.02 + 0.005) * (Math.random() < 0.5 ? 1 : -1),
        speedY: (Math.random() * 0.15 + 0.05) * (i % 3 === 0 ? 1 : 0.5), // subtle slow drift
      });
    }

    // Occasional cosmic drifting particles
    const dustParticles = [];
    const dustCount = 20;
    for (let i = 0; i < dustCount; i++) {
      dustParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 1.2,
        color: i % 2 === 0 ? 'rgba(0, 229, 255, ' : 'rgba(124, 58, 237, ',
        alpha: Math.random() * 0.4 + 0.1,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
      });
    }

    let animationFrameId;

    function render() {
      ctx.clearRect(0, 0, width, height);

      // Render Stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        if (!prefersReducedMotion) {
          s.alpha += s.twinkleSpeed;
          if (s.alpha > 1) {
            s.alpha = 1;
            s.twinkleSpeed = -Math.abs(s.twinkleSpeed);
          } else if (s.alpha < 0.2) {
            s.alpha = 0.2;
            s.twinkleSpeed = Math.abs(s.twinkleSpeed);
          }

          s.y += s.speedY * 0.3;
          if (s.y > height) {
            s.y = 0;
            s.x = Math.random() * width;
          }
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.shadowBlur = s.radius > 1.2 ? 4 : 0;
        ctx.shadowColor = s.color;
        ctx.fill();
      }

      // Render subtle drifting cosmic particles
      if (!prefersReducedMotion) {
        for (let i = 0; i < dustParticles.length; i++) {
          const d = dustParticles[i];
          d.x += d.speedX;
          d.y += d.speedY;

          if (d.x < 0) d.x = width;
          if (d.x > width) d.x = 0;
          if (d.y < 0) d.y = height;
          if (d.y > height) d.y = 0;

          ctx.beginPath();
          ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
          ctx.fillStyle = d.color + d.alpha + ')';
          ctx.shadowBlur = 8;
          ctx.shadowColor = d.color + '0.8)';
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    // Debounced Resize Listener
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }, 150);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStarfield);
  } else {
    initStarfield();
  }
})();
