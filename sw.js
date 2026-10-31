/* ═══════════════════════════════════════════════════════════════════════
   Rilievo misure — service worker
   1) tiene una copia dell'app sul telefono: si apre anche senza linea;
   2) tiene le mappe già viste (fino a 600 riquadri) per riaprirle offline;
   3) quando torna la linea manda a Dropbox i rilievi in coda, anche ad app
      chiusa dove il telefono lo permette (Android/Chrome: Background Sync).
   Per pubblicare una versione nuova basta cambiare VERSIONE: il telefono
   la scarica alla prima apertura con linea e la usa dall'apertura dopo.
   ═══════════════════════════════════════════════════════════════════ */
var VERSIONE = 'rilievo-v3.1.0';
var CACHE_APP = VERSIONE;
var CACHE_MAPPE = 'rilievo-mappe';
var MAX_MAPPE = 600;

var FILE_APP = [
  './',
  'index.html',
  'app.css?v=3.1.0',
  'app.js?v=3.1.0',
  'dbx.js?v=3.1.0',
  'manifest.webmanifest',
  'assets/logo-df-bianco.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'fonts/inter-latin.woff2',
  'fonts/chakrapetch-500-latin.woff2',
  'fonts/chakrapetch-600-latin.woff2',
  'fonts/chakrapetch-700-latin.woff2',
  'vendor/jspdf.umd.min.js',
  'vendor/leaflet/leaflet.js',
  'vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/marker-icon.png',
  'vendor/leaflet/images/marker-icon-2x.png',
  'vendor/leaflet/images/marker-shadow.png',
  'vendor/leaflet/images/layers.png',
  'vendor/leaflet/images/layers-2x.png'
];

importScripts('dbx.js?v=3.1.0');

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE_APP).then(function (c) {
    // cache: 'reload' = prendi i file freschi dal server, non dalla cache HTTP
    return Promise.all(FILE_APP.map(function (u) {
      return fetch(new Request(u, { cache: 'reload' })).then(function (r) {
        if (!r.ok) throw new Error(u + ' ' + r.status);
        return c.put(u, r);
      });
    }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE_APP && k !== CACHE_MAPPE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (e) {
  if (e.data === 'aggiorna-ora') self.skipWaiting();
  if (e.data === 'svuota-coda') e.waitUntil(DFDropbox.svuotaCoda('sw-messaggio'));
});

/* Background Sync: il telefono chiama qui quando torna la linea */
self.addEventListener('sync', function (e) {
  if (e.tag === 'df-invio') {
    e.waitUntil(DFDropbox.svuotaCoda('sync').then(function (r) {
      // se non è andata per mancanza di linea, chiedi al telefono di riprovare
      if (r && r.codice === 'rete' && r.rimasti > 0) throw new Error('riprova');
    }));
  }
});

function eTile(url) { return /(^|\.)tile\.openstreetmap\.org$/.test(url.hostname); }

function limitaMappe() {
  return caches.open(CACHE_MAPPE).then(function (c) {
    return c.keys().then(function (k) {
      if (k.length <= MAX_MAPPE) return;
      return Promise.all(k.slice(0, k.length - MAX_MAPPE).map(function (r) { return c.delete(r); }));
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // riquadri della mappa: prima la copia, poi la rete (e se ne tiene copia)
  if (eTile(url)) {
    e.respondWith(caches.open(CACHE_MAPPE).then(function (c) {
      return c.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (r) {
          if (r && (r.ok || r.type === 'opaque')) { c.put(req, r.clone()).then(limitaMappe); }
          return r;
        });
      });
    }));
    return;
  }

  if (url.origin !== self.location.origin) return; // Dropbox, indirizzi: sempre rete

  // l'app: prima la copia sul telefono (si apre subito, anche offline)
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(CACHE_APP).then(function (c) {
      return c.match('index.html').then(function (hit) {
        return hit || fetch(req);
      });
    }).catch(function () { return fetch(req); }));
    return;
  }
  e.respondWith(caches.open(CACHE_APP).then(function (c) {
    return c.match(req).then(function (hit) {
      if (hit) return hit;
      return c.match(req, { ignoreSearch: true }).then(function (hit2) {
        if (hit2) return hit2;
        return fetch(req).then(function (r) {
          if (r && r.ok && r.type === 'basic') c.put(req, r.clone());
          return r;
        });
      });
    });
  }));
});
