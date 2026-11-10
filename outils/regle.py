"""La règle de sécurité du site, à un seul endroit : finitions.py la pose sur chaque page, verifier.py contrôle qu'elle y est, mot pour mot."""
import base64, hashlib

BOOT = '!function(d,w){try{if(w.matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.classList.add("m");w.setTimeout(function(){w.__lcMotion||d.classList.remove("m")},2500)}catch(e){}}(document.documentElement,window)'
H = base64.b64encode(hashlib.sha256(BOOT.encode()).digest()).decode()
# La règle de sécurité (Content-Security-Policy) : le site ne charge que ses propres fichiers.
#  - scripts : les fichiers du site et le seul script d'amorçage ci-dessus (reconnu par son empreinte) ; aucun gestionnaire écrit dans le HTML
#  - styles : les feuilles du site ; les attributs style="…" restent permis (couleurs des cartes), pas les blocs <style>
#  - images, polices, sons, données : le site uniquement ; aucun cadre, aucun module, aucun envoi de formulaire ailleurs
CSP = '; '.join([
    "default-src 'self'",
    "script-src 'self' 'sha256-%s'" % H,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",      # pour les navigateurs qui ne connaissent pas les deux lignes suivantes
    "style-src-elem 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "child-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",                     # la page 404 pose <base href="/"> pour retrouver ses fichiers
    "form-action 'self'",
])

# Le QG du Comptoir (qg.html) : espace réservé au bureau, avec sa propre règle.
# Même règle que le site, sauf « connect-src » qui ouvre la connexion et la base de données Firebase (Google),
# seuls services extérieurs, appelés uniquement depuis cette page.
CSP_QG = '; '.join([
    "default-src 'self'",
    "script-src 'self'",
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "style-src-elem 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
    "media-src 'none'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "child-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
])
PAGES_QG = ('qg.html',)
# Bibliothèque Firebase 10.12.2 (npm « firebase »), hébergée sur le site : reconnue par son empreinte, elle ne doit pas être modifiée
VENDOR = {
    'assets/qg/vendor/firebase-app-compat.js': '24a1fd90a9424647636669f59013201ba385eff82a58f88c76a7d400d4d71139',
    'assets/qg/vendor/firebase-auth-compat.js': '277f6ef70525168247921e7a51fe995ecc66f9c3cf56c97f0d2bc262f74b5906',
    'assets/qg/vendor/firebase-firestore-compat.js': '25133ac64bef210c19384ed72eafdec440c27c02a6b48e9d2b6b48bf7b00ad04',
}
