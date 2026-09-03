import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';
import {
  IPushSender,
  PushPayload,
  PushSubscriptionGoneError,
  PushTarget,
} from './push-sender';

/**
 * Real Web Push delivery via the `web-push` VAPID implementation. Keys come
 * from `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (generate a pair with
 * `npm run push:generate-vapid --workspace=backend`); without them the sender
 * reports no public key and the whole feature fails soft — the app boots,
 * the UI simply never offers the notification toggle.
 */
@Injectable()
export class WebPushSender implements IPushSender {
  private readonly logger = new Logger(WebPushSender.name);
  readonly publicKey: string | null;
  private readonly privateKey: string | null;
  private readonly subject: string;

  constructor(config: ConfigService) {
    this.publicKey = config.get<string>('VAPID_PUBLIC_KEY') ?? null;
    this.privateKey = config.get<string>('VAPID_PRIVATE_KEY') ?? null;
    // web-push demands a mailto:/https: subject; it identifies the sender to
    // the push services and is never shown to users.
    this.subject =
      config.get<string>('VAPID_SUBJECT') ?? 'mailto:fireplace@example.com';
    if (!this.publicKey || !this.privateKey) {
      this.publicKey = null;
      this.logger.warn(
        'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push notifications are disabled',
      );
    }
  }

  async send(target: PushTarget, payload: PushPayload): Promise<void> {
    if (!this.publicKey || !this.privateKey) {
      return;
    }
    try {
      await webPush.sendNotification(
        {
          endpoint: target.endpoint,
          keys: { p256dh: target.p256dh, auth: target.auth },
        },
        JSON.stringify(payload),
        {
          vapidDetails: {
            subject: this.subject,
            publicKey: this.publicKey,
            privateKey: this.privateKey,
          },
          TTL: 60 * 60 * 24, // stale family news is pointless after a day
        },
      );
    } catch (error) {
      if (isGone(error)) {
        throw new PushSubscriptionGoneError(target.endpoint);
      }
      throw error;
    }
  }
}

/** 404/410 mean the browser revoked the subscription — it will never work. */
function isGone(error: unknown): boolean {
  const status = (error as { statusCode?: number }).statusCode;
  return status === 404 || status === 410;
}
