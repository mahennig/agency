/* ==========================================================================
   Design Mindset — Experience v2 controller
   ========================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------------
     0. Intro loader — green wash parts to reveal the logo
     ---------------------------------------------------------------------- */
  (function playIntro() {
    var intro = document.getElementById('intro');
    if (!intro) return;

    if (reduce) {                    // honour reduced-motion: skip straight to the page
      intro.classList.add('is-hidden');
      return;
    }

    // Fly the intro logo from screen-centre onto the real hero logo, then hand
    // off: both are the same artwork, so removing the intro is seamless.
    function handoff() {
      var introLogo = intro.querySelector('.intro__logo');
      var introImg  = introLogo ? introLogo.querySelector('img') : null;
      var heroLogo  = document.querySelector('.hero__logo');
      if (!introLogo || !introImg || !heroLogo) { intro.classList.add('is-done'); return; }
      var from = introImg.getBoundingClientRect();
      var to   = heroLogo.getBoundingClientRect();
      if (!from.width || !to.width) { intro.classList.add('is-done'); return; }
      var scale = to.width / from.width;
      var dx = (to.left + to.width  / 2) - (from.left + from.width  / 2);
      var dy = (to.top  + to.height / 2) - (from.top  + from.height / 2);
      introLogo.style.transition = 'transform 0.9s cubic-bezier(0.66, 0, 0.2, 1)';
      introLogo.style.transform  =
        'translate(-50%, -50%) translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')';
      intro.classList.add('is-handoff');
    }

    var timers = [
      [220,  function () { intro.classList.add('is-lit'); }],    // light sweeps across the green flood
      [720,  function () { intro.classList.add('is-charge'); }], // shockwave rings blast from the centre
      [1050, function () { intro.classList.add('is-flash'); }],  // white flash-bang peaks
      [1120, function () { intro.classList.add('is-split'); }],  // curtains blast apart; logo glitches in on black
      [2750, handoff],                                           // logo flies to its hero position
      [3650, function () { intro.classList.add('is-done'); }],   // black stage fades, revealing the page
      [4300, function () { intro.classList.add('is-hidden'); }]  // remove from the layout
    ];
    timers.forEach(function (step) {
      window.setTimeout(step[1], step[0]);
    });
  })();

  var scrollRoot = document.getElementById('experienceRoot');
  var useLocalScroll = false;
  var useVirtualScroll = false;
  var virtualY = 0;
  var drawStoryLine = function () {};

  function getStaticTop(el) {
    var top = 0;
    while (el && el !== scrollRoot && el !== document.body) {
      top += el.offsetTop || 0;
      el = el.offsetParent;
    }
    return top;
  }

  function getStaticLeft(el) {
    var left = 0;
    while (el && el !== scrollRoot && el !== document.body) {
      left += el.offsetLeft || 0;
      el = el.offsetParent;
    }
    return left;
  }

  function getScrollTop() {
    if (useVirtualScroll) return virtualY;
    return useLocalScroll && scrollRoot ? scrollRoot.scrollTop : window.scrollY;
  }

  function getScrollMax() {
    if (useLocalScroll && scrollRoot) return scrollRoot.scrollHeight - scrollRoot.clientHeight;
    var doc = document.documentElement;
    return doc.scrollHeight - doc.clientHeight;
  }

  function getFullHeight() {
    if ((useLocalScroll || useVirtualScroll) && scrollRoot) return scrollRoot.scrollHeight;
    return document.documentElement.scrollHeight;
  }

  function scrollToY(top) {
    if (useVirtualScroll) {
      animateVirtualTo(top);
      return;
    }
    if (useLocalScroll && scrollRoot) {
      scrollRoot.scrollTo({ top: top, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  function calibrateScrollRoot() {
    window.scrollTo(0, 2);
    var doc = document.documentElement;
    useLocalScroll = window.scrollY === 0 && scrollRoot && doc.scrollHeight > doc.clientHeight;
    if (useLocalScroll) {
      document.body.classList.add('use-local-scroll');
      scrollRoot.scrollTop = 0;
      scrollRoot.scrollTop = 2;
      useVirtualScroll = scrollRoot.scrollTop === 0 && scrollRoot.scrollHeight > scrollRoot.clientHeight;
      scrollRoot.scrollTop = 0;
      if (useVirtualScroll) {
        document.body.classList.add('use-virtual-scroll');
        document.body.classList.remove('use-local-scroll');
        setVirtualScroll(0);
      }
    } else {
      document.body.classList.remove('use-local-scroll');
      window.scrollTo(0, 0);
    }
  }
  calibrateScrollRoot();

  // Smoothed virtual scroll: wheel/keys nudge a *target* position and a RAF
  // loop eases the rendered position toward it, so big batched wheel/trackpad
  // deltas glide instead of snapping. Touch follows the finger 1:1 and then
  // keeps gliding (momentum) after release.
  var virtualTargetY = 0;
  var virtualRAF = null;

  function clampVirtual(y) {
    return Math.max(0, Math.min(y, getScrollMax()));
  }

  function renderVirtual(y) {
    if (!scrollRoot) return;
    virtualY = clampVirtual(y);
    scrollRoot.style.setProperty('--virtual-y', (-virtualY) + 'px');
    updateHeaderSolid();
    drawStoryLine();
    updateVirtualGuide();
    updateVirtualReveals();
  }

  function stopVirtualAnim() {
    if (virtualRAF) { cancelAnimationFrame(virtualRAF); virtualRAF = null; }
  }

  function stepVirtual() {
    var diff = virtualTargetY - virtualY;
    if (Math.abs(diff) < 0.4) {
      virtualRAF = null;
      renderVirtual(virtualTargetY);
      return;
    }
    renderVirtual(virtualY + diff * 0.18);
    virtualRAF = requestAnimationFrame(stepVirtual);
  }

  // Immediate jump (used for init and programmatic resets).
  function setVirtualScroll(nextY) {
    if (!scrollRoot) return;
    stopVirtualAnim();
    virtualTargetY = clampVirtual(nextY);
    renderVirtual(virtualTargetY);
  }

  // Eased move toward a target position.
  function animateVirtualTo(nextY) {
    if (!scrollRoot) return;
    virtualTargetY = clampVirtual(nextY);
    if (reduce) { stopVirtualAnim(); renderVirtual(virtualTargetY); return; }
    if (!virtualRAF) virtualRAF = requestAnimationFrame(stepVirtual);
  }

  function onVirtualWheel(e) {
    if (!useVirtualScroll) return;
    e.preventDefault();
    animateVirtualTo(virtualTargetY + e.deltaY);
  }

  var touchLastY = 0, touchLastT = 0, touchVel = 0;
  function onVirtualTouchStart(e) {
    if (!useVirtualScroll || !e.touches.length) return;
    stopVirtualAnim();
    touchLastY = e.touches[0].clientY;
    touchLastT = e.timeStamp || Date.now();
    touchVel = 0;
    virtualTargetY = virtualY;
  }

  function onVirtualTouchMove(e) {
    if (!useVirtualScroll || !e.touches.length) return;
    e.preventDefault();
    var currentY = e.touches[0].clientY;
    var now = e.timeStamp || Date.now();
    var dy = touchLastY - currentY;
    var dt = now - touchLastT;
    if (dt > 0) touchVel = touchVel * 0.7 + (dy / dt) * 0.3; // px/ms, smoothed
    virtualTargetY = clampVirtual(virtualTargetY + dy);
    renderVirtual(virtualTargetY); // follow the finger with no lag
    touchLastY = currentY;
    touchLastT = now;
  }

  function onVirtualTouchEnd() {
    if (!useVirtualScroll || reduce) return;
    // Fling: project the release velocity into a glide the easing loop settles.
    if (Math.abs(touchVel) > 0.02) animateVirtualTo(virtualTargetY + touchVel * 240);
  }

  function onVirtualKey(e) {
    if (!useVirtualScroll) return;
    var step = window.innerHeight * 0.85;
    if (e.key === 'ArrowDown') { e.preventDefault(); animateVirtualTo(virtualTargetY + 80); }
    if (e.key === 'ArrowUp') { e.preventDefault(); animateVirtualTo(virtualTargetY - 80); }
    if (e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); animateVirtualTo(virtualTargetY + step); }
    if (e.key === 'PageUp') { e.preventDefault(); animateVirtualTo(virtualTargetY - step); }
    if (e.key === 'Home') { e.preventDefault(); animateVirtualTo(0); }
    if (e.key === 'End') { e.preventDefault(); animateVirtualTo(getScrollMax()); }
  }

  window.addEventListener('wheel', onVirtualWheel, { passive: false });
  window.addEventListener('touchstart', onVirtualTouchStart, { passive: true });
  window.addEventListener('touchmove', onVirtualTouchMove, { passive: false });
  window.addEventListener('touchend', onVirtualTouchEnd, { passive: true });
  window.addEventListener('touchcancel', onVirtualTouchEnd, { passive: true });
  window.addEventListener('keydown', onVirtualKey);

  /* ----------------------------------------------------------------------
     1. Floating guide — updates per chapter via IntersectionObserver
     ---------------------------------------------------------------------- */
  var guide       = document.getElementById('guide');
  var guidePortrait = document.getElementById('guidePortrait');
  var guidePhoto  = document.getElementById('guidePhoto');
  var guideBubble = guide ? guide.querySelector('.guide__bubble') : null;
  var PORTRAIT_PLACEHOLDER = 'assets/portrait-placeholder.png';
  // Real portraits per speaker; falls back to the silhouette placeholder.
  var GUIDE_PORTRAITS = { 'Georgiana': 'assets/georgiana.png' };
  var guideName   = document.getElementById('guideName');
  var guideRole   = document.getElementById('guideRole');
  var guideQuote  = document.getElementById('guideQuote');
  var guideInitials = document.getElementById('guideInitials');
  var chapters    = Array.prototype.slice.call(document.querySelectorAll('[data-guide-name]'));
  var finalSection = document.querySelector('.final');
  var currentKey  = '';
  var currentName = '';
  var guideSwapTimer = null;

  // The guide belongs to the cinematic chapters only. It appears after the hero
  // and steps aside once the closing "traditional layout" (portfolio/contact) begins.
  function guideAllowedAt(scrollTop) {
    if (scrollTop <= window.innerHeight * 0.3) return false;
    if (finalSection && getStaticTop(finalSection) <= scrollTop + window.innerHeight * 0.55) return false;
    return true;
  }
  function syncGuideVisibility() {
    if (guide) guide.classList.toggle('is-visible', guideAllowedAt(getScrollTop()));
  }

  function setGuide(el) {
    var name = el.getAttribute('data-guide-name');
    var role = el.getAttribute('data-guide-role') || '';
    var quote = el.getAttribute('data-guide-quote') || '';
    var portrait = el.getAttribute('data-guide-portrait') || '';
    var initials = el.getAttribute('data-guide-initials') || name.charAt(0);
    var key = name + quote;
    if (key === currentKey) return;
    currentKey = key;
    var speakerChanged = name !== currentName;
    currentName = name;

    // Cancel any swap still mid-flight so rapid scrolling can't stack multiple
    // fade-out/fade-in passes on top of each other (the cause of the flicker).
    if (guideSwapTimer) { clearTimeout(guideSwapTimer); guideSwapTimer = null; }

    guideQuote.classList.add('is-swapping');
    guideSwapTimer = window.setTimeout(function () {
      guideSwapTimer = null;
      guideName.textContent = name;
      guideRole.textContent = role;
      guideQuote.textContent = quote;
      if (guideInitials) guideInitials.textContent = initials;
      // Show the real portrait when a chapter provides one, otherwise fall back
      // to the transparent silhouette placeholder (never the bare initials).
      var src = portrait || GUIDE_PORTRAITS[name] || PORTRAIT_PLACEHOLDER;
      if (guide) guide.classList.remove('is-abstract');
      if (guidePhoto && guidePhoto.getAttribute('src') !== src) {
        guidePhoto.setAttribute('src', src);
        guidePhoto.setAttribute('alt', portrait ? name : '');
      }
      // Re-trigger the bubble pop only when the speaker actually changes; for a
      // same-speaker quote change we just cross-fade the quote so it stays calm.
      if (guideBubble && speakerChanged) {
        guideBubble.style.animation = 'none';
        void guideBubble.offsetWidth;
        guideBubble.style.animation = '';
      }
      guideQuote.classList.remove('is-swapping');
    }, reduce ? 0 : 300);
  }

  if (guide && chapters.length && 'IntersectionObserver' in window) {
    var guideObs = new IntersectionObserver(function (entries) {
      // In virtual/local scroll modes the deterministic updateVirtualGuide()
      // already drives the guide on every tick; letting the observer also fire
      // makes the two disagree at chapter boundaries and flip the guide back
      // and forth. Defer entirely to the scroll driver in those modes.
      if (useVirtualScroll || useLocalScroll) return;
      entries.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio > 0.4) setGuide(e.target);
      });
    }, { threshold: [0.4, 0.6] });
    chapters.forEach(function (c) { guideObs.observe(c); });
  }

  function updateVirtualGuide() {
    if (!useVirtualScroll || !chapters || !chapters.length) return;
    var midpoint = virtualY + window.innerHeight * 0.24;
    var active = chapters[0];
    chapters.forEach(function (chapter) {
      if (getStaticTop(chapter) <= midpoint) active = chapter;
    });
    if (guide) guide.classList.toggle('is-visible', guideAllowedAt(virtualY));
    if (header) header.classList.toggle('is-visible', virtualY > window.innerHeight * 0.3);
    if (chapterNav) chapterNav.classList.toggle('is-visible', virtualY > window.innerHeight * 0.3);
    setGuide(active);
  }

  function updateVirtualReveals() {
    if (!useVirtualScroll) return;
    document.querySelectorAll('.reveal').forEach(function (item) {
      if (getStaticTop(item) < virtualY + window.innerHeight * 0.88) item.classList.add('is-in');
    });
    document.querySelectorAll('[data-animate-in]').forEach(function (section) {
      if (getStaticTop(section) < virtualY + window.innerHeight * 0.72) section.classList.add('is-in');
    });
  }

  /* ----------------------------------------------------------------------
     2. Show guide + header once the visitor leaves the hero
     ---------------------------------------------------------------------- */
  var header = document.getElementById('expHeader');
  var hero   = document.getElementById('hero');
  if (hero && 'IntersectionObserver' in window) {
    var heroObs = new IntersectionObserver(function (entries) {
      var past = !entries[0].isIntersecting;
      if (guide)  guide.classList.toggle('is-visible', past && guideAllowedAt(getScrollTop()));
      if (header) header.classList.toggle('is-visible', past);
      if (chapterNav) chapterNav.classList.toggle('is-visible', past);
    }, { threshold: 0.35 });
    heroObs.observe(hero);
  }
  function updateHeaderSolid() {
    if (header) header.classList.toggle('is-solid', getScrollTop() > window.innerHeight * 0.9);
  }
  window.addEventListener('scroll', updateHeaderSolid, { passive: true });
  if (scrollRoot) scrollRoot.addEventListener('scroll', updateHeaderSolid, { passive: true });

  /* ----------------------------------------------------------------------
     2b. Chapter navigation rail + active-section tracking
     ---------------------------------------------------------------------- */
  var chapterNav = document.getElementById('chapterNav');
  var navDots = [];
  if (chapterNav) {
    Array.prototype.slice.call(document.querySelectorAll('[data-nav]')).forEach(function (sec) {
      if (!sec.id) return;
      var dot = document.createElement('a');
      dot.className = 'chapter-nav__dot';
      dot.href = '#' + sec.id;
      dot.setAttribute('data-label', sec.getAttribute('data-nav'));
      dot.setAttribute('aria-label', 'Go to ' + sec.getAttribute('data-nav'));
      chapterNav.appendChild(dot);
      navDots.push({ el: dot, target: sec });
    });
  }
  function updateActiveChapter() {
    if (!navDots.length) return;
    var probe = getScrollTop() + window.innerHeight * 0.42;
    var activeIdx = 0;
    navDots.forEach(function (d, i) { if (getStaticTop(d.target) <= probe) activeIdx = i; });
    navDots.forEach(function (d, i) { d.el.classList.toggle('is-active', i === activeIdx); });
  }

  /* ----------------------------------------------------------------------
     2c. Staggered grid reveals
     ---------------------------------------------------------------------- */
  ['.team__grid', '.portfolio__grid'].forEach(function (sel) {
    var grid = document.querySelector(sel);
    if (!grid) return;
    Array.prototype.slice.call(grid.children).forEach(function (child, i) {
      child.style.setProperty('--i', i);
    });
  });

  /* ----------------------------------------------------------------------
     2d. Magnetic buttons
     ---------------------------------------------------------------------- */
  if (!reduce) {
    document.querySelectorAll('.hero__play, .contact__cta, .exp-header__cta').forEach(function (m) {
      m.addEventListener('mousemove', function (e) {
        var r = m.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        m.style.transform = 'translate(' + (mx * 0.28) + 'px,' + (my * 0.28) + 'px)';
      });
      m.addEventListener('mouseleave', function () { m.style.transform = ''; });
    });
  }

  /* ----------------------------------------------------------------------
     3. Neon storyline — a single line that weaves through every section
        title, lighting up each node (and its title) as you reach it.
     ---------------------------------------------------------------------- */
  var storylineEl = document.getElementById('storyline');
  var storySvg    = document.getElementById('storySvg');
  var storyTrack  = document.getElementById('storyTrack');
  var storyPath   = document.getElementById('storyPath');
  var storyComet  = document.getElementById('storyComet');
  var storyNodesG = document.getElementById('storyNodes');
  var storyLen = 0, cometLen = 0, yTable = [], nodeMarkers = [];
  var storyDrawn = 0, storyTarget = 0, storyRAF = null;

  function renderStoryLine(drawn) {
    if (!storyLen) return;
    storyPath.style.strokeDashoffset = storyLen - drawn;
    if (storyComet) storyComet.style.strokeDashoffset = cometLen - drawn;
    if (storylineEl) storylineEl.classList.toggle('is-live', drawn > cometLen && drawn < storyLen - 2);
    nodeMarkers.forEach(function (m) {
      var on = drawn >= m.l - 1;
      m.circle.classList.toggle('is-on', on);
      if (m.el) m.el.classList.toggle('is-linked', on);
    });
  }

  function stepStoryLine() {
    var diff = storyTarget - storyDrawn;
    if (Math.abs(diff) < 0.5) {
      storyDrawn = storyTarget;
      renderStoryLine(storyDrawn);
      storyRAF = null;
      return;
    }
    storyDrawn += diff * 0.16;
    renderStoryLine(storyDrawn);
    storyRAF = requestAnimationFrame(stepStoryLine);
  }

  function lengthAtY(targetY) {
    if (!yTable.length) return 0;
    if (targetY <= yTable[0].y) return 0;
    var last = yTable[yTable.length - 1];
    if (targetY >= last.y) return last.l;
    var lo = 0, hi = yTable.length - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (yTable[mid].y < targetY) lo = mid + 1; else hi = mid; }
    var b = yTable[lo], a = yTable[lo - 1] || yTable[0];
    var t = (b.y - a.y) ? (targetY - a.y) / (b.y - a.y) : 0;
    return a.l + (b.l - a.l) * t;
  }

  function buildStoryline() {
    if (!storySvg || !storyPath) return;
    var heads = Array.prototype.slice.call(document.querySelectorAll('[data-story-node]'));
    if (!heads.length) return;
    var vw = (useLocalScroll && scrollRoot ? scrollRoot.clientWidth : document.documentElement.clientWidth) || window.innerWidth;
    var contentH = getFullHeight();
    // Each title becomes a point the line threads through vertically:
    // it enters at the title's top and exits at the bottom, weaving
    // left/right to line up with where each title actually sits.
    var pts = heads.map(function (h) {
      var rawTop = getStaticTop(h);
      var left = getStaticLeft(h);
      var w = h.offsetWidth;
      var centered = getComputedStyle(h).textAlign === 'center';
      var cx = centered ? left + w / 2 : left + Math.min(w * 0.5, 54);
      cx = Math.max(22, Math.min(cx, vw - 22));
      return { el: h, x: cx, topY: rawTop - 4, midY: rawTop + h.offsetHeight / 2, botY: rawTop + h.offsetHeight + 4 };
    }).sort(function (a, b) { return a.topY - b.topY; });

    // Weave to each title's top, run straight down through it, then
    // continue from the bottom toward the next title. The final title
    // is where the whole line culminates — it ends inside it.
    // The line is born at the hero's play button and flows down into the story.
    var heroSec = document.getElementById('hero');
    var startX = vw / 2;
    // Begin exactly at the hero's bottom edge so the line emerges right where
    // the hero thread ends — no gap, no occluded segment behind the hero.
    var startY = heroSec ? Math.max(0, getStaticTop(heroSec) + heroSec.offsetHeight) : 0;
    var d = 'M ' + startX + ' ' + startY;
    var px = startX, py = startY;
    pts.forEach(function (n, idx) {
      var isLast = idx === pts.length - 1;
      var dy = n.topY - py;
      d += ' C ' + px + ' ' + (py + dy * 0.45) +
           ', ' + n.x + ' ' + (n.topY - dy * 0.35) +
           ', ' + n.x + ' ' + n.topY;
      if (isLast) {
        d += ' L ' + n.x + ' ' + n.midY;
        px = n.x; py = n.midY;
      } else {
        d += ' L ' + n.x + ' ' + n.botY;
        px = n.x; py = n.botY;
      }
    });

    storySvg.setAttribute('viewBox', '0 0 ' + vw + ' ' + contentH);
    storySvg.style.height = contentH + 'px';
    if (storyTrack) storyTrack.setAttribute('d', d);
    storyPath.setAttribute('d', d);
    if (storyComet) storyComet.setAttribute('d', d);

    storyLen = storyPath.getTotalLength();
    cometLen = Math.max(6, storyLen * 0.014);
    storyPath.style.strokeDasharray = storyLen;
    storyPath.style.strokeDashoffset = storyLen;
    if (storyComet) storyComet.style.strokeDasharray = cometLen + ' ' + (storyLen + cometLen);

    // Sample the path so we can map a scroll Y → drawn length precisely.
    yTable = [];
    var samples = 260;
    for (var i = 0; i <= samples; i++) {
      var l = storyLen * i / samples;
      var pt = storyPath.getPointAtLength(l);
      yTable.push({ y: pt.y, l: l });
    }

    // Draw the node dots on the line.
    // A glowing dot marks where the line enters each title; the last is a finale.
    heads.forEach(function (h) { h.classList.remove('is-finale'); });
    if (storyNodesG) storyNodesG.innerHTML = '';
    nodeMarkers = pts.map(function (n, idx) {
      var isLast = idx === pts.length - 1;
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', n.x);
      c.setAttribute('cy', n.topY);
      c.setAttribute('r', isLast ? '6.5' : '4.5');
      c.setAttribute('class', isLast ? 'storyline__node storyline__node--finale' : 'storyline__node');
      if (storyNodesG) storyNodesG.appendChild(c);
      if (isLast && n.el) n.el.classList.add('is-finale');
      return { circle: c, el: n.el, l: lengthAtY(isLast ? n.midY : n.topY) };
    });
    drawStoryLine();
  }

  drawStoryLine = function () {
    if (!storyLen) return;
    // In native scroll the SVG scrolls with the page; local mode needs a nudge.
    if (useLocalScroll && storylineEl) {
      storylineEl.style.transform = 'translateY(' + (-getScrollTop()) + 'px)';
    }
    // Draw the line as a smooth, uniform function of overall scroll progress so
    // it advances at a constant rate through every section — including the hero.
    // (Mapping to the viewport "read line" instead froze the draw while the hero
    // was on screen and parked the comet at the seam, which looked disconnected.)
    var maxScroll = getScrollMax();
    var atBottom = getScrollTop() >= maxScroll - 2;
    var prog = maxScroll > 0 ? getScrollTop() / maxScroll : 0;
    if (prog < 0) prog = 0; else if (prog > 1) prog = 1;
    // The *target* length for the current scroll position. The rendered length
    // (storyDrawn) eases toward it in a RAF loop so a batched wheel/trackpad
    // jump animates the line instead of snapping it forward all at once.
    storyTarget = atBottom ? storyLen : storyLen * prog;
    if (reduce) {
      storyDrawn = storyTarget;
      renderStoryLine(storyDrawn);
    } else if (!storyRAF) {
      storyRAF = requestAnimationFrame(stepStoryLine);
    }
    updateActiveChapter();
    syncGuideVisibility();
  };

  window.addEventListener('scroll', drawStoryLine, { passive: true });
  if (scrollRoot) scrollRoot.addEventListener('scroll', drawStoryLine, { passive: true });
  var storyResizeRAF;
  window.addEventListener('resize', function () {
    if (storyResizeRAF) cancelAnimationFrame(storyResizeRAF);
    storyResizeRAF = requestAnimationFrame(buildStoryline);
  });
  window.addEventListener('load', function () { window.setTimeout(buildStoryline, 80); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { buildStoryline(); });
  buildStoryline();

  /* ----------------------------------------------------------------------
     4. Reveal on scroll
     ---------------------------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); revObs.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach(function (r) { revObs.observe(r); });

    // sections that trigger internal animation (dashboards)
    var animSections = document.querySelectorAll('[data-animate-in]');
    var animObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); animObs.unobserve(e.target); } });
    }, { threshold: 0.3 });
    animSections.forEach(function (s) { animObs.observe(s); });
  } else {
    reveals.forEach(function (r) { r.classList.add('is-in'); });
  }

  /* ----------------------------------------------------------------------
     5. Counters
     ---------------------------------------------------------------------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1600, start = null;
    function step(ts) {
      if (!start) start = ts;
      var k = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(2, -10 * k);
      var val = target * eased;
      el.textContent = (target >= 1000 ? Math.round(val / 100) / 10 + 'K' : Math.round(val)) + suffix;
      if (k < 1) requestAnimationFrame(step); else el.textContent = (target >= 1000 ? (target / 1000) + 'K' : target) + suffix;
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { animateCount(e.target); cObs.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cObs.observe(c); });
  }

  /* ----------------------------------------------------------------------
     6. Hero play → cinematic trailer (image montage fallback)
     ---------------------------------------------------------------------- */
  var playBtn = document.getElementById('heroPlay');
  var trailer = document.getElementById('trailer');
  var trailerClose = document.getElementById('trailerClose');
  var trailerVideo = document.getElementById('trailerVideo');
  var slides  = trailer ? Array.prototype.slice.call(trailer.querySelectorAll('.trailer__slide')) : [];
  var filmstrip = trailer ? Array.prototype.slice.call(trailer.querySelectorAll('.trailer__filmstrip span')) : [];
  var trailerKicker = document.getElementById('trailerKicker');
  var trailerTitle = document.getElementById('trailerTitle');
  var trailerMeta = document.getElementById('trailerMeta');
  var progress = document.getElementById('trailerProgress');
  var slideTimer = null, slideIndex = 0;
  var lastFocus = null;

  function loadTrailerVideo() {
    if (!trailer || !trailerVideo) return false;
    var src = trailer.getAttribute('data-video-src');
    if (src) {
      trailerVideo.innerHTML = '';
      var video = document.createElement('video');
      video.src = encodeURI(src);
      video.setAttribute('playsinline', '');
      video.controls = true;
      video.autoplay = true;
      video.preload = 'auto';
      video.addEventListener('ended', closeTrailer);
      trailerVideo.appendChild(video);
      trailer.classList.add('has-video');
      var p = video.play();
      if (p && typeof p.catch === 'function') { p.catch(function () {}); }
      return true;
    }
    var id = trailer.getAttribute('data-youtube-id');
    if (!id) return false;
    trailerVideo.innerHTML = '';
    var iframe = document.createElement('iframe');
    var params = new URLSearchParams({
      autoplay: '1',
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      origin: window.location.origin
    });
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?' + params.toString();
    iframe.setAttribute('title', 'Design Mindset intro film');
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    trailerVideo.appendChild(iframe);
    trailer.classList.add('has-video');
    return true;
  }

  function openTrailer() {
    if (!trailer) return;
    lastFocus = document.activeElement;
    trailer.classList.add('is-open');
    trailer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('trailer-lock');
    if (trailerClose) trailerClose.focus({ preventScroll: true });
    slideIndex = 0;
    if (!loadTrailerVideo()) showSlide(0);
  }
  function showSlide(i) {
    slides.forEach(function (s, idx) { s.classList.toggle('is-active', idx === i); });
    filmstrip.forEach(function (s, idx) { s.classList.toggle('is-active', idx === i); });
    if (slides[i]) {
      if (trailerKicker) trailerKicker.textContent = slides[i].getAttribute('data-kicker') || '';
      if (trailerTitle) trailerTitle.textContent = slides[i].getAttribute('data-title') || '';
      if (trailerMeta) trailerMeta.textContent = slides[i].getAttribute('data-meta') || '';
    }
    if (progress) { progress.style.transition = 'none'; progress.style.width = '0'; void progress.offsetWidth; progress.style.transition = 'width 5s linear'; progress.style.width = '100%'; }
    slideTimer = window.setTimeout(function () {
      slideIndex = (i + 1);
      if (slideIndex >= slides.length) { closeTrailer(); return; }
      showSlide(slideIndex);
    }, reduce ? 1200 : 5000);
  }
  function closeTrailer() {
    if (!trailer) return;
    window.clearTimeout(slideTimer);
    trailer.classList.remove('is-open');
    trailer.classList.remove('has-video');
    if (trailerVideo) trailerVideo.innerHTML = '';
    trailer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('trailer-lock');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
  }
  if (playBtn) playBtn.addEventListener('click', openTrailer);
  if (trailerClose) trailerClose.addEventListener('click', closeTrailer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeTrailer(); });

  /* ----------------------------------------------------------------------
     7. Smooth anchor scroll
     ---------------------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      var top = useLocalScroll && scrollRoot ? t.offsetTop - 70 : t.getBoundingClientRect().top + window.scrollY - 70;
      scrollToY(top);
    });
  });
})();
