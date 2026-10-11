"""Met à jour la page de présentation du jeu (jeu.html) à partir de la version publiée."""
import os
import importlib.util
spec = importlib.util.spec_from_file_location('sitegen', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pages.py'))
g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)
REPO = g.REPO
s = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'presentation-base.txt'), encoding='utf-8').read()


def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:80])
    s = s.replace(old, new)


rep('<link rel="stylesheet" href="assets/motion.css">', '<link rel="stylesheet" href="assets/motion.css">\n<link rel="stylesheet" href="assets/jeu.css">')
# Le compteur des étapes entrait en conflit avec celui du site (numéros doublés : 2, 4, 6, 8)
rep('.steps{counter-reset:s;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:28px}',
    '.gsteps{counter-reset:g;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin:28px 0 0;padding:0;list-style:none}')
rep('.steps li{background:#fff;border:1px solid var(--cream2);border-radius:6px;padding:18px 18px 18px 58px;position:relative}',
    '.gsteps li{background:#fff;border:1px solid var(--cream2);border-radius:6px;padding:18px 18px 18px 58px;position:relative}')
rep('.steps li::before{counter-increment:s;content:counter(s);position:absolute;left:16px;top:16px;width:28px;height:28px;border-radius:50%;background:var(--gold);color:var(--navy);font-weight:700;display:grid;place-items:center}',
    '.gsteps li::before{counter-increment:g;content:counter(g);position:absolute;left:16px;top:16px;width:28px;height:28px;border-radius:50%;background:var(--gold);color:var(--navy);font-weight:700;display:grid;place-items:center}')
rep('<ol class="steps">', '<ol class="gsteps">')
rep('<a class="btn" href="rejoindre.html" data-en="Play at a Comptoir">Jouer à un Comptoir</a><a class="btn ghost" href="#kit" data-en="Print the game">Imprimer le jeu</a>',
    '<a class="btn" href="jeu-regle.html" data-en="Read the rules">Lire la règle</a><a class="btn ghost" href="#contact" data-en="See the game with the board">Voir le jeu avec le bureau</a>')
doors = '''
%s

<section class="band">
  <div class="wrap">
    <p class="over" data-en="Monopoly × La Bonne Paie × Cluedo">Monopoly × La Bonne Paie × Cluedo</p>''' % g.jnav('jeu.html')
rep('''
<section class="band">
  <div class="wrap">
    <p class="over" data-en="Monopoly × La Bonne Paie × Cluedo">Monopoly × La Bonne Paie × Cluedo</p>''', doors)
rep('''    </div>
  </div>
</section>

<section class="band navy">
  <div class="wrap play">''', '''    </div>
    <h2 style="margin-top:clamp(56px,8vw,96px)" data-en="The whole game, online">Tout le jeu, en ligne</h2>
    <div class="j-doors">
      <a class="j-door" href="jeu-regle.html"><b data-en="The rules">La règle</b><span data-en="Setup, a turn, challenges, the investigation, a sample turn and two short variants.">Mise en place, tour de jeu, défis, enquête, exemple de tour et deux variantes courtes.</span><i data-en="Read the rules">Lire la règle</i></a>
      <a class="j-door" href="jeu-plateau.html"><b data-en="The board and the pieces">Le plateau et le matériel</b><span data-en="The 32 squares, the pawns, the bills, the score sheets and the box.">Les 32 cases, les pions, les billets, les fiches et la boîte.</span><i data-en="See the board">Voir le plateau</i></a>
      <a class="j-door" href="jeu-cartes.html"><b data-en="The 282 cards">Les 282 cartes</b><span data-en="Every deck, with a revision mode: the answer stays hidden until you tap the card.">Toutes les pioches, avec un mode révision : la réponse reste cachée tant qu’on n’a pas touché la carte.</span><i data-en="Revise with the cards">Réviser avec les cartes</i></a>
      <a class="j-door" href="jeu-enquete.html"><b data-en="The investigation">L’enquête</b><span data-en="Six suspects, six misdeeds, six rooms: the full scenario and its epilogue.">Six suspects, six méfaits, six lieux : le scénario complet et son épilogue.</span><i data-en="Open the case file">Ouvrir le dossier</i></a>
    </div>
  </div>
</section>

<section class="band navy">
  <div class="wrap play">''')
rep('<p class="actions"><button class="btn" id="gdraw" type="button" data-en="Draw a card">Tirer une carte</button><button class="btn ghost" id="gshow" type="button" data-en="Show the answer">Voir la réponse</button></p>',
    '<p class="actions"><button class="btn" id="gdraw" type="button" data-en="Draw a card">Tirer une carte</button><button class="btn ghost" id="gshow" type="button" data-en="Show the answer">Voir la réponse</button></p>\n      <p style="margin-top:1.6em"><a class="more" href="jeu-cartes.html" data-en="Revise with all 180 challenge cards">Réviser avec les 180 cartes Défi</a></p>')
rep('<ul class="suspects">', '<ul class="suspects">', 1)
rep('''<p style="margin-top:24px" class="soft" data-en="Misdeeds: leaked sketches, counterfeiting, embezzlement, greenwashing, supplier bribe, phantom stock. Each one leads back to a point of the course.">Méfaits : fuite des croquis, contrefaçon, détournement de fonds, greenwashing, pot-de-vin fournisseur, stock fantôme. Chacun renvoie à une notion du cours.</p>''',
    '''<p style="margin-top:24px" class="soft" data-en="Misdeeds: leaked sketches, counterfeiting, embezzlement, greenwashing, supplier bribe, phantom stock. Each one leads back to a point of the course.">Méfaits : fuite des croquis, contrefaçon, détournement de fonds, greenwashing, pot-de-vin fournisseur, stock fantôme. Chacun renvoie à une notion du cours.</p>
    <p class="actions"><a class="btn ghost" href="jeu-enquete.html" data-en="Open the case file">Ouvrir le dossier d’enquête</a></p>''')
# Le jeu ne se télécharge pas : la dernière section est un espace de contact avec le bureau pour le voir
old_kit = s[s.index('<section class="band" id="kit">'):s.index('</main>')]
new_kit = '''<section class="band" id="contact">
  <div class="wrap split">
    <div>
      <h2 data-en="See the game, with the board">Voir le jeu, avec le bureau</h2>
      <p data-en="The Ombreval Affair is not available to download: the board of Le Comptoir shows it to you in person. Write to us to see the game or to play it at a Comptoir.">L’Affaire Ombreval ne se télécharge pas : c’est le bureau du Comptoir qui vous le présente. Écrivez-nous pour voir le jeu ou pour y jouer à un Comptoir.</p>
      <p><b>Lucas Denis</b>, <span data-en="president">président</span><br><a data-set-mail href="mailto:jblucas.denis@audencia.com">jblucas.denis@audencia.com</a><br><a href="https://www.linkedin.com/in/lucas-denis-jb" target="_blank" rel="noopener">linkedin.com/in/lucas-denis-jb ↗</a></p>
      <h3 style="margin-top:1.8em" data-en="In the box">Dans la boîte</h3>
      <ul class="checks">
        <li data-en="1 board, 6 pawns, 2 dice">1 plateau, 6 pions, 2 dés</li>
        <li data-en="180 challenge cards, 18 clues, 24 mail cards">180 cartes Défi, 18 Indices, 24 Imprévus</li>
        <li data-en="18 investigation cards, 6 roles, 12 secret objectives">18 cartes d’enquête, 6 Rôles, 12 Objectifs secrets</li>
        <li data-en="12 deeds, 12 loans, 12 Flagships, 144 bills">12 titres, 12 emprunts, 12 Flagships, 144 billets</li>
        <li data-en="Balance sheets, detective notebooks, player aids">Fiches Bilan, carnets d’enquêteur, aides de jeu</li>
      </ul>
    </div>
    <form class="card" data-form="Voir le jeu">
      <p class="form-intro" data-en="Ask to see the game: a board member gets back to you to set a time.">Demandez à voir le jeu : un membre du bureau vous répond pour convenir d’un moment.</p>
      <div class="row">
        <label><span data-en="Your name">Votre nom</span><input name="nom" required autocomplete="name"></label>
        <label><span data-en="E-mail">E-mail</span><input name="email" type="email" required autocomplete="email"></label>
      </div>
      <div class="row">
        <label><span data-en="Programme and year">Programme et année</span><input name="Programme" placeholder="Bachelor in Management, 1re année" data-en-ph="Bachelor in Management, year 1"></label>
        <label><span data-en="I would like to">Je souhaite</span><select name="Demande"><option data-en="See the game">Voir le jeu</option><option data-en="Play a game at a Comptoir">Jouer une partie à un Comptoir</option><option data-en="Something else">Autre demande</option></select></label>
      </div>
      <label><span data-en="Your message">Votre message</span><textarea name="message"></textarea></label>
      <label class="hp" aria-hidden="true">Site web<input name="website" tabindex="-1" autocomplete="off"></label>
      <p class="soft" style="font-size:.86em;line-height:1.5;margin:4px 0 0" data-en="Your details are used only by the Comptoir board to answer your request and arrange a time to show you the game. Name and e-mail are needed so we can reply; the other fields are optional. They are deleted at the end of the academic year. You can access, correct or delete them by writing to the club, and complain to the CNIL. &lt;a href=\'confidentialite.html\'&gt;Privacy policy&lt;/a&gt;">Vos informations servent uniquement au bureau du Comptoir pour répondre à votre demande et convenir d’un moment pour vous montrer le jeu. Le nom et l’e-mail sont nécessaires pour vous répondre ; les autres champs sont facultatifs. Elles sont supprimées à la fin de l’année universitaire. Vous pouvez y accéder, les corriger ou les faire effacer en écrivant au club, et saisir la CNIL. <a href="confidentialite.html">Politique de confidentialité</a></p>
      <button class="btn" type="submit" data-en="Send my request">Envoyer ma demande</button>
      <p class="msg" role="status"></p>
    </form>
  </div>
</section>

'''
rep(old_kit, new_kit)
# Le tirage de cartes passe dans assets/jeu.js (plus aucun script écrit dans la page)
a = s.index('<script>\n(function () {\n  var C = [')
b = s.index('</script>', a) + len('</script>\n')
s = s[:a] + '<script src="assets/jeu.js"></script>\n' + s[b:]
rep('<meta property="og:image" content="https://le-comptoir-nantes.github.io/assets/partage.png">',
    '<meta property="og:locale" content="fr_FR">\n<meta property="og:image" content="https://le-comptoir-nantes.github.io/assets/partage.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n'
    '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Game","name":"L’Affaire Ombreval","alternateName":"Le Comptoir, le jeu","description":"Un jeu de société pour réviser la négociation, le droit, la comptabilité, le marketing et l’économie de 1re année de bachelor, entre Monopoly, La Bonne Paie et Cluedo.","url":"https://le-comptoir-nantes.github.io/jeu.html","inLanguage":"fr","numberOfPlayers":{"@type":"QuantitativeValue","minValue":2,"maxValue":6},"author":{"@type":"Organization","name":"Le Comptoir","url":"https://le-comptoir-nantes.github.io/"}}</script>')
# Les styles propres à cette page rejoignent assets/jeu.css : aucune page n'écrit de style dans son HTML
i = s.index('<style>\n')
j = s.index('</style>\n', i)
page_css = s[i + len('<style>\n'):j]
s = s[:i] + s[j + len('</style>\n'):]
assert '<style' not in s
with open(os.path.join(REPO, 'assets/jeu.css'), 'a', encoding='utf-8') as f:
    f.write('\n/* ───────── Page de présentation du jeu (jeu.html) ───────── */\n' + page_css)
open(os.path.join(REPO, 'jeu.html'), 'w', encoding='utf-8').write(s)
print('jeu.html', len(s) // 1024, 'Ko')
