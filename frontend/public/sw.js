/*
 * Fireplace service worker — minimal and hand-rolled (no Workbox) to keep the
 * build dependency-free and, above all, to NEVER cache /env.js, which the
 * container entrypoint rewrites at start (frontend/docker/30-fireplace-env.sh).
 * Caching it would pin a stale backend URL and break "deploy one image
 * anywhere".
 *
 * Strategy:
 *   - navigations        -> network-first, fall back to the cached shell offline
 *   - /assets/* (hashed) -> cache-first (filenames change every build)
 *   - other same-origin  -> stale-while-revalidate (icons, manifest, favicons)
 *   - cross-origin / API / sockets / env.js -> untouched (straight to network)
 *
 * Bump CACHE to force every client to drop old entries on the next visit.
 */
const CACHE = 'fireplace-cache-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Cache only successful, same-origin ("basic") responses; never opaque/errors.
function cachePut(key, response) {
  if (response && response.status === 200 && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(key, copy));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // backend API, sockets, CDNs
  if (url.pathname === '/env.js' || url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => cachePut('/index.html', response))
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || caches.match('/')),
        ),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches
        .match(request)
        .then(
          (cached) =>
            cached || fetch(request).then((response) => cachePut(request, response)),
        ),
    );
    return;
  }

  // Stale-while-revalidate for the remaining static same-origin files.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => cachePut(request, response))
        .catch(() => cached);
      return cached || network;
    }),
  );
});
