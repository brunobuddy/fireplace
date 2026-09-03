import {
  IPushSender,
  PushPayload,
  PushSubscriptionGoneError,
  PushTarget,
} from './push-sender';

/**
 * Deterministic sender bound under NODE_ENV=test: records every delivery so
 * suites can assert who was (and wasn't) notified without touching a real
 * push service. Endpoints containing `gone` simulate a revoked subscription.
 */
export class StubPushSender implements IPushSender {
  readonly publicKey = 'stub-vapid-public-key';
  readonly sent: Array<{ target: PushTarget; payload: PushPayload }> = [];

  send(target: PushTarget, payload: PushPayload): Promise<void> {
    if (target.endpoint.includes('gone')) {
      return Promise.reject(new PushSubscriptionGoneError(target.endpoint));
    }
    this.sent.push({ target, payload });
    return Promise.resolve();
  }
}
