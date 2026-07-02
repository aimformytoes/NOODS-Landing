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
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const nameError = document.getElementById('name-error');
  const emailError = document.getElementById('email-error');
  const hero = document.getElementById('hero');

  let lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    nameInput.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    signupForm.hidden = false;
    modalSuccess.hidden = true;
    signupForm.reset();
    clearErrors();
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

  [ctaBtn, footerCtaBtn, floatingCta].forEach(function (btn) {
    if (btn) btn.addEventListener('click', openModal);
  });

  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', function (e) {
    if (!modal.hidden && e.key === 'Escape') closeModal();
  });

  signupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    signupForm.hidden = true;
    modalSuccess.hidden = false;
  });

  const heroVideo = document.querySelector('.hero__video');
  if (heroVideo) {
    heroVideo.play().catch(function () {});
  }

  /* Scroll reveal */
  const revealEls = document.querySelectorAll('.reveal');
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
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
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
})();
