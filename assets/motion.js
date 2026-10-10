/* Le Comptoir — couche d'animation. Se charge après site.js, ne touche à aucun contenu,
   n'enregistre rien dans le navigateur. Si quoi que ce soit échoue, le site s'affiche sans animation. */
(function () {
  'use strict';
  var W = window, D = document, R = D.documentElement;
  W.__lcMotion = 1;
  if (!R.classList.contains('m')) return;
  function off() {
    R.classList.remove('m', 'mr');
    Array.prototype.forEach.call(D.querySelectorAll('[data-rv]'), function (e) { e.removeAttribute('data-rv'); });
  }
  if (!('IntersectionObserver' in W) || !W.requestAnimationFrame) { off(); return; }

  try {
    var $ = function (s, r) { return (r || D).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
    var fine = W.matchMedia && W.matchMedia('(hover:hover) and (pointer:fine)').matches;

    /* ── Titres découpés en mots (le texte reste identique pour les lecteurs d'écran) ── */
    function words(el) {
      if (el.childElementCount || el.hasAttribute('data-set') || !el.textContent.trim()) return false;
      var parts = el.textContent.split(/([ \n\t]+)/), f = D.createDocumentFragment(), i = 0;
      parts.forEach(function (p) {
        if (!p) return;
        if (/^[ \n\t]+$/.test(p)) { f.appendChild(D.createTextNode(' ')); return; }
        var w = D.createElement('span'), s = D.createElement('span');
        w.className = 'w'; s.textContent = p; s.style.setProperty('--i', i++);
        w.appendChild(s); f.appendChild(w);
      });
      el.textContent = '';
      el.appendChild(f);
      return true;
    }

    /* ── Repérage des blocs à faire apparaître ── */
    var RULES = [
      ['.ticket', 'ticket'],
      ['.item', 'rule'],
      ['.steps li', 'step'],
      ['.checks li', 'check'],
      ['.proofs li', 'proof'],
      ['.subj, .suspects li, .facts li, .chip', 'scale'],
      ['.hero .seal', 'seal'],
      ['hr.rule', 'line'],
      ['.pin, .topic, form.card, .gcard, .faces, .member, .good, .partner, .roster li, details, .empty, .actions, .foot > *, .legal', 'up'],
      ['h1, h2', 'words'],
      ['h3, p, li, .more', 'up']
    ];
    var io = new IntersectionObserver(seen, { threshold: [0, 0.15] });

    function tag(root) {
      var found = [];
      RULES.forEach(function (r) {
        $$(r[0], root).forEach(function (el) {
          if (el.hasAttribute('data-rv') || el.__lc) return;
          if (el.closest('.story, dialog, #hd')) return;
          if (!el.closest('main, #ft')) return;
          if (el.parentElement && el.parentElement.closest('[data-rv]')) return;
          var t = r[1];
          if (t === 'step') t = parseFloat(getComputedStyle(el).borderLeftWidth) > 0 ? 'up' : 'rule';
          if (t === 'words' && !words(el)) t = 'up';
          if (t === 'proof') $$('svg *', el).forEach(function (s) { s.setAttribute('pathLength', '1'); });
          el.__lc = 1;
          el.setAttribute('data-rv', t);
          found.push(el);
        });
      });
      found.forEach(function (el) { io.observe(el); });
    }

    function done(el) {
      if (el.getAttribute('data-rv') === 'words') return;
      el.removeAttribute('data-rv');
      el.classList.remove('in');
      el.style.removeProperty('--d');
    }

    function seen(entries) {
      var list = [];
      entries.forEach(function (e) {
        var el = e.target;
        if (e.isIntersecting && (e.intersectionRatio >= 0.15 || e.intersectionRect.height > 120)) list.push(e);
        else if (!e.isIntersecting && e.boundingClientRect.bottom < 0 && e.boundingClientRect.height > 0) {
          /* déjà au-dessus de l'écran (arrivée sur une ancre) : visible tout de suite */
          io.unobserve(el);
          if (el.getAttribute('data-rv') === 'words') { el.style.setProperty('--d', '-2000ms'); el.classList.add('in'); }
          else done(el);
        }
      });
      list.sort(function (a, b) {
        return (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left);
      });
      list.forEach(function (e, i) {
        var el = e.target, d = Math.min(i, 7) * 85;
        io.unobserve(el);
        el.style.setProperty('--d', d + 'ms');
        el.classList.add('in');
        W.setTimeout(function () { done(el); }, d + 1700);
      });
    }

    /* ── Ouverture de l'accueil : mots des chapitres, halo, orbite d'étoiles, inertie ── */
    var story = $('#story'), orb = story && $('[data-orb]', story);
    if (story) {
      $$('.ch h1, .ch h2', story).forEach(words);
      if (orb) {
        var star = 'M0 -2.3L.6 -.6 2.3 0 .6 .6 0 2.3-.6 .6-2.3 0-.6-.6Z';
        orb.insertAdjacentHTML('afterbegin', '<span class="lc-halo"></span>');
        orb.insertAdjacentHTML('beforeend', '<svg class="lc-orbit" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49"/>' +
          [18, 138, 258].map(function (a) { return '<g transform="rotate(' + a + ' 50 50) translate(50 1)"><path d="' + star + '"/></g>'; }).join('') + '</svg>');
      }
      var ps = 0, tx = 0, ty = 0, ttx = 0, tty = 0, running = false, visible = false;
      var goal = function () {
        var r = story.getBoundingClientRect(), span = r.height - W.innerHeight;
        return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      };
      var frame = function () {
        var g = goal();
        ps += (g - ps) * 0.11; tx += (ttx - tx) * 0.07; ty += (tty - ty) * 0.07;
        if (Math.abs(g - ps) < 0.0004) ps = g;
        story.style.setProperty('--ps', ps.toFixed(4));
        story.style.setProperty('--ox', (Math.cos(ps * Math.PI * 2) * 6).toFixed(3));
        story.style.setProperty('--tx', tx.toFixed(3));
        story.style.setProperty('--ty', ty.toFixed(3));
        if (visible) W.requestAnimationFrame(frame); else running = false;
      };
      ps = goal();
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !running) { running = true; W.requestAnimationFrame(frame); }
      }).observe(story);
      if (fine) {
        var stage = $('.stage', story);
        stage.addEventListener('pointermove', function (e) {
          var r = stage.getBoundingClientRect();
          ttx = ((e.clientX - r.left) / r.width - 0.5) * 2;
          tty = ((e.clientY - r.top) / r.height - 0.5) * 2;
        });
        stage.addEventListener('pointerleave', function () { ttx = 0; tty = 0; });
      }
    }

    /* ── Défilement : en-tête, fil de lecture, bandes qui s'ouvrent, sceau qui tourne ── */
    var hd = $('#hd'), bands = $$('.band.navy'), heroSeal = $('.hero .seal'), ticking = false;
    function onScroll() {
      ticking = false;
      var y = W.scrollY || W.pageYOffset || 0, vh = W.innerHeight, max = R.scrollHeight - vh;
      if (hd) {
        hd.classList.toggle('scrolled', y > 8);
        hd.style.setProperty('--sp', (max > 0 ? Math.min(1, y / max) : 0).toFixed(4));
      }
      bands.forEach(function (b) {
        var e = Math.min(1, Math.max(0, (vh - b.getBoundingClientRect().top) / (vh * 0.55))).toFixed(3);
        if (b.__e !== e) { b.__e = e; b.style.setProperty('--e', e); }
      });
      if (heroSeal) heroSeal.style.setProperty('--py', Math.round(y));
    }
    function askScroll() { if (!ticking) { ticking = true; W.requestAnimationFrame(onScroll); } }
    W.addEventListener('scroll', askScroll, { passive: true });
    W.addEventListener('resize', askScroll);

    /* ── Curseur : lumière sur les bandes sombres, billets qui s'inclinent ── */
    if (fine) {
      var px = 0, py = 0, pt = null, pending = false;
      D.addEventListener('pointermove', function (e) {
        px = e.clientX; py = e.clientY; pt = e.target;
        if (pending) return;
        pending = true;
        W.requestAnimationFrame(function () {
          pending = false;
          if (!pt || !pt.closest) return;
          var glow = pt.closest('.band.navy, .hero.navy'), r;
          if (glow) {
            r = glow.getBoundingClientRect();
            glow.style.setProperty('--mx', (px - r.left).toFixed(0) + 'px');
            glow.style.setProperty('--my', (py - r.top).toFixed(0) + 'px');
          }
          var tk = pt.closest('button.ticket');
          if (tk) {
            r = tk.getBoundingClientRect();
            tk.style.setProperty('--ry', (((px - r.left) / r.width - 0.5) * 7).toFixed(2) + 'deg');
            tk.style.setProperty('--rx', (((py - r.top) / r.height - 0.5) * -6).toFixed(2) + 'deg');
          }
        });
      }, { passive: true });
    }

    /* ── Le jeu : la carte se retourne à chaque tirage ── */
    var gdraw = $('#gdraw'), gcard = $('#gcard');
    if (gdraw && gcard) gdraw.addEventListener('click', function () {
      gcard.classList.remove('dealt'); void gcard.offsetWidth; gcard.classList.add('dealt');
    });

    /* ── Contenus qui arrivent du CMS après coup (événements, bureau, merch…) ── */
    if ('MutationObserver' in W) {
      $$('#events, #board, #roster, #products, #partners, #filters').forEach(function (box) {
        new MutationObserver(function () { tag(box); }).observe(box, { childList: true });
      });
    }

    tag(D);
    onScroll();
    void D.body.offsetWidth;
    R.classList.add('mr');
  } catch (err) {
    off();
  }
})();
