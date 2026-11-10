/* QG du Comptoir : branchement au projet Firebase du club.
   Ces valeurs ne sont pas secrètes (elles identifient le projet) : ce sont les règles Firestore
   (outils/qg/firestore.rules) qui réservent les données aux adresses du bureau.
   À remplir avec la configuration donnée par la console Firebase (Paramètres du projet > Vos applications). */
window.QG_FIREBASE = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
  /* Le président : toujours administrateur, même s'il n'est pas dans la liste des accès. Doit être identique dans firestore.rules. */
  proprietaire: "jblucas.denis@audencia.com"
};
