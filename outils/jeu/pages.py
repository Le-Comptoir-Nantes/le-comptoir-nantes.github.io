"""Écrit les pages du jeu dans le dépôt du site (règle, plateau et matériel, cartes, enquête)."""
import json, os, re, shutil, subprocess, html as H

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
F = json.load(open(os.path.join(HERE, 'fragments.json'), encoding='utf-8'))
PDF = 'assets/jeu/affaire-ombreval-kit-a-imprimer.pdf'
BASE = 'https://le-comptoir-nantes.github.io/'

pdf_path = os.path.join(REPO, PDF)
if os.path.exists(pdf_path):
    info = subprocess.run(['pdfinfo', pdf_path], capture_output=True, text=True).stdout
    PAGES = int(re.search(r'Pages:\s+(\d+)', info).group(1))
    MO = ('%.1f' % (os.path.getsize(pdf_path) / 1e6)).replace('.', ',')
else:
    PAGES, MO = 0, '?'
PDF_FR = 'PDF, %d pages A4, %s Mo' % (PAGES, MO)
PDF_EN = 'PDF, %d A4 pages, %s MB' % (PAGES, MO.replace(',', '.'))


def a(s):
    return H.escape(s, quote=True)


def el(tag, fr, en=None, cls=None, **kw):
    at = ''
    if cls:
        at += ' class="%s"' % cls
    for k, v in kw.items():
        at += ' %s="%s"' % (k.replace('_', '-'), a(v))
    if en:
        at += ' data-en="%s"' % a(en)
    return '<%s%s>%s</%s>' % (tag, at, fr, tag)


NAV = [('jeu.html', 'Présentation', 'Overview'), ('jeu-regle.html', 'Règle', 'Rules'),
       ('jeu-plateau.html', 'Plateau et matériel', 'Board and pieces'), ('jeu-cartes.html', 'Cartes', 'Cards'),
       ('jeu-enquete.html', 'Enquête', 'Investigation')]


def jnav(cur):
    li = ''.join('<li><a href="%s"%s data-en="%s">%s</a></li>' % (h, ' aria-current="page"' if h == cur else '', a(en), fr)
                 for h, fr, en in NAV)
    li += '<li><a class="j-dl" href="%s" download data-en="Print the game (PDF)">Imprimer le jeu (PDF)</a></li>' % PDF
    return ('<nav class="j-nav" aria-label="Le jeu"><div class="wrap"><ul>%s</ul></div></nav>' % li)


def crumbs(name, og_title):
    """Fil d'Ariane pour les moteurs de recherche : Le Comptoir > Le jeu > page."""
    items = [('Le Comptoir', BASE), ('Le jeu', BASE + 'jeu.html'), (og_title.split(' · ')[0], BASE + name)]
    return json.dumps({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(items)]},
        ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


def page(name, title, title_en, desc, og_title, body, script=True):
    return '''<!doctype html>
<html lang="fr" data-title-en="%(title_en)s">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<meta name="description" content="%(desc)s">
<link rel="canonical" href="%(base)s%(name)s">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Le Comptoir">
<meta property="og:title" content="%(og)s">
<meta property="og:description" content="%(desc)s">
<meta property="og:url" content="%(base)s%(name)s">
<meta property="og:locale" content="fr_FR">
<meta property="og:image" content="%(base)sassets/partage.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">%(ld)s</script>
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/site.css">
<link rel="stylesheet" href="assets/motion.css">
<link rel="stylesheet" href="assets/jeu.css">
<script>!function(d,w){try{if(w.matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.classList.add("m");w.setTimeout(function(){w.__lcMotion||d.classList.remove("m")},2500)}catch(e){}}(document.documentElement,window)</script>
</head>
<body>
<header id="hd"></header>
<main>
%(body)s
</main>
<footer id="ft"></footer>
<script src="assets/site.js"></script>
%(js)s<script src="assets/motion.js"></script>
</body>
</html>
''' % dict(title=a(title), title_en=a(title_en), desc=a(desc), og=a(og_title), base=BASE, name=name, body=body.strip(), ld=crumbs(name, og_title),
           js='<script src="assets/jeu.js"></script>\n' if script else '')


OVER = el('p', 'L’Affaire Ombreval · le jeu du Comptoir', 'The Ombreval Affair · Le Comptoir’s board game', 'over')
FR_ONLY = '<p class="j-note j-en-only" data-en="The rules and the cards are in French: the game revises courses taught in French."></p>'


def head(h1, h1_en, lead, lead_en, facts=(), note=True):
    f = ''
    if facts:
        f = '<ul class="j-facts">%s</ul>' % ''.join(el('li', fr, en) for fr, en in facts)
    return '''<section class="pagehead navy">
  <div class="wrap">
    %s
    %s
    %s
    %s%s
  </div>
</section>''' % (OVER, el('h1', h1, h1_en), el('p', lead, lead_en, 'lead soft'), f, FR_ONLY if note else '')


def nxt(*links):
    out = ['<a class="btn" href="%s" download data-en="Download the print-and-play kit <span class=&quot;sub&quot;>%s</span>">Télécharger le kit à imprimer <span class="sub">%s</span></a>' % (PDF, PDF_EN, PDF_FR)]
    for h, fr, en in links:
        out.append('<a class="btn ghost" href="%s" data-en="%s">%s</a>' % (h, a(en), fr))
    return '<p class="j-next">%s</p>' % ''.join(out)


# ═════════ Règle ═════════
TOC_EN = {'r-but': 'Aim', 'r-mise': 'Setup', 'r-tour': 'A turn', 'r-cases': 'The squares', 'r-defis': 'Challenges',
          'r-enquete': 'The investigation', 'r-argent': 'Money, loans and trades', 'r-fin': 'End of the game',
          'r-exemple': 'Sample turn', 'r-variantes': 'Variants'}
toc = ''.join('<li><a href="#%s">%s</a></li>' % (i, {'r-argent': 'Argent, emprunts, échanges', 'r-fin': 'Fin de partie'}.get(i, lab))
              for i, lab in F['rule_toc'])
regle = head('La règle du jeu', 'The rules',
             'Tout ce qu’il faut pour jouer : le but, la mise en place, le tour de jeu, les défis, l’enquête, la fin de partie, un exemple de tour et deux variantes courtes.',
             'Everything you need to play: the aim, setup, a turn, challenges, the investigation, the end of the game, a sample turn and two short variants.',
             [('2 à 6 joueurs', '2 to 6 players'), ('60 à 90 min', '60 to 90 min'), ('Variante courte : 40 min', 'Short variant: 40 min')])
regle += jnav('jeu-regle.html')
regle += '''
<section class="band j-band-tight">
  <div class="wrap">
    <nav aria-label="Sommaire de la règle"><ul class="j-toc">%s</ul></nav>
    <div class="j-rule">
      <div class="j-rule-main">
%s
      </div>
      <aside class="j-rule-aside" aria-label="Aide-mémoire">
%s
      </aside>
    </div>
    %s
  </div>
</section>''' % (toc, F['rule'], F['aside'],
                 nxt(('jeu-plateau.html', 'Voir le plateau et le matériel', 'See the board and pieces'), ('jeu-cartes.html', 'Parcourir les cartes', 'Browse the cards')))

# ═════════ Plateau et matériel ═════════
box_text = ''.join(F['box_text'])
lid = F['lid'].replace(' style="--s:520px"', '')
plateau = head('Le plateau et le matériel', 'The board and the pieces',
               'Un tour de plateau, c’est un mois : 32 cases, du Jour de paie au jour 31. Et tout ce qu’il y a dans la boîte, pièce par pièce.',
               'One lap of the board is one month: 32 squares, from payday to day 31. And everything in the box, piece by piece.',
               [('32 cases', '32 squares'), ('12 boutiques, 6 villes', '12 boutiques, 6 cities'), ('6 pions', '6 pawns'), ('144 billets', '144 bills')], note=False)
plateau += jnav('jeu-plateau.html')
plateau += '''
<section class="band navy j-band-tight" data-norv>
  <div class="wrap">
    <h2 class="sr" data-en="The board">Le plateau</h2>
    <div class="j-board-wrap" tabindex="0" role="group" aria-label="Plateau du jeu, à faire défiler">%(board)s</div>
    %(legend)s
  </div>
</section>

<section class="band j-band-tight">
  <div class="wrap">
    <h2 data-en="How it is built">Comment il est construit</h2>
    %(board_text)s
    <h2 class="j-h" data-en="The 32 squares">Les 32 cases</h2>
    %(cases)s
  </div>
</section>

<section class="band j-band-tight" style="padding-top:0">
  <div class="wrap">
    <h2 data-en="In the box">Dans la boîte</h2>
    <p class="soft" data-en="The complete list, with quantities.">La liste complète, avec les quantités.</p>
    %(mat)s
  </div>
</section>

<section class="band navy j-band-tight">
  <div class="wrap">
    <h2 data-en="The pawns">Les pions</h2>
    %(pawns_text)s
    <div class="j-pawns" data-norv role="img" aria-label="Les six pions à plier, un par métier, et trois jetons Flagship dorés"><div aria-hidden="true" style="display:contents">%(pawns)s%(tokens)s</div></div>
    <h2 class="j-h" data-en="The bills">Les billets</h2>
    %(billets_text)s
    <div class="j-billets" data-norv role="img" aria-label="Les quatre billets de la Banque Ombreval : 1, 5, 10 et 20 k€"><div aria-hidden="true" style="display:contents">%(billets)s</div></div>
  </div>
</section>

<section class="band j-band-tight">
  <div class="wrap">
    <h2 data-en="Balance sheet, notebook and player aid">Fiche Bilan, carnet et aide de jeu</h2>
    %(sheets_text)s
    <div class="j-scroll-x" data-norv tabindex="0" role="group" aria-label="Fiche Bilan, carnet d’enquêteur et aide de jeu"><div class="j-pieces" role="img" aria-label="Aperçu de la Fiche Bilan, du carnet d’enquêteur et de l’aide de jeu, au format A5"><div aria-hidden="true" style="display:contents">%(sheets)s</div></div></div>
  </div>
</section>

<section class="band navy j-band-tight">
  <div class="wrap">
    <div class="j-show" style="align-items:center">
      <div>
        <h2 data-en="The box">La boîte</h2>
        %(box_text)s
      </div>
      <div data-norv role="img" aria-label="Maquette de la boîte du jeu, bleu nuit et or"><div aria-hidden="true">%(box3d)s</div></div>
    </div>
    <div class="j-show j-box" data-norv>
      <div role="img" aria-label="Couvercle de la boîte : Le Comptoir, L’Affaire Ombreval. Révisez. Investissez. Démasquez."><div aria-hidden="true">%(lid)s</div></div>
      %(box_back)s
    </div>
    %(next)s
  </div>
</section>''' % dict(board=F['board'], legend=F['legend'], board_text=F['board_text'], cases=F['cases'], mat=F['mat'],
                     pawns_text=F['pawns_text'].replace('<p>', '<p class="soft">'), pawns=''.join(F['pawn_list']), tokens=F['token'] * 3,
                     billets_text=F['billets_text'].replace('<p>', '<p class="soft">'), billets=''.join(F['billet_list']),
                     sheets_text=F['sheets_text'], sheets=''.join(F['sheets'][k] for k in ('fiche', 'carnet', 'aide')),
                     box_text=box_text.replace('<p>', '<p class="soft">'), box3d=F['box3d'], lid=lid, box_back=F['box_back'].replace('<h4>', '<h3>').replace('</h4>', '</h3>'),
                     next=nxt(('jeu-cartes.html', 'Parcourir les cartes', 'Browse the cards'), ('jeu-enquete.html', 'Découvrir l’enquête', 'Discover the investigation')))

# ═════════ Cartes ═════════
DECKS = [('nego', 'Négociation', 'Negotiation'), ('droit', 'Droit', 'Law'), ('compta', 'Comptabilité', 'Accounting'),
         ('mkt', 'Marketing', 'Marketing'), ('eco', 'Économie', 'Economics'), ('indice', 'Indices', 'Clues'),
         ('imprevu', 'Imprévus', 'Mail of the month'), ('enquete', 'Enquête', 'Investigation'), ('role', 'Rôles', 'Roles'),
         ('objectif', 'Objectifs secrets', 'Secret objectives'), ('titre', 'Titres et emprunts', 'Deeds and loans'),
         ('dos', 'Dos de cartes', 'Card backs')]
tabs = ''.join('<button type="button" data-deck="%s" aria-pressed="%s"><span data-en="%s">%s</span> <span class="j-n">%d</span></button>'
               % (k, 'true' if i == 0 else 'false', a(en), fr, len(F['decks'][k])) for i, (k, fr, en) in enumerate(DECKS))
decks = '\n'.join('<div class="j-deck" data-group="%s"%s>%s</div>' % (k, '' if i == 0 else ' hidden', ''.join(F['decks'][k]).replace('<article ', '<div ').replace('</article>', '</div>'))
                  for i, (k, fr, en) in enumerate(DECKS))
note = F['deck_note'].replace('ta fiche', 'la fiche').replace(
    'aucun cours fourni, toutes les cartes viennent du programme classique de 1re année', 'programme classique de 1re année')
assert 'ta fiche' not in note and 'aucun cours' not in note
note = note.replace('Chaque carte indique', 'Chaque carte Défi indique')
cartes = head('Les 282 cartes', 'The 282 cards',
              'Les cinq pioches Défi, les Indices, les Imprévus, les cartes d’enquête, les Rôles et les Objectifs secrets. Choisissez une pioche, cherchez la réponse, puis touchez la carte pour la vérifier.',
              'The five challenge decks, the clues, the mail of the month, the investigation cards, the roles and the secret objectives. Pick a deck, think of your answer, then tap the card to check it.',
              [('180 défis', '180 challenges'), ('21 défis oraux', '21 spoken challenges'), ('36 cartes par matière', '36 cards per subject')])
cartes += jnav('jeu-cartes.html')
cartes += '''
<section class="band navy j-band-tight" id="pioches">
  <div class="wrap">
    <div class="j-deck-tabs" role="group" aria-label="Choisir une pioche">%s</div>
    <div class="j-tools">
      <p class="j-count" id="j-count" aria-live="polite"></p>
      <div class="j-tools-r">
        <button class="j-tool" type="button" id="j-shuffle" data-en="Shuffle the deck">Mélanger la pioche</button>
        <button class="j-tool" type="button" id="j-reveal" aria-pressed="false" data-en="Show all answers">Afficher toutes les réponses</button>
      </div>
    </div>
    <h2 class="sr" data-en="The decks">Les pioches</h2>
    <div id="j-decks" class="j-quiz" data-norv>
%s
    </div>
    <p class="j-deck-note">%s</p>
    %s
  </div>
</section>''' % (tabs, decks, note, nxt(('jeu-regle.html', 'Lire la règle', 'Read the rules'), ('jeu-enquete.html', 'Découvrir l’enquête', 'Discover the investigation')))

# ═════════ Enquête ═════════
enq = F['enquete']
lead_in = '<p>À lire à voix haute au début de la partie. La solution'
assert enq.startswith(lead_in), enq[:120]
enq = '<p>La solution' + enq[len(lead_in):]
enq = enq.replace('<h2 class="j-h">Les six suspects</h2>', '<h2 class="j-h" data-en="The six suspects">Les six suspects</h2>') \
         .replace('<h2 class="j-h">Les six méfaits</h2>', '<h2 class="j-h" data-en="The six misdeeds">Les six méfaits</h2>') \
         .replace('<h2 class="j-h">Les six lieux</h2>', '<h2 class="j-h" data-en="The six rooms">Les six lieux</h2>') \
         .replace('<h2 class="j-h">L’épilogue</h2>', '<h2 class="j-h" data-en="The epilogue">L’épilogue</h2>') \
         .replace('<h2 class="j-h">Comment l’enquête se règle d’elle-même</h2>', '<h2 class="j-h" data-en="How the investigation balances itself">Comment l’enquête se règle d’elle-même</h2>')
assert enq.count('data-en=') == 5
enquete = head('L’enquête', 'The investigation',
               'L’Affaire Ombreval : 6 suspects, 6 méfaits, 6 lieux et 216 solutions possibles. La solution est tirée au hasard à chaque partie.',
               'The Ombreval Affair: 6 suspects, 6 misdeeds, 6 rooms and 216 possible solutions. The solution is drawn at random every game.',
               [('6 suspects', '6 suspects'), ('6 méfaits', '6 misdeeds'), ('6 lieux', '6 rooms'), ('216 solutions', '216 solutions')])
enquete += jnav('jeu-enquete.html')
enquete += '''
<section class="band navy j-band-tight">
  <div class="wrap">
    <p class="over" data-en="To read aloud at the start of the game">À lire à voix haute au début de la partie</p>
    <blockquote class="j-intro-read">%s</blockquote>
  </div>
</section>

<section class="band j-band-tight">
  <div class="wrap">
%s
    %s
  </div>
</section>''' % (F['intro_read'], enq, nxt(('jeu-cartes.html#enquete', 'Voir les 18 cartes d’enquête', 'See the 18 investigation cards'), ('jeu-regle.html#r-enquete', 'Relire la règle de l’enquête', 'Reread the investigation rules')))

PAGES_OUT = {
    'jeu-regle.html': page('jeu-regle.html', 'La règle du jeu · L’Affaire Ombreval · Le Comptoir', 'The rules · The Ombreval Affair · Le Comptoir',
                           'La règle complète de L’Affaire Ombreval, le jeu de société du Comptoir : but, mise en place, tour de jeu, défis, enquête, fin de partie, exemple de tour et variantes.',
                           'La règle du jeu · L’Affaire Ombreval', regle),
    'jeu-plateau.html': page('jeu-plateau.html', 'Le plateau et le matériel · L’Affaire Ombreval · Le Comptoir', 'The board and the pieces · The Ombreval Affair · Le Comptoir',
                             'Le plateau de 32 cases, les pions, les billets, les fiches et la boîte de L’Affaire Ombreval, le jeu de société du Comptoir.',
                             'Le plateau et le matériel · L’Affaire Ombreval', plateau),
    'jeu-cartes.html': page('jeu-cartes.html', 'Les 282 cartes · L’Affaire Ombreval · Le Comptoir', 'The 282 cards · The Ombreval Affair · Le Comptoir',
                            'Les 282 cartes de L’Affaire Ombreval : 180 défis de négociation, droit, comptabilité, marketing et économie pour réviser en ligne, plus les indices, imprévus, rôles et objectifs.',
                            'Les 282 cartes · L’Affaire Ombreval', cartes),
    'jeu-enquete.html': page('jeu-enquete.html', 'L’enquête · L’Affaire Ombreval · Le Comptoir', 'The investigation · The Ombreval Affair · Le Comptoir',
                             'Le scénario de L’Affaire Ombreval : six suspects, six méfaits, six lieux, 216 solutions et un épilogue qui renvoie au cours.',
                             'L’enquête · L’Affaire Ombreval', enquete),
}
for name, htm in PAGES_OUT.items():
    htm = htm.replace('<div class="j-table-wrap">', '<div class="j-table-wrap" tabindex="0" role="group" aria-label="Tableau, à faire défiler sur petit écran">')
    open(os.path.join(REPO, name), 'w', encoding='utf-8').write(htm)
    print(name, len(htm) // 1024, 'Ko')

css = open(os.path.join(HERE, 'layout.css'), encoding='utf-8').read().rstrip() + '\n.j-en-only:empty{display:none}\n' + F['css_pieces'] + '\n' + F['css_box'] + '\n' + \
    '.j-flat-lid{--s:min(420px,calc(100vw - 2 * var(--gut)))}\n.j-box3d-wrap{padding:20px 0 50px}\n.j-box-back,.j-lid{font-family:var(--f-texte)}\n.j-box-back h3{font:600 13px/1.3 var(--f-texte);letter-spacing:.16em;text-transform:uppercase;margin:0;color:#7A6230}\n.j-show.j-box{grid-template-columns:auto minmax(0,1fr)}\n@media (max-width:960px){.j-show.j-box{grid-template-columns:minmax(0,1fr)}}\n'
open(os.path.join(REPO, 'assets/jeu.css'), 'w', encoding='utf-8').write(css)
shutil.copy(os.path.join(HERE, 'jeu.js'), os.path.join(REPO, 'assets/jeu.js'))
print('jeu.css', len(css) // 1024, 'Ko ; kit :', PDF_FR)
