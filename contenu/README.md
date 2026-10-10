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

## Formulaires

Les formulaires n'enregistrent rien : ils ouvrent la messagerie du visiteur avec un e-mail prêt à envoyer à l'adresse `email` de `reglages.json`.
