/**
 * Register the Fireplace service worker — the piece that makes the app
 * installable ("Add to Home screen") and gives it a light offline shell.
 *
 * Production only: in dev, Vite serves ES modules a service worker would
 * happily cache and then hand back stale. The worker itself lives at
 * `public/sw.js` and is careful never to cache `/env.js`.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // A failed registration must never take the app down with it.
    });
  });
}
