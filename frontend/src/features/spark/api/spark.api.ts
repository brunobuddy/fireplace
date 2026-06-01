import { http } from '@/lib/api/http';
import type { SparkView } from '@/lib/types';

/**
 * The viewing/answering member is the signed-in session — never sent in the
 * URL or body. The server reads it from the JWT and redacts the partner's
 * answer text until both parents have answered.
 */
export const sparkApi = {
  view: (familyId: string) =>
    http.get<SparkView>(`/families/${familyId}/spark`),

  answer: (familyId: string, input: { text: string }) =>
    http.post<SparkView>(`/families/${familyId}/spark/answer`, input),

  regenerate: (familyId: string) =>
    http.post<SparkView>(`/families/${familyId}/spark/regenerate`),
};
