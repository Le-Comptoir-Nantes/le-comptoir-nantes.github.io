#!/usr/bin/env python3
"""Tests de l'envoyeur de notifications du QG (sans réseau) : python3 outils/qg/test_notifier.py"""
import datetime as dt
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from notifier import PARIS, notifications  # noqa: E402

maintenant = dt.datetime(2026, 11, 11, 16, 5, tzinfo=PARIS)          # mercredi 16h05
ms = lambda d: int(d.timestamp() * 1000)
avant = maintenant - dt.timedelta(minutes=10)
ev = {'comptoir': {'titre': 'Comptoir du mercredi', 'type': 'comptoir', 'date': '2026-11-11', 'debut': '18:00', 'fin': '20:00',
                   'lieu': 'Bar à annoncer', 'repetition': 'hebdo', 'exceptions': {'2026-11-11': {'lieu': 'Le Lieu Unique'}}, 'majLe': ms(avant)},
      'reunion': {'titre': 'Réunion du club', 'date': '2026-11-12', 'debut': '15:00', 'repetition': 'hebdo', 'exceptions': {}, 'majLe': 1}}

# 1er passage : rien n'est envoyé, l'existant est noté
envois, etat = notifications({}, ev, {}, maintenant)
assert envois == [] and etat['connus'] == ['comptoir', 'reunion'], etat

# Passage suivant : une annonce, un rendez-vous modifié, un rappel (18h00 dans 1 h 55)
etat0 = {'annoncesDepuis': ms(avant) - 1, 'evenementsDepuis': ms(avant) - 1, 'connus': ['comptoir', 'reunion'], 'rappels': []}
ann = {'a1': {'texte': 'Le Comptoir de ce soir a lieu au Lieu Unique !', 'creeLe': ms(avant)}}
envois, etat = notifications(ann, ev, etat0, maintenant)
titres = [e['titre'] for e in envois]
assert titres[0] == 'Nouvelle annonce · Le Comptoir', titres
assert titres[1] == 'Rendez-vous modifié : Comptoir du mercredi', titres
assert envois[1]['corps'] == 'Mercredi 11 novembre · 18h00 · Le Lieu Unique', envois[1]['corps']
assert titres[2] == 'Dans 1 h 55 : Comptoir du mercredi' and envois[2]['corps'] == '18h00 · Le Lieu Unique', envois[2]
assert len(envois) == 3

# Rien ne repart au passage d'après
envois2, _ = notifications(ann, ev, etat, maintenant + dt.timedelta(minutes=5))
assert envois2 == [], envois2

# Date annulée : pas de rappel ; nouveau rendez-vous annoncé comme « nouveau »
ev['comptoir']['exceptions']['2026-11-11'] = {'annule': True}
ev['sortie'] = {'titre': 'Visite du tribunal de commerce', 'date': '2026-11-20', 'debut': '09:30', 'lieu': 'Tribunal de commerce', 'majLe': ms(maintenant)}
envois3, _ = notifications({}, ev, dict(etat, evenementsDepuis=ms(avant), rappels=[]), maintenant)
assert [e['titre'] for e in envois3] == ['Nouveau rendez-vous : Visite du tribunal de commerce'], envois3
assert envois3[0]['corps'] == 'Vendredi 20 novembre · 09h30 · Tribunal de commerce'
print('notifier : tous les tests passent')
