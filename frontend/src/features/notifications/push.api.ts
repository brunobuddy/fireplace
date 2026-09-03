import { http } from '@/lib/api/http';

/** Standard `PushSubscription.toJSON()` fields the backend stores. */
export interface PushSubscriptionBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export const pushApi = {
  /** `null` public key = push not configured server-side → hide the toggle. */
  publicKey: () =>
    http.get<{ publicKey: string | null }>('/notifications/public-key'),
  subscribe: (body: PushSubscriptionBody) =>
    http.post<void>('/notifications/subscription', body),
  unsubscribe: (endpoint: string) =>
    http.del<void>('/notifications/subscription', { endpoint }),
};
