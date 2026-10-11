"""Fabrique le kit à imprimer (PDF A4) à partir des mêmes fragments que les pages du site.

Le kit sert au bureau pour imprimer l'exemplaire du club : il n'est pas proposé sur le site.
Il est écrit dans outils/jeu/tmp/, un dossier que Git ignore, donc il n'est jamais mis en ligne.
"""
import json, os, re, subprocess, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'tmp')
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
FONTS = 'file://' + os.path.join(REPO, 'assets', 'fonts') + '/'
ITAL = 'file://' + os.path.join(HERE, 'polices') + '/'
OUT = os.path.join(WORK, 'affaire-ombreval-kit-a-imprimer.pdf')
F = json.load(open(os.path.join(HERE, 'fragments.json'), encoding='utf-8'))
NB = ' '

CSS = '''
@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:300 700;src:url(@F@cormorant-garamond-latin-wght-normal.woff2) format("woff2")}
@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:300 700;src:url(@F@cormorant-garamond-latin-wght-italic.woff2) format("woff2")}
@font-face{font-family:Jost;font-style:normal;font-weight:100 900;src:url(@F@jost-latin-wght-normal.woff2) format("woff2")}
@font-face{font-family:Jost;font-style:italic;font-weight:100 900;src:url(@I@jost-latin-wght-italic.woff2) format("woff2")}
:root{--ink:#0F1B33;--paper:#fff;--chalk:#F3EEE2;--slate:#4A4E6A;--line:rgba(15,27,51,.22);--brass:#C9A55A;--brass2:#C9A55A;--brassink:#7A6230;
--serif:'Cormorant Garamond',Georgia,serif;--sans:Jost,'Helvetica Neue',Arial,sans-serif;--hd:0px;--gut:0px}
@page{size:A4;margin:0}
@page full{size:A4;margin:0}
@page rules{size:A4;margin:15mm 14mm 16mm;@bottom-center{content:"Le Comptoir · L’Affaire Ombreval · Règle du jeu · page " counter(page);font:500 7.5pt Jost,sans-serif;color:#4A4E6A}}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:var(--sans);font-size:16px;line-height:1.6;color:#18203A;background:#fff}
svg{display:block}
.pg{page:full;width:210mm;height:297mm;position:relative;overflow:hidden;contain:strict;break-after:page;break-inside:avoid}
.hdr{position:absolute;left:10.5mm;right:10.5mm;top:6mm;height:8mm;display:flex;align-items:center;justify-content:space-between;gap:6mm;font:500 7.6pt/1.2 var(--sans);color:#4A4E6A;letter-spacing:.02em}
.hdr b{font:700 11pt/1 var(--serif);color:#0F1B33;letter-spacing:0}
.hdr span:last-child{text-align:right}
.ftr{position:absolute;left:10.5mm;right:10.5mm;bottom:6mm;height:7mm;display:flex;align-items:center;justify-content:space-between;font:500 7.2pt/1.2 var(--sans);color:#4A4E6A}
.grid{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid}
.grid.cards{grid-template-columns:repeat(3,63mm);grid-auto-rows:88mm;width:189mm;height:264mm}
.grid.bills{grid-template-columns:repeat(3,63mm);grid-auto-rows:33mm;width:189mm;height:264mm}
.cell{outline:.15mm solid #A9A294;outline-offset:-.075mm;overflow:hidden}
.cell .j-card{border-radius:0}
.cell.back .j-card{border-radius:0}
/* Plateau */
.quarter{position:absolute;left:10mm;top:22mm;width:190mm;height:190mm;outline:.15mm solid #A9A294}
.quarter svg{width:190mm;height:190mm}
.q-help{position:absolute;left:10mm;right:10mm;top:220mm;display:grid;grid-template-columns:34mm 1fr;gap:8mm;align-items:start;font-size:9.4pt;line-height:1.45}
.q-map{display:grid;grid-template-columns:1fr 1fr;gap:1mm;width:34mm;height:34mm}
.q-map i{border:.3mm solid #0F1B33;display:grid;place-items:center;font:700 12pt var(--serif);font-style:normal;color:#0F1B33}
.q-map i.on{background:#0F1B33;color:#C9A55A}
.q-help p{margin:0 0 2mm}
/* Fiches */
.two{position:absolute;left:0;top:.5mm;width:296mm;height:210mm;display:flex;transform-origin:0 0;transform:translateX(210mm) rotate(90deg)}
.two .j-sheet{outline:.15mm solid #A9A294;outline-offset:-.075mm}
/* Pions */
.kit{position:absolute;left:14mm;right:14mm;top:22mm;display:flex;flex-direction:column;gap:7mm}
.kit h2{font:700 15pt/1.1 var(--serif);margin:0 0 1.5mm;color:#0F1B33}
.kit p{margin:0 0 3mm;font-size:9.2pt;line-height:1.45;max-width:150mm}
.kit .row{display:flex;flex-wrap:wrap;gap:5mm;align-items:flex-start}
.kit .j-token{margin:0}
.safe{width:105mm;height:62mm;background:#0A1325;color:#C9A55A;border:.5mm solid #C9A55A;display:flex;align-items:center;gap:6mm;padding:0 8mm;outline:.15mm solid #A9A294;outline-offset:1.5mm}
.safe svg{width:30mm;height:30mm;flex:none}
.safe b{display:block;font:700 22pt/1 var(--serif)}
.safe small{display:block;font:600 7pt/1.3 var(--sans);letter-spacing:.2em;text-transform:uppercase;color:#E6CF96;margin-top:2mm}
.safe em{display:block;font:italic 500 11pt/1.25 var(--serif);color:#F5EFE2;margin-top:3mm}
/* Couverture */
.cover{padding:20mm 18mm 16mm;display:flex;flex-direction:column}
.cover .top{display:flex;align-items:center;gap:10mm;border-bottom:.5mm solid #C9A55A;padding-bottom:8mm}
.cover .top svg{width:42mm;height:42mm;flex:none}
.cover .kick{font:600 8pt/1.3 var(--sans);letter-spacing:.24em;text-transform:uppercase;color:#7A6230;margin:0 0 2mm}
.cover h1{font:700 44pt/.95 var(--serif);margin:0;color:#0F1B33}
.cover .sub{font:italic 500 19pt/1.2 var(--serif);margin:2mm 0 0;color:#18203A}
.cover .facts{display:flex;gap:2mm;list-style:none;padding:0;margin:4mm 0 0;flex-wrap:wrap}
.cover .facts li{border:.3mm solid #7A6230;border-radius:99px;padding:.6mm 3.4mm;font-size:8.6pt;color:#7A6230}
.cover h2{font:700 17pt/1.1 var(--serif);margin:9mm 0 3mm;color:#0F1B33}
.cover ol{margin:0;padding-left:5mm;font-size:9.8pt;line-height:1.45;display:grid;gap:1.6mm}
.cover table{width:100%;border-collapse:collapse;font-size:9.4pt;line-height:1.35;font-variant-numeric:tabular-nums}
.cover th{text-align:left;font-weight:600;border-bottom:.4mm solid #0F1B33;padding:1.4mm 3mm 1.4mm 0;font-size:7.6pt;letter-spacing:.1em;text-transform:uppercase}
.cover td{border-bottom:.2mm solid #CFC4AC;padding:1.5mm 3mm 1.5mm 0;vertical-align:top}
.cover td:nth-child(2){white-space:nowrap;font-weight:600}
.cover .legal{margin-top:auto;font-size:7.8pt;color:#4A4E6A;display:flex;justify-content:space-between;gap:6mm;border-top:.2mm solid #CFC4AC;padding-top:3mm}
/* Règle */
.flow{page:rules;break-after:page;font-size:9pt;line-height:1.4}
.flow h1{font:700 30pt/1 var(--serif);margin:0 0 2mm;color:#0F1B33}
.flow .intro{font:italic 500 12.5pt/1.3 var(--serif);margin:0 0 6mm;color:#18203A;border-bottom:.5mm solid #C9A55A;padding-bottom:4mm}
.flow .cols{columns:2;column-gap:9mm}
.flow p{margin:0 0 2.2mm}
.flow h2,.flow .j-h{font:700 15.5pt/1.1 var(--serif);margin:5mm 0 2mm;color:#0F1B33;break-after:avoid}
.flow .j-h:first-child{margin-top:0}
.flow h3{font:600 9.6pt/1.25 var(--sans);margin:0 0 1.6mm;color:#7A6230;break-after:avoid}
.flow .j-steps,.flow .j-list{margin:0 0 2.6mm;padding-left:4.4mm;display:block}
.flow .j-steps li,.flow .j-list li{margin-bottom:1.2mm}
.flow .j-list{list-style:disc}
.flow .j-callout{background:#F3EEE2;border-left:1mm solid #C9A55A;border-radius:0;padding:2.6mm 3.4mm;margin:2.6mm 0;break-inside:avoid}
.flow .j-callout p:last-child{margin:0}
.flow .j-callout .j-ic{width:3.6mm;height:3.6mm;display:inline-block;vertical-align:-.7mm;color:#7A6230}
.flow .j-chip{display:inline-flex;align-items:center;gap:1mm;background:var(--c);color:#fff;border-radius:99px;padding:0 2mm 0 1.4mm;font-size:7.4pt;font-weight:600;white-space:nowrap;line-height:1.5}
.flow .j-chip .j-ic{width:2.8mm;height:2.8mm}
.flow dl.j-cases{margin:0 0 2.6mm;display:block}
.flow dl.j-cases dt{font-weight:600;display:flex;gap:1.6mm;align-items:center;break-after:avoid}
.flow dl.j-cases dt .j-ic{width:4mm;height:4mm;color:#7A6230}
.flow dl.j-cases dd{margin:0 0 2mm 5.6mm}
.flow .j-example{border:.3mm solid #CFC4AC;padding:2.6mm 3.4mm;background:#FBF8F1}
.flow .j-example p:last-child{margin:0}
.flow .j-variant{border:.3mm solid #CFC4AC;padding:2.6mm 3.4mm;margin-bottom:2.4mm;break-inside:avoid}
.flow .j-variant .j-list{margin:0}
.flow .j-table-wrap{margin:1.6mm 0 2.6mm;break-inside:avoid}
.flow .j-tbl{border-collapse:collapse;width:100%;font-size:8.2pt;line-height:1.3}
.flow .j-tbl caption{text-align:left;font-weight:600;color:#7A6230;padding-bottom:1mm}
.flow .j-tbl th{text-align:left;font-weight:600;border-bottom:.35mm solid #0F1B33;padding:1mm 2mm 1mm 0}
.flow .j-tbl td{border-bottom:.2mm solid #CFC4AC;padding:1mm 2mm 1mm 0;vertical-align:top}
.flow .j-small{font-size:8.2pt;color:#4A4E6A}
.flow .j-aside-card{border:.3mm solid #C9A55A;padding:3mm 3.6mm;margin:3mm 0 0;break-inside:avoid}
.flow .j-aside-card dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:.8mm 3mm}
.flow .j-aside-card dt{font-weight:600}
.flow .j-aside-card dd{margin:0}
.flow .j-aside-card p{margin:0}
.flow .j-die{margin:0;padding-left:4.4mm;display:grid;grid-template-columns:1fr 1fr;gap:1mm 3mm}
.flow sup{line-height:0}
'''.replace('@F@', FONTS).replace('@I@', ITAL) + F['css_pieces']

HDR = '<b>Le Comptoir · L’Affaire Ombreval</b>'


def pg(label, body, n=None, foot='', cls=''):
    return ('<section class="pg %s"><div class="hdr">%s<span>%s</span></div>%s<div class="ftr"><span>%s</span><span>{{P%d}}</span></div></section>'
            % (cls, HDR, label, body, foot, n))


DECKS = [('nego', 'Défis Négociation', 'Négociation'), ('droit', 'Défis Droit', 'Droit'), ('compta', 'Défis Comptabilité', 'Comptabilité'),
         ('mkt', 'Défis Marketing', 'Marketing'), ('eco', 'Défis Économie', 'Économie'), ('indice', 'Cartes Indice', 'Indice'),
         ('imprevu', 'Cartes Imprévu', 'Imprévu'), ('enquete', 'Cartes d’enquête', 'Dossier'), ('role', 'Cartes Rôle', 'Rôle'),
         ('objectif', 'Cartes Objectif secret', 'Objectif')]
backs = F['decks']['dos']
back_of = {}
for b in backs:
    back_of[re.search(r'<div class="j-b-title">(.*?)</div>', b).group(1)] = b

fixed = []      # (clé de sommaire, html) — pages à taille fixe, dans l'ordre
CUT = 'Imprimer à 100' + NB + '% · découper sur les traits'

# Plateau
QN = ['haut gauche', 'haut droite', 'bas gauche', 'bas droite']
inner = F['board'][F['board'].index('>') + 1:F['board'].rindex('</svg>')]
for q in range(4):
    x, y = (q % 2) * 190, (q // 2) * 190
    svg = '<svg viewBox="%d %d 190 190" xmlns="http://www.w3.org/2000/svg">%s</svg>' % (x, y, inner)
    qmap = ''.join('<i class="%s">%d</i>' % ('on' if i == q else '', i + 1) for i in range(4))
    body = ('<div class="quarter">%s</div><div class="q-help"><div class="q-map">%s</div><div>'
            '<p><strong>Plateau, quart %d sur 4 (%s).</strong> Imprimez les quatre quarts à 100' + NB + '%%, sur papier épais ou collés sur du carton.</p>'
            '<p>Découpez chaque carré au ras du décor, posez-les bord à bord selon le schéma, puis assemblez-les au dos avec du ruban adhésif. '
            'Le plateau fini mesure 38 × 38' + NB + 'cm et se replie en quatre.</p></div></div>') % (svg, qmap, q + 1, QN[q])
    fixed.append(('plateau', ('Plateau · quart %d/4 (%s)' % (q + 1, QN[q]), body, CUT, '')))


def card_pages(key, cards, label):
    n = (len(cards) + 8) // 9
    for i in range(n):
        cells = ''.join('<div class="cell">%s</div>' % c for c in cards[i * 9:i * 9 + 9])
        fixed.append((key, ('%s · planche %d/%d' % (label, i + 1, n), '<div class="grid cards">%s</div>' % cells, CUT, '')))
    return n


counts = {}
for k, label, bk in DECKS:
    counts[k] = card_pages('defis' if k in ('nego', 'droit', 'compta', 'mkt', 'eco') else 'autres', F['decks'][k], label)
counts['titre'] = card_pages('autres', F['decks']['titre'], 'Titres de propriété et contrats d’emprunt')

# Dos
for k, label, bk in DECKS:
    n = counts[k]
    cells = ''.join('<div class="cell back">%s</div>' % back_of[bk] for _ in range(9))
    lab = 'Dos · %s · au verso de %s' % (label, 'la planche' if n == 1 else 'chacune des %d planches' % n)
    fixed.append(('dos', (lab, '<div class="grid cards">%s</div>' % cells, 'Facultatif · %d exemplaire%s' % (n, 's' if n > 1 else ''), '')))

# Billets
for b, (val, qty) in zip(F['billet_list'], [(1, 48), (5, 48), (10, 24), (20, 24)]):
    n = qty // 24
    for i in range(n):
        cells = ''.join('<div class="cell">%s</div>' % b for _ in range(24))
        fixed.append(('billets', ('Billets de %d' % val + NB + 'k€ · planche %d/%d' % (i + 1, n), '<div class="grid bills">%s</div>' % cells, CUT, '')))

# Pions, jetons, étiquette
logo = F['logo']
kit = ('<div class="kit"><div><h2>Les six pions</h2><p>Découpez chaque bande, pliez-la sur les trois pointillés pour former un triangle '
       '(les deux faces colorées vers l’extérieur) et collez les deux socles l’un sur l’autre.</p><div class="row">%s</div></div>'
       '<div><h2>Les douze jetons Flagship</h2><p>À découper et, si possible, à coller sur du carton. Un jeton se pose sur une boutique quand on possède les deux boutiques de la ville.</p><div class="row">%s</div></div>'
       '<div><h2>L’étiquette du Coffre-fort</h2><p>À coller sur une enveloppe : elle reçoit les trois cartes de la solution.</p>'
       '<div class="safe">%s<div><b>Coffre-fort</b><small>Maison Ombreval · la solution</small><em>À n’ouvrir que pour vérifier une accusation.</em></div></div></div></div>'
       ) % (''.join(F['pawn_list']), F['token'] * 12, logo)
fixed.append(('pions', ('Pions, jetons Flagship et Coffre-fort', kit, CUT, '')))

# Fiches (A4 paysage, deux A5 par page)
for k, lab, note in (('fiche', 'Fiche Bilan', 'Une par joueur et par partie · 2 par page'), ('carnet', 'Carnet d’enquêteur', 'Un par joueur et par partie · 2 par page'),
                     ('aide', 'Aide de jeu', 'Une par joueur · 2 par page')):
    fixed.append(('fiches', (lab, '<div class="two">%s%s</div>' % (F['sheets'][k], F['sheets'][k]), note, 'land')))

RULES = ('<section class="flow"><h1>Règle du jeu</h1><p class="intro">Un jeu de société du club Le Comptoir pour réviser la négociation, le droit, la comptabilité, '
         'le marketing et l’économie. 2 à 6 joueurs · 60 à 90 minutes.</p><div class="cols">%s%s</div></section>') % (F['rule'], F['aside'])


def build(nrules):
    first = 2 + nrules   # numéro de la première page fixe
    rng = {}
    out = []
    for i, (key, (label, body, foot, cls)) in enumerate(fixed):
        p = first + i
        rng.setdefault(key, [p, p])[1] = p
        if cls == 'land':
            out.append('<section class="pg">%s</section>' % body)
        else:
            out.append(pg(label, body, 0, foot, cls).replace('{{P0}}', 'page %d' % p))
    total = first + len(fixed) - 1

    def r(k):
        a, b = rng[k]
        return '%d' % a if a == b else '%d à %d' % (a, b)
    rows = [('Règle du jeu', '2' if nrules == 1 else '2 à %d' % (1 + nrules), 'Une fois, sur papier ordinaire.'),
            ('Plateau en quatre quarts', r('plateau'), 'Une fois, sur papier épais. À assembler.'),
            ('180 cartes Défi (cinq matières)', r('defis'), 'Une fois, sur papier épais.'),
            ('Indices, Imprévus, enquête, Rôles, Objectifs, titres et emprunts', r('autres'), 'Une fois, sur papier épais.'),
            ('Dos des cartes', r('dos'), 'Facultatif. Le nombre d’exemplaires est indiqué sur chaque planche.'),
            ('144 billets de la Banque Ombreval', r('billets'), 'Une fois, sur papier ordinaire.'),
            ('Pions, jetons Flagship, étiquette du Coffre-fort', r('pions'), 'Une fois, sur papier épais.'),
            ('Fiche Bilan, carnet d’enquêteur, aide de jeu', r('fiches'), 'Fiche et carnet : un par joueur à chaque partie (deux par page).')]
    table = ''.join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % x for x in rows)
    cover = ('<section class="pg cover"><div class="top">%s<div><p class="kick">Un jeu de société du club Le Comptoir · Audencia</p><h1>Le Comptoir</h1>'
             '<p class="sub">L’Affaire Ombreval · kit à imprimer</p><ul class="facts"><li>2 à 6 joueurs</li><li>60 à 90' + NB + 'min</li><li>282 cartes</li><li>%d pages A4</li></ul></div></div>'
             '<h2>Avant d’imprimer</h2><ol>'
             '<li>Imprimez en <strong>A4</strong>, en couleur, à <strong>100' + NB + '%%</strong> (« taille réelle », sans « ajuster à la page »), en recto seul.</li>'
             '<li>Prenez un <strong>papier épais</strong> (160 à 250' + NB + 'g) pour le plateau, les cartes, les pions et les jetons. Le papier ordinaire suffit pour la règle, les billets et les fiches.</li>'
             '<li>Découpez sur les traits fins. Les cartes mesurent 63 × 88' + NB + 'mm : elles entrent dans des protège-cartes standard.</li>'
             '<li>Les <strong>dos des cartes</strong> sont facultatifs. Pour les avoir, repassez les planches d’une pioche dans l’imprimante et imprimez son dos au verso. Tous les dos d’une pioche sont identiques : aucun calage précis n’est nécessaire.</li>'
             '<li>Ajoutez <strong>deux dés</strong>, un crayon par joueur, une enveloppe pour le Coffre-fort et un minuteur (celui d’un téléphone convient).</li></ol>'
             '<h2>Ce que contient ce document</h2><table><thead><tr><th>Élément</th><th>Pages</th><th>À imprimer</th></tr></thead><tbody>%s</tbody></table>'
             '<div class="legal"><span>Une édition Le Comptoir · club étudiant d’Audencia, Nantes · Fortes fortuna adiuvat · le-comptoir-nantes.github.io</span>'
             '<span>Maison et personnages fictifs. Toute ressemblance serait fortuite.</span></div></section>') % (logo, total, table)
    doc = ('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Le Comptoir · L’Affaire Ombreval · kit à imprimer</title><style>%s</style></head><body>%s%s%s'
           '<script>%s</script></body></html>') % (CSS, cover, RULES, ''.join(out), FIT)
    return doc, total


FIT = '''function fitCards(root){var over=0;(root||document).querySelectorAll('.j-card .j-fit').forEach(function(el){var card=el.closest('.j-card');var fs=1;card.style.setProperty('--fs',fs);var g=0;
while(el.scrollHeight>el.clientHeight+1&&fs>0.66&&g<40){fs=Math.round((fs-0.03)*100)/100;card.style.setProperty('--fs',fs);g++;}
if(el.scrollHeight>el.clientHeight+1)over++;});return over;}'''


def render(doc, path):
    os.makedirs(WORK, exist_ok=True)
    html_path = os.path.join(WORK, 'print.html')
    open(html_path, 'w', encoding='utf-8').write(doc)
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page()
        page.goto('file://' + os.path.abspath(html_path))
        page.evaluate('document.fonts.ready')
        page.wait_for_timeout(600)
        print('cartes en dépassement :', page.evaluate('fitCards(document)'))
        page.emulate_media(media='print')
        page.set_viewport_size({'width': 794, 'height': 1123})
        print('débordement horizontal (px) :', page.evaluate('document.documentElement.scrollWidth - 794'))
        page.pdf(path=path, prefer_css_page_size=True, print_background=True, tagged=False)
        b.close()
    info = subprocess.run(['pdfinfo', path], capture_output=True, text=True).stdout
    return int(re.search(r'Pages:\s+(\d+)', info).group(1))


if __name__ == '__main__':
    tmp = os.path.join(WORK, 'kit.pdf')
    guess = 4
    for _ in range(3):
        doc, total = build(guess)
        got = render(doc, tmp)
        nrules = got - 1 - len(fixed)
        print('pages :', got, '· règle :', nrules, '· attendu :', total)
        if nrules == guess:
            break
        guess = nrules
    os.replace(tmp, OUT)
    print(OUT, os.path.getsize(OUT) // 1024, 'Ko', '· pages fixes :', len(fixed), counts)
