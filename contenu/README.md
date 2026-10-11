# Modifier les contenus du site

Tous les contenus qui changent (événements, bureau, merch, partenaires, sujets de débat, réglages) sont dans ce dossier, un fichier par rubrique. Le site ne dépend d'aucun autre service.

## Comment modifier

1. Sur GitHub, ouvre le fichier à modifier (par exemple `evenements.json`).
2. Clique sur le crayon en haut à droite du fichier.
3. Change le texte **entre les guillemets**, sans toucher aux guillemets, aux virgules ni aux accolades.
4. Clique sur **Commit changes**. Le site se met à jour en une à deux minutes.

Si une rubrique affiche « Ce contenu ne se charge pas » après une modification, c'est qu'une virgule ou un guillemet a sauté dans le fichier : dans l'historique du fichier (**History**), reviens à la version précédente.

## Les fichiers

| Fichier | Rubrique | À savoir |
| --- | --- | --- |
| `reglages.json` | Contact, cotisation, prix du billet, prochain rendez-vous, liens des réseaux | Une ligne `note` explique chaque réglage. Un lien laissé vide (`""`) masque le bouton correspondant. |
| `evenements.json` | Billets de la page Événements et de l'accueil | `type` : `Comptoir`, `Meet and Talk`, `Sortie Terrain` ou `Conférence`. Pour une vraie date, ajoute `"date": "2026-11-04T18:00:00"` : l'événement passe alors tout seul dans les événements passés. Champs facultatifs : `lieu`, `intervenant`, `cours`, `video`. |
| `bureau.json` | Fiches du bureau | La photo ne s'affiche que si `"autorisationPhoto": true`. Dans `parcours`, `faits` et `expertises`, `\n` marque un retour à la ligne. |
| `merch.json` | Articles de la page Merch | `"afficher": false` masque un article. `prixMembre` et `prixPublic` vides affichent « Prix à venir ». |
| `partenaires.json` | « Ils accompagnent le club » | Vide pour l'instant. N'y ajoute un partenaire qu'une fois sa convention signée. |
| `sujets.json` | Sujets tirés au sort sur l'accueil | |
| `photos.json` | Photos d'événements | `evenement` doit reprendre exactement le titre de l'événement ; la photo ne s'affiche que si `"autorisation": true`. |

Les champs qui finissent par `En` (`titleEn`, `resumeEn`…) sont la version anglaise. S'ils manquent, le site affiche le français.

`ordre` fixe l'ordre d'affichage (1 en premier).

## Ajouter un élément

Copie un bloc existant, de son `{` à son `}`, colle-le juste après, et sépare les deux blocs par une virgule. Le dernier bloc de la liste ne prend pas de virgule après son `}`.

Exemple de partenaire :

```json
[
  {
    "ordre": 1,
    "afficher": true,
    "title": "Nom du partenaire",
    "categorie": "Lieu partenaire",
    "description": "Une phrase sur ce qu'il fait avec le club.",
    "site": "https://exemple.fr",
    "logo": "assets/partenaires/nom-du-partenaire.png"
  }
]
```

## Images

Dépose les images dans `assets/` (portraits dans `assets/bureau/`, logos dans `assets/partenaires/`, photos dans `assets/photos/`), puis écris leur chemin dans le fichier, par exemple `"photo": "assets/bureau/lucas-denis.webp"`.

Portraits du bureau attendus : `lucas-denis.webp`, `romain-rabiller.webp`, `felice-maire.webp`, `zoe-podevin.webp`, `adil-moutmir.webp`, `luc-grana.webp`. Tant qu'un portrait manque, le site affiche les initiales à la place.

## Dater un événement

Dès qu'un événement à venir porte une vraie date dans `evenements.json`, le site fait trois choses tout seul :

- il devient le « Prochain rendez-vous » de la page d'accueil (à la place du texte de `reglages.json`) ;
- sa fiche propose un bouton « Ajouter à mon agenda » ;
- il est signalé aux moteurs de recherche comme un événement.

Écris la date avec l'heure, `"date": "2026-11-04T18:30:00"`, et le lieu dans `"lieu"`. Sans heure (`"2026-11-04"`), l'événement est noté sur la journée entière. Une fois la date passée, il rejoint les événements passés.

## Questions fréquentes

Les questions de la page Rejoindre sont écrites dans `rejoindre.html` (bloc `id="faq"`), en français et en anglais, et une seconde fois en haut du fichier pour les moteurs de recherche. Si la cotisation ou le prix du billet change, corrige les trois endroits.

## Formulaires

Les formulaires n'enregistrent rien : ils ouvrent la messagerie du visiteur avec un e-mail prêt à envoyer à l'adresse `email` de `reglages.json`.

## Le jeu « L'Affaire Ombreval »

Le jeu n'est pas dans ce dossier : ses pages et le kit à imprimer sont fabriqués ensemble par un script, pour que les cartes soient identiques sur le site et dans le PDF. Le mode d'emploi est dans [`outils/README.md`](../outils/README.md).

| Page | Contenu |
| --- | --- |
| `jeu.html` | Présentation du jeu |
| `jeu-regle.html` | Règle complète |
| `jeu-plateau.html` | Plateau, matériel et boîte |
| `jeu-cartes.html` | Les 282 cartes, avec le mode révision |
| `jeu-enquete.html` | Scénario de l'enquête |
| `assets/jeu/affaire-ombreval-kit-a-imprimer.pdf` | Kit à imprimer (A4) |

Pour corriger une carte ou un point de règle : modifie `outils/jeu/source.txt`, puis lance `python3 outils/construire.py --pdf` (ou demande la modification).

## Sécurité du site

Chaque page porte une règle de sécurité (balise `Content-Security-Policy`, en haut du fichier) : le site ne charge que ses propres fichiers : scripts, styles, polices et images. Rien ne vient d'un autre site.

Conséquence : une vidéo YouTube intégrée, un widget Instagram ou un outil de mesure d'audience ne s'afficheront pas tant que cette règle n'aura pas été élargie. Ces ajouts demandent aussi un bandeau cookies : demande la modification plutôt que de coller un code d'intégration.

Les liens écrits dans les fichiers de ce dossier (`linkedin`, `site`, `video`, réseaux) doivent commencer par `https://`, sinon ils ne sont pas affichés. Les images sont toujours des fichiers du site, rangés dans `assets/` : l'adresse d'une image hébergée ailleurs n'est pas affichée.

Avant de publier une modification, `python3 outils/verifier.py` relit les pages et les fichiers de ce dossier et signale ce qui affaiblirait la sécurité du site. GitHub le lance aussi tout seul à chaque publication : s'il échoue, le propriétaire du dépôt reçoit un e-mail.

## Plan du site

Le fichier `sitemap.xml` liste les pages à faire connaître aux moteurs de recherche. Les pages légales n'y sont pas, volontairement.
