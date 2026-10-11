/* Le Comptoir — pages du jeu. Ajuste le texte des cartes à leur format, gère les pioches
   et le mode révision (réponse masquée tant qu'on n'a pas touché la carte). N'enregistre rien. */
(function () {
  'use strict';
  var D = document;
  function $$(s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); }
  var en = D.documentElement.lang === 'en';
  function t(fr, e) { return en ? e : fr; }

  /* Le texte d'une carte rétrécit par petits pas jusqu'à tenir dans son cadre */
  function fit(root) {
    $$('.j-card .j-fit', root).forEach(function (el) {
      var card = el.closest('.j-card'), fs = 1, guard = 0;
      card.style.setProperty('--fs', fs);
      while (el.scrollHeight > el.clientHeight + 1 && fs > 0.66 && guard < 40) {
        fs = Math.round((fs - 0.03) * 100) / 100;
        card.style.setProperty('--fs', fs);
        guard++;
      }
    });
  }
  function fitVisible() { $$('.j-deck:not([hidden])').forEach(fit); if (!$$('.j-deck').length) fit(D); }
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(fitVisible); else window.addEventListener('load', fitVisible);

  var box = D.getElementById('j-decks');
  if (!box) return;
  var tabs = $$('.j-deck-tabs button'), count = D.getElementById('j-count'),
    reveal = D.getElementById('j-reveal'), shuffle = D.getElementById('j-shuffle'), current = 'nego';

  /* Mode révision : chaque carte Défi devient un bouton qui montre ou cache sa réponse */
  $$('.j-defi', box).forEach(function (c) {
    var ans = c.querySelector('.j-c-ans');
    if (!ans) return;
    ans.setAttribute('data-hint', c.classList.contains('j-oral') ? t('Voir les critères', 'Show the criteria') : t('Voir la réponse', 'Show the answer'));
    c.tabIndex = 0;
    c.setAttribute('role', 'button');
    c.setAttribute('aria-expanded', 'false');
  });
  function toggle(c) {
    if (!box.classList.contains('j-quiz')) return;
    c.setAttribute('aria-expanded', c.classList.toggle('j-open'));
  }
  box.addEventListener('click', function (e) { var c = e.target.closest('.j-defi'); if (c) toggle(c); });
  box.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var c = e.target.closest('.j-defi');
    if (c && c === e.target) { e.preventDefault(); toggle(c); }
  });

  function show(g, quiet) {
    var found = false;
    $$('.j-deck', box).forEach(function (d) {
      var on = d.getAttribute('data-group') === g;
      d.hidden = !on;
      if (on) { found = true; fit(d); }
    });
    if (!found) return show('nego', quiet);
    current = g;
    tabs.forEach(function (b) {
      var on = b.getAttribute('data-deck') === g;
      b.setAttribute('aria-pressed', on);
      if (on && count) count.textContent = b.querySelector('.j-n').textContent + ' ' + t('cartes', 'cards') + ' · ' + b.firstElementChild.textContent;
    });
    var defi = !!box.querySelector('.j-deck:not([hidden]) .j-defi');
    reveal.hidden = !defi;
    if (!quiet && history.replaceState) history.replaceState(null, '', '#' + g);
  }
  tabs.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-deck')); }); });

  reveal.addEventListener('click', function () {
    var all = box.classList.toggle('j-quiz') === false;
    reveal.setAttribute('aria-pressed', all);
    $$('.j-defi', box).forEach(function (c) { c.classList.remove('j-open'); c.setAttribute('aria-expanded', all); });
  });
  shuffle.addEventListener('click', function () {
    var d = box.querySelector('.j-deck:not([hidden])'), cards = $$('.j-card', d), i, j, x;
    for (i = cards.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); x = cards[i]; cards[i] = cards[j]; cards[j] = x; }
    cards.forEach(function (c) { c.classList.remove('j-open'); if (c.hasAttribute('aria-expanded')) c.setAttribute('aria-expanded', !box.classList.contains('j-quiz')); d.appendChild(c); });
  });

  var h = location.hash.slice(1);
  show(h && box.querySelector('.j-deck[data-group="' + h.replace(/[^a-z]/g, '') + '"]') ? h : 'nego', true);
  window.addEventListener('hashchange', function () { var g = location.hash.slice(1).replace(/[^a-z]/g, ''); if (g && g !== current) show(g, true); });
})();

/* Tirage de la page de présentation : dix cartes Défi d'exemple (les cartes sont en français) */
(function () {
  if (!document.getElementById('gcard')) return;
  var en = document.documentElement.lang === 'en';
  var C = [
    ['Négociation', '#8E2C3A', '★ · QCM', 'La règle des 4x20, c’est…', ['20 secondes, 20 mots, 20 gestes, 20 cm', '20 minutes, 20 questions, 20 arguments, 20 % de remise', '20 jours de délai, 20 relances, 20 devis, 20 clients'], 'A', 'La première impression (effet de halo). Les 20 cm, c’est le visage.'],
    ['Négociation', '#8E2C3A', '★★ · QCM', 'Le client : « Votre concurrent est 10 % moins cher. » Votre première réaction ?', ['Baisser votre prix de 10 %', '« Qu’est-ce qui est compris dans leur offre ? »', 'Dire que ce concurrent fait de la mauvaise qualité'], 'B', 'On questionne, puis on valorise sans jamais critiquer un concurrent.'],
    ['Droit', '#1F6B4F', '★ · QCM', 'Lequel n’est PAS un vice du consentement ?', ['Le dol', 'La violence', 'L’erreur sur la valeur'], 'C', 'Vices : erreur, dol, violence. L’erreur sur la valeur ne compte pas.'],
    ['Droit', '#1F6B4F', '★★ · QCM', 'Clause piège ! Quelle clause de ces CGV en ligne est illégale ?', ['Prix affichés toutes taxes comprises', 'Droit de rétractation de 7 jours francs', 'Délai de livraison maximal de 60 jours ouvrés'], 'B', 'Le délai légal de rétractation à distance est de 14 jours.'],
    ['Comptabilité', '#2C5F8A', '★ · QCM', 'Pour l’entreprise, la TVA est…', ['Une charge', 'Un produit', 'Ni l’un ni l’autre : des mouvements de trésorerie'], 'C', 'Elle la collecte pour l’État ; c’est le consommateur final qui la supporte.'],
    ['Comptabilité', '#2C5F8A', '★ · QCM', 'Un ordinateur à 1 200 € HT utilisé 3 ans est…', ['Une charge', 'Une immobilisation', 'Un stock'], 'B', 'Plus de 500 € et utilisé plus d’un an : immobilisation.'],
    ['Marketing', '#6A3A86', '★ · QCM', 'Une campagne qui vise à « faire agir » a un objectif…', ['Cognitif', 'Affectif', 'Conatif'], 'C', 'Cognitif : faire connaître. Affectif : faire aimer. Conatif : faire agir.'],
    ['Marketing', '#6A3A86', '★ · QCM', 'Soutien sans contrepartie directe à une œuvre d’intérêt général : c’est…', ['Le mécénat', 'Le parrainage', 'La promotion des ventes'], 'A', 'Le parrainage, lui, vise un bénéfice direct.'],
    ['Économie', '#A65A24', '★★ · QCM', 'L’effet Veblen, c’est quand…', ['La demande d’un bien de prestige augmente avec son prix', 'Le prix baisse quand l’offre augmente', 'Les salaires suivent l’inflation'], 'A', 'Consommation ostentatoire : un prix élevé signale le statut.'],
    ['Économie', '#A65A24', '★★ · QCM', 'L’euro s’apprécie face au dollar. À New York, les sacs fabriqués en France deviennent…', ['Moins chers en dollars', 'Plus chers en dollars', 'Gratuits'], 'B', 'Un euro fort pénalise les exportations.']
  ];
  var i = 0, $ = function (id) { return document.getElementById(id); };
  function show(k) {
    var c = C[k];
    $('gcard').style.setProperty('--c', c[1]);
    $('gsub').textContent = c[0]; $('glvl').textContent = c[2]; $('gq').textContent = c[3];
    $('go').innerHTML = c[4].map(function (o) { var li = document.createElement('li'); li.textContent = o; return li.outerHTML; }).join('');
    $('gr').textContent = (en ? 'Answer ' : 'Réponse ') + c[5] + ' · ' + c[4]['ABC'.indexOf(c[5])];
    $('ge').textContent = c[6]; $('ga').hidden = true;
  }
  $('gdraw').addEventListener('click', function () { var j; do { j = Math.floor(Math.random() * C.length); } while (j === i); i = j; show(i); });
  $('gshow').addEventListener('click', function () { $('ga').hidden = false; });
  show(0);
})();
