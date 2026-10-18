/**
 * Cosmic Universe Background Engine & Animation System
 * Features:
 * 1. Multi-layer twinkling starfield with subtle drifting cosmic dust and shooting stars.
 * 2. Cinematic Hyperspace Warp entrance on initial visit (respects session & reduced motion).
 * 3. Rotating Hero Planet cursor-responsive parallax interaction.
 * 4. Cosmic Particle Celebration emitter after genuine 201 Created registration.
 * 5. Floating Cosmic Companion reactions and telemetry pings.
 */

(function () {
  'use strict';

  // Check reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFirstVisitInSession = !sessionStorage.getItem('zenith_hyperspace_seen');

  let canvas, ctx;
  let width, height;
  let centerX, centerY;
  let stars = [];
  let shootingStars = [];
  let celebrationParticles = [];
  let dustParticles = [];

  // Hyperspace state
  let isHyperspace = !prefersReducedMotion && isFirstVisitInSession;
  let hyperspaceStartTime = 0;
  const HYPERSPACE_DURATION = 1400; // 1.4 seconds total entrance

  // -------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------
  function initEngine() {
    canvas = document.getElementById('cosmic-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'cosmic-canvas';
      canvas.className = 'fixed inset-0 w-full h-full pointer-events-none z-0';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.prepend(canvas);
    }

    ctx = canvas.getContext('2d');
    resize();

    initStarfield();
    initHeroPlanetParallax();
    initCompanionInteractions();

    if (isHyperspace) {
      hyperspaceStartTime = performance.now();
      sessionStorage.setItem('zenith_hyperspace_seen', 'true');
    }

    requestAnimationFrame(renderLoop);

    window.addEventListener('resize', debounce(resize, 150));
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    centerX = width / 2;
    centerY = height / 2;
  }

  // -------------------------------------------------------------
  // Starfield Setup
  // -------------------------------------------------------------
  function initStarfield() {
    stars = [];
    const starCount = Math.min(220, Math.floor((width * height) / 5500));

    // Color distribution: Dim white (70%), Muted lavender (15%), Holographic blue (10%), Restrained cyan (5%)
    const starColors = [
      '#F8FAFC', '#F8FAFC', '#F8FAFC', '#F8FAFC',
      '#B8B5E8',
      '#38BDF8',
      '#00E5FF',
    ];

    for (let i = 0; i < starCount; i++) {
      const distFromCenter = Math.random() * Math.max(width, height) * 0.7 + 10;
      const angle = Math.random() * Math.PI * 2;

      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        originDist: distFromCenter,
        angle: angle,
        warpSpeed: Math.random() * 8 + 6,
        radius: Math.random() * 1.4 + 0.4,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        alpha: Math.random() * 0.7 + 0.25,
        twinkleSpeed: (Math.random() * 0.015 + 0.005) * (Math.random() < 0.5 ? 1 : -1),
        driftY: (Math.random() * 0.12 + 0.04),
      });
    }

    // Occasional cosmic drifting dust particles
    dustParticles = [];
    const dustCount = Math.min(18, Math.floor(width / 70));
    for (let i = 0; i < dustCount; i++) {
      dustParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 1,
        color: i % 2 === 0 ? 'rgba(0, 229, 255, ' : 'rgba(124, 58, 237, ',
        alpha: Math.random() * 0.35 + 0.08,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: (Math.random() - 0.5) * 0.15,
      });
    }

    // Shooting star scheduler (Intermittent, every 5-9 seconds)
    if (!prefersReducedMotion) {
      scheduleShootingStar();
    }
  }

  function scheduleShootingStar() {
    const nextInterval = Math.random() * 4000 + 5000;
    setTimeout(() => {
      spawnShootingStar();
      scheduleShootingStar();
    }, nextInterval);
  }

  function spawnShootingStar() {
    if (isHyperspace || prefersReducedMotion) return;

    const startX = Math.random() * width * 0.8;
    const startY = Math.random() * (height * 0.4);
    const length = Math.random() * 90 + 70;
    const speed = Math.random() * 9 + 8;
    const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.2; // approx 45 degrees

    shootingStars.push({
      x: startX,
      y: startY,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      length: length,
      alpha: 1.0,
      fadeSpeed: 0.02,
    });
  }

  // -------------------------------------------------------------
  // Main Canvas Render Loop
  // -------------------------------------------------------------
  function renderLoop(currentTime) {
    ctx.clearRect(0, 0, width, height);

    // 1. Hyperspace Entrance Phase
    if (isHyperspace) {
      const elapsed = currentTime - hyperspaceStartTime;
      const progress = Math.min(1.0, elapsed / HYPERSPACE_DURATION);

      renderHyperspace(progress);

      if (progress >= 1.0) {
        isHyperspace = false;
        // Notify document that entrance completed
        document.body.classList.remove('hyperspace-active');
        document.body.classList.add('hyperspace-arrived');
      }
    } else {
      // 2. Normal Subtle Starfield & Nebula Dust
      renderStandardStarfield();
      renderShootingStars();
    }

    // 3. Render any active celebratory particles
    renderCelebrationParticles();

    requestAnimationFrame(renderLoop);
  }

  // -------------------------------------------------------------
  // Hyperspace Warp Animation (Phase 1, 2, 3)
  // -------------------------------------------------------------
  function renderHyperspace(progress) {
    // Warp speed curve: ease-in, peak speed at 0.5, gentle deceleration at 0.8 -> 1.0
    let streakMultiplier;
    if (progress < 0.6) {
      streakMultiplier = (progress / 0.6) * 35;
    } else {
      streakMultiplier = (1 - (progress - 0.6) / 0.4) * 35;
    }

    ctx.save();
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];

      // Stretch outwards radially from center
      const dx = Math.cos(s.angle);
      const dy = Math.sin(s.angle);
      s.originDist += s.warpSpeed * (streakMultiplier * 0.25 + 1);

      if (s.originDist > Math.max(width, height)) {
        s.originDist = Math.random() * 40 + 10;
        s.angle = Math.random() * Math.PI * 2;
      }

      const px = centerX + Math.cos(s.angle) * s.originDist;
      const py = centerY + Math.sin(s.angle) * s.originDist;

      const tailLength = Math.max(2, streakMultiplier * (s.warpSpeed * 0.4));
      const tx = px - dx * tailLength;
      const ty = py - dy * tailLength;

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(px, py);
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = Math.min(1.0, s.alpha * (streakMultiplier * 0.05 + 0.4));
      ctx.lineWidth = s.radius > 1.2 ? 1.8 : 1.0;
      ctx.stroke();
    }
    ctx.restore();
  }

  // -------------------------------------------------------------
  // Standard Subtle Starfield Rendering
  // -------------------------------------------------------------
  function renderStandardStarfield() {
    // Draw Stars
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];

      if (!prefersReducedMotion) {
        s.alpha += s.twinkleSpeed;
        if (s.alpha > 0.95) {
          s.alpha = 0.95;
          s.twinkleSpeed = -Math.abs(s.twinkleSpeed);
        } else if (s.alpha < 0.2) {
          s.alpha = 0.2;
          s.twinkleSpeed = Math.abs(s.twinkleSpeed);
        }

        s.y += s.driftY * 0.35;
        if (s.y > height) {
          s.y = 0;
          s.x = Math.random() * width;
        }
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha;
      if (s.color === '#00E5FF' && s.radius > 1.0) {
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#00E5FF';
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    }

    // Draw Drifting Cosmic Dust
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
        ctx.shadowBlur = 6;
        ctx.shadowColor = d.color + '0.7)';
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }

  // -------------------------------------------------------------
  // Shooting Stars Rendering
  // -------------------------------------------------------------
  function renderShootingStars() {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const st = shootingStars[i];
      st.x += st.dx;
      st.y += st.dy;
      st.alpha -= st.fadeSpeed;

      if (st.alpha <= 0 || st.x > width + 100 || st.y > height + 100) {
        shootingStars.splice(i, 1);
        continue;
      }

      const tailX = st.x - (st.dx / Math.hypot(st.dx, st.dy)) * st.length;
      const tailY = st.y - (st.dy / Math.hypot(st.dx, st.dy)) * st.length;

      const grad = ctx.createLinearGradient(tailX, tailY, st.x, st.y);
      grad.addColorStop(0, 'rgba(124, 58, 237, 0)');
      grad.addColorStop(0.7, 'rgba(0, 229, 255, ' + st.alpha * 0.6 + ')');
      grad.addColorStop(1, 'rgba(248, 250, 252, ' + st.alpha + ')');

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(st.x, st.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00E5FF';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // -------------------------------------------------------------
  // Cosmic Particle Celebration Emitter (Feature 3)
  // -------------------------------------------------------------
  window.triggerCosmicCelebration = function (target) {
    if (prefersReducedMotion) return;

    let originX = width / 2;
    let originY = height / 2;

    if (target) {
      if (typeof target.getBoundingClientRect === 'function') {
        const rect = target.getBoundingClientRect();
        originX = rect.left + rect.width / 2;
        originY = rect.top + rect.height / 2;
      } else if (typeof target.x === 'number' && typeof target.y === 'number') {
        originX = target.x;
        originY = target.y;
      }
    }

    const particleCount = 55;
    const colors = ['#00E5FF', '#7C3AED', '#38BDF8', '#F8FAFC', '#A855F7'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 4.5 + 2.0;

      celebrationParticles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        decay: Math.random() * 0.018 + 0.015,
        alpha: 1.0,
        radius: Math.random() * 2.2 + 1.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.1,
      });
    }

    // Trigger companion celebration spin & sonar pulse
    window.dispatchEvent(new CustomEvent('cosmic-success'));
  };

  function renderCelebrationParticles() {
    if (celebrationParticles.length === 0) return;

    for (let i = celebrationParticles.length - 1; i >= 0; i--) {
      const p = celebrationParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96; // soft deceleration
      p.vy *= 0.96;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        celebrationParticles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // -------------------------------------------------------------
  // Rotating Hero Planet Cursor Parallax (Feature 5)
  // -------------------------------------------------------------
  function initHeroPlanetParallax() {
    const planetSphere = document.getElementById('hero-planet-sphere');
    const heroSection = document.getElementById('hero-section');

    if (!planetSphere || prefersReducedMotion) return;

    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let isTracking = false;

    window.addEventListener('mousemove', (e) => {
      // Small angular offset: Max ±10px
      const normX = (e.clientX / width - 0.5) * 2;
      const normY = (e.clientY / height - 0.5) * 2;
      targetX = normX * 10;
      targetY = normY * 10;
      isTracking = true;
    });

    document.addEventListener('mouseleave', () => {
      targetX = 0;
      targetY = 0;
      isTracking = false;
    });

    // Smooth damping loop for planet parallax
    function updatePlanetParallax() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      if (planetSphere) {
        planetSphere.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      }
      requestAnimationFrame(updatePlanetParallax);
    }

    updatePlanetParallax();
  }

  // -------------------------------------------------------------
  // Floating Cosmic Companion Setup (Feature 4)
  // -------------------------------------------------------------
  function initCompanionInteractions() {
    const companion = document.getElementById('cosmic-companion');
    if (!companion) return;

    // Listen for genuine registration success celebration
    window.addEventListener('cosmic-success', () => {
      companion.classList.add('companion-celebrate');
      const ping = document.getElementById('companion-ping');
      if (ping) {
        ping.classList.remove('hidden');
        ping.classList.add('animate-ping');
        setTimeout(() => ping.classList.add('hidden'), 2000);
      }
      setTimeout(() => {
        companion.classList.remove('companion-celebrate');
      }, 1500);
    });
  }

  // Utility: Debounce
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Boot on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEngine);
  } else {
    initEngine();
  }
})();
