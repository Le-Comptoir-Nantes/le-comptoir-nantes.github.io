# Sécurité du site

## Signaler un problème

Écrivez à **jblucas.denis@audencia.com** avec l'adresse de la page et ce que vous avez observé. Merci de ne pas publier le problème avant d'avoir eu une réponse du club.

*Found a security issue? Email the address above with the page and what you observed. Please wait for a reply before disclosing it.*

## Ce que le site fait, et ne fait pas

- Le site est fait de fichiers statiques servis par GitHub Pages. Il n'a ni compte, ni mot de passe, ni base de données, ni paiement.
- Il n'enregistre aucune donnée de visiteur : les formulaires préparent un e-mail dans la messagerie du visiteur.
- Ses pages ne chargent aucun fichier d'un autre site : ni script, ni police, ni image, ni vidéo.

## Les protections en place

| Protection | Où |
| --- | --- |
| Règle de sécurité du navigateur (`Content-Security-Policy`) sur chaque page : seuls les fichiers du site sont chargés, aucun script écrit dans une page ne s'exécute | Définie dans `outils/regle.py`, posée par `outils/finitions.py` |
| Les contenus des fichiers `contenu/*.json` sont affichés comme du texte, jamais comme du code ; leurs liens doivent commencer par `https://`, leurs images être dans `assets/` | `assets/site.js` |
| Affiché dans le cadre d'un autre site, le site se remplace par un simple lien vers lui-même. GitHub Pages ne permet pas de l'interdire tout à fait : un cadre qui coupe les scripts montre encore le texte brut des pages, sans menu ni formulaire utilisable | `assets/site.js` |
| Contrôle automatique à chaque publication, et chaque lundi. Il n'empêche pas la publication : s'il échoue, GitHub prévient le propriétaire du dépôt par e-mail | `outils/verifier.py`, lancé par `.github/workflows/verifier.yml` |

## Pour le bureau : ce qui protège vraiment le site

Le site vaut ce que vaut le compte GitHub qui le publie. Quiconque peut écrire dans ce dépôt peut changer le site.

1. **Validation en deux étapes** activée sur le compte GitHub du club, codes de secours rangés en lieu sûr.
2. **Aucune application tierce** avec un droit d'écriture sur ce dépôt, sauf celles dont le bureau se sert réellement. À revoir dans *Settings → Applications* du compte.
3. **Le dépôt reste public, la branche `main` protégée** contre la suppression et la réécriture de l'historique (*Settings → Rules*).
4. **Un seul propriétaire ne suffit pas** : un second membre du bureau doit pouvoir reprendre le compte.
5. Avant de publier : `python3 outils/verifier.py` ne doit signaler aucune erreur.

## À renouveler

Le fichier `.well-known/security.txt` porte une date d'expiration (`Expires`). Un mois avant, le contrôle automatique échoue et le signale : il suffit alors de repousser la date d'un an.

GitHub suspend le contrôle du lundi quand le dépôt reste soixante jours sans modification. Le contrôle lancé à chaque publication, lui, continue.
