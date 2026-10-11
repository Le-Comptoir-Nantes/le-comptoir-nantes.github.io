"""Contrôle de sécurité du site, à lancer avant de publier :  python3 outils/verifier.py

Il relit toutes les pages, les scripts et les fichiers de contenu, et s'arrête sur la première
famille de problèmes qui ferait baisser la sécurité du site : un fichier chargé depuis un autre site,
un script écrit dans une page, une règle de sécurité affaiblie, un lien piégé dans un contenu.
Il ne modifie rien. Code de sortie 0 = tout va bien, 1 = au moins une erreur.
N'utilise que Python 3, sans rien installer.
"""
import datetime, glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
from regle import BOOT, CSP      # la règle attendue, celle que finitions.py pose
errors = []


def err(where, msg):
    errors.append('%s : %s' % (where, msg))


def read(p):
    return open(os.path.join(R, p), encoding='utf-8').read()


def walk(ext):
    """Tous les fichiers du dépôt portant cette extension (tout le dépôt est publié), hors .git."""
    out = []
    for d, dirs, files in os.walk(R):
        dirs[:] = [x for x in dirs if x not in ('.git', 'tmp', '__pycache__', 'node_modules')]
        out += [os.path.relpath(os.path.join(d, f), R) for f in files if f.lower().endswith(ext)]
    return sorted(out)


EXTERNAL = re.compile(r'^\s*(?:[a-z][a-z0-9+.-]*:)?//', re.I)      # https://…, http://…, //…
I = re.I | re.S

# Toute page HTML du dépôt est en ligne : elles vivent toutes à la racine, là où finitions.py les protège
pages = [p for p in walk('.html') + walk('.htm') if os.sep not in p]
for p in walk('.html') + walk('.htm') + walk('.xhtml') + walk('.svg'):
    if os.sep in p and not (p.endswith('.svg') and p.startswith('assets' + os.sep)):
        err(p, 'page ou image SVG hors de sa place : une page se range à la racine du dépôt (sinon elle est en ligne sans protection)')
if len(pages) < 10:
    err('dépôt', 'seulement %d pages trouvées : le contrôle ne tourne pas au bon endroit' % len(pages))

for n in pages:
    t = re.sub(r'<!--.*?-->', '', read(n), flags=re.S)       # ce qui est en commentaire ne protège rien
    metas = re.findall(r'<meta\b[^>]*http-equiv\s*=\s*["\']?Content-Security-Policy[^>]*>', t, I)
    if len(metas) != 1 or metas[0] != '<meta http-equiv="Content-Security-Policy" content="%s">' % CSP:
        err(n, 'règle de sécurité absente, en double ou modifiée : elle doit être, mot pour mot, celle de outils/regle.py (lancer python3 outils/finitions.py)')
    if re.search(r'<meta\b[^>]*http-equiv\s*=\s*["\']?refresh', t, I):
        err(n, 'redirection automatique (meta refresh)')
    # Scripts : des fichiers du site, des données pour moteurs de recherche, ou le script d'amorçage connu
    for tag, body in re.findall(r'<script\b([^>]*)>(.*?)</script\s*>', t, I):
        src = re.search(r'\bsrc\s*=\s*["\']?([^"\'\s>]*)', tag, I)
        if src:
            u = src.group(1)
            if EXTERNAL.match(u) or not os.path.exists(os.path.join(R, u.split('?')[0])):
                err(n, 'script chargé hors du site ou introuvable : %s' % u)
        elif re.search(r'type\s*=\s*["\']application/ld\+json["\']', tag, I):
            try:
                json.loads(body)
            except ValueError:
                err(n, 'bloc de données pour moteurs de recherche (ld+json) illisible')
        elif body != BOOT:
            err(n, 'script écrit dans la page : le déplacer dans un fichier de assets/')
    if re.search(r'<style\b', t, I):
        err(n, 'bloc <style> dans la page : le déplacer dans un fichier de assets/')
    if re.search(r'<[^>]+\son[a-z]+\s*=', t, I):
        err(n, 'gestionnaire écrit dans le HTML (onclick=…) : le déplacer dans un script de assets/')
    if re.search(r'<(iframe|object|embed|frame|applet|portal)\b', t, I):
        err(n, 'balise interdite (cadre ou module) : une vidéo ou un widget intégré demande de revoir la règle de sécurité et la page Confidentialité')
    bases = re.findall(r'<base\b[^>]*>', t, I)
    if bases and (n != '404.html' or bases != ['<base href="/">']):
        err(n, 'balise <base> inattendue : seule la page 404 en porte une, vers la racine du site')
    if re.search(r'(?:href|src|action|formaction)\s*=\s*["\']?\s*(?:javascript|data|vbscript)\s*:', t, I):
        err(n, 'lien en javascript: ou data:')
    # Fichiers chargés par la page : toujours ceux du site
    for attr in re.findall(r'<(?:link|img|source|video|audio|track|input)\b[^>]*>', t, I):
        if re.search(r'rel\s*=\s*["\'](?:canonical|alternate)["\']', attr, I):
            continue
        for u in re.findall(r'\b(?:href|src|srcset|poster)\s*=\s*"([^"]*)"', attr, I):
            for u1 in [x.strip().split()[0] for x in u.split(',') if x.strip()] if 'srcset' in attr.lower() else [u]:
                if EXTERNAL.match(u1):
                    err(n, 'fichier chargé depuis un autre site : %s' % u1)
                elif not os.path.exists(os.path.join(R, u1.split('#')[0].split('?')[0])):
                    err(n, 'fichier introuvable : %s' % u1)
    for a in re.findall(r'<a\b[^>]*>', t, I):
        href = re.search(r'\bhref\s*=\s*"([^"]*)"', a, I)
        if href and href.group(1).strip().lower().startswith('http://'):
            err(n, 'lien non chiffré (http://) : %s' % href.group(1))
        if re.search(r'target\s*=\s*["\']?_blank', a, I) and 'noopener' not in a.lower():
            err(n, 'lien ouvert dans un nouvel onglet sans rel="noopener" : %s' % a[:80])
    for f in re.findall(r'<form\b[^>]*>', t, I):
        if re.search(r'\baction\s*=', f, I):
            err(n, 'formulaire qui envoie des données (action=…) : les formulaires du site ne doivent rien envoyer eux-mêmes')

# Scripts et styles du site
scripts = [p for p in walk('.js') + walk('.mjs') if not p.startswith('outils' + os.sep)]
for n in scripts:
    if not n.startswith('assets' + os.sep):
        err(n, 'script hors de assets/')
    t = read(n)
    for pat, what in ((r'\beval\s*\(', 'eval('), (r'\bnew\s+Function\b', 'new Function'), (r'document\.write', 'document.write'),
                      (r'setTimeout\s*\(\s*[\'"`]', 'setTimeout avec du texte'), (r'\bimportScripts\b', 'importScripts')):
        if re.search(pat, t):
            err(n, 'construction dangereuse : %s' % what)
    for u in re.findall(r'fetch\(\s*[\'"]([^\'"]*)', t) + re.findall(r'\.src\s*=\s*[\'"]([^\'"]*)', t):
        if EXTERNAL.match(u):
            err(n, 'le script appelle un autre site : %s' % u)
for n in walk('.css'):
    t = read(n)
    for u in re.findall(r'url\(\s*[\'"]?([^)\'"]+)', t):
        if EXTERNAL.match(u) or u.startswith('data:'):
            err(n, 'la feuille de style charge un fichier hors du site : %s' % u[:60])
    if re.search(r'@import', t):
        err(n, '@import dans une feuille de style')

# Fichiers de contenu : du texte, des liens https, des images du site
LINKS = ('site', 'video', 'linkedin')
IMAGES = ('photo', 'logo', 'image')
for p in sorted(glob.glob(os.path.join(R, 'contenu', '*.json'))):
    n = 'contenu/' + os.path.basename(p)
    try:
        rows = json.load(open(p, encoding='utf-8'))
    except ValueError as e:
        err(n, 'fichier illisible (virgule ou guillemet en trop ?) : %s' % e)
        continue
    if not isinstance(rows, list):
        err(n, 'le fichier doit être une liste [ … ]')
        continue
    for i, r in enumerate(rows):
        if not isinstance(r, dict):
            err(n, 'élément %d : doit être un bloc { … }' % (i + 1))
            continue
        who = '%s, « %s »' % (n, str(r.get('title', i + 1))[:40])
        for k, v in r.items():
            if not isinstance(v, str) or not v.strip():
                continue
            if re.search(r'<\s*/?\s*(script|iframe|img|svg|object|embed|link|style|a|base|form|meta)\b', v, re.I):
                err(who, 'le champ « %s » contient du code : seul du texte est attendu' % k)
            if k in LINKS and not v.strip().lower().startswith('https://'):
                err(who, 'le lien « %s » doit commencer par https://' % k)
            if k in IMAGES:
                if not re.match(r'^assets/[\w\-./]+$', v.strip()) or '..' in v:
                    err(who, 'l’image « %s » doit être un fichier du site, dans assets/' % k)
                elif not os.path.exists(os.path.join(R, v.strip())):
                    err(who, 'image introuvable : %s' % v.strip())
        if n.endswith('reglages.json') and r.get('title') in ('instagram', 'linkedin', 'youtube', 'lienBilletterie'):
            for v in (str(r.get('valeur') or '').strip(), str(r.get('valeurEn') or '').strip()):
                if v and not v.lower().startswith('https://'):
                    err(who, 'le lien doit commencer par https://')
        if n.endswith('reglages.json') and r.get('title') == 'email':
            for k, v in (('valeur', str(r.get('valeur') or '').strip()), ('valeurEn', str(r.get('valeurEn') or '').strip())):
                if (v or k == 'valeur') and not re.match(r'^[^\s@<>"\'?&,;:]+@[^\s@<>"\'?&,;:]+\.[a-z]{2,}$', v, re.I):
                    err(who, 'adresse e-mail invalide')

# Fichier de signalement : présent, et pas périmé
try:
    sec = read('.well-known/security.txt')
    m = re.search(r'^Expires:\s*(\d{4})-(\d{2})-(\d{2})', sec, re.M)
    if not m or 'Contact:' not in sec:
        err('.well-known/security.txt', 'il manque la ligne Contact ou Expires')
    else:
        left = (datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3))) - datetime.date.today()).days
        if left < 0:
            err('.well-known/security.txt', 'date Expires dépassée : la repousser d’un an')
        elif left < 30:
            err('.well-known/security.txt', 'expire dans %d jours : repousser la date Expires d’un an' % left)
except OSError:
    err('.well-known/security.txt', 'fichier absent')
for need in ('.nojekyll', 'SECURITY.md', 'robots.txt'):
    if not os.path.exists(os.path.join(R, need)):
        err(need, 'fichier absent')

for e in errors:
    print('ERREUR  ' + e)
print('%d pages, %d scripts, %d fichiers de contenu contrôlés : %s' % (
    len(pages), len(scripts), len(glob.glob(os.path.join(R, 'contenu', '*.json'))),
    'aucune erreur' if not errors else '%d erreur(s)' % len(errors)))
sys.exit(1 if errors else 0)
