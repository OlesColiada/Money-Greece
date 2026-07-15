// Rich Tour — app-shell service worker.
// Caches the app's own files (HTML/manifest/icons) so the page can open with
// no internet connection at all. It does NOT cache or intercept calls to
// Supabase or any other cross-origin service — those still need real network
// (or are queued locally by the app itself, see the offline outbox in index.html).
const CACHE_NAME = 'richtour-shell-v2';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192_1.png', './icon-512_1.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch(() => {}) // never block install on a missing icon etc.
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never intercept writes (Supabase POST/PATCH etc.)

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave Supabase/CDN requests alone entirely

  event.respondWith(
    fetch(req)
      .then(res => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
  );
});
