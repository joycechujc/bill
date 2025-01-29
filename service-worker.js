const CACHE_NAME = 'expense-splitter-v1';
const urlsToCache = [
  '/bill/',
  '/bill/index.html',
  '/bill/styles.css',
  '/bill/script.js',
  '/bill/manifest.json',
  '/bill/icons/app_192.webp',
  '/bill/icons/app_512.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
