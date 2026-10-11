# Le Comptoir · site du club

Site du **Comptoir**, club étudiant du Bachelor in Management d'Audencia (City Campus, Nantes).
En ligne : <https://le-comptoir-nantes.github.io/>

Le site est fait de pages HTML simples, sans base de données ni service extérieur. Il est hébergé gratuitement par GitHub Pages : **tout ce qui est enregistré sur la branche `main` est en ligne une à deux minutes plus tard.**

## Modifier le site

| Je veux… | Où aller |
| --- | --- |
| Changer un événement, une fiche du bureau, un article du merch, un partenaire, un réglage (contact, cotisation, réseaux) | Dossier [`contenu/`](contenu/README.md) : un fichier par rubrique, mode d'emploi dedans |
| Ajouter une photo, un portrait, un logo | Dossier `assets/` (`assets/bureau/`, `assets/partenaires/`, `assets/photos/`), puis le chemin dans le fichier de `contenu/` |
| Changer un texte fixe d'une page | Le fichier `.html` de la page. Le texte français est entre les balises, sa traduction dans l'attribut `data-en` juste à côté |
| Corriger une carte, la règle ou le plateau du jeu | [`outils/`](outils/README.md) : les pages du jeu et le PDF sont fabriqués par un script |

## Ce que contient le dépôt

```
index.html, club.html, evenements.html, bureau.html,      les pages du site
merch.html, partenaires.html, rejoindre.html
jeu.html, jeu-regle.html, jeu-plateau.html,               le jeu « L'Affaire Ombreval »
jeu-cartes.html, jeu-enquete.html                         (pages fabriquées par outils/)
mentions.html, confidentialite.html, conditions.html      pages légales
404.html                                                  page « introuvable »
contenu/                                                  les contenus modifiables (fichiers .json)
assets/site.css, site.js                                  mise en page et fonctionnement du site
assets/motion.css, motion.js                              animations (coupées si le visiteur le demande)
assets/jeu.css, jeu.js, assets/jeu/                       pages du jeu et kit à imprimer (PDF)
assets/fonts/, assets/bureau/                             polices et portraits, hébergés sur le site
outils/                                                   scripts de fabrication (pas utiles aux visiteurs)
sitemap.xml, robots.txt                                   pour les moteurs de recherche
```

## Règles à garder

- **Le dépôt doit rester public.** Avec un compte GitHub gratuit, un dépôt privé coupe le site (erreur 404).
- **Aucun service extérieur** : pas de police Google, pas de mesure d'audience, pas de vidéo intégrée. C'est ce qui permet de se passer de bandeau cookies. Si cela change, la page Confidentialité doit changer aussi.
- **Les formulaires n'enregistrent rien** : ils préparent un e-mail dans la messagerie du visiteur, à l'adresse `email` de `contenu/reglages.json`.
- **Aucune photo d'une personne sans autorisation écrite** : dans les fichiers de `contenu/`, une photo ne s'affiche que si `autorisationPhoto` (ou `autorisation`) vaut `true`.
- **Français et anglais** : tout texte ajouté dans une page a sa traduction dans `data-en`. Les cartes et la règle du jeu restent en français.
- Chaque page porte une règle de sécurité (balise `Content-Security-Policy`) qui interdit les scripts écrits dans la page. Un script va dans `assets/`, jamais dans le HTML. Après avoir créé une page, lancer `python3 outils/finitions.py`.

## Vérifier avant de publier

Ouvrir le site sur son ordinateur :

```
python3 -m http.server 8000
```

puis <http://localhost:8000> dans le navigateur. Regarder la page modifiée sur ordinateur et sur téléphone, en français et en anglais (bouton EN).

Si une rubrique affiche « Ce contenu ne se charge pas » : une virgule ou un guillemet a sauté dans un fichier de `contenu/`. L'historique du fichier sur GitHub (**History**) permet de revenir à la version précédente.
