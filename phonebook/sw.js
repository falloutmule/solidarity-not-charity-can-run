const CACHE = 'gj-unhoused-phonebook-v2';
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.svg",
  "./icon-512.svg",
  "./share-qr.svg",
  "./resources-01.js",
  "./resources-02.js",
  "./resources-03.js",
  "./resources-04.js",
  "./resources-05.js",
  "./resources-06.js",
  "./resources-07.js",
  "./resources-08.js",
  "./resources-09.js",
  "./resources-10.js",
  "./resources-11.js",
  "./resources-12.js",
  "./app.js"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); return response;
    }).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); return response;
  })));
});
