import { http } from '@/lib/api/http';
import type { SparkView } from '@/lib/types';

/**
 * `memberId` rides on every call because the profile switcher — not the JWT —
 * is the identity, and the server uses it to redact the partner's answer until
 * the reveal.
 */
export const sparkApi = {
  view: (familyId: string, memberId: string) =>
    http.get<SparkView>(
      `/families/${familyId}/spark?memberId=${encodeURIComponent(memberId)}`,
    ),

  answer: (familyId: string, input: { memberId: string; text: string }) =>
    http.post<SparkView>(`/families/${familyId}/spark/answer`, input),

  regenerate: (familyId: string, memberId: string) =>
    http.post<SparkView>(
      `/families/${familyId}/spark/regenerate?memberId=${encodeURIComponent(
        memberId,
      )}`,
    ),
};
