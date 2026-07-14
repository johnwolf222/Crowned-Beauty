/* Crowned Beauty — scroll-driven background engine + interactions */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById('header');
  function onHeaderScroll() {
    if (window.scrollY > 40) header.classList.add('header--scrolled');
    else header.classList.remove('header--scrolled');
  }
  window.addEventListener('scroll', onHeaderScroll, { passive: true });
  onHeaderScroll();

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById('navToggle');
  var navClose = document.getElementById('navClose');
  var mobileNav = document.getElementById('mobileNav');
  function openNav() { mobileNav.classList.add('open'); mobileNav.setAttribute('aria-hidden', 'false'); navToggle.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; }
  function closeNav() { mobileNav.classList.remove('open'); mobileNav.setAttribute('aria-hidden', 'true'); navToggle.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
  navToggle.addEventListener('click', openNav);
  navClose.addEventListener('click', closeNav);
  document.querySelectorAll('[data-mobile-link]').forEach(function (a) { a.addEventListener('click', closeNav); });

  /* ---------- Footer year ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Content reveals ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Background stage engine ---------- */
  var stage = document.getElementById('stage');
  var doorLeft = document.getElementById('doorLeft');
  var doorRight = document.getElementById('doorRight');
  var wiper = document.getElementById('wiper');
  var introLockup = document.getElementById('introLockup');

  // sections with bg layers (home is the base, never transformed)
  var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-scene]')).map(function (el) {
    return { el: el, key: el.getAttribute('data-scene') };
  });

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // map scene key -> bg layer element
  var bgLayers = {};
  document.querySelectorAll('.bg').forEach(function (b) { bgLayers[b.getAttribute('data-bg')] = b; });
  var dirMap = { up: 'y', down: 'y', left: 'x', right: 'x' };

  if (!reduceMotion) {
    var ticking = false;

    function update() {
      var vh = window.innerHeight;
      var start = vh * 0.92;   // section top enters here (near bottom)
      var end = vh * 0.10;     // section top reaches here (near top) => fully covered
      var span = start - end;

      // --- doors: open over the intro's first stretch of scroll ---
      var intro = scenes[0].el;
      var ir = intro.getBoundingClientRect();
      var openDist = vh * 0.82;
      var doorP = clamp(-ir.top / openDist, 0, 1);
      doorLeft.style.transform = 'translate3d(' + (-doorP * 50) + '%,0,0)';
      doorRight.style.transform = 'translate3d(' + (doorP * 50) + '%,0,0)';
      if (introLockup) introLockup.style.opacity = String(1 - doorP);

      // --- bg layer cover transitions (skip intro scene; home is base) ---
      for (var i = 1; i < scenes.length; i++) {
        var sc = scenes[i];
        var layer = bgLayers[sc.key];
        if (!layer) continue;
        var r = sc.el.getBoundingClientRect();
        // cover progress: 0 when section top near bottom, 1 when near top
        var p = clamp((start - r.top) / span, 0, 1);
        var inv = 1 - p;
        var dir = layer.getAttribute('data-dir') || 'up';
        if (dir === 'up') layer.style.transform = 'translate3d(0,' + (inv * 100) + '%,0)';
        else if (dir === 'down') layer.style.transform = 'translate3d(0,' + (-inv * 100) + '%,0)';
        else if (dir === 'left') layer.style.transform = 'translate3d(' + (-inv * 100) + '%,0,0)';
        else if (dir === 'right') layer.style.transform = 'translate3d(' + (inv * 100) + '%,0,0)';

        // flat-iron wiper sweeps during the about -> owner transition
        if (sc.key === 'owner') {
          var w = (1 - p) * 220; // 110% -> -110%
          wiper.style.transform = 'translate3d(' + (110 - w) + '%,0,0)';
          wiper.style.opacity = p > 0.02 && p < 0.98 ? '1' : '0';
        }
      }
      ticking = false;
    }

    function onScroll() {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // run once after images have a chance to decode
    update();
    setTimeout(update, 300);
  } else {
    // reduced motion: instantly reveal the active scene's bg via IntersectionObserver
    doors && (doors.style.display = 'none');
    wiper && (wiper.style.display = 'none');
    var activeBg = bgLayers['home'];
    function setActive(key) {
      Object.keys(bgLayers).forEach(function (k) {
        bgLayers[k].style.opacity = (k === key) ? '1' : '0';
      });
    }
    setActive('home');
    if ('IntersectionObserver' in window) {
      var bio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) setActive(e.target.getAttribute('data-scene'));
        });
      }, { threshold: 0.5 });
      scenes.forEach(function (sc) { bio.observe(sc.el); });
    }
  }

  /* ---------- Preload / decode bg images to avoid flash ---------- */
  document.querySelectorAll('.bg__img, .door__img').forEach(function (img) {
    if (img.decode && !img.complete) img.decode().catch(function () {});
  });

  /* ---------- Booking form (EmailJS) ---------- */
  var form = document.getElementById('bookingForm');
  var statusEl = document.getElementById('bookingStatus');
  var submitBtn = document.getElementById('submitBtn');

  var EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
  var EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
  var EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
  var EMAILJS_READY = (window.emailjs && EMAILJS_PUBLIC_KEY.indexOf('YOUR_') === -1);
  if (EMAILJS_READY) { try { emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); } catch (e) {} }

  function setStatus(msg, kind) { statusEl.textContent = msg; statusEl.className = 'booking__status ' + (kind || ''); }
  function setLoading(on) { submitBtn.disabled = on; submitBtn.style.opacity = on ? '0.6' : ''; submitBtn.firstChild.nodeValue = on ? 'Sending… ' : 'Send Request '; }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (form.company.value) return;
    var name = form.name.value.trim(), email = form.email.value.trim(), date = form.date.value, time = form.time.value;
    if (!name || !email || !date || !time) { setStatus('Please complete the required fields (name, email, date, time).', 'status--err'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus('That email address doesn’t look right.', 'status--err'); return; }

    var svc = form.querySelector('input[name="service"]:checked');
    var params = {
      service: svc ? svc.value : 'Not specified', name: name, email: email,
      phone: form.phone.value.trim() || '—', date: date, time: time,
      referral: form.ref.value || '—', notes: form.notes.value.trim() || '—', to_email: 'hello@crownedbeauty.example'
    };

    if (!EMAILJS_READY) {
      setStatus('EmailJS isn’t configured yet. Add your PUBLIC_KEY, SERVICE_ID and TEMPLATE_ID in app.js — this request would otherwise be sent: ' + name + ' · ' + (svc && svc.value) + ' · ' + date + ' · ' + time + '.', 'status--err');
      return;
    }
    setLoading(true); setStatus('Sending your request…', '');
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params).then(
      function () { setLoading(false); setStatus('Thank you, ' + name.split(' ')[0] + '. Your request is in — we’ll reply within 24 hours to confirm.', 'status--ok'); form.reset(); },
      function (err) { setLoading(false); console.error('EmailJS error:', err); setStatus('Something went wrong. Please email us directly at hello@crownedbeauty.example.', 'status--err'); }
    );
  });

  var dateInput = document.getElementById('date');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
})();
