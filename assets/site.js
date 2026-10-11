/* Le Comptoir — affichage du site. Les contenus se modifient dans le dossier « contenu » (fichiers .json), pas ici. */
(function () {
  'use strict';
  var D = document;

  /* Le site ne s'affiche pas dans le cadre d'un autre site : on ne peut pas faire cliquer un visiteur à son insu */
  var framed = false;
  try { framed = window.top !== window.self && window.top.location.host !== window.location.host; } catch (e) { framed = true; }
  if (framed) {
    D.body.textContent = '';
    var out = D.createElement('a');
    out.href = window.location.href; out.target = '_top'; out.rel = 'noopener';
    out.textContent = 'Ouvrir le site du Comptoir · Open Le Comptoir’s website';
    out.style.cssText = 'display:block;padding:24px;font:700 1rem/1.4 sans-serif;color:#0B1F4D';
    D.body.appendChild(out);
    return;
  }

  function get(k) { try { return localStorage.getItem('lc_' + k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem('lc_' + k, v); } catch (e) {} }
  var L = get('lang') === 'en' ? 'en' : 'fr';
  function t(fr, en) { return L === 'en' && en ? en : fr; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || D).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); }
  var here = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index';

  /* Le sceau du club, dessiné une fois et réutilisé (en-tête, ouverture, pied de page) */
  var n = 0;
  function seal() {
    n++;
    var a = 'sa' + n, b = 'sb' + n, star = 'M0 -9 L2.6 -2.6 L9 0 L2.6 2.6 L0 9 L-2.6 2.6 L-9 0 L-2.6 -2.6Z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" role="img" aria-label="Le Comptoir, club étudiant. Fortes fortuna adiuvat.">' +
      '<defs><path id="' + a + '" d="M 80 250 A 170 170 0 0 1 420 250"/><path id="' + b + '" d="M 72 250 A 178 178 0 0 0 428 250"/></defs>' +
      '<circle cx="250" cy="250" r="238" fill="#0B1F4D"/><circle cx="250" cy="250" r="226" fill="none" stroke="#D9A441" stroke-width="5"/><circle cx="250" cy="250" r="214" fill="none" stroke="#D9A441" stroke-width="1.5"/>' +
      '<text font-family="Lora, Georgia, serif" font-weight="700" font-size="46" letter-spacing="2" fill="#F5F1E6" text-anchor="middle"><textPath href="#' + a + '" startOffset="50%">LE COMPTOIR</textPath></text>' +
      '<g fill="#D9A441"><path transform="translate(62 250)" d="' + star + '"/><path transform="translate(438 250)" d="' + star + '"/></g>' +
      '<line x1="190" y1="352" x2="310" y2="352" stroke="#D9A441" stroke-width="1.2" opacity=".7"/>' +
      '<g transform="translate(250 205)"><path class="steam" d="M -14 -52 q -10 -12 0 -24 q 10 -12 0 -24" fill="none" stroke="#D9A441" stroke-width="4" stroke-linecap="round"/><path class="steam" d="M 10 -52 q -10 -12 0 -24 q 10 -12 0 -24" fill="none" stroke="#D9A441" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M -38 -36 h 76 v 30 a 38 38 0 0 1 -76 0 z" fill="#F5F1E6"/><path d="M 38 -26 h 10 a 14 14 0 0 1 0 28 h -12" fill="none" stroke="#F5F1E6" stroke-width="7"/><rect x="-52" y="26" width="104" height="7" rx="3.5" fill="#D9A441"/></g>' +
      '<g transform="translate(250 300)"><path d="M 0 -40 C -30 -58 -80 -58 -118 -44 L -118 20 C -80 6 -30 6 0 24 Z" fill="#F5F1E6"/><path d="M 0 -40 C 30 -58 80 -58 118 -44 L 118 20 C 80 6 30 6 0 24 Z" fill="#EDE4D0"/>' +
      '<g stroke="#0B1F4D" stroke-width="2.2" opacity=".35" fill="none"><path d="M -20 -30 C -45 -40 -80 -40 -100 -32"/><path d="M -20 -16 C -45 -26 -80 -26 -100 -18"/><path d="M -20 -2 C -45 -12 -80 -12 -100 -4"/><path d="M 20 -30 C 45 -40 80 -40 100 -32"/><path d="M 20 -16 C 45 -26 80 -26 100 -18"/><path d="M 20 -2 C 45 -12 80 -12 100 -4"/></g>' +
      '<path d="M -130 24 C -80 12 -30 14 0 34 C 30 14 80 12 130 24" fill="none" stroke="#D9A441" stroke-width="6" stroke-linecap="round"/></g>' +
      '<text font-family="Lato, Carlito, sans-serif" font-weight="700" font-size="20" letter-spacing="3" fill="#E8B04B" text-anchor="middle"><textPath href="#' + b + '" startOffset="50%">FORTES FORTUNA ADIUVAT</textPath></text>' +
      '<text x="250" y="376" font-family="Lato, Carlito, sans-serif" font-size="14" letter-spacing="3" fill="#F5F1E6" text-anchor="middle">' + t('CLUB ÉTUDIANT', 'STUDENT CLUB') + '</text></svg>';
  }

  /* Langue : le texte anglais est porté par l'attribut data-en de chaque élément */
  function translate() {
    D.documentElement.lang = L;
    if (L !== 'en') return;
    $$('[data-en]').forEach(function (e) { e.innerHTML = e.getAttribute('data-en'); });
    $$('[data-en-ph]').forEach(function (e) { e.placeholder = e.getAttribute('data-en-ph'); });
    var te = D.documentElement.getAttribute('data-title-en');
    if (te) D.title = te;
  }

  /* Navigation : l'ordre suit le parcours d'un visiteur (découvrir, venir, acheter, s'associer) */
  var NAV = [['club', 'Le club', 'The club'], ['evenements', 'Événements', 'Events'], ['jeu', 'Le jeu', 'The game'], ['bureau', 'Le bureau', 'The board'], ['merch', 'Merch', 'Merch'], ['partenaires', 'Partenaires', 'Partners']];
  /* Action principale de chaque page, reprise par la barre mobile */
  var DOCK = {
    merch: [['#precommande', 'Réserver un article', 'Reserve an item']],
    partenaires: [['#contact', 'Prendre rendez-vous', 'Book a call']],
    rejoindre: [],
    jeu: [['#contact', 'Voir le jeu', 'See the game'], ['rejoindre.html', 'Venir à un Comptoir', 'Come to a Comptoir']]
  };
  /* Les pages du jeu (règle, plateau, cartes, enquête) partagent la même action et le même onglet « Le jeu » */
  var inGame = here.indexOf('jeu-') === 0;
  if (inGame) DOCK[here] = [['jeu.html#contact', 'Voir le jeu', 'See the game']];
  function link(h, fr, en, cls) { return '<a' + (cls ? ' class="' + cls + '"' : '') + ' href="' + h + '"' + (here + '.html' === h || (inGame && h === 'jeu.html') ? ' aria-current="page"' : '') + '>' + t(fr, en) + '</a>'; }
  function chrome() {
    var main = $('main');
    if (main && !main.id) main.id = 'main';
    D.body.insertAdjacentHTML('afterbegin', '<a class="skip" href="#main">' + t('Aller au contenu', 'Skip to content') + '</a>');
    $('#hd').innerHTML = '<div class="wrap bar"><a class="brand" href="index.html">' + seal().replace(/ role="img" aria-label="[^"]*"/, ' aria-hidden="true" focusable="false"') + '<span>Le Comptoir<span class="sr">, ' + t('accueil', 'home') + '</span></span></a>' +
      '<button class="burger" aria-controls="menu" aria-expanded="false"><i aria-hidden="true"></i>' + t('Menu', 'Menu') + '</button>' +
      '<nav class="menu" id="menu" aria-label="' + t('Navigation principale', 'Main navigation') + '"><div class="links">' +
      NAV.map(function (v) { return link(v[0] + '.html', v[1], v[2]); }).join('') + '</div>' +
      '<a class="btn" href="rejoindre.html">' + t('Venir à un Comptoir', 'Come to a Comptoir') + '</a>' +
      '<p class="hint">' + t('Chaque mercredi · ouvert à tous les étudiants du City Campus', 'Every Wednesday · open to all City Campus students') + '</p>' +
      '<button class="lang" lang="' + t('en', 'fr') + '" aria-label="' + t('EN, switch to English', 'FR, passer en français') + '">' + t('EN', 'FR') + '</button></nav></div>';
    $('#ft').innerHTML = '<div class="wrap"><div class="foot"><div class="about">' + seal() + '<p><b>Le Comptoir</b></p>' +
      '<p class="soft">' + t('Club étudiant du Bachelor in Management, incubé au Bureau des Clubs d’Audencia · City Campus, Nantes', 'Bachelor in Management student club, incubated by Audencia’s Bureau des Clubs · City Campus, Nantes') + '</p>' +
      '<p class="motto"><b>FORTES FORTUNA ADIUVAT</b><br>' + t('« La fortune sourit aux audacieux », Térence', '“Fortune favours the bold”, Terence') + '</p>' +
      '<p>Contact : <a data-set-mail href="mailto:jblucas.denis@audencia.com">jblucas.denis@audencia.com</a></p></div>' +
      '<nav aria-label="' + t('Découvrir', 'Discover') + '"><h2>' + t('Découvrir', 'Discover') + '</h2><ul>' +
      '<li>' + link('club.html', 'Le club', 'The club') + '</li><li>' + link('evenements.html', 'Événements', 'Events') + '</li><li>' + link('jeu.html', 'Le jeu', 'The game') + '</li><li>' + link('bureau.html', 'Le bureau', 'The board') + '</li></ul></nav>' +
      '<nav aria-label="' + t('Agir', 'Get involved') + '"><h2>' + t('Agir', 'Get involved') + '</h2><ul>' +
      '<li>' + link('rejoindre.html', 'Venir à un Comptoir', 'Come to a Comptoir') + '</li><li>' + link('merch.html', 'Réserver le merch', 'Reserve merch') + '</li><li>' + link('partenaires.html', 'Devenir partenaire', 'Become a partner') + '</li><li>' + link('partenaires.html#contact', 'Prendre rendez-vous', 'Book a call') + '</li></ul></nav>' +
      '<nav aria-label="' + t('Suivre', 'Follow') + '"><h2>' + t('Suivre', 'Follow') + '</h2><ul>' +
      '<li><a href="https://www.audencia.com" target="_blank" rel="noopener">Audencia ↗</a></li>' +
      '<li><a data-set-href="instagram" target="_blank" rel="noopener" hidden>Instagram ↗</a></li><li><a data-set-href="linkedin" target="_blank" rel="noopener" hidden>LinkedIn ↗</a></li><li><a data-set-href="youtube" target="_blank" rel="noopener" hidden>YouTube ↗</a></li>' +
      '<li data-nosocial class="soft">' + t('Instagram et YouTube : bientôt en ligne.', 'Instagram and YouTube: coming soon.') + '</li>' +
      '<li><a href="https://www.linkedin.com/in/lucas-denis-jb" target="_blank" rel="noopener">' + t('LinkedIn du président ↗', 'The president on LinkedIn ↗') + '</a></li></ul></nav></div>' +
      '<div class="legal"><span>© ' + new Date().getFullYear() + ' Le Comptoir</span><span style="display:flex;gap:18px;flex-wrap:wrap"><a href="mentions.html">' + t('Mentions légales', 'Legal notice') + '</a><a href="confidentialite.html">' + t('Confidentialité et cookies', 'Privacy and cookies') + '</a><a href="conditions.html">' + t('Conditions de précommande', 'Pre-order terms') + '</a></span></div></div>';
    $$('[data-seal]').forEach(function (e) { e.innerHTML = seal(); });
    var burger = $('.burger'), menu = $('.menu');
    function setMenu(o) { menu.classList.toggle('open', o); burger.setAttribute('aria-expanded', o); D.body.classList.toggle('locked', o); }
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); } });
    $('.lang').addEventListener('click', function () { put('lang', L === 'en' ? 'fr' : 'en'); location.reload(); });
    dock();
  }

  /* Barre d'action mobile : l'action principale reste à portée de pouce après l'ouverture de la page */
  function dock() {
    var acts = DOCK.hasOwnProperty(here) ? DOCK[here] : [['rejoindre.html', 'Venir à un Comptoir', 'Come to a Comptoir']];
    if (!acts.length || /^(mentions|confidentialite|conditions)$/.test(here)) return;
    var d = D.createElement('nav');
    d.className = 'dock';
    d.setAttribute('aria-label', t('Action principale', 'Main action'));
    d.innerHTML = acts.map(function (a, i) { return '<a class="btn' + (i ? ' ghost' : '') + '" href="' + a[0] + '">' + t(a[1], a[2]) + '</a>'; }).join('');
    D.body.appendChild(d);
    D.body.classList.add('has-dock');
    var ft = $('#ft'), ticking = false;
    function upd() {
      ticking = false;
      var past = window.scrollY > window.innerHeight * .6;
      var atFoot = ft && ft.getBoundingClientRect().top < window.innerHeight;
      var target = acts[0][0].charAt(0) === '#' ? $(acts[0][0]) : null;
      var atTarget = target && target.getBoundingClientRect().top < window.innerHeight * .8 && target.getBoundingClientRect().bottom > 0;
      var st = $('#story'), inStory = st && st.getBoundingClientRect().bottom > window.innerHeight * .5;
      d.classList.toggle('show', past && !atFoot && !atTarget && !inStory);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  /* Ouverture de l'accueil : la position de défilement fait tourner le sceau et change de chapitre */
  function story() {
    var s = $('#story');
    if (!s) return;
    var orb = $('[data-orb]', s);
    if (orb) orb.insertAdjacentHTML('afterbegin', seal());
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches, ticking = false;
    function upd() {
      ticking = false;
      var r = s.getBoundingClientRect(), span = r.height - window.innerHeight;
      var p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      s.style.setProperty('--p', p.toFixed(3));
      s.setAttribute('data-ch', p < .34 ? '1' : p < .68 ? '2' : '3');
    }
    if (reduce) { s.setAttribute('data-ch', '1'); return; }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  }

  /* Lecture des contenus : un fichier par rubrique dans le dossier « contenu » du site */
  var FILES = { Reglages: 'reglages', Evenements: 'evenements', Photos: 'photos', Bureau: 'bureau', Partenaires: 'partenaires', Produits: 'merch', Sujets: 'sujets' };
  function load(coll, cb) {
    fetch('contenu/' + FILES[coll] + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('contenu'); return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows)) throw new Error('contenu');
        return rows.map(function (r, i) { return { r: r, i: i }; })
          .sort(function (x, y) { return ((x.r.ordre || 999) - (y.r.ordre || 999)) || (x.i - y.i); })
          .map(function (x) { return x.r; });
      })
      .then(cb, function () { cb(null); });
  }
  /* Un lien venu d'un fichier de contenu n'est gardé que si c'est une adresse web */
  function web(v) { v = String(v == null ? '' : v).trim(); return /^https?:\/\//i.test(v) ? v : ''; }
  /* Une image venue d'un fichier de contenu est toujours un fichier du site, rangé dans assets/ */
  function img(v) { v = String(v == null ? '' : v).trim(); return /^assets\/[\w\-.\/]+$/.test(v) && v.indexOf('..') < 0 ? v : ''; }
  /* Une adresse e-mail venue d'un fichier de contenu : une seule adresse, sans rien d'autre */
  function mail(v) { v = String(v == null ? '' : v).trim(); return /^[^\s@<>"'?&,;:]+@[^\s@<>"'?&,;:]+\.[a-z]{2,}$/i.test(v) ? v : ''; }
  function fail() { return '<p class="empty">' + t('Ce contenu ne se charge pas pour le moment. Rechargez la page, ou écrivez-nous : ', 'This content is not loading right now. Reload the page, or email us: ') + '<a href="mailto:' + esc(S.email) + '">' + esc(S.email) + '</a></p>'; }

  /* Réglages : liens des réseaux, contact, tarifs, prochain rendez-vous */
  var S = Object.create(null);
  S.email = 'jblucas.denis@audencia.com';
  function settings(rows) {
    if (!rows) return;
    rows.forEach(function (r) {
      if (!r || typeof r.title !== 'string' || !/^[a-zA-Z]+$/.test(r.title)) return;
      var v = String(t(r.valeur, r.valeurEn) || '');
      if (r.title === 'email') { if (mail(v)) S.email = mail(v); } else S[r.title] = v;
    });
    $$('[data-set]').forEach(function (e) { var v = S[e.getAttribute('data-set')]; if (v) e.textContent = v; });
    /* Un lien dont l'adresse n'est pas renseignée est retiré de la page : un lien vide ne sert ni au visiteur ni aux moteurs de recherche */
    $$('[data-set-href]').forEach(function (e) {
      var v = web(S[e.getAttribute('data-set-href')]), holder = /^(LI|P)$/.test(e.parentNode.tagName) && e.parentNode.children.length === 1 ? e.parentNode : e;
      if (v) { e.href = v; e.hidden = false; holder.hidden = false; } else holder.parentNode.removeChild(holder);
    });
    next();
    $$('[data-set-mail]').forEach(function (e) { e.href = 'mailto:' + S.email; e.textContent = S.email; });
    var any = web(S.instagram) || web(S.linkedin) || web(S.youtube);
    $$('[data-nosocial]').forEach(function (e) { e.hidden = !!any; });
  }

  /* Fenêtre de détail */
  var dg;
  function show(html) {
    if (!dg) {
      dg = D.createElement('dialog');
      D.body.appendChild(dg);
      dg.addEventListener('click', function (e) { if (e.target === dg || e.target.className === 'x') dg.close(); });
    }
    dg.innerHTML = '<div class="dlg"><button class="x" aria-label="' + t('Fermer', 'Close') + '">×</button>' + html + '</div>';
    var h = $('h2', dg);
    if (h) { h.id = 'dlg-t'; dg.setAttribute('aria-labelledby', 'dlg-t'); }
    dg.showModal();
  }

  /* Événements : un même billet sert l'agenda et l'archive */
  var TYPES = { 'Comptoir': 'Comptoir', 'Meet and Talk': 'Meet and Talk', 'Sortie Terrain': 'Field trip', 'Conférence': 'Conference' };
  var DT = { 'Date à confirmer': 'Date to be confirmed', 'Chaque mercredi': 'Every Wednesday' };
  var E = [], P = [], F = '';
  function time(d) { if (!d) return null; var x = new Date(d).getTime(); return isNaN(x) ? null : x; }
  function timed(r) { return String(r.date || '').length > 10; }
  function day(r) {
    var x = time(r.date);
    if (x !== null) return new Date(x).toLocaleDateString(L === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    return t(r.dateTexte, DT[r.dateTexte]) || '';
  }
  function events(rows) {
    var box = $('#events');
    if (!rows) { box.innerHTML = fail(); return; }
    var now = Date.now() - 864e5;
    E = rows.filter(function (r) { return r.afficher !== false; }).map(function (r, i) { var d = time(r.date); return { r: r, d: d, past: d !== null && d < now, no: i + 1 }; });
    E.sort(function (x, y) {
      if (x.past !== y.past) return x.past ? 1 : -1;
      if (x.past) return y.d - x.d;
      if (x.d && y.d) return x.d - y.d;
      if (x.d || y.d) return x.d ? -1 : 1;
      return x.no - y.no;
    });
    NEXT = E.filter(function (e) { return e.d !== null && !e.past; })[0] || null;
    next();
    schema();
    var chips = $('#filters');
    if (chips) {
      var seen = [];
      E.forEach(function (e) { if (e.r.type && seen.indexOf(e.r.type) < 0) seen.push(e.r.type); });
      chips.innerHTML = [''].concat(seen).map(function (k) { return '<button class="chip" data-f="' + esc(k) + '" aria-pressed="' + (k === F) + '">' + esc(k ? t(k, TYPES[k]) : t('Tout', 'All')) + '</button>'; }).join('');
    }
    drawEvents();
  }
  /* Dès qu'un événement à venir a une date, c'est lui le « prochain rendez-vous » de l'accueil */
  var NEXT = null;
  function hour(r) { return timed(r) ? new Date(time(r.date)).toLocaleTimeString(L === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''; }
  function next() {
    var a = $('[data-set=prochainRdv]'), b = $('[data-set=prochainRdvDetail]');
    if (!NEXT || !a || !b) return;
    var r = NEXT.r;
    a.textContent = t(r.title, r.titleEn);
    b.textContent = [day(r), hour(r), r.lieu].filter(Boolean).join(' · ');
  }
  /* Les événements datés sont décrits aux moteurs de recherche (schema.org/Event) */
  function schema() {
    var list = E.filter(function (e) { return e.d !== null && !e.past; }).map(function (e) {
      var r = e.r;
      return {
        '@type': 'Event', name: r.title, description: r.resume || undefined, startDate: String(r.date),
        eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: { '@type': 'Place', name: r.lieu || 'Nantes', address: { '@type': 'PostalAddress', addressLocality: 'Nantes', addressCountry: 'FR' } },
        organizer: { '@type': 'Organization', name: 'Le Comptoir', url: 'https://le-comptoir-nantes.github.io/' }
      };
    });
    var old = D.getElementById('ld-events');
    if (old) old.parentNode.removeChild(old);
    if (!list.length) return;
    var el = D.createElement('script');
    el.type = 'application/ld+json'; el.id = 'ld-events';
    el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': list }).replace(/</g, '\\u003c');
    D.head.appendChild(el);
  }
  /* Fichier d'agenda (.ics) d'un événement daté : 1 h 30 par défaut, journée entière si l'heure n'est pas donnée */
  function ics(e) {
    var r = e.r, d = new Date(e.d);
    function p(n) { return ('0' + n).slice(-2); }
    function ymd(x) { return x.getFullYear() + p(x.getMonth() + 1) + p(x.getDate()); }
    function full(x) { return ymd(x) + 'T' + p(x.getHours()) + p(x.getMinutes()) + '00'; }
    function txt(v) { return String(v || '').replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n'); }
    var end = timed(r) ? new Date(e.d + 54e5) : new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    var rows = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Le Comptoir//Site//FR', 'BEGIN:VEVENT',
      'UID:' + ymd(d) + '-' + e.no + '@le-comptoir-nantes.github.io', 'DTSTAMP:' + full(new Date()),
      timed(r) ? 'DTSTART:' + full(d) : 'DTSTART;VALUE=DATE:' + ymd(d), timed(r) ? 'DTEND:' + full(end) : 'DTEND;VALUE=DATE:' + ymd(end),
      'SUMMARY:' + txt('Le Comptoir · ' + r.title), 'DESCRIPTION:' + txt(r.resume), r.lieu ? 'LOCATION:' + txt(r.lieu) : '',
      'URL:https://le-comptoir-nantes.github.io/evenements.html', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean);
    var a = D.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'le-comptoir-' + ymd(d) + '.ics';
    D.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function drawEvents() {
    var box = $('#events'), lim = +box.getAttribute('data-limit') || 99;
    var list = E.filter(function (e) { return (!F || e.r.type === F) && (lim === 99 || !e.past); }).slice(0, lim);
    box.innerHTML = list.length ? list.map(function (e) {
      var r = e.r;
      return '<button class="ticket' + (e.past ? ' past' : '') + '" data-ev="' + E.indexOf(e) + '"><span class="stub"><span class="no">N° ' + ('00' + e.no).slice(-3) + '</span><span class="date">' + esc(day(r)) + '</span></span>' +
        '<span class="tbody"><span class="kind">' + esc(t(r.type, TYPES[r.type])) + '</span><span class="h">' + esc(t(r.title, r.titleEn)) + '</span><span class="p">' + esc(t(r.resume, r.resumeEn)) + '</span></span></button>';
    }).join('') : '<p class="empty">' + t('Rien dans cette catégorie pour le moment.', 'Nothing in this category for now.') + '</p>';
  }
  function eventDetail(e) {
    var r = e.r, rows = [[t('Quand', 'When'), [day(r), hour(r)].filter(Boolean).join(', ')], [t('Où', 'Where'), r.lieu], [t('Avec', 'With'), r.intervenant], [t('Cours mis en pratique', 'Course put into practice'), r.cours]];
    var pics = P.filter(function (p) { return p.autorisation === true && p.evenement === r.title && img(p.image); });
    var main = r.autorisationPhoto === true ? img(r.photo) : '';
    show('<p class="over">' + esc(t(r.type, TYPES[r.type])) + '</p><h2>' + esc(t(r.title, r.titleEn)) + '</h2><p>' + esc(t(r.resume, r.resumeEn)) + '</p>' +
      '<ul class="checks">' + rows.filter(function (x) { return x[1]; }).map(function (x) { return '<li><b>' + x[0] + ' :</b> ' + esc(x[1]) + '</li>'; }).join('') + '</ul>' +
      (web(r.video) ? '<p style="margin-top:1em"><a class="more" href="' + esc(web(r.video)) + '" target="_blank" rel="noopener">' + t('Voir la vidéo ↗', 'Watch the video ↗') + '</a></p>' : '') +
      (main || pics.length ? '<div class="shots">' + (main ? '<a href="' + esc(main) + '" target="_blank" rel="noopener"><img src="' + esc(main) + '" alt="' + esc(r.title) + '"></a>' : '') + pics.map(function (p) { var u = esc(img(p.image)); return '<a href="' + u + '" target="_blank" rel="noopener"><img src="' + u + '" alt="' + esc(p.title || r.title) + '" loading="lazy"></a>'; }).join('') + '</div>' : '') +
      '<p class="actions"><a class="btn" href="rejoindre.html">' + t('Venir avec le club', 'Come with the club') + '</a>' +
      (e.d !== null && !e.past ? '<button type="button" class="btn ghost" data-ics="' + E.indexOf(e) + '">' + t('Ajouter à mon agenda', 'Add to my calendar') + '</button>' : '') + '</p>');
  }

  /* Bureau */
  var B = [];
  function open(name) { return name === 'Poste à pourvoir'; }
  function face(r) {
    var u = r.autorisationPhoto === true ? img(r.photo) : '';
    if (u) return '<img class="face" src="' + esc(u) + '" alt="' + esc(r.title) + '" loading="lazy">';
    var w = String(r.title || '').split(/\s+/);
    return '<span class="face" aria-hidden="true">' + (open(r.title) ? '?' : esc((w[0] || '').charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : ''))) + '</span>';
  }
  function who(r) { return open(r.title) ? t('Poste à pourvoir', 'Open position') : r.title; }
  function board(rows) {
    var box = $('#board'), ro = $('#roster'), fc = $('#faces');
    if (!rows) { if (box || ro) (box || ro).innerHTML = fail(); return; }
    B = rows;
    if (ro) ro.innerHTML = rows.map(function (r) { return '<li><b>' + esc(who(r)) + '</b><br>' + esc(t(r.role, r.roleEn)) + '</li>'; }).join('');
    if (box) box.innerHTML = rows.map(function (r, i) {
      return '<button class="member" data-mb="' + i + '">' + face(r) + '<span class="role">' + esc(t(r.role, r.roleEn)) + '</span><span class="h">' + esc(who(r)) + '</span><span class="see">' + t('Voir la fiche', 'See profile') + '</span></button>';
    }).join('');
    if (fc) {
      var people = rows.filter(function (r) { return !open(r.title); });
      var pics = people.filter(function (r) { return r.autorisationPhoto === true && img(r.photo); }).slice(0, 6);
      fc.innerHTML = '<span class="stack">' + pics.map(function (r) { return '<img src="' + esc(img(r.photo)) + '" alt="" loading="lazy">'; }).join('') + '</span>' +
        '<span><b>' + t(people.length + ' étudiants tiennent le comptoir', people.length + ' students run the club') + '</b><small>' + t('Rencontrer le bureau', 'Meet the board') + '</small></span>';
    }
  }
  function lines(v) { return String(v == null ? '' : v).split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function block(title, v, list) {
    var l = lines(v);
    if (!l.length) return '';
    return '<h3 style="margin-top:1.3em">' + title + '</h3>' + (list || l.length > 1
      ? '<ul class="checks">' + l.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'
      : '<p>' + esc(l[0]) + '</p>');
  }
  function memberDetail(r) {
    var vacant = open(r.title), links = [];
    if (web(r.linkedin)) links.push('<a class="more" href="' + esc(web(r.linkedin)) + '" target="_blank" rel="noopener">LinkedIn ↗</a>');
    if (mail(r.mail)) links.push('<a class="more" href="mailto:' + esc(mail(r.mail)) + '">' + esc(mail(r.mail)) + '</a>');
    show(face(r) + '<p class="over">' + esc(t(r.role, r.roleEn)) + '</p><h2>' + esc(who(r)) + '</h2>' +
      (!vacant && r.surnom ? '<p class="when">' + t('Surnom : ', 'Nickname: ') + '« ' + esc(r.surnom) + ' »</p>' : '') +
      (!vacant && r.accroche ? '<p class="lead">' + esc(r.accroche) + '</p>' : '') +
      (vacant ? '<p>' + t('Le club cherche la personne qui tiendra ce poste. ', 'The club is looking for someone to take on this role. ') + '<a class="more" href="rejoindre.html">' + t('Proposer sa candidature', 'Apply') + '</a></p>'
        : '<p>' + (r.presentation ? esc(r.presentation) : '<span class="soft">' + t('Présentation à venir.', 'Introduction coming soon.') + '</span>') + '</p>') +
      block(t('Sa mission au Comptoir', 'Role at Le Comptoir'), t(r.missions, r.missionsEn)) +
      (vacant ? '' : block(t('Parcours', 'Background'), r.parcours, true) + block(t('Faits marquants', 'Highlights'), r.faits, true)) +
      (!vacant && r.expertises ? '<h3 style="margin-top:1.3em">' + t('Expertises', 'Skills') + '</h3><p>' + lines(r.expertises).map(esc).join(' · ') + '</p>' : '') +
      (r.citation ? '<blockquote>' + esc(r.citation) + '</blockquote>' : '') +
      (links.length ? '<p style="display:flex;gap:18px;flex-wrap:wrap">' + links.join('') + '</p>' : ''));
  }
  /* Partenaires, merch, sujets de débat */
  function partners(rows) {
    var box = $('#partners');
    if (!rows) { box.innerHTML = fail(); return; }
    rows = rows.filter(function (r) { return r.afficher !== false; });
    box.innerHTML = rows.length ? '<div class="logos">' + rows.map(function (r) {
      var u = img(r.logo);
      return '<div class="partner">' + (u ? '<img src="' + esc(u) + '" alt="" loading="lazy">' : '') + '<h3>' + esc(r.title) + '</h3>' + (r.categorie ? '<p class="when">' + esc(r.categorie) + '</p>' : '') +
        (r.description ? '<p>' + esc(r.description) + '</p>' : '') + (web(r.site) ? '<a class="more" href="' + esc(web(r.site)) + '" target="_blank" rel="noopener">' + t('Voir le site ↗', 'Visit website ↗') + '</a>' : '') + '</div>';
    }).join('') + '</div>' : '<p class="empty">' + t('Les premiers partenaires du club seront présentés ici. Et si c’était vous ? ', 'The club’s first partners will be shown here. Why not you? ') + '<a class="more" href="#contact">' + t('Prendre rendez-vous', 'Book a call') + '</a></p>';
  }
  function products(rows) {
    var box = $('#products'), sel = $('#article');
    if (!rows) { box.innerHTML = fail(); return; }
    rows = rows.filter(function (r) { return r.afficher !== false; });
    box.innerHTML = rows.map(function (r, i) {
      var u = img(r.photo), price = [];
      if (r.prixMembre) price.push(t('Membre : ', 'Member: ') + r.prixMembre);
      if (r.prixPublic) price.push(t('Public : ', 'Non-member: ') + r.prixPublic);
      return '<div class="good' + (u ? '' : ' nopic') + '"><div class="pic">' + (u ? '<img src="' + esc(u) + '" alt="' + esc(r.title) + '" loading="lazy">' : seal()) + '</div><div class="txt"><h3>' + esc(t(r.title, r.titleEn)) + '</h3><p>' + esc(t(r.description, r.descriptionEn)) + '</p>' +
        '<p class="price">' + esc(price.join(' · ') || t('Prix à venir', 'Price to be announced')) + '</p>' + (r.tailles ? '<p class="soft">' + t('Tailles : ', 'Sizes: ') + esc(r.tailles) + '</p>' : '') +
        '<a class="btn small ghost" href="#precommande" data-pick="' + i + '">' + t('Réserver cet article', 'Reserve this item') + '</a></div></div>';
    }).join('');
    if (sel) sel.innerHTML = rows.map(function (r) { return '<option>' + esc(t(r.title, r.titleEn)) + '</option>'; }).join('');
  }
  var T = [], last = -1;
  function draw() {
    if (!T.length) return;
    var i;
    do { i = Math.floor(Math.random() * T.length); } while (T.length > 1 && i === last);
    last = i;
    var box = $('#topic'), r = T[i];
    $('q', box).textContent = t(r.title, r.titleEn);
    $('.when', box).textContent = t(r.cours, r.coursEn) || '';
    box.classList.remove('flip'); void box.offsetWidth; box.classList.add('flip');
  }

  /* Formulaires : le message est préparé dans la messagerie du visiteur, à l'adresse du club. Le site n'enregistre rien. */
  function copy(text, btn) {
    function done() { btn.textContent = t('Message copié', 'Message copied'); }
    function old() {
      var a = D.createElement('textarea');
      a.value = text; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0';
      D.body.appendChild(a); a.select();
      try { if (D.execCommand('copy')) done(); } catch (e) {}
      a.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, old); else old();
  }
  function forms() {
    $$('form[data-form]').forEach(function (f) {
      var text = '';
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var fd = new FormData(f), det = [], m = $('.msg', f), kind = f.getAttribute('data-form');
        if (fd.get('website')) return;
        fd.forEach(function (v, k) { if (['nom', 'email', 'message', 'website'].indexOf(k) < 0 && v) det.push(k + ' : ' + v); });
        var subject = 'Le Comptoir · ' + kind + ' · ' + fd.get('nom');
        var head = [t('Nom', 'Name') + ' : ' + fd.get('nom'), 'E-mail : ' + fd.get('email')].concat(det).join('\n');
        var body = head + '\n\n' + (fd.get('message') || '');
        text = body;
        /* Un lien de messagerie trop long est coupé par certains logiciels : au-delà, le texte passe par le bouton « Copier » */
        if (encodeURIComponent(body).length > 1500) body = head + '\n\n' + t('(Collez ici votre message : utilisez le bouton « Copier le message » du site.)', '(Paste your message here: use the “Copy the message” button on the site.)');
        m.className = 'msg';
        var su = encodeURIComponent(subject), bo = encodeURIComponent(body), to = encodeURIComponent(S.email);
        m.innerHTML = '<b>' + t('Votre messagerie s’ouvre avec le message prêt à partir : il ne reste qu’à cliquer sur « Envoyer ».', 'Your mail app opens with the message ready to go: just press “Send”.') + '</b><br>' +
          t('Rien ne s’ouvre ? Passez par votre messagerie en ligne, ou copiez le message et envoyez-le à ', 'Nothing opens? Use your webmail, or copy the message and send it to ') +
          '<a href="mailto:' + esc(S.email) + '">' + esc(S.email) + '</a>.' +
          '<span class="ways"><a class="btn small ghost" target="_blank" rel="noopener" href="https://outlook.office.com/mail/deeplink/compose?to=' + to + '&subject=' + su + '&body=' + bo + '">' + t('Ouvrir dans Outlook', 'Open in Outlook') + '</a>' +
          '<a class="btn small ghost" target="_blank" rel="noopener" href="https://mail.google.com/mail/?view=cm&fs=1&to=' + to + '&su=' + su + '&body=' + bo + '">' + t('Ouvrir dans Gmail', 'Open in Gmail') + '</a>' +
          '<button type="button" class="btn small ghost" data-copy>' + t('Copier le message', 'Copy the message') + '</button></span>';
        location.href = 'mailto:' + S.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      });
      f.addEventListener('click', function (ev) {
        var b = ev.target.closest ? ev.target.closest('[data-copy]') : null;
        if (b) copy(text, b);
      });
    });
    /* Pré-remplit le formulaire quand on arrive avec ?demande=… ou depuis un bouton « Réserver cet article » */
    var q = /[?&]demande=([^&]+)/.exec(location.search), sel = $('select[name=Demande]');
    if (q && sel) { var want = ''; try { want = decodeURIComponent(q[1]); } catch (e) {} $$('option', sel).forEach(function (o, i) { if (o.value === want || o.textContent === want) sel.selectedIndex = i; }); }
  }

  /* Une image qui ne se charge pas laisse la place aux initiales, ou au sceau, plutôt qu'à une icône cassée */
  D.addEventListener('error', function (e) {
    var el = e.target, w, s;
    if (!el || el.tagName !== 'IMG' || !el.closest) return;
    if (el.classList.contains('face')) {
      w = String(el.alt || '').split(/\s+/);
      s = D.createElement('span'); s.className = 'face'; s.setAttribute('aria-hidden', 'true');
      s.textContent = (w[0] || '').charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '');
      el.parentNode.replaceChild(s, el);
    } else if (el.closest('.good .pic')) el.closest('.pic').innerHTML = seal();
    else if (el.closest('.faces, .partner, .shots')) { s = el.closest('.shots a') || el; s.parentNode.removeChild(s); }
  }, true);

  translate();
  chrome();
  story();
  forms();
  load('Reglages', settings);
  if ($('#events')) { if (!$('#events').getAttribute('data-limit')) load('Photos', function (r) { P = r || []; }); load('Evenements', events); }
  if ($('#board') || $('#roster') || $('#faces')) load('Bureau', board);
  if ($('#partners')) load('Partenaires', partners);
  if ($('#products')) load('Produits', products);
  if ($('#topic')) load('Sujets', function (r) { T = r || []; });
  D.addEventListener('click', function (e) {
    var pick = e.target.closest ? e.target.closest('[data-pick]') : null;
    if (pick) { var sel = $('#article'); if (sel) sel.selectedIndex = +pick.getAttribute('data-pick'); return; }
    var el = e.target.closest ? e.target.closest('[data-ics],[data-ev],[data-mb],[data-f],#draw') : null;
    if (!el) return;
    if (el.hasAttribute('data-ics')) ics(E[+el.getAttribute('data-ics')]);
    else if (el.id === 'draw') draw();
    else if (el.hasAttribute('data-f')) { F = el.getAttribute('data-f'); $$('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c === el); }); drawEvents(); }
    else if (el.hasAttribute('data-ev')) eventDetail(E[+el.getAttribute('data-ev')]);
    else memberDetail(B[+el.getAttribute('data-mb')]);
  });
})();