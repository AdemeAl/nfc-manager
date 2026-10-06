// Service worker minimal : aucune mise en cache, pour ne jamais afficher
// d'anciennes stats ni stocker de données privées sur l'appareil.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
