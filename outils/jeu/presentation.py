"""Met à jour la page de présentation du jeu (jeu.html) à partir de la version publiée."""
import os
import importlib.util
spec = importlib.util.spec_from_file_location('sitegen', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pages.py'))
g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)
REPO = g.REPO
s = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'presentation-base.html'), encoding='utf-8').read()


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
    '<a class="btn" href="jeu-regle.html" data-en="Read the rules">Lire la règle</a><a class="btn ghost" href="#kit" data-en="Print the game">Imprimer le jeu</a>')
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
old_kit = s[s.index('      <p data-en="The whole game prints on A4 at home'):s.index('    </div>\n    <div>\n      <h3 data-en="In the box">')]
new_kit = '''      <p data-en="The whole game prints on A4 at home: rules, a 38 × 38 cm board in four sheets, 282 cards nine per page, bills, pawns, score sheets.">Tout le jeu s’imprime en A4 à la maison : la règle, le plateau de 38 × 38 cm en quatre feuilles, les 282 cartes à neuf par page, les billets, les pions et les fiches.</p>
      <p class="soft" data-en="Print at 100% (actual size), in colour, single-sided. Thick paper (160 to 250 g) for the board, cards and pawns; plain paper for everything else. Add two dice and a pencil per player.">Imprimez à 100 % (taille réelle), en couleur, en recto seul. Papier épais (160 à 250 g) pour le plateau, les cartes et les pions ; papier ordinaire pour le reste. Ajoutez deux dés et un crayon par joueur.</p>
      <p class="actions" id="kitdl"><a class="btn" href="@PDF@" download data-en="Download the kit <span class=&quot;sub&quot;>@EN@</span>">Télécharger le kit <span class="sub">@FR@</span></a><a class="btn ghost" href="rejoindre.html" data-en="Play it at a Comptoir">Y jouer à un Comptoir</a></p>
'''.replace('@PDF@', g.PDF).replace('@EN@', g.PDF_EN).replace('@FR@', g.PDF_FR)
rep(old_kit, new_kit)
# Le tirage de cartes passe dans assets/jeu.js (plus aucun script écrit dans la page)
a = s.index('<script>\n(function () {\n  var C = [')
b = s.index('</script>', a) + len('</script>\n')
s = s[:a] + '<script src="assets/jeu.js"></script>\n' + s[b:]
rep('<meta property="og:image" content="https://le-comptoir-nantes.github.io/assets/partage.png">',
    '<meta property="og:locale" content="fr_FR">\n<meta property="og:image" content="https://le-comptoir-nantes.github.io/assets/partage.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n'
    '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Game","name":"L’Affaire Ombreval","alternateName":"Le Comptoir, le jeu","description":"Un jeu de société pour réviser la négociation, le droit, la comptabilité, le marketing et l’économie de 1re année de bachelor, entre Monopoly, La Bonne Paie et Cluedo.","url":"https://le-comptoir-nantes.github.io/jeu.html","inLanguage":"fr","numberOfPlayers":{"@type":"QuantitativeValue","minValue":2,"maxValue":6},"author":{"@type":"Organization","name":"Le Comptoir","url":"https://le-comptoir-nantes.github.io/"}}</script>')
open(os.path.join(REPO, 'jeu.html'), 'w', encoding='utf-8').write(s)
print('jeu.html', len(s) // 1024, 'Ko')
