/* Carte des tables — fonctionnement hors connexion.
   Change le numéro de version ci-dessous après chaque modification
   de l'application, pour forcer la mise à jour sur ton téléphone. */

var VERSION = 'tables-v5';

var COQUILLE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icone-192.png',
  './icone-512.png',
  './icone-180.png',
  './logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700&display=swap'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (cache) {
      // addAll échoue en bloc si une seule ressource manque : on tolère les absences
      return Promise.all(COQUILLE.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (cles) {
      return Promise.all(cles.map(function (c) {
        if (c !== VERSION) return caches.delete(c);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = e.request.url;

  // Recherche de lieux : jamais de cache, ça doit être frais ou échouer proprement
  if (url.indexOf('photon.komoot.io') !== -1 || url.indexOf('nominatim.openstreetmap.org') !== -1) {
    return;
  }

  // Tuiles de carte : on sert le cache d'abord, sinon le réseau
  if (url.indexOf('basemaps.cartocdn.com') !== -1) {
    e.respondWith(
      caches.match(e.request).then(function (r) {
        return r || fetch(e.request).then(function (reponse) {
          var copie = reponse.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, copie); });
          return reponse;
        }).catch(function () { return new Response('', { status: 504 }); })
      })
    );
    return;
  }

  // Le reste : cache d'abord, réseau en secours
  e.respondWith(
    caches.match(e.request).then(function (r) {
      return r || fetch(e.request);
    })
  );
});
