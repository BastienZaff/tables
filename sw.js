/* Dévoreur Explorer — fonctionnement hors connexion.
   Change le numéro de version ci-dessous après chaque modification. */

var VERSION = 'tables-v45';

var COQUILLE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo.png',
  './ravioli.png',
  './icone-192.png',
  './icone-512.png',
  './icone-180.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700&display=swap'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (cache) {
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

  if (url.indexOf('photon.komoot.io') !== -1 || url.indexOf('nominatim.openstreetmap.org') !== -1) {
    return;
  }

  var estPage = e.request.mode === 'navigate' ||
                url.indexOf('index.html') !== -1 ||
                url.indexOf('manifest.webmanifest') !== -1;

  /* La page elle-même : le réseau d'abord, pour toujours avoir la dernière version.
     Le cache ne sert que si la connexion manque. */
  if (estPage) {
    e.respondWith(
      fetch(e.request).then(function (reponse) {
        var copie = reponse.clone();
        caches.open(VERSION).then(function (c) { c.put(e.request, copie); });
        return reponse;
      }).catch(function () {
        return caches.match(e.request).then(function (r) {
          return r || caches.match('./index.html');
        });
      })
    );
    return;
  }

  if (url.indexOf('basemaps.cartocdn.com') !== -1 || url.indexOf('arcgisonline.com') !== -1) {
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

  e.respondWith(
    caches.match(e.request).then(function (r) {
      return r || fetch(e.request);
    })
  );
});
