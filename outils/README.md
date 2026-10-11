# Outils de fabrication

Ce dossier ne sert pas aux visiteurs : il fabrique les pages du jeu et, pour le bureau seulement, le kit à imprimer.

## Le jeu « L'Affaire Ombreval »

Tout le jeu (règle, plateau, 282 cartes, fiches, billets, boîte) vient d'un seul fichier : `jeu/source.txt`.
Les pages `jeu-regle.html`, `jeu-plateau.html`, `jeu-cartes.html`, `jeu-enquete.html`, `jeu.html`, et les fichiers `assets/jeu.css` et `assets/jeu.js` sont **fabriqués** à partir de lui. Ne pas les modifier à la main : la modification serait perdue à la fabrication suivante.

Les deux fichiers source portent l'extension `.txt` alors qu'ils contiennent du HTML : c'est voulu. Tout le dépôt est publié par GitHub Pages, et un fichier `.txt` est servi comme du texte, sans être affiché comme une page ni charger quoi que ce soit.

Pour corriger une carte, une règle ou une case :

1. Modifier le texte dans `jeu/source.txt` (chercher le texte de la carte).
2. Lancer `python3 outils/construire.py`.
3. Vérifier la page, puis publier.

**Le jeu ne se télécharge pas sur le site.** Pour le voir, le visiteur écrit au bureau (formulaire en bas de `jeu.html`). Le kit à imprimer reste fabricable pour l'exemplaire du club : `python3 outils/construire.py --pdf` l'écrit dans `outils/jeu/tmp/affaire-ombreval-kit-a-imprimer.pdf`. Ce dossier est ignoré par Git : le PDF reste sur l'ordinateur et n'est jamais mis en ligne. Ne pas le copier dans `assets/`.

| Fichier | Rôle |
| --- | --- |
| `construire.py` | La commande unique. Sans `--pdf`, refait les pages en quelques secondes ; avec, fabrique aussi le kit à imprimer du bureau (hors du site) |
| `jeu/source.txt` | La page d'origine du jeu : textes des cartes, règle, plateau, pièces |
| `jeu/extract.py` | Découpe la source en morceaux, pose les apostrophes et les espaces insécables |
| `jeu/pages.py` | Écrit les quatre pages du jeu, `assets/jeu.css` et `assets/jeu.js` |
| `jeu/presentation.py` | Écrit `jeu.html` à partir de `jeu/presentation-base.txt`, avec l'espace de contact « Voir le jeu » |
| `jeu/kit_pdf.py` | Écrit le PDF A4 du bureau dans `jeu/tmp/` : règle, plateau en quatre quarts, cartes à neuf par page, dos, billets, pions, fiches |
| `jeu/layout.css`, `jeu/jeu.js` | Mise en page et fonctionnement des pages du jeu (copiés dans `assets/`) |
| `verifier.py` | Contrôle de sécurité : ne modifie rien, signale ce qui affaiblirait le site (fichier chargé ailleurs, script dans une page, règle de sécurité modifiée, lien piégé dans un contenu) |
| `finitions.py` | Sur **toutes** les pages du site : règle de sécurité, couleur de thème, polices préchargées, icône, menu de secours sans JavaScript |

Besoins : Python 3. Pour le PDF, en plus : `playwright` avec Chromium (`pip install playwright` puis `playwright install chromium`) et `pdfinfo` (paquet `poppler`).

## Après avoir créé ou modifié une page du site

Lancer `python3 outils/finitions.py`, puis `python3 outils/verifier.py`. Les deux peuvent être relancés autant de fois que nécessaire.
