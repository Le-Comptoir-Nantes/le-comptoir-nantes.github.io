"""Corrections d'audit communes à toutes les pages (peut être relancé sans risque)."""
import glob, os, re, hashlib, base64
R = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')) + '/'
BOOT = '!function(d,w){try{if(w.matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.classList.add("m");w.setTimeout(function(){w.__lcMotion||d.classList.remove("m")},2500)}catch(e){}}(document.documentElement,window)'
H = base64.b64encode(hashlib.sha256(BOOT.encode()).digest()).decode()
CSP = ("default-src 'self'; script-src 'self' 'sha256-%s'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; "
       "font-src 'self'; connect-src 'self'; media-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'") % H
HEAD = ('<meta http-equiv="Content-Security-Policy" content="%s">\n'
        '<meta name="theme-color" content="#0B1F4D">\n'
        '<link rel="preload" href="assets/fonts/lora-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>\n'
        '<link rel="preload" href="assets/fonts/lato-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>\n') % CSP
ICON = '<link rel="apple-touch-icon" href="assets/icone-180.png">\n'
NOJS = ('<noscript><p class="nojs">Le menu et certains contenus ont besoin de JavaScript. Pages : <a href="index.html">Accueil</a><a href="club.html">Le club</a>'
        '<a href="evenements.html">Événements</a><a href="jeu.html">Le jeu</a><a href="bureau.html">Le bureau</a><a href="merch.html">Merch</a>'
        '<a href="partenaires.html">Partenaires</a><a href="rejoindre.html">Venir à un Comptoir</a><a href="mentions.html">Mentions légales</a></p></noscript>\n')
TITLES = {
    'club.html': ('Le club · Le Comptoir, club étudiant d’Audencia à Nantes', 'The club · Le Comptoir, student club at Audencia, Nantes'),
    'evenements.html': ('Événements · Le Comptoir, club étudiant d’Audencia Nantes', 'Events · Le Comptoir, student club at Audencia, Nantes'),
    'bureau.html': ('Le bureau · Le Comptoir, club étudiant d’Audencia Nantes', 'The board · Le Comptoir, student club at Audencia, Nantes'),
    'merch.html': ('Merch · Le Comptoir, club étudiant d’Audencia Nantes', 'Merch · Le Comptoir, student club at Audencia, Nantes'),
    'rejoindre.html': ('Rejoindre Le Comptoir · club étudiant d’Audencia Nantes', 'Join Le Comptoir · student club at Audencia, Nantes'),
    'partenaires.html': ('Partenaires et intervenants · Le Comptoir, Audencia Nantes', 'Partners and speakers · Le Comptoir, Audencia Nantes'),
}
for f in sorted(glob.glob(R + '*.html')):
    n = os.path.basename(f); t = open(f, encoding='utf-8').read(); o = t
    assert t.count('<script>' + BOOT + '</script>') == 1, n
    assert t.count('<script>') == 1, (n, 'script intégré inattendu')
    t = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n<meta name="theme-color"[^>]*>\n(?:<link rel="preload"[^>]*>\n)*', '', t)
    vp = '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    assert t.count(vp) == 1, n
    t = t.replace(vp, vp + HEAD)
    if 'apple-touch-icon' not in t:
        ic = '<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">\n'
        assert t.count(ic) == 1, n
        t = t.replace(ic, ic + ICON)
    if '<noscript>' not in t:
        hd = '<header id="hd"></header>\n'
        assert t.count(hd) == 1, n
        t = t.replace(hd, hd + NOJS)
    if n in TITLES:
        fr, en = TITLES[n]
        t = re.sub(r'<title>.*?</title>', '<title>%s</title>' % fr, t, count=1)
        t = re.sub(r'data-title-en="[^"]*"', 'data-title-en="%s"' % en, t, count=1)
    if n == 'evenements.html' and 'class="sr"' not in t:
        a = '<section class="band navy">\n  <div class="wrap cols">\n    <div class="item">\n      <h3 data-en="Prices">Tarifs</h3>'
        assert t.count(a) == 1
        t = t.replace(a, a.replace('<div class="wrap cols">\n', '<div class="wrap cols">\n    <h2 class="sr" data-en="Good to know">Bon à savoir</h2>\n'))
    if n == 'merch.html' and 'class="sr"' not in t:
        a = '    <div class="goods" id="products"></div>'
        assert t.count(a) == 1
        t = t.replace(a, '    <h2 class="sr" data-en="The items">Les articles</h2>\n' + a)
    if t != o:
        open(f, 'w', encoding='utf-8').write(t)
    print('%-22s %s' % (n, 'modifié' if t != o else 'inchangé'))
