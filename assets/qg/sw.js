/* QG du Comptoir : affiche les notifications envoyées par outils/qg/notifier.py
   (nouvelle annonce, rendez-vous ajouté ou modifié, rappel 2 h avant).
   Ce fichier ne met rien en cache et ne charge aucun autre script. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (_) { p = {}; }
  const d = p.data || {}, n = p.notification || {};
  const titre = d.titre || n.title || "QG du Comptoir";
  const options = {
    body: d.corps || n.body || "",
    icon: "icone-192.png",
    badge: "icone-192.png",
    lang: "fr",
    data: { url: d.url || "../../qg.html" }
  };
  if (d.tag) options.tag = d.tag;
  e.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const cible = new URL((e.notification.data && e.notification.data.url) || "../../qg.html", self.location.href).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(fenetres => {
    for (const f of fenetres) {
      if (f.url.split("#")[0] === cible.split("#")[0] && "focus" in f) return f.focus();
    }
    return self.clients.openWindow(cible);
  }));
});
