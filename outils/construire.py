"""Reconstruit les pages du jeu et applique les finitions communes à toutes les pages.

    python3 outils/construire.py          pages du jeu + finitions (quelques secondes)
    python3 outils/construire.py --pdf    refait aussi le kit à imprimer (PDF)

À relancer après toute modification de outils/jeu/source.html (texte d'une carte, d'une règle…)
ou des fichiers de outils/jeu. Sans risque : relancé deux fois, il donne le même résultat.
Besoins : Python 3 ; pour le PDF, en plus : playwright (avec Chromium) et pdfinfo (poppler).
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def run(*path):
    print('→', os.path.join(*path))
    subprocess.run([sys.executable, os.path.join(HERE, *path)], check=True)


run('jeu', 'extract.py')            # découpe la page d'origine du jeu en fragments
if '--pdf' in sys.argv:
    run('jeu', 'kit_pdf.py')        # assets/jeu/affaire-ombreval-kit-a-imprimer.pdf
run('jeu', 'pages.py')              # jeu-regle, jeu-plateau, jeu-cartes, jeu-enquete, assets/jeu.css, assets/jeu.js
run('jeu', 'presentation.py')       # jeu.html
run('finitions.py')                 # règle de sécurité, icônes, titres : sur toutes les pages
print('Terminé.')
