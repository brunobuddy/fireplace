import { pushApi } from './push.api';

/**
 * Web Push client plumbing. The flow is standard PWA push:
 *   1. the service worker is registered (prod-only, see register-sw.ts);
 *   2. the user taps the bell → Notification permission → subscribe with the
 *      backend's VAPID public key → POST the subscription;
 *   3. the backend pushes to every *other* family device on each mutation.
 *
 * In dev there is no service worker, so the bell simply never appears —
 * push is exercised on the installed PWA (or any built deploy).
 */

export type PushState = 'hidden' | 'off' | 'on' | 'denied';

export function pushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Where the toggle should start: 'hidden' when the device or deployment can't
 * do push at all, otherwise the current permission/subscription state. When
 * already subscribed, the subscription is re-POSTed so the server row
 * survives DB resets and key ownership follows the signed-in member.
 */
export async function currentPushState(): Promise<PushState> {
  const registration = await pushRegistration();
  if (!registration) return 'hidden';
  const { publicKey } = await pushApi.publicKey().catch(() => ({
    publicKey: null,
  }));
  if (!publicKey) return 'hidden';
  if (Notification.permission === 'denied') return 'denied';
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return 'off';
  await saveSubscription(subscription).catch(() => undefined);
  return 'on';
}

/** User tapped the bell while off — ask, subscribe, register server-side. */
export async function enablePush(): Promise<PushState> {
  const registration = await pushRegistration();
  if (!registration) return 'hidden';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return permission === 'denied' ? 'denied' : 'off';
  }
  const { publicKey } = await pushApi.publicKey();
  if (!publicKey) return 'hidden';
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));
  await saveSubscription(subscription);
  return 'on';
}

/** User tapped the bell while on — drop both sides of the subscription. */
export async function disablePush(): Promise<PushState> {
  const registration = await pushRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await pushApi.unsubscribe(subscription.endpoint).catch(() => undefined);
    await subscription.unsubscribe();
  }
  return 'off';
}

async function pushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Incomplete push subscription');
  }
  await pushApi.subscribe({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
}

/**
 * The VAPID key arrives base64url-encoded; `pushManager.subscribe` wants the
 * raw bytes. Exported for tests.
 */
export function urlBase64ToUint8Array(
  base64url: string,
): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}
