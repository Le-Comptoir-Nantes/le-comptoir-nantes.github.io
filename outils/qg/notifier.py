#!/usr/bin/env python3
"""QG du Comptoir : envoie les notifications aux appareils inscrits.

Lancé toutes les 5 minutes par .github/workflows/qg-notifications.yml. À chaque passage :
  - nouvelle annonce publiée            -> « Nouvelle annonce »
  - rendez-vous ajouté ou modifié       -> « Nouveau rendez-vous » / « Rendez-vous modifié »
  - rendez-vous qui commence dans 2 h   -> rappel (une seule fois par date)
Les notifications partent vers les appareils (collection « jetons ») dont l'adresse a encore un accès.

Clé : la variable QG_FIREBASE_SA contient la clé du compte de service Firebase (fichier JSON),
rangée dans les secrets GitHub du dépôt. Sans elle, le script ne fait rien.
Ce qui a déjà été envoyé est noté dans le document Firestore notifs/etat.
"""
import datetime as dt
import json
import os
import sys
import time
from urllib.parse import quote
from zoneinfo import ZoneInfo

PROJET = 'qg-le-comptoir'
PRESIDENT = 'jblucas.denis@audencia.com'
APPLI = 'https://le-comptoir-nantes.github.io/qg.html'
PARIS = ZoneInfo('Europe/Paris')
RAPPEL = dt.timedelta(hours=2)
BASE = 'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents' % PROJET
JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
        'septembre', 'octobre', 'novembre', 'décembre']


# ---------- Lecture des valeurs Firestore ----------
def valeur(v):
    if 'stringValue' in v: return v['stringValue']
    if 'integerValue' in v: return int(v['integerValue'])
    if 'doubleValue' in v: return v['doubleValue']
    if 'booleanValue' in v: return v['booleanValue']
    if 'nullValue' in v: return None
    if 'timestampValue' in v: return v['timestampValue']
    if 'mapValue' in v: return {k: valeur(x) for k, x in v['mapValue'].get('fields', {}).items()}
    if 'arrayValue' in v: return [valeur(x) for x in v['arrayValue'].get('values', [])]
    return None


def document(d):
    return d['name'].rsplit('/', 1)[1], {k: valeur(x) for k, x in d.get('fields', {}).items()}


# ---------- Rendez-vous ----------
def heure(h):
    try:
        hh, mm = (h or '').split(':')[:2]
        return dt.time(int(hh), int(mm))
    except ValueError:
        return None


def joli_jour(d):
    return '%s %d %s' % (JOURS[d.weekday()], d.day, MOIS[d.month - 1])


def occurrences(ev, debut, fin):
    """Dates du rendez-vous entre deux instants (heure de Paris), exceptions comprises."""
    try:
        base = dt.date.fromisoformat(ev.get('date') or '')
    except ValueError:
        return []
    jusqua = None
    if ev.get('jusqua'):
        try: jusqua = dt.date.fromisoformat(ev['jusqua'])
        except ValueError: jusqua = None
    dates = []
    if ev.get('repetition') == 'hebdo':
        d = base
        if d < debut.date():
            d += dt.timedelta(weeks=max(0, (debut.date() - d).days // 7 - 1))
        while d <= fin.date() and (jusqua is None or d <= jusqua):
            dates.append(d); d += dt.timedelta(weeks=1)
    elif debut.date() <= base <= fin.date():
        dates.append(base)
    out = []
    for d in dates:
        ex = (ev.get('exceptions') or {}).get(d.isoformat()) or {}
        if ex.get('annule'):
            continue
        h = heure(ex.get('debut') or ev.get('debut')) or dt.time(0, 0)
        quand = dt.datetime.combine(d, h, tzinfo=PARIS)
        if debut <= quand <= fin:
            out.append({'cle': d.isoformat(), 'quand': quand, 'heure': h,
                        'lieu': ex.get('lieu') or ev.get('lieu') or 'lieu à annoncer'})
    return out


def prochaine(ev, maintenant):
    o = occurrences(ev, maintenant - dt.timedelta(hours=2), maintenant + dt.timedelta(days=120))
    return o[0] if o else None


def resume(ev, o):
    if not o:
        return 'Voir le détail dans l\'agenda du QG.'
    return '%s · %s · %s' % (joli_jour(o['quand'].date()).capitalize(), o['heure'].strftime('%Hh%M'), o['lieu'])


def notifications(annonces, evenements, etat, maintenant):
    """Liste des notifications à envoyer et nouvel état. Fonction pure, testée par outils/qg/test_notifier.py."""
    ms = int(maintenant.timestamp() * 1000)
    if not etat:   # tout premier passage : on note l'existant sans rien envoyer
        return [], {'annoncesDepuis': ms, 'evenementsDepuis': ms, 'connus': sorted(evenements), 'rappels': []}
    envois = []
    nouvel = dict(etat)
    # Annonces
    depuis = etat.get('annoncesDepuis', ms)
    for aid, a in sorted(annonces.items(), key=lambda x: x[1].get('creeLe') or 0):
        if (a.get('creeLe') or 0) > depuis:
            texte = ' '.join((a.get('texte') or '').split())
            envois.append({'titre': 'Nouvelle annonce · Le Comptoir',
                           'corps': texte[:180] + ('…' if len(texte) > 180 else ''),
                           'tag': 'annonce-' + aid, 'url': APPLI + '#annonces'})
            nouvel['annoncesDepuis'] = max(nouvel.get('annoncesDepuis', 0), a.get('creeLe') or 0)
    # Rendez-vous ajoutés ou modifiés
    connus = set(etat.get('connus', []))
    depuis = etat.get('evenementsDepuis', ms)
    for eid, ev in evenements.items():
        if (ev.get('majLe') or 0) > depuis:
            nouveau = eid not in connus
            envois.append({'titre': ('Nouveau rendez-vous : ' if nouveau else 'Rendez-vous modifié : ') + (ev.get('titre') or 'Le Comptoir'),
                           'corps': resume(ev, prochaine(ev, maintenant)),
                           'tag': 'rdv-' + eid, 'url': APPLI + '#agenda'})
            nouvel['evenementsDepuis'] = max(nouvel.get('evenementsDepuis', 0), ev.get('majLe') or 0)
    nouvel['connus'] = sorted(connus | set(evenements))
    # Rappels 2 h avant
    faits = set(etat.get('rappels', []))
    for eid, ev in evenements.items():
        for o in occurrences(ev, maintenant, maintenant + RAPPEL):
            cle = eid + '_' + o['cle']
            if cle in faits:
                continue
            minutes = max(1, round((o['quand'] - maintenant).total_seconds() / 60))
            dans = ('%d h %02d' % divmod(minutes, 60)) if minutes >= 60 else '%d min' % minutes
            envois.append({'titre': 'Dans %s : %s' % (dans.replace(' 00', ''), ev.get('titre') or 'rendez-vous'),
                           'corps': '%s · %s' % (o['heure'].strftime('%Hh%M'), o['lieu']),
                           'tag': 'rappel-' + cle, 'url': APPLI + '#agenda'})
            faits.add(cle)
    limite = (maintenant - dt.timedelta(days=3)).date().isoformat()
    nouvel['rappels'] = sorted(c for c in faits if c.rsplit('_', 1)[-1] >= limite)
    return envois, nouvel


# ---------- Accès Google ----------
def session():
    import requests
    from google.auth.transport.requests import Request
    from google.oauth2 import service_account
    info = json.loads(os.environ['QG_FIREBASE_SA'])
    cred = service_account.Credentials.from_service_account_info(info, scopes=[
        'https://www.googleapis.com/auth/datastore',
        'https://www.googleapis.com/auth/firebase.messaging'])
    cred.refresh(Request())
    s = requests.Session()
    s.headers['Authorization'] = 'Bearer ' + cred.token
    return s


def lire(s, collection):
    docs, page = {}, None
    while True:
        r = s.get('%s/%s' % (BASE, collection), params={'pageSize': 300, **({'pageToken': page} if page else {})}, timeout=20)
        r.raise_for_status()
        j = r.json()
        for d in j.get('documents', []):
            k, v = document(d); docs[k] = v
        page = j.get('nextPageToken')
        if not page:
            return docs


def main():
    if not os.environ.get('QG_FIREBASE_SA'):
        print('Pas de clé QG_FIREBASE_SA : rien à faire (voir README, « Notifications »).')
        return 0
    s = session()
    maintenant = dt.datetime.now(PARIS)
    annonces, evenements = lire(s, 'annonces'), lire(s, 'evenements')
    r = s.get(BASE + '/notifs/etat', timeout=20)
    etat = json.loads(document(r.json())[1].get('json') or '{}') if r.status_code == 200 else {}
    envois, nouvel = notifications(annonces, evenements, etat, maintenant)

    if envois:
        acces = lire(s, 'acces')
        autorises = {m.lower() for m in acces} | {PRESIDENT}
        jetons = {j: v for j, v in lire(s, 'jetons').items() if (v.get('mail') or '').lower() in autorises}
        print('%d notification(s) vers %d appareil(s)' % (len(envois), len(jetons)))
        perimes = set()
        for n in envois:
            for jeton in jetons:
                if jeton in perimes:
                    continue
                corps = {'message': {'token': jeton, 'data': {k: str(v) for k, v in n.items()},
                                     'webpush': {'headers': {'Urgency': 'high', 'TTL': '86400'}}}}
                r = s.post('https://fcm.googleapis.com/v1/projects/%s/messages:send' % PROJET, json=corps, timeout=20)
                if r.status_code in (400, 404) and ('UNREGISTERED' in r.text or 'NOT_FOUND' in r.text or 'INVALID_ARGUMENT' in r.text):
                    perimes.add(jeton)
                elif r.status_code >= 300:
                    print('Envoi refusé (%d) : %s' % (r.status_code, r.text[:200]))
                time.sleep(0.05)
        for jeton in perimes:   # appareils désinscrits : on les oublie
            s.delete('%s/jetons/%s' % (BASE, quote(jeton, safe='')), timeout=20)
        if perimes:
            print('%d appareil(s) désinscrit(s) retiré(s)' % len(perimes))
    else:
        print('Rien de nouveau.')

    r = s.patch(BASE + '/notifs/etat', json={'fields': {'json': {'stringValue': json.dumps(nouvel)}}}, timeout=20)
    r.raise_for_status()
    return 0


if __name__ == '__main__':
    sys.exit(main())
