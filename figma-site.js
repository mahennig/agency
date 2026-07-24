/* ==========================================================================
   Design Mindset — Figma build controller
   Intro animation (orb power-up + staggered wordmark) + scroll reveals
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;

  /* ----------------------------------------------------------------------
     Intro animation — build the wordmark letters, run the timeline
     ---------------------------------------------------------------------- */
  (function intro() {
    var intro = document.getElementById('intro');
    var word = document.getElementById('introWord');
    if (!intro || !word) { body.classList.remove('is-loading'); return; }

    var text = 'DESIGNMINDSET';
    // Build one <span> per letter so they can stagger up
    text.split('').forEach(function (ch, i) {
      var s = document.createElement('span');
      s.textContent = ch;
      s.style.animationDelay = (0.9 + i * 0.045) + 's';
      word.appendChild(s);
    });
    // trailing lime dot
    var dot = document.createElement('span');
    dot.textContent = '.';
    dot.className = 'dot';
    dot.style.animationDelay = (0.9 + text.length * 0.045) + 's';
    word.appendChild(dot);

    if (reduce) {
      intro.classList.add('is-hidden');
      body.classList.remove('is-loading');
      return;
    }

    // End the intro after the timeline completes
    window.setTimeout(function () { intro.classList.add('is-out'); }, 2600);
    window.setTimeout(function () {
      intro.classList.add('is-hidden');
      body.classList.remove('is-loading');
    }, 3450);
  })();

  /* ----------------------------------------------------------------------
     Scroll reveal — fade section content in on entry
     ---------------------------------------------------------------------- */
  (function reveals() {
    var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!els.length) return;

    document.documentElement.classList.add('reveal-ready');

    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    function showVisible() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      els.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        var rect = el.getBoundingClientRect();
        if (rect.top < vh * 0.92 && rect.bottom > vh * 0.04) {
          el.classList.add('is-in');
        }
      });
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });

    els.forEach(function (el) { io.observe(el); });

    window.addEventListener('scroll', showVisible, { passive: true });
    window.addEventListener('resize', showVisible);
    requestAnimationFrame(showVisible);
    window.setTimeout(showVisible, 250);
  })();

  /* ----------------------------------------------------------------------
     Subtle parallax drift on the hero orb as the page scrolls away
     ---------------------------------------------------------------------- */
  (function heroParallax() {
    if (reduce) return;
    var orb = document.querySelector('.hero__orb');
    var vids = orb ? orb.querySelectorAll('video') : [];
    var word = document.querySelector('.hero__wordmark');
    var tag = document.querySelector('.hero__tagline');
    var hero = document.getElementById('hero');
    if (!orb || !hero) return;

    var ticking = false;
    function update() {
      var rect = hero.getBoundingClientRect();
      var progress = Math.min(Math.max(-rect.top / window.innerHeight, 0), 1);
      orb.style.setProperty('opacity', String(1 - progress * 0.95));
      orb.style.setProperty('filter', 'blur(' + (progress * 22).toFixed(2) + 'px)');
      // the orb drops down the page…
      var ty = 'translateY(' + (progress * 42).toFixed(1) + 'vh)';
      for (var i = 0; i < vids.length; i++) { vids[i].style.transform = ty; }
      // …while the name lifts up, giving a feeling of movement
      if (word) { word.style.transform = 'translateY(' + (-progress * 26).toFixed(1) + 'vh)'; word.style.opacity = String(1 - progress * 0.7); }
      if (tag)  { tag.style.transform = 'translate(-50%, ' + (-progress * 14).toFixed(1) + 'vh)'; tag.style.opacity = String(1 - progress * 1.1); }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  })();

  /* ----------------------------------------------------------------------
     Hero orb — the video is a baked boomerang (forward + reverse), so a
     plain native loop is perfectly seamless. Nothing to script here.
     ---------------------------------------------------------------------- */

  /* ----------------------------------------------------------------------
     Smooth scroll — use Lenis when it is available, otherwise keep native
     scrolling. The rest of the page remains driven by requestAnimationFrame.
     ---------------------------------------------------------------------- */
  (function smoothScroll() {
    var LenisCtor = window.Lenis || (window.lenis && window.lenis.Lenis);
    if (reduce || !LenisCtor) return;
    var lenis = new LenisCtor({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.1
    });
    window.__lenis = lenis;
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  })();

  /* ----------------------------------------------------------------------
     THE THREAD — build an elastic rope through every section and send the
     chrome sphere travelling along it as the page scrolls. The sphere lags
     the scroll (lerp) so it feels like it has weight, momentum and inertia.
     ---------------------------------------------------------------------- */
  (function thread() {
    if (reduce) return;
    var main = document.getElementById('main');
    var layer = document.getElementById('ropeLayer');
    var svg = document.getElementById('ropeSvg');
    var base = document.getElementById('ropeBase');
    var prog = document.getElementById('ropeProgress');
    var flow = document.getElementById('ropeFlow');
    var sphere = document.getElementById('sphere');
    if (!main || !layer || !svg || !base || !prog) return;

    var VB_W = 1440;               // path is authored in a 1440-wide viewBox
    var anchors = Array.prototype.slice.call(
      main.querySelectorAll('[data-rope-anchor]')
    );
    if (anchors.length < 2) return;

    var pathLength = 0;
    var layerWidth = layer.clientWidth;
    var current = 0;               // lerped position along the path (px)
    var target = 0;                // scroll-driven target (px)
    var lastLen = 0;
    var lastScrollY = window.scrollY;
    var scrollVelocity = 0;
    var mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var influence = { x: 0, y: 0 };
    var sectionState = anchors.map(function (el) { return { el: el, start: 0, end: 0 }; });
    var threadItems = Array.prototype.slice.call(main.querySelectorAll('[data-thread-item]'));

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    // Catmull-Rom spline → cubic bezier path for smooth, organic curves
    function toPath(pts) {
      if (pts.length < 2) return '';
      var d = 'M ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i - 1] || pts[i];
        var p1 = pts[i];
        var p2 = pts[i + 1];
        var p3 = pts[i + 2] || p2;
        var c1x = p1.x + (p2.x - p0.x) / 6;
        var c1y = p1.y + (p2.y - p0.y) / 6;
        var c2x = p2.x - (p3.x - p1.x) / 6;
        var c2y = p2.y - (p3.y - p1.y) / 6;
        d += ' C ' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ', ' +
                     c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ', ' +
                     p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
      }
      return d;
    }

    function build() {
      var mainTop = main.getBoundingClientRect().top + window.scrollY;
      layer.style.height = '0px';        // collapse the overlay (layer + svg) first so we
      svg.style.height = '0px';          // measure the true content height, not the stale one
      var mainH = main.scrollHeight;
      layerWidth = layer.clientWidth;

      layer.style.height = mainH + 'px';
      svg.style.height = mainH + 'px';
      svg.setAttribute('viewBox', '0 0 ' + VB_W + ' ' + mainH);

      var pts = [];
      anchors.forEach(function (el, i) {
        var r = el.getBoundingClientRect();
        var topDoc = r.top + window.scrollY - mainTop;
        var ax = el.dataset.anchorX !== undefined
          ? parseFloat(el.dataset.anchorX)
          : (i % 2 ? 0.76 : 0.24);
        var ay = el.dataset.anchorY !== undefined ? parseFloat(el.dataset.anchorY) : 0.5;
        pts.push({ x: ax * VB_W, y: topDoc + r.height * ay });
        sectionState[i] = {
          el: el,
          start: Math.max(0, topDoc - window.innerHeight * 0.28),
          end: Math.min(mainH, topDoc + r.height - window.innerHeight * 0.18)
        };
      });
      // extend a touch past the last anchor so the rope comes to rest
      var last = pts[pts.length - 1];
      pts.push({ x: last.x, y: Math.min(mainH - 40, last.y + 220) });

      var d = toPath(pts);
      base.setAttribute('d', d);
      prog.setAttribute('d', d);
      if (flow) flow.setAttribute('d', d);
      pathLength = base.getTotalLength();
      prog.style.strokeDasharray = pathLength;
      prog.style.strokeDashoffset = pathLength;
    }

    function scrollProgress() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    }

    function updateStoryState() {
      var scrollY = window.scrollY;
      var viewportCenter = scrollY + window.innerHeight * 0.52;
      sectionState.forEach(function (state) {
        var span = Math.max(1, state.end - state.start);
        var progress = clamp((viewportCenter - state.start) / span, 0, 1);
        state.el.style.setProperty('--section-progress', progress.toFixed(3));
        state.el.classList.toggle('is-thread-active', progress > 0.08 && progress < 0.96);
        state.el.classList.toggle('is-thread-passed', progress >= 0.96);
      });

      var bestItem = null;
      var bestDistance = Infinity;
      var litBand = window.innerHeight * 0.34;   // items within this band of centre light up together
      threadItems.forEach(function (item) {
        var rect = item.getBoundingClientRect();
        var itemCenter = rect.top + window.scrollY + rect.height * 0.5;
        var distance = Math.abs(itemCenter - viewportCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestItem = item;
        }
        // light every item whose centre sits inside the active band, so both
        // left- and right-column items in a row highlight at the same time
        item.classList.toggle('is-thread-lit', distance < litBand);
      });
      // guarantee at least the nearest item is lit, even between bands
      if (bestItem && bestDistance < window.innerHeight * 0.6) {
        bestItem.classList.add('is-thread-lit');
      }
    }

    function updatePointerInfluence(sx, sy) {
      var dx = mouse.x - sx;
      var dy = mouse.y - (sy - window.scrollY);
      var distance = Math.sqrt(dx * dx + dy * dy);
      var pull = clamp(1 - distance / 380, 0, 1);
      influence.x += (dx * pull * 0.055 - influence.x) * 0.08;
      influence.y += (dy * pull * 0.055 - influence.y) * 0.08;
      if (sphere) sphere.style.setProperty('--cursor-pull', pull.toFixed(3));
    }

    function frame() {
      scrollVelocity += ((window.scrollY - lastScrollY) - scrollVelocity) * 0.16;
      lastScrollY = window.scrollY;
      target = pathLength * scrollProgress();
      // spring toward the target → inertia / easing / physical weight
      current += (target - current) * 0.085;
      if (Math.abs(target - current) < 0.05) current = target;

      if (pathLength > 0) {
        var pt = base.getPointAtLength(current);
        var sx = (pt.x / VB_W) * layerWidth;
        var sy = pt.y;
        // gentle idle levitation so the sphere always feels alive / afloat
        sy += Math.sin(performance.now() / 900) * 3.5;
        // velocity → gentle roll + squash, so it reads as a heavy object
        var vel = current - lastLen;
        lastLen = current;
        updatePointerInfluence(sx, sy);
        if (sphere) {
          var roll = clamp((vel + scrollVelocity * 0.32) * 0.17, -28, 28);
          var squash = 1 + clamp((Math.abs(vel) + Math.abs(scrollVelocity) * 0.8) * 0.0014, 0, 0.09);
          var bounce = Math.sin(current * 0.018) * clamp(Math.abs(scrollVelocity) * 0.022, 0, 7);
          sphere.style.transform =
            'translate(' + (sx + influence.x).toFixed(1) + 'px, ' + (sy + influence.y + bounce).toFixed(1) + 'px) ' +
            'translate(-50%, -50%) rotate(' + roll.toFixed(2) + 'deg) ' +
            'scale(' + (1 / squash).toFixed(3) + ', ' + squash.toFixed(3) + ')';
        }
        prog.style.strokeDashoffset = (pathLength - current).toFixed(1);
      }

      // the sphere "detaches" from the hero once you begin the story
      if (sphere) sphere.classList.toggle('is-live', window.scrollY > window.innerHeight * 0.08);
      main.classList.toggle('has-live-sphere', window.scrollY > window.innerHeight * 0.08);
      // the green line reacts to scrolling — brighter, faster energy flow
      layer.classList.toggle('is-flowing', Math.abs(scrollVelocity) > 0.35);
      updateStoryState();

      requestAnimationFrame(frame);
    }

    // Rebuild when layout settles (fonts, video, images) and on resize
    var rebuildTimer;
    function scheduleBuild() {
      window.clearTimeout(rebuildTimer);
      rebuildTimer = window.setTimeout(build, 120);
    }

    build();
    requestAnimationFrame(frame);

    window.addEventListener('resize', scheduleBuild);
    window.addEventListener('load', scheduleBuild);
    window.addEventListener('dm:langchange', scheduleBuild);   // text reflows on language switch
    window.addEventListener('pointermove', function (event) {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    }, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleBuild);
    }
    // sections can grow as reveals fire — recheck a few times early on
    [400, 1000, 2000].forEach(function (t) { window.setTimeout(build, t); });
  })();

  /* ----------------------------------------------------------------------
     SOUND — background music track (looped). Muted until the visitor opts
     in (browser autoplay policy), toggled from a Lusion-style minimal text
     control injected into the header.
     ---------------------------------------------------------------------- */
  (function sound() {
    var audio = document.getElementById('bgAudio');
    var enabled = false;
    var fadeRaf = null;
    var TARGET = 0.55;

    function fadeTo(target, done) {
      if (!audio) return;
      if (fadeRaf) cancelAnimationFrame(fadeRaf);
      function step() {
        var diff = target - audio.volume;
        if (Math.abs(diff) < 0.02) {
          audio.volume = Math.max(0, Math.min(1, target));
          if (done) done();
          return;
        }
        audio.volume = Math.max(0, Math.min(1, audio.volume + diff * 0.08));
        fadeRaf = requestAnimationFrame(step);
      }
      step();
    }

    var api = {
      get enabled() { return enabled; },
      setEnabled: function (on) {
        enabled = !!on;
        if (!audio) return;
        if (enabled) {
          audio.volume = 0;
          var p = audio.play();
          if (p && typeof p.catch === 'function') p.catch(function () {});
          fadeTo(TARGET);
        } else {
          fadeTo(0, function () { audio.pause(); });
        }
      },
      toggle: function () { api.setEnabled(!enabled); return enabled; }
    };

    window.__dmSound = api;

    /* Inject the Lusion-style minimal text toggle into the header */
    (function control() {
      var header = document.getElementById('siteHeader');
      var cta = header ? header.querySelector('.site-header__cta') : null;
      if (!header) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sound-toggle';
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Unmute sound');
      btn.innerHTML = '<span class="sound-toggle__wave" aria-hidden="true"><svg viewBox="0 0 32 12" preserveAspectRatio="none"><path class="sound-toggle__flat" d="M0 6 H32"/><path class="sound-toggle__line" d="M-16 6 Q-12 2 -8 6 T0 6 T8 6 T16 6 T24 6 T32 6 T40 6 T48 6"/></svg></span>';
      btn.addEventListener('click', function () {
        var on = api.toggle();
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.setAttribute('aria-label', on ? 'Mute sound' : 'Unmute sound');
      });
      if (cta) header.insertBefore(btn, cta);
      else header.appendChild(btn);
    })();
  })();

  /* ----------------------------------------------------------------------
     MAGNETIC HOVER — interactive elements pull gently toward the pointer.
     Fine-pointer devices only; disabled for reduced-motion and touch.
     ---------------------------------------------------------------------- */
  (function magnetic() {
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduce || !fine) return;

    var magnets = Array.prototype.slice.call(
      document.querySelectorAll('.site-header__cta, .cta, .film__play, .text-link, .site-header__links a, .sound-toggle')
    );
    magnets.forEach(function (el) {
      el.addEventListener('pointermove', function (event) {
        var r = el.getBoundingClientRect();
        var relX = event.clientX - (r.left + r.width / 2);
        var relY = event.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (relX * 0.28).toFixed(1) + 'px, ' + (relY * 0.32).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transform = '';
      });
    });
  })();

  /* ----------------------------------------------------------------------
     LANGUAGE — English / Romanian switch with a fancy sliding-pill toggle.
     Every translatable node carries data-i18n (textContent) or
     data-i18n-html (innerHTML). The chosen language persists in storage.
     ---------------------------------------------------------------------- */
  (function i18n() {
    var dict = {
      en: {
        'nav.work': 'Work',
        'nav.services': 'Services',
        'nav.expertise': 'Expertise',
        'nav.cta': "Let's talk",
        'hero.tagline': 'One industry. Total focus.',
        'showcase.eyebrow': 'Portfolio + campaigns',
        'showcase.headline': 'Strategy you can see, not just a deck',
        'showcase.note': 'Scroll to expand \u00b7 tap to play',
        'agency.index': '01 / Agency',
        'agency.eyebrow': 'Built from inside the industry',
        'agency.headline': 'The agency that makes marketing for interior design brands.',
        'agency.body': 'We combine strategic thinking, industry knowledge and expressive design to build brands that are clear, memorable and commercially relevant.',
        'agency.link': 'Discover our work <span aria-hidden="true">\u2198</span>',
        'positioning.index': '02 / Positioning',
        'positioning.headline': 'Built from inside<br /><span>the industry.</span>',
        'positioning.p1': 'We do not need months to understand how interior design brands operate.',
        'positioning.p2': 'We already understand the products, the decision-makers and the commercial context.',
        'positioning.m1': 'Specialized industry',
        'positioning.m2': 'Brand perspective',
        'positioning.m3': 'Creative capabilities',
        'work.index': '03 / Selected Work',
        'work.headline': 'Brands designed to<br />move the industry.',
        'work.c1.tags': 'Positioning \u00b7 Identity \u00b7 Systems',
        'work.c1.title': 'Brand Strategy',
        'work.c2.tags': 'Content \u00b7 Campaigns \u00b7 Editorial',
        'work.c2.title': 'Interior Storytelling',
        'work.c3.tags': 'Web \u00b7 Motion \u00b7 Conversion',
        'work.c3.title': 'Digital Experience',
        'process.index': '04 / Process',
        'process.headline': 'Strategy first.<br />Expression follows.',
        'process.s1.title': 'Industry Immersion',
        'process.s1.body': 'We understand the product, audience, market and commercial reality before designing the answer.',
        'process.s2.title': 'Strategic Direction',
        'process.s2.body': 'We define the positioning, narrative and creative direction that make the brand recognizable.',
        'process.s3.title': 'Brand Construction',
        'process.s3.body': 'We build the visual, verbal and digital system around one clear strategic idea.',
        'process.s4.title': 'Activation',
        'process.s4.body': 'We turn the strategy into content, campaigns, digital experiences and growth tools.',
        'services.index': '05 / Services',
        'services.headline': 'The practical system<br />behind the story.',
        'services.body': 'The work covers the full growth loop: collaborations, positioning, content, social, video and digital expression.',
        'services.i1.title': 'Influencer marketing',
        'services.i1.body': 'Creator partnerships, launches and community-led campaigns shaped for design audiences.',
        'services.i2.title': 'Strategic growth',
        'services.i2.body': 'Positioning, offer architecture and audience development for premium interior brands.',
        'services.i3.title': 'Branding & digital experience',
        'services.i3.body': 'Editorial systems, websites and campaign worlds with a clear commercial role.',
        'services.i4.title': 'Social media',
        'services.i4.body': 'Content direction, calendars and premium channel management that respects the brand.',
        'services.i5.title': 'Video production',
        'services.i5.body': 'Films, interviews, product stories and event coverage with an editorial point of view.',
        'services.i6.title': 'Brand strategy',
        'services.i6.body': 'Clear narratives for design-led brands ready to scale with intention.',
        'proof.index': '06 / Proof',
        'proof.headline': 'A design audience already exists around the work.',
        'proof.body': 'The credibility is not abstract. It comes from design content, industry events and premium interiors experience.',
        'proof.p1': 'Editorial design content and interviews built for a specialist audience.',
        'proof.p2.title': 'Milano Design Week',
        'proof.p2': 'On-the-ground reporting, trend narratives and community moments.',
        'proof.p3.title': 'Premium interiors',
        'proof.p3': 'Strategy shaped for studios, makers, showrooms and design-led brands.',
        'expertise.index': '07 / Expertise',
        'expertise.headline': 'One partner.<br />One connected system.',
        'expertise.e1': 'Brand Strategy',
        'expertise.e2': 'Brand Identity',
        'expertise.e3': 'Creative Direction',
        'expertise.e4': 'Content Strategy',
        'expertise.e5': 'Campaigns',
        'expertise.e6': 'Web Design',
        'expertise.e7': 'Motion',
        'expertise.e8': 'Video',
        'expertise.e9': 'Interior Branding',
        'expertise.e10': 'Growth Systems',
        'final.eyebrow': 'Your brand should feel as considered as your work.',
        'final.headline': "Let's design what<br />comes next<span class=\"dot-period\">.</span>",
        'final.cta': 'Start a conversation <span aria-hidden="true">\u2197</span>',
        'footer.copy': '\u00a9 2026 Design Mindset \u2014 the marketing agency for interior design brands.',
        'sound.off': 'Sound',
        'sound.on': 'Mute'
      },
      ro: {
        'nav.work': 'Lucr\u0103ri',
        'nav.services': 'Servicii',
        'nav.expertise': 'Expertiz\u0103',
        'nav.cta': 'Hai s\u0103 vorbim',
        'hero.tagline': 'O industrie. Focus total.',
        'showcase.eyebrow': 'Portofoliu + campanii',
        'showcase.headline': 'Strategie pe care o vezi, nu doar un pitch',
        'showcase.note': 'Deruleaz\u0103 pentru a extinde \u00b7 atinge pentru redare',
        'agency.index': '01 / Agen\u021bie',
        'agency.eyebrow': 'Construit\u0103 din interiorul industriei',
        'agency.headline': 'Agen\u021bia care face marketing pentru branduri de design interior.',
        'agency.body': 'Combin\u0103m g\u00e2ndirea strategic\u0103, cunoa\u0219terea industriei \u0219i designul expresiv pentru a construi branduri clare, memorabile \u0219i relevante comercial.',
        'agency.link': 'Descoper\u0103 lucr\u0103rile noastre <span aria-hidden="true">\u2198</span>',
        'positioning.index': '02 / Pozi\u021bionare',
        'positioning.headline': 'Construit\u0103 din interiorul<br /><span>industriei.</span>',
        'positioning.p1': 'Nu avem nevoie de luni \u00eentregi ca s\u0103 \u00een\u021belegem cum func\u021bioneaz\u0103 brandurile de design interior.',
        'positioning.p2': '\u00cen\u021belegem deja produsele, factorii de decizie \u0219i contextul comercial.',
        'positioning.m1': 'Industrie specializat\u0103',
        'positioning.m2': 'Perspectiv\u0103 de brand',
        'positioning.m3': 'Capacit\u0103\u021bi creative',
        'work.index': '03 / Lucr\u0103ri selectate',
        'work.headline': 'Branduri create s\u0103<br />mi\u0219te industria.',
        'work.c1.tags': 'Pozi\u021bionare \u00b7 Identitate \u00b7 Sisteme',
        'work.c1.title': 'Strategie de brand',
        'work.c2.tags': 'Con\u021binut \u00b7 Campanii \u00b7 Editorial',
        'work.c2.title': 'Storytelling de interior',
        'work.c3.tags': 'Web \u00b7 Motion \u00b7 Conversie',
        'work.c3.title': 'Experien\u021b\u0103 digital\u0103',
        'process.index': '04 / Proces',
        'process.headline': '\u00cent\u00e2i strategia.<br />Expresia urmeaz\u0103.',
        'process.s1.title': 'Imersiune \u00een industrie',
        'process.s1.body': '\u00cen\u021belegem produsul, publicul, pia\u021ba \u0219i realitatea comercial\u0103 \u00eenainte de a proiecta r\u0103spunsul.',
        'process.s2.title': 'Direc\u021bie strategic\u0103',
        'process.s2.body': 'Definim pozi\u021bionarea, narativul \u0219i direc\u021bia creativ\u0103 care fac brandul u\u0219or de recunoscut.',
        'process.s3.title': 'Construc\u021bia brandului',
        'process.s3.body': 'Construim sistemul vizual, verbal \u0219i digital \u00een jurul unei singure idei strategice clare.',
        'process.s4.title': 'Activare',
        'process.s4.body': 'Transform\u0103m strategia \u00een con\u021binut, campanii, experien\u021be digitale \u0219i instrumente de cre\u0219tere.',
        'services.index': '05 / Servicii',
        'services.headline': 'Sistemul practic<br />din spatele pove\u0219tii.',
        'services.body': 'Munca acoper\u0103 \u00eentreg parcursul de cre\u0219tere: colabor\u0103ri, pozi\u021bionare, con\u021binut, social media, video \u0219i expresie digital\u0103.',
        'services.i1.title': 'Marketing cu influenceri',
        'services.i1.body': 'Parteneriate cu creatori, lans\u0103ri \u0219i campanii conduse de comunitate, g\u00e2ndite pentru publicul de design.',
        'services.i2.title': 'Cre\u0219tere strategic\u0103',
        'services.i2.body': 'Pozi\u021bionare, arhitectura ofertei \u0219i dezvoltarea publicului pentru branduri premium de interior.',
        'services.i3.title': 'Branding & experien\u021b\u0103 digital\u0103',
        'services.i3.body': 'Sisteme editoriale, site-uri \u0219i universuri de campanie cu un rol comercial clar.',
        'services.i4.title': 'Social media',
        'services.i4.body': 'Direc\u021bie de con\u021binut, calendare \u0219i management premium al canalelor, cu respect pentru brand.',
        'services.i5.title': 'Produc\u021bie video',
        'services.i5.body': 'Filme, interviuri, pove\u0219ti de produs \u0219i acoperire de evenimente cu o viziune editorial\u0103.',
        'services.i6.title': 'Strategie de brand',
        'services.i6.body': 'Narative clare pentru branduri conduse de design, gata s\u0103 creasc\u0103 cu inten\u021bie.',
        'proof.index': '06 / Dovezi',
        'proof.headline': 'Un public de design exist\u0103 deja \u00een jurul lucr\u0103rilor.',
        'proof.body': 'Credibilitatea nu este abstract\u0103. Vine din con\u021binut de design, evenimente din industrie \u0219i experien\u021b\u0103 \u00een interioare premium.',
        'proof.p1': 'Con\u021binut editorial de design \u0219i interviuri create pentru un public specializat.',
        'proof.p2.title': 'Milano Design Week',
        'proof.p2': 'Reportaje la fa\u021ba locului, narative de trend \u0219i momente de comunitate.',
        'proof.p3.title': 'Interioare premium',
        'proof.p3': 'Strategie g\u00e2ndit\u0103 pentru studiouri, produc\u0103tori, showroom-uri \u0219i branduri conduse de design.',
        'expertise.index': '07 / Expertiz\u0103',
        'expertise.headline': 'Un singur partener.<br />Un sistem conectat.',
        'expertise.e1': 'Strategie de brand',
        'expertise.e2': 'Identitate de brand',
        'expertise.e3': 'Direc\u021bie creativ\u0103',
        'expertise.e4': 'Strategie de con\u021binut',
        'expertise.e5': 'Campanii',
        'expertise.e6': 'Web design',
        'expertise.e7': 'Motion',
        'expertise.e8': 'Video',
        'expertise.e9': 'Branding de interior',
        'expertise.e10': 'Sisteme de cre\u0219tere',
        'final.eyebrow': 'Brandul t\u0103u ar trebui s\u0103 par\u0103 la fel de bine g\u00e2ndit ca munca ta.',
        'final.headline': 'Hai s\u0103 cre\u0103m ce<br />urmeaz\u0103<span class="dot-period">.</span>',
        'final.cta': '\u00cencepe o conversa\u021bie <span aria-hidden="true">\u2197</span>',
        'footer.copy': '\u00a9 2026 Design Mindset \u2014 agen\u021bia de marketing pentru branduri de design interior.',
        'sound.off': 'Sunet',
        'sound.on': 'Opre\u0219te'
      }
    };

    var current = 'en';
    try { current = window.localStorage.getItem('dm-lang') || 'en'; } catch (e) {}
    if (!dict[current]) current = 'en';

    function applyOne(el) {
      var lang = dict[current] || dict.en;
      var key = el.getAttribute('data-i18n');
      if (key && lang[key] !== undefined) { el.textContent = lang[key]; return; }
      var hkey = el.getAttribute('data-i18n-html');
      if (hkey && lang[hkey] !== undefined) { el.innerHTML = lang[hkey]; }
    }

    function applyLang(lang) {
      current = dict[lang] ? lang : 'en';
      try { window.localStorage.setItem('dm-lang', current); } catch (e) {}
      document.documentElement.setAttribute('lang', current);
      var nodes = document.querySelectorAll('[data-i18n], [data-i18n-html]');
      Array.prototype.forEach.call(nodes, applyOne);
      // text length changes between languages — let the rope/layout recompute
      window.dispatchEvent(new CustomEvent('dm:langchange'));
    }

    window.__dmI18n = { applyLang: applyLang, applyOne: applyOne, get lang() { return current; } };

    /* Fancy sliding-pill EN / RO switch injected into the header */
    (function control() {
      var header = document.getElementById('siteHeader');
      if (!header) return;
      var sw = document.createElement('div');
      sw.className = 'lang-switch';
      sw.setAttribute('role', 'group');
      sw.setAttribute('aria-label', 'Language');
      sw.innerHTML =
        '<span class="lang-switch__pill" aria-hidden="true"></span>' +
        '<button type="button" class="lang-switch__opt" data-lang="en">EN</button>' +
        '<button type="button" class="lang-switch__opt" data-lang="ro">RO</button>';

      function sync() {
        sw.classList.toggle('is-ro', current === 'ro');
        Array.prototype.forEach.call(sw.querySelectorAll('.lang-switch__opt'), function (b) {
          var active = b.getAttribute('data-lang') === current;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      }

      sw.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.lang-switch__opt') : null;
        if (!b) return;
        applyLang(b.getAttribute('data-lang'));
        sync();
      });

      var soundBtn = header.querySelector('.sound-toggle');
      var cta = header.querySelector('.site-header__cta');
      header.insertBefore(sw, soundBtn || cta || null);
      sync();
    })();

    applyLang(current);
  })();

})();
