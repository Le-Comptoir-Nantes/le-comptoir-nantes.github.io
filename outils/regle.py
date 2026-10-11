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
