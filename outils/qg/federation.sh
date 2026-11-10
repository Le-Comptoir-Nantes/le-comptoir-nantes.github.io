#!/bin/bash
# QG du Comptoir : autorise l'envoyeur de notifications (workflow GitHub qg-notifications) à utiliser
# Firestore et Firebase Cloud Messaging, SANS CLÉ, par la fédération d'identité de Google Cloud.
# À lancer une seule fois dans Cloud Shell (shell.cloud.google.com), connecté au compte du président.
# Peut être relancé sans risque : chaque étape vérifie si elle est déjà faite.
set -u
P=qg-le-comptoir
N=139731513780
DEPOT=Le-Comptoir-Nantes/le-comptoir-nantes.github.io
SA=qg-notifications@$P.iam.gserviceaccount.com

echo "1/5 Services Google nécessaires"
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com --project "$P" --quiet

echo "2/5 Compte de service qg-notifications"
if ! gcloud iam service-accounts describe "$SA" --project "$P" >/dev/null 2>&1; then
  gcloud iam service-accounts create qg-notifications --project "$P" --display-name "QG - envoi des notifications" --quiet
  sleep 15
fi

echo "3/5 Rôles : lecture/écriture Firestore et envoi de notifications"
for ROLE in roles/datastore.user roles/firebasecloudmessaging.admin; do
  for i in 1 2 3 4 5; do
    gcloud projects add-iam-policy-binding "$P" --member "serviceAccount:$SA" --role "$ROLE" --condition=None --format=none --quiet && break
    sleep 10
  done
done

echo "4/5 Fédération d'identité : uniquement le dépôt du club, branche main"
gcloud iam workload-identity-pools describe github --project "$P" --location global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create github --project "$P" --location global --display-name "GitHub du club" --quiet
gcloud iam workload-identity-pools providers describe depot --project "$P" --location global --workload-identity-pool github >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc depot --project "$P" --location global --workload-identity-pool github \
    --display-name "Depot du site" --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition "assertion.repository=='$DEPOT' && assertion.ref=='refs/heads/main'" --quiet

echo "5/5 Le dépôt du club peut agir au nom de qg-notifications"
gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$P" --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$N/locations/global/workloadIdentityPools/github/attribute.repository/$DEPOT" \
  --format=none --quiet

echo
gcloud iam workload-identity-pools providers describe depot --project "$P" --location global --workload-identity-pool github --format="value(state)" | grep -q ACTIVE \
  && echo "FEDERATION-OK : l'envoyeur peut fonctionner sans clé." || echo "FEDERATION-INCOMPLETE : relancer le script."
