'use strict';
const CACHE_PREFIX = 'gj-unhoused-phonebook-';
const CACHE = CACHE_PREFIX + 'v3-recovery-20261117';
const APP_SHELL = [
  './', './index.html', './recovery.html', './manifest.webmanifest',
  './icon-192.svg', './icon-512.svg', './share-qr.svg',
  './resources-01.js', './resources-02.js', './resources-03.js',
  './resources-04.js', './resources-05.js', './resources-06.js',
  './resources-07.js', './resources-08.js', './resources-09.js',
  './resources-10.js', './resources-11.js', './resources-12.js', './app.js'
];
const APP_URLS = new Set(APP_SHELL.map(path => new URL(path, self.location.href).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([...APP_URLS].map(url => new Request(url, {cache: 'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // CacheStorage is shared with other projects on this origin. Leave them alone.
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  url.search = '';
  url.hash = '';
  // Only this phonebook's known files; never cache the game or external sources.
  if (!APP_URLS.has(url.href)) return;
  const key = url.href;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(key);
    if (event.request.mode !== 'navigate' && cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        await cache.put(key, response.clone());
        return response;
      }
      return cached || response;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  })());
});
