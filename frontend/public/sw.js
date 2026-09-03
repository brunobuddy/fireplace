/*
 * Fireplace service worker — minimal and hand-rolled (no Workbox) to keep the
 * build dependency-free. The app is single-origin (NestJS serves the SPA *and*
 * the API), so the worker must explicitly skip the API + websocket: they now
 * share the page's origin and must never be cached.
 *
 * Strategy:
 *   - navigations            -> network-first, fall back to the cached shell offline
 *   - /assets/* (hashed)     -> cache-first (filenames change every build)
 *   - other same-origin      -> stale-while-revalidate (icons, manifest, favicons)
 *   - /api, /socket.io, x-origin -> untouched (straight to network)
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

/*
 * Web Push: the backend sends a JSON payload ({ title, body, url, tag }) to
 * the subscribed family members — always "the others", never the person who
 * acted. `tag` collapses bursts (several pushes about the same thing replace
 * each other instead of stacking).
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return; // not ours — a malformed push must never throw in the worker
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Fireplace', {
      body: payload.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: payload.tag || undefined,
      data: { url: payload.url || '/' },
    }),
  );
});

// Tapping the notification focuses an open Fireplace tab (navigating it to
// the relevant view) or opens a fresh one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        const existing = windows[0];
        if (existing) {
          return existing.focus().then(() => existing.navigate(url));
        }
        return clients.openWindow(url);
      }),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // cross-origin (CDNs, etc.)
  if (url.pathname === '/sw.js') return;
  // Same-origin now includes the API + websocket — never cache those.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/'))
    return;

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
