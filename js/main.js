(function () {
  'use strict';

  const modal = document.getElementById('signup-modal');
  const ctaBtn = document.getElementById('cta-btn');
  const footerCtaBtn = document.getElementById('footer-cta-btn');
  const floatingCta = document.getElementById('floating-cta');
  const modalClose = document.getElementById('modal-close');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const signupForm = document.getElementById('signup-form');
  const modalSuccess = document.getElementById('modal-success');
  const signupSubmit = document.getElementById('signup-submit');
  const formStatus = document.getElementById('form-status');
  const modalSuccessText = document.getElementById('modal-success-text');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const nameError = document.getElementById('name-error');
  const emailError = document.getElementById('email-error');
  const hero = document.getElementById('hero');

  let lastFocused = null;

  function getCheckoutConfig() {
    return window.NOODS_CHECKOUT || {};
  }

  function applyCheckoutConfig() {
    const cfg = getCheckoutConfig();
    const finePrintEl = document.querySelector('.modal__fine-print');

    if (finePrintEl && cfg.finePrint) {
      finePrintEl.textContent = cfg.finePrint;
    }
    if (signupSubmit && cfg.submitLabel) {
      signupSubmit.textContent = cfg.submitLabel;
    }
  }

  function setFormStatus(message) {
    if (formStatus) {
      formStatus.textContent = message || '';
    }
  }

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setFormStatus('');
    nameInput.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    signupForm.hidden = false;
    modalSuccess.hidden = true;
    signupForm.reset();
    clearErrors();
    setFormStatus('');
    if (signupSubmit) {
      signupSubmit.disabled = false;
    }
    if (lastFocused) lastFocused.focus();
  }

  function clearErrors() {
    nameError.textContent = '';
    emailError.textContent = '';
    nameInput.classList.remove('is-error');
    emailInput.classList.remove('is-error');
  }

  function validate() {
    clearErrors();
    let valid = true;

    if (!nameInput.value.trim()) {
      nameError.textContent = 'Please enter your name.';
      nameInput.classList.add('is-error');
      valid = false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim()) {
      emailError.textContent = 'Please enter your email.';
      emailInput.classList.add('is-error');
      valid = false;
    } else if (!emailPattern.test(emailInput.value.trim())) {
      emailError.textContent = 'Please enter a valid email address.';
      emailInput.classList.add('is-error');
      valid = false;
    }

    return valid;
  }

  async function saveLead(name, email, cfg) {
    if (!cfg.formEndpoint) {
      throw new Error('Waitlist is not connected yet. Add your Formspree URL in js/checkout-config.js.');
    }

    const response = await fetch(cfg.formEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: name,
        email: email,
        product: cfg.productName || 'First Bundle Release + PR Launch Box',
        source: 'noods-landing',
      }),
    });

    if (!response.ok) {
      throw new Error('We could not save your email. Please try again.');
    }
  }

  function showSuccess(message) {
    signupForm.hidden = true;
    modalSuccess.hidden = false;
    if (modalSuccessText && message) {
      modalSuccessText.textContent = message;
    }
  }

  applyCheckoutConfig();

  [ctaBtn, footerCtaBtn, floatingCta].forEach(function (btn) {
    if (btn) btn.addEventListener('click', openModal);
  });

  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', function (e) {
    if (!modal.hidden && e.key === 'Escape') closeModal();
  });

  signupForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validate()) return;

    const cfg = getCheckoutConfig();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (signupSubmit) signupSubmit.disabled = true;
    setFormStatus('Submitting…');

    try {
      await saveLead(name, email, cfg);
      showSuccess(
        cfg.successMessage ||
          "You're on the list! We'll email you about the first bundle and PR Launch box."
      );
    } catch (err) {
      setFormStatus(err.message || 'Something went wrong. Please try again.');
      if (signupSubmit) signupSubmit.disabled = false;
    }
  });

  const heroVideo = document.querySelector('.hero__video');
  if (heroVideo) {
    heroVideo.play().catch(function () {});
  }

  /* Scroll reveal */
  const revealEls = document.querySelectorAll('.reveal, .product-reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -24px 0px' }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* Fixed logo appears after scrolling past hero */
  const siteLogo = document.getElementById('site-logo');
  if (siteLogo && hero) {
    const logoObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          siteLogo.classList.toggle('site-logo--hidden', entry.isIntersecting);
        });
      },
      { threshold: 0.15 }
    );
    logoObserver.observe(hero);
  }

  /* Floating CTA after hero */
  if (floatingCta && hero) {
    const heroObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          floatingCta.hidden = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    heroObserver.observe(hero);
  }

  /* Products title: one continuous noodle worm around the full border */
  function initProductsNoodleBorder() {
    const box = document.querySelector('[data-noodle-border]');
    if (!box) return;

    const svg = box.querySelector('.products__noodle-loop');
    const fillPath = box.querySelector('.products__noodle-loop__fill');
    const shadowPath = box.querySelector('.products__noodle-loop__shadow');
    const bodyPath = box.querySelector('.products__noodle-loop__body');
    const highlightPath = box.querySelector('.products__noodle-loop__highlight');
    if (!svg || !fillPath || !shadowPath || !bodyPath || !highlightPath) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const measurePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const WIGGLE_SPEED = 2.4;
    let rafId = 0;
    let running = false;
    let lastPhase = 0;

    function closedSplinePath(points) {
      const n = points.length;
      if (n < 4) return '';

      let d = 'M ' + points[0].x.toFixed(2) + ' ' + points[0].y.toFixed(2);
      for (let i = 0; i < n; i += 1) {
        const p0 = points[(i - 1 + n) % n];
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        const p3 = points[(i + 2) % n];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ' C ' +
          cp1x.toFixed(2) + ' ' + cp1y.toFixed(2) + ', ' +
          cp2x.toFixed(2) + ' ' + cp2y.toFixed(2) + ', ' +
          p2.x.toFixed(2) + ' ' + p2.y.toFixed(2);
      }
      return d + ' Z';
    }

    function roundedRectD(x, y, w, h, r) {
      return (
        'M ' + (x + r) + ' ' + y +
        ' H ' + (x + w - r) +
        ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) +
        ' V ' + (y + h - r) +
        ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) +
        ' H ' + (x + r) +
        ' A ' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r) +
        ' V ' + (y + r) +
        ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y +
        ' Z'
      );
    }

    const LOOP_INSET = 16;
    const LOOP_AMP = 12;
    const LOOP_WAVES = 14;
    const FILL_PULL_IN = 10.5;

    function buildWavyLoop(width, height, phaseOffset, pullInward) {
      const inset = LOOP_INSET;
      const frameW = Math.max(40, width - inset * 2);
      const frameH = Math.max(40, height - inset * 2);
      const radius = Math.min(24, frameW * 0.12, frameH * 0.22);
      const x = inset;
      const y = inset;

      measurePath.setAttribute('d', roundedRectD(x, y, frameW, frameH, radius));
      const total = measurePath.getTotalLength();
      const samples = Math.max(72, Math.min(120, Math.floor(total / 4)));
      const points = [];

      for (let i = 0; i < samples; i += 1) {
        const t = i / samples;
        const len = t * total;
        const p = measurePath.getPointAtLength(len);
        const pNext = measurePath.getPointAtLength((len + total / samples) % total);
        const dx = pNext.x - p.x;
        const dy = pNext.y - p.y;
        const mag = Math.hypot(dx, dy) || 1;
        const nx = dy / mag;
        const ny = -dx / mag;
        const wave = LOOP_AMP * Math.sin(t * LOOP_WAVES * Math.PI * 2 + phaseOffset);
        const radial = wave - pullInward;
        points.push({ x: p.x + nx * radial, y: p.y + ny * radial });
      }

      return closedSplinePath(points);
    }

    function render(phase) {
      const rect = box.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));

      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

      const dFill = buildWavyLoop(width, height, phase, FILL_PULL_IN);
      const dNoodle = buildWavyLoop(width, height, phase, 0);

      fillPath.setAttribute('d', dFill);
      shadowPath.setAttribute('d', dNoodle);
      bodyPath.setAttribute('d', dNoodle);
      highlightPath.setAttribute('d', dNoodle);
    }

    function tick(now) {
      lastPhase = motionQuery.matches ? 0 : (now / 1000) * WIGGLE_SPEED;
      render(lastPhase);
      rafId = window.requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      rafId = window.requestAnimationFrame(tick);
    }

    function stop() {
      running = false;
      window.cancelAnimationFrame(rafId);
    }

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(function () {
        render(lastPhase);
      });
      ro.observe(box);
    } else {
      window.addEventListener('resize', function () {
        render(lastPhase);
      });
    }

    motionQuery.addEventListener('change', function () {
      render(lastPhase);
    });
    start();

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });
  }

  initProductsNoodleBorder();

  /* Flavors: three cups orbiting on an ellipse, front cup in the middle */
  function initFlavorCarousel() {
    const carousel = document.querySelector('[data-flavor-carousel]');
    if (!carousel) return;

    const stage = carousel.querySelector('.flavors__stage');
    const cups = Array.prototype.slice.call(carousel.querySelectorAll('.flavor-cup'));
    const nameEl = carousel.querySelector('.flavors__name');
    const prevBtn = carousel.querySelector('[data-flavor-prev]');
    const nextBtn = carousel.querySelector('[data-flavor-next]');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const count = cups.length;
    const step = 360 / count;
    const SPIN_MS = 1100;
    const AUTOPLAY_MS = 3400;

    let rotation = 0;
    let index = 0;
    let animId = 0;
    let autoplayId = 0;
    let paused = false;
    let inView = false;

    function easeOutBack(t) {
      const c1 = 1.3;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    function layout() {
      const rx = stage.clientWidth * 0.36;
      const ry = stage.clientHeight * 0.1;

      cups.forEach(function (cup, i) {
        const theta = ((i * step - rotation) * Math.PI) / 180;
        const depth = (Math.cos(theta) + 1) / 2;
        const x = Math.sin(theta) * rx;
        const y = -(1 - depth) * ry * 2;
        const scale = 0.8 + 0.2 * depth;
        const tilt = Math.sin(theta) * -10;

        cup.style.transform =
          'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) ' +
          'scale(' + scale.toFixed(3) + ') rotate(' + tilt.toFixed(2) + 'deg)';
        cup.style.zIndex = String(Math.round(depth * 100));
        cup.style.filter = 'brightness(' + (0.82 + 0.18 * depth).toFixed(3) + ')';
        cup.setAttribute('aria-hidden', depth > 0.95 ? 'false' : 'true');
      });
    }

    function spinTo(target) {
      window.cancelAnimationFrame(animId);
      index = ((Math.round(target / step) % count) + count) % count;
      if (nameEl) nameEl.textContent = cups[index].getAttribute('data-name');

      if (motionQuery.matches) {
        rotation = target;
        layout();
        return;
      }

      const from = rotation;
      const start = performance.now();

      function frame(now) {
        const t = Math.min(1, (now - start) / SPIN_MS);
        rotation = from + (target - from) * easeOutBack(t);
        layout();
        if (t < 1) animId = window.requestAnimationFrame(frame);
      }
      animId = window.requestAnimationFrame(frame);
    }

    function go(delta) {
      const base = Math.round(rotation / step) * step;
      spinTo(base + delta * step);
    }

    function goToCup(i) {
      let delta = (i - index + count) % count;
      if (delta > count / 2) delta -= count;
      if (delta !== 0) go(delta);
    }

    function stopAutoplay() {
      window.clearInterval(autoplayId);
      autoplayId = 0;
    }

    function startAutoplay() {
      stopAutoplay();
      if (motionQuery.matches || paused || !inView || document.hidden) return;
      autoplayId = window.setInterval(function () { go(1); }, AUTOPLAY_MS);
    }

    function userGo(fn) {
      fn();
      startAutoplay();
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { userGo(function () { go(-1); }); });
    if (nextBtn) nextBtn.addEventListener('click', function () { userGo(function () { go(1); }); });

    cups.forEach(function (cup, i) {
      cup.addEventListener('click', function () { userGo(function () { goToCup(i); }); });
    });

    carousel.addEventListener('mouseenter', function () { paused = true; stopAutoplay(); });
    carousel.addEventListener('mouseleave', function () { paused = false; startAutoplay(); });

    let swipeX = null;
    stage.addEventListener('pointerdown', function (e) { swipeX = e.clientX; });
    stage.addEventListener('pointerup', function (e) {
      if (swipeX === null) return;
      const dx = e.clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 40) userGo(function () { go(dx < 0 ? 1 : -1); });
    });

    document.addEventListener('visibilitychange', startAutoplay);
    window.addEventListener('resize', layout);
    layout();

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          inView = entry.isIntersecting;
          if (inView && !carousel.classList.contains('is-popped')) {
            carousel.classList.add('is-popped');
            window.setTimeout(startAutoplay, 1600);
          } else if (inView) {
            startAutoplay();
          } else {
            stopAutoplay();
          }
        });
      }, { threshold: 0.3 });
      io.observe(carousel);
    } else {
      carousel.classList.add('is-popped');
      inView = true;
      startAutoplay();
    }
  }

  initFlavorCarousel();
})();
