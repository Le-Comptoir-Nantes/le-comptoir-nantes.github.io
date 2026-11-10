/* QG du Comptoir : branchement au projet Firebase du club.
   Ces valeurs ne sont pas secrètes (elles identifient le projet) : ce sont les règles Firestore
   (outils/qg/firestore.rules) qui réservent les données aux adresses du bureau.
   Projet Firebase « QG Le Comptoir » (qg-le-comptoir), base Firestore en Europe (eur3). */
window.QG_FIREBASE = {
  apiKey: "AIzaSyB6Q1TO78MMXg391049_E3vKm8E0Ptlm7c",
  authDomain: "qg-le-comptoir.firebaseapp.com",
  projectId: "qg-le-comptoir",
  appId: "1:139731513780:web:8c6f18441d4d2dfb3982e1",
  /* Le président : toujours administrateur, même s'il n'est pas dans la liste des accès. Doit être identique dans firestore.rules. */
  proprietaire: "jblucas.denis@audencia.com"
};
