"""Découpe la page d'origine du jeu en fragments réutilisables, classes préfixées « j- »."""
import re, json, os, html as H

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'source.txt')
t = open(SRC, encoding='utf-8').read()


def balanced(s, start, tag):
    """Renvoie (début, fin) du bloc <tag ...>...</tag> qui commence à start."""
    assert s.startswith('<' + tag, start), s[start:start + 40]
    depth, i = 0, start
    pat = re.compile(r'<(/?)%s\b' % tag)
    while True:
        m = pat.search(s, i)
        assert m, 'non fermé'
        if m.group(1):
            depth -= 1
            if depth == 0:
                return start, s.index('>', m.start()) + 1
        else:
            depth += 1
        i = m.end()


def block(marker, tag, after=0, inner=False):
    i = t.index(marker, after)
    a, b = balanced(t, i, tag)
    s = t[a:b]
    if inner:
        s = s[s.index('>') + 1:s.rindex('</')]
    return s


def prefix(s):
    def f(m):
        return 'class="' + ' '.join('j-' + c for c in m.group(1).split()) + '"'
    return re.sub(r'class="([^"]*)"', f, s)


def prefix_css(css):
    assert '@' not in css, 'règle @ inattendue'
    out = []
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        sel = re.sub(r'\.(?=[A-Za-z])', '.j-', m.group(1).strip())
        out.append(sel + '{' + m.group(2) + '}')
    return '\n'.join(out)


F = {}

# ── Règle ──
rule = block('<div class="rule-main">', 'div', inner=True).strip()
rule = re.sub(r'<h3 id="(r-[a-z]+)">(.*?)</h3>', r'<h2 class="h" id="\1">\2</h2>', rule)
rule = rule.replace('<h4>', '<h3>').replace('</h4>', '</h3>')
F['rule_toc'] = re.findall(r'<h2 class="h" id="(r-[a-z]+)">(.*?)</h2>', rule)
F['rule'] = prefix(rule)
a = t.index('<aside class="rule-aside"')
aside = t[t.index('>', a) + 1:t.index('</aside>', a)].strip()
aside = aside.replace('<h4>', '<h3>').replace('</h4>', '</h3>')
F['aside'] = prefix(aside)

# ── Plateau ──
p0 = t.index('<section class="block" id="plateau"')
F['board'] = prefix(block('<svg class="board"', 'svg', p0))
F['legend'] = prefix(block('<div class="legend">', 'div', p0))
a = t.index('<h3>Comment il est construit</h3>', p0) + len('<h3>Comment il est construit</h3>')
F['board_text'] = prefix(t[a:t.index('<h3>Les 32 cases</h3>', a)].strip())
F['cases'] = prefix(block('<div class="table-wrap">', 'div', t.index('<h3>Les 32 cases</h3>', a)))

# ── Matériel ──
m0 = t.index('<section class="block" id="materiel"')
F['mat'] = prefix(block('<div class="mat-grid">', 'div', m0))


def para_after(h, start):
    a = t.index(h, start) + len(h)
    a = t.index('<p>', a)
    return t[a:t.index('</p>', a) + 4]


F['pawns_text'] = para_after('<h3>Les pions</h3>', m0)
pawns = block('<div class="pawns">', 'div', m0, inner=True)
F['pawn_list'] = [prefix(x) for x in re.findall(r'<div class="pawn">.*?<div class="p-base"></div></div>', pawns, re.S)]
assert len(F['pawn_list']) == 6
tk = pawns.index('<div class="token">')
F['token'] = prefix(pawns[tk:balanced(pawns, tk, 'div')[1]])
F['billets_text'] = para_after('<h3>Les billets</h3>', m0)
bil = block('<div class="billets">', 'div', m0, inner=True)
F['billet_list'] = []
i = 0
while True:
    i = bil.find('<div class="billet ', i)
    if i < 0:
        break
    a, b = balanced(bil, i, 'div')
    F['billet_list'].append(prefix(bil[a:b]))
    i = b
assert len(F['billet_list']) == 4
F['sheets_text'] = para_after('<h3>Fiche Bilan, carnet et aide de jeu</h3>', m0)
F['sheets'] = {}
for k in ('fiche', 'carnet', 'aide'):
    F['sheets'][k] = prefix(block('<section class="sheet a5 %s">' % k, 'section', m0))

# ── Cartes ──
c0 = t.index('<section class="block" id="cartes"')
F['decks'] = {}
for m in re.finditer(r'<div class="deck" data-group="(\w+)"', t[c0:]):
    s = block(m.group(0), 'div', c0, inner=True)
    cards = re.findall(r'<article class="card[^"]*".*?</article>', s, re.S)
    F['decks'][m.group(1)] = [prefix(c) for c in cards]
n = {k: len(v) for k, v in F['decks'].items()}
assert sum(v for k, v in n.items() if k != 'dos') == 282, n
F['deck_note'] = prefix(block('<p class="deck-note">', 'p', c0, inner=True))

# ── Enquête ──
e0 = t.index('<section class="block" id="enquete"')
a = t.index('<p class="intro-read">', e0)
F['intro_read'] = t[t.index('>', a) + 1:t.index('</p>', a)]
b = t.index('</p>', a) + 4
enq = t[b:t.index('</div></section>', b)].strip()
enq = re.sub(r'<h3>(.*?)</h3>', r'<h2 class="h">\1</h2>', enq)
enq = re.sub(r'<div class="item"><h4>(.*?)</h4>', r'<div class="item"><span class="k">\1</span>', enq)
enq = enq.replace('<h4>', '<h3>').replace('</h4>', '</h3>')
F['enquete'] = prefix(enq)

# ── Boîte ──
b0 = t.index('<section class="block" id="boite"')
stage = block('<div class="box-stage">', 'div', b0, inner=True)
F['box3d'] = prefix(block('<div class="box3d-wrap"', 'div', b0))
F['box_text'] = re.findall(r'<p>.*?</p>', stage[stage.index('<h3 style="margin-top:0">'):], re.S)
F['lid'] = prefix(block('<div class="lid flat-lid"', 'div', b0))
F['box_back'] = prefix(block('<div class="box-back">', 'div', b0))

# ── Logo du jeu ──
F['logo'] = prefix(block('<svg class="hero-logo"', 'svg'))

# ── Styles des pièces ──
css = re.findall(r'<style>([\s\S]*?)</style>', t)[1]
cut = css.index('\n.card{--fs:1')
pieces = css[cut:]
head = css[:cut]
box = '\n'.join(m.group(0) for m in re.finditer(r'^\.(?:box|lid|edge|flat-lid)[^{}]*\{[^{}]*\}', head, re.M)
                if not re.search(r'box-stage|edge-flat|edges-flat', m.group(0)))   # parties de la maquette non reprises sur le site
F['css_pieces'] = prefix_css(pieces)
F['css_box'] = prefix_css(box)


def typo(s):
    """Apostrophes courbes et espaces insécables, dans le texte seulement (jamais dans les balises)."""
    parts = re.split(r'(<[^>]+>)', s)
    for i in range(0, len(parts), 2):
        x = parts[i].replace('&#x27;', "'").replace("'", '\u2019')
        x = x.replace('\u00ab ', '\u00ab\u00a0').replace(' \u00bb', '\u00a0\u00bb')
        x = re.sub(r' ([!?:;%])', '\u00a0\\1', x)
        x = re.sub(r'(\d) (k\u20ac|\u20ac|cm|mm|min|g)\b', '\\1\u00a0\\2', x)
        parts[i] = x
    return ''.join(parts)


def walk(v):
    if isinstance(v, str):
        return typo(v)
    if isinstance(v, list):
        return [walk(x) for x in v]
    if isinstance(v, tuple):
        return tuple(walk(x) for x in v)
    if isinstance(v, dict):
        return {k: walk(x) for k, x in v.items()}
    return v


# L'or du rôle Commercial était trop clair pour porter du texte blanc (contraste 4,0) : on prend le laiton foncé de la charte (5,8)
GOLD = lambda v: v.replace('#9A7A2E', '#7A6230')
keep = {k: F.pop(k) for k in ('css_pieces', 'css_box')}
keep['css_pieces'] += '\n.j-p-face{color:#fff}'
toc = F.pop('rule_toc')
F = walk(F)
F = json.loads(GOLD(json.dumps(F, ensure_ascii=False)))
F['rule_toc'] = [(i, typo(lab)) for i, lab in toc]
F.update(keep)

json.dump(F, open(os.path.join(HERE, 'fragments.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print({k: (len(v) if isinstance(v, (str, list, dict)) else v) for k, v in F.items()})
print(n)
print(F['rule_toc'])
