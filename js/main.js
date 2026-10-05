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
    const titleEl = document.getElementById('modal-bundle-title');
    const priceEl = document.getElementById('modal-bundle-price');
    const priceNoteEl = document.getElementById('modal-bundle-price-note');
    const listEl = document.getElementById('modal-bundle-list');

    if (titleEl && cfg.productName) {
      titleEl.textContent = cfg.productName;
    }
    if (priceEl && cfg.priceLabel) {
      priceEl.textContent = cfg.priceLabel;
    }
    if (priceNoteEl && cfg.priceNote) {
      priceNoteEl.textContent = cfg.priceNote;
    }
    if (listEl && Array.isArray(cfg.bundleItems)) {
      listEl.innerHTML = '';
      cfg.bundleItems.forEach(function (item) {
        const li = document.createElement('li');
        li.textContent = item;
        listEl.appendChild(li);
      });
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
      return;
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

  function redirectToStripe(name, email, paymentLink) {
    const url = new URL(paymentLink);
    url.searchParams.set('prefilled_email', email);
    if (name) {
      url.searchParams.set('client_reference_id', name.slice(0, 200));
    }
    window.location.href = url.toString();
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
    const hasStripe = Boolean(cfg.stripePaymentLink);
    const hasForm = Boolean(cfg.formEndpoint);

    if (signupSubmit) signupSubmit.disabled = true;
    setFormStatus(hasStripe ? 'Saving your details…' : 'Submitting…');

    try {
      await saveLead(name, email, cfg);

      if (hasStripe) {
        setFormStatus('Redirecting to secure checkout…');
        redirectToStripe(name, email, cfg.stripePaymentLink);
        return;
      }

      if (hasForm) {
        showSuccess(
          "You're reserved! We'll email you about your first bundle and PR Launch box."
        );
        return;
      }

      showSuccess(
        'Thanks! Connect Stripe and email in js/checkout-config.js to enable payments.'
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
    const shadowPath = box.querySelector('.products__noodle-loop__shadow');
    const bodyPath = box.querySelector('.products__noodle-loop__body');
    const highlightPath = box.querySelector('.products__noodle-loop__highlight');
    if (!svg || !shadowPath || !bodyPath || !highlightPath) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const measurePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let phase = 0;
    let rafId = 0;
    let running = false;

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

    function buildWavyLoop(width, height, phaseOffset, ampScale) {
      const inset = 16;
      const frameW = Math.max(40, width - inset * 2);
      const frameH = Math.max(40, height - inset * 2);
      const radius = Math.min(24, frameW * 0.12, frameH * 0.22);
      const x = inset;
      const y = inset;

      measurePath.setAttribute('d', roundedRectD(x, y, frameW, frameH, radius));
      const total = measurePath.getTotalLength();
      const samples = Math.max(160, Math.floor(total / 2));
      const amp = 13 * ampScale;
      const waves = 17;
      const parts = [];

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
        const wave = amp * Math.sin(t * waves * Math.PI * 2 + phaseOffset);
        const px = p.x + nx * wave;
        const py = p.y + ny * wave;
        parts.push((i === 0 ? 'M ' : ' L ') + px.toFixed(2) + ' ' + py.toFixed(2));
      }

      return parts.join('') + ' Z';
    }

    function render() {
      const rect = box.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));

      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

      const dBody = buildWavyLoop(width, height, phase, 1);
      const dShadow = buildWavyLoop(width, height, phase + 0.35, 1.08);
      const dHighlight = buildWavyLoop(width, height, phase + 0.12, 0.92);

      bodyPath.setAttribute('d', dBody);
      shadowPath.setAttribute('d', dShadow);
      highlightPath.setAttribute('d', dHighlight);
    }

    function tick() {
      if (!motionQuery.matches) {
        phase += 0.15;
      }
      render();
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
        render();
      });
      ro.observe(box);
    } else {
      window.addEventListener('resize', render);
    }

    motionQuery.addEventListener('change', render);
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
})();
