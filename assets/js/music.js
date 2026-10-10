/* Fløa — Music page. Reads the list of releases that tools/releases/update.py writes into the page
   and builds the shelf, the timeline and the colour of the room from it. The chosen release is in
   the address (#slug), so a link can open the page on it. The Spotify player is only loaded when
   someone presses Listen; until then the page sends nothing to Spotify. */
(function () {
  'use strict';
  var list = document.getElementById('releases');
  var rows = Array.prototype.slice.call(list.querySelectorAll('.rel'));
  if (!rows.length) return;

  var music = document.querySelector('.music');
  var shelf = document.querySelector('.m-shelf');
  var stage = shelf.querySelector('.m-stage');
  var timeline = document.querySelector('.m-timeline');
  var ticksBox = timeline.querySelector('.m-ticks');
  var yearsBox = timeline.querySelector('.m-years');
  var toggle = document.querySelector('.m-toggle');
  var listen = shelf.querySelector('.m-listen');
  var player = shelf.querySelector('.m-player');
  var linksBox = shelf.querySelector('.m-links');
  var steps = shelf.querySelectorAll('.m-step');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');

  var R = rows.map(function (li, i) {
    var spotify = (li.getAttribute('data-spotify') || '').match(/open\.spotify\.com\/album\/([A-Za-z0-9]+)/);
    return {
      i: i, li: li, slug: li.id, date: li.getAttribute('data-date'), type: li.getAttribute('data-type'),
      light: li.getAttribute('data-light'), deep: li.getAttribute('data-deep'),
      title: li.querySelector('.rel-title').textContent,
      with: li.querySelector('.rel-with').textContent,
      label: li.querySelector('.rel-label').textContent,
      links: Array.prototype.map.call(li.querySelectorAll('.rel-links a'), function (a) { return { name: a.textContent, url: a.href }; }),
      spotify: spotify ? spotify[1] : null
    };
  });

  function mix(a, b, t) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), out = '#';
    [16, 8, 0].forEach(function (s) {
      var v = Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
      out += (v < 16 ? '0' : '') + v.toString(16);
    });
    return out;
  }
  function day(d) { return d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4); }

  /* ---------- shelf ---------- */
  // Per distance from the chosen cover: offset in cover widths, scale, turn (deg), opacity, brightness.
  var SLOT = [[0, 1, 0, 1, 1], [.87, .66, 34, .92, .78], [1.37, .5, 42, .62, .6], [1.74, .4, 48, .35, .48], [2.05, .3, 52, 0, .4]];
  var covers = R.map(function (r) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'm-cover'; b.tabIndex = -1;
    b.setAttribute('aria-hidden', 'true');
    var img = document.createElement('img');
    img.alt = ''; img.decoding = 'async'; img.draggable = false;
    img.width = 380; img.height = 380;
    b.appendChild(img);
    b.addEventListener('click', function () { if (!dragged) choose(r.i); });
    stage.appendChild(b);
    return b;
  });

  var sel = 0;
  function layout() {
    var cv = covers[0].offsetWidth;
    covers.forEach(function (b, i) {
      var o = i - sel, a = Math.min(Math.abs(o), 4), k = SLOT[a], sg = o < 0 ? -1 : 1;
      b.style.transform = 'translateX(' + (sg * k[0] * cv).toFixed(1) + 'px) rotateY(' + (-sg * k[2]) + 'deg) scale(' + k[1] + ')';
      b.style.opacity = k[3];
      b.style.filter = a ? 'brightness(' + k[4] + ')' : '';
      b.style.zIndex = 100 - a;
      b.style.pointerEvents = a < 4 ? '' : 'none';
      b.classList.toggle('is-on', a === 0);
      var img = b.firstChild;
      if (a <= 3 && !img.getAttribute('src')) img.src = '../assets/img/music/' + R[i].slug + '.jpg';
    });
  }

  /* ---------- timeline ---------- */
  var first = +R[R.length - 1].date.slice(0, 4), last = +R[0].date.slice(0, 4);
  var t0 = Date.parse(first + '-01-01'), t1 = Date.parse((last + 1) + '-01-01');
  function at(d) { return ((Date.parse(d) - t0) / (t1 - t0) * 100).toFixed(3) + '%'; }
  var ticks = R.map(function (r) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'm-tick'; b.tabIndex = -1; b.title = r.title + ' · ' + day(r.date);
    b.style.left = at(r.date);
    var bar = document.createElement('span');
    bar.style.background = r.light;
    b.appendChild(bar);
    b.addEventListener('click', function () { choose(r.i); });
    ticksBox.appendChild(b);
    return b;
  });
  for (var y = first; y <= last; y++) {
    var m = document.createElement('span');
    m.textContent = y; m.style.left = at(y + '-01-01');
    yearsBox.appendChild(m);
  }

  /* ---------- the chosen release ---------- */
  var eyebrow = shelf.querySelector('.m-eyebrow'), title = shelf.querySelector('.m-title'), meta = shelf.querySelector('.m-meta');
  var pos = timeline.querySelector('.m-pos');
  function playerFor(r) {
    player.innerHTML = '';
    var f = document.createElement('iframe');
    f.src = 'https://open.spotify.com/embed/album/' + r.spotify + '?utm_source=generator&theme=0';
    f.title = 'Spotify player: ' + r.title;
    f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    player.appendChild(f);
  }
  function openPlayer(open) {
    player.hidden = !open;
    listen.setAttribute('aria-expanded', open ? 'true' : 'false');
    listen.lastChild.textContent = open ? 'Close player' : 'Listen here';
    if (open) playerFor(R[sel]); else player.innerHTML = '';
  }

  function choose(i, quiet) {
    i = Math.max(0, Math.min(R.length - 1, i));
    var r = R[i], was = R[sel];
    sel = i;
    layout();
    eyebrow.textContent = i === 0 ? 'Latest release' : r.date.slice(0, 4);
    title.textContent = r.title;
    meta.textContent = (r.with ? 'with ' + r.with + ' · ' : '') + day(r.date) + ' · ' + r.type + (r.label ? ' · ' + r.label : '');
    linksBox.innerHTML = '';
    r.links.forEach(function (l) {
      var a = document.createElement('a');
      a.href = l.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = l.name + ' ↗';
      linksBox.appendChild(a);
    });
    listen.hidden = !r.spotify;
    if (!player.hidden) { if (r.spotify) playerFor(r); else openPlayer(false); }
    music.style.setProperty('--m-deep', r.deep);
    music.style.setProperty('--m-floor', mix(r.deep, '#101211', .7));
    music.style.setProperty('--m-light', r.light);
    was.li.classList.remove('is-on'); r.li.classList.add('is-on');
    ticks[was.i].classList.remove('is-on'); ticks[i].classList.add('is-on');
    pos.textContent = (i + 1) + ' / ' + R.length;
    steps[0].disabled = i === 0;
    steps[1].disabled = i === R.length - 1;
    if (!quiet && history.replaceState) history.replaceState(null, '', '#' + r.slug);
  }

  listen.addEventListener('click', function () { openPlayer(player.hidden); });
  steps[0].addEventListener('click', function () { choose(sel - 1); });
  steps[1].addEventListener('click', function () { choose(sel + 1); });

  /* Keys on the shelf, a swipe or drag across it, and a sideways trackpad scroll over it. */
  stage.addEventListener('keydown', function (e) {
    var to = { ArrowLeft: sel - 1, ArrowRight: sel + 1, Home: 0, End: R.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    choose(to);
  });
  var downX = null, dragged = false;
  stage.addEventListener('pointerdown', function (e) { downX = e.clientX; dragged = false; });
  stage.addEventListener('pointermove', function (e) {
    if (downX === null) return;
    var dx = e.clientX - downX;
    if (Math.abs(dx) > 48) { dragged = true; downX = e.clientX; choose(sel + (dx < 0 ? 1 : -1)); }
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
    stage.addEventListener(t, function () { downX = null; setTimeout(function () { dragged = false; }, 0); });
  });
  var wheel = 0, wheelTimer = 0;
  stage.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    wheel += e.deltaX;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () { wheel = 0; }, 160);
    if (Math.abs(wheel) > 70) { choose(sel + (wheel > 0 ? 1 : -1)); wheel = 0; }
  }, { passive: false });

  /* ---------- the list ---------- */
  function openList(open) {
    list.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? 'Hide the list' : 'All ' + R.length + ' releases as a list';
  }
  toggle.addEventListener('click', function () { openList(list.hidden); });
  list.addEventListener('click', function (e) {
    if (e.target.closest('a')) return;
    var li = e.target.closest('.rel');
    if (!li) return;
    e.preventDefault();
    choose(rows.indexOf(li));
    var top = shelf.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * .5) shelf.scrollIntoView({ behavior: still.matches ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- start ---------- */
  document.documentElement.classList.add('js');
  document.querySelector('.m-count').textContent = R.length + ' releases · ' + first + '–' + last;
  shelf.hidden = false; timeline.hidden = false; toggle.hidden = false;
  openList(false);
  var start = rows.findIndex(function (li) { return '#' + li.id === location.hash; });
  choose(Math.max(start, 0), true);
  var raf = 0;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(layout);
  });
})();
