/**
 * Port for delivering one Web Push message to one subscription (DIP — the
 * real adapter wraps the `web-push` VAPID protocol; tests bind a recording
 * stub). The sender knows nothing about members or families: routing is the
 * NotificationsService's job.
 */
export const PUSH_SENDER = Symbol('PUSH_SENDER');

/** The payload every push carries, JSON-encoded for the service worker. */
export interface PushPayload {
  title: string;
  body: string;
  /** In-app path to open when the notification is tapped. */
  url: string;
  /** Collapse key — a newer push with the same tag replaces the older one. */
  tag: string;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** The push service says this subscription no longer exists → drop the row. */
export class PushSubscriptionGoneError extends Error {
  constructor(endpoint: string) {
    super(`Push subscription gone: ${endpoint}`);
    this.name = 'PushSubscriptionGoneError';
  }
}

export interface IPushSender {
  /**
   * The VAPID public key browsers subscribe with, or `null` when push is not
   * configured — the feature then fails soft (no key exposed, no sends).
   */
  readonly publicKey: string | null;

  /** Deliver one message. Throws {@link PushSubscriptionGoneError} on 404/410. */
  send(target: PushTarget, payload: PushPayload): Promise<void>;
}
