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
