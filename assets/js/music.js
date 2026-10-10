/* Fløa — Music page. Reads the list of releases that tools/releases/update.py writes into the page
   and builds the shelf, the pager's timeline and the colour of the room from it. The chosen
   release is in the address (#slug), so a link can open the page on it. The Spotify player is only
   loaded when someone presses Play; until then the page sends nothing to Spotify. */
(function () {
  'use strict';
  var list = document.getElementById('releases');
  var rows = Array.prototype.slice.call(list.querySelectorAll('.rel'));
  if (!rows.length) return;

  var music = document.querySelector('.music');
  var shelf = document.querySelector('.m-shelf');
  var stage = shelf.querySelector('.m-covers');
  var ticksBox = shelf.querySelector('.m-ticks');
  var yearsBox = shelf.querySelector('.m-years');
  var steps = shelf.querySelectorAll('.m-step');
  var card = shelf.querySelector('.m-card');
  var listen = card.querySelector('.m-listen');
  var note = card.querySelector('.m-note');
  var player = card.querySelector('.m-player');
  var linksBox = card.querySelector('.m-links');
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
  var SLOT = [[0, 1, 0, 1, 1], [.87, .66, 34, .9, .7], [1.37, .5, 42, .6, .55], [1.74, .4, 48, .32, .45], [2.05, .3, 52, 0, .4]];
  var covers = R.map(function (r) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'm-cover'; b.tabIndex = -1;
    b.setAttribute('aria-hidden', 'true');
    var img = document.createElement('img');
    img.alt = ''; img.decoding = 'async'; img.draggable = false;
    img.width = 350; img.height = 350;
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

  /* ---------- the pager's timeline ---------- */
  var first = +R[R.length - 1].date.slice(0, 4), last = +R[0].date.slice(0, 4);
  var t0 = Date.parse(first + '-01-01'), t1 = Date.parse((last + 1) + '-01-01');
  function at(d) { return ((Date.parse(d) - t0) / (t1 - t0) * 100).toFixed(3) + '%'; }
  var ticks = R.map(function (r) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'm-tick'; b.tabIndex = -1; b.title = r.title + ' · ' + day(r.date);
    b.style.left = at(r.date);
    b.appendChild(document.createElement('span'));
    b.addEventListener('click', function () { choose(r.i); });
    ticksBox.appendChild(b);
    return b;
  });
  for (var y = first; y <= last; y++) {
    var m = document.createElement('span'), c = document.createElement('span');
    c.className = 'c'; c.textContent = String(y).slice(0, 2);
    m.appendChild(c); m.appendChild(document.createTextNode(String(y).slice(2)));
    m.style.left = at(y + '-01-01');
    yearsBox.appendChild(m);
  }

  /* ---------- the chosen release ---------- */
  var eyebrow = card.querySelector('.m-eyebrow'), title = card.querySelector('.m-title'), withP = card.querySelector('.m-with');
  var dateD = card.querySelector('.m-date'), typeD = card.querySelector('.m-type'), labelD = card.querySelector('.m-label');
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
    listen.lastChild.textContent = open ? 'Close player' : 'Play here';
    if (open) playerFor(R[sel]); else player.innerHTML = '';
  }

  function choose(i, quiet) {
    i = Math.max(0, Math.min(R.length - 1, i));
    var r = R[i], was = R[sel];
    sel = i;
    layout();
    eyebrow.textContent = i === 0 ? 'Latest release' : 'Release · ' + (i + 1) + ' of ' + R.length;
    title.textContent = r.title;
    withP.textContent = r.with ? 'with ' + r.with : '';
    dateD.textContent = day(r.date);
    typeD.textContent = r.type;
    labelD.textContent = r.label || '—';
    linksBox.innerHTML = '';
    r.links.forEach(function (l) {
      var a = document.createElement('a'), k = document.createElement('span'), v = document.createElement('span'), arrow = document.createElement('span');
      a.className = 'm-link'; a.href = l.url; a.target = '_blank'; a.rel = 'noopener';
      k.className = 'k'; k.textContent = l.name;
      v.className = 'v'; v.textContent = 'Open';
      arrow.className = 'arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '↗';
      v.appendChild(arrow); a.appendChild(k); a.appendChild(v);
      linksBox.appendChild(a);
    });
    listen.hidden = !r.spotify;
    note.textContent = r.spotify
      ? 'Plays here from Spotify. Nothing loads from Spotify until you press play.'
      : 'Not on Spotify yet; open it in one of the places on the right.';
    if (!player.hidden) { if (r.spotify) playerFor(r); else openPlayer(false); }
    music.style.setProperty('--m-light', r.light);
    music.style.setProperty('--m-field', mix(r.deep, '#060707', .35));
    was.li.classList.remove('is-on'); r.li.classList.add('is-on');
    ticks[was.i].classList.remove('is-on'); ticks[i].classList.add('is-on');
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

  /* A row of the table puts its release on the shelf and brings the shelf into view. */
  list.addEventListener('click', function (e) {
    if (e.target.closest('a')) return;
    var li = e.target.closest('.rel');
    if (!li) return;
    choose(rows.indexOf(li));
    shelf.scrollIntoView({ behavior: still.matches ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- start ---------- */
  document.documentElement.classList.add('js');
  document.querySelector('.m-count').textContent = R.length + ' releases, ' + first + '–' + last;
  shelf.hidden = false;
  var start = rows.findIndex(function (li) { return '#' + li.id === location.hash; });
  choose(Math.max(start, 0), true);
  var raf = 0;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(layout);
  });
})();
