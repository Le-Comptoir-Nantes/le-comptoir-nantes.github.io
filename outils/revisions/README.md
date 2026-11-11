# Révisions : fabrication des fiches et des quiz

Scripts utilisés pour préparer les fiches et les quiz des cours avant de les publier dans l'onglet Révisions du QG.
**Aucun contenu de cours n'est rangé ici** : le dépôt est public. Le contenu de chaque cours (`content.py` : `COURSE`, `FICHES`, `END`, `QUIZ`) reste sur l'ordinateur de travail.

| Script | Rôle |
| --- | --- |
| `fiches_quiz.py <dossier>` | Lit `<dossier>/content.py`, contrôle le quiz (4 propositions distinctes, pas d'intitulé en double, aucune explication qui cite une position) et écrit `fiches.html` et `quiz.html` (pages autonomes, style fiches manuscrites). |
| `vers_qg.py <dossier> <id> <matière> <ordre>` | Convertit le même contenu au format de la collection `revisions` du QG (fiches au format riche avec les classes `f-*` de `assets/qg/qg.css`, quiz avec parties et questions). |

Publication dans le QG : un membre du bureau connecté au QG écrit les deux documents dans la collection `revisions` (identifiants `fiches-<cours>-abm1` et `quiz-<cours>-abm1`, champ `matiere` pour le regroupement). Les règles Firestore réservent l'écriture au bureau.
