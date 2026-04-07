/* ==========================================================================
   Design Mindset Agency — script.js
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. Page Load Reveal
     ------------------------------------------------------------------------ */
  window.addEventListener('load', function () {
    document.body.classList.add('ready');
  });

  // Safety net: reveal body after 2 s even if the load event never fires
  setTimeout(function () {
    document.body.classList.add('ready');
  }, 2000);

  /* ------------------------------------------------------------------------
     2. Sticky Header on Scroll
     ------------------------------------------------------------------------ */
  var header = document.getElementById('header');

  function onScroll() {
    if (window.scrollY > 60) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* ------------------------------------------------------------------------
     3. Mobile Navigation Toggle
     ------------------------------------------------------------------------ */
  var navToggle = document.getElementById('navToggle');
  var nav       = document.getElementById('nav');

  function openNav() {
    nav.classList.add('open');
    navToggle.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    nav.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  navToggle.addEventListener('click', function () {
    if (nav.classList.contains('open')) {
      closeNav();
    } else {
      openNav();
    }
  });

  // Close on nav link click
  nav.querySelectorAll('.nav__link').forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      closeNav();
    }
  });

  /* ------------------------------------------------------------------------
     4. Smooth Scroll for All Anchor Links
     ------------------------------------------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      var target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      var headerH = header.offsetHeight;
      var targetY = target.getBoundingClientRect().top + window.scrollY - headerH;

      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  });

  /* ------------------------------------------------------------------------
     5. Scroll Reveal — Intersection Observer
     ------------------------------------------------------------------------ */
  var revealItems = document.querySelectorAll('.reveal');

  // Add stagger delays to grid children
  var staggerParents = document.querySelectorAll(
    '.services__grid, .proof__grid'
  );

  staggerParents.forEach(function (parent) {
    var children = parent.querySelectorAll('.reveal');
    children.forEach(function (child, i) {
      // Stagger within same row: cap at 4 items wide, so delay resets per row
      var delay = (i % 4) * 0.1;
      child.style.transitionDelay = delay + 's';
    });
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    revealItems.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: show everything immediately
    revealItems.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  /* ------------------------------------------------------------------------
     6. Contact Form — Validation & Formspree Submission
     ------------------------------------------------------------------------ */
  var form        = document.getElementById('contactForm');
  var formSuccess = document.getElementById('formSuccess');

  if (form && formSuccess) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name    = document.getElementById('f-name');
      var email   = document.getElementById('f-email');
      var submitBtn = form.querySelector('[type="submit"]');
      var valid   = true;

      // Clear previous errors
      [name, email].forEach(function (field) {
        field.style.borderColor = '';
        field.removeAttribute('aria-invalid');
      });

      // Required field check
      [name, email].forEach(function (field) {
        if (!field.value.trim()) {
          field.style.borderColor = '#b05b5b';
          field.setAttribute('aria-invalid', 'true');
          valid = false;
        }
      });

      // Email format check
      if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        email.style.borderColor = '#b05b5b';
        email.setAttribute('aria-invalid', 'true');
        valid = false;
      }

      if (!valid) return;

      // ---- Formspree submission ----
      submitBtn.disabled    = true;
      submitBtn.textContent = 'Sending…';

      fetch(form.action, {
        method:  'POST',
        body:    new FormData(form),
        headers: { 'Accept': 'application/json' }
      })
        .then(function (response) {
          if (response.ok) {
            // Show success state
            form.style.transition = 'opacity 0.35s ease';
            form.style.opacity    = '0';
            setTimeout(function () {
              form.style.display = 'none';
              formSuccess.removeAttribute('hidden');
            }, 350);
          } else {
            return response.json().then(function (data) {
              var msg = (data.errors && data.errors.length)
                ? data.errors.map(function (err) { return err.message; }).join(' · ')
                : 'Something went wrong. Please try again.';
              submitBtn.disabled    = false;
              submitBtn.textContent = 'Send Inquiry';
              alert(msg);
            });
          }
        })
        .catch(function () {
          submitBtn.disabled    = false;
          submitBtn.textContent = 'Send Inquiry';
          alert('Network error — please check your connection and try again.');
        });
    });

    // Remove error highlight on input
    form.querySelectorAll('input, select, textarea').forEach(function (field) {
      field.addEventListener('input', function () {
        field.style.borderColor = '';
        field.removeAttribute('aria-invalid');
      });
    });
  }

  /* ------------------------------------------------------------------------
     8. Active Nav Link on Scroll
     ------------------------------------------------------------------------ */
  var sections  = document.querySelectorAll('section[id]');
  var navLinks  = document.querySelectorAll('.nav__link');

  function updateActiveLink() {
    var scrollPos = window.scrollY + header.offsetHeight + 80;

    sections.forEach(function (section) {
      var top    = section.offsetTop;
      var bottom = top + section.offsetHeight;
      var id     = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < bottom) {
        navLinks.forEach(function (link) {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });

})();

