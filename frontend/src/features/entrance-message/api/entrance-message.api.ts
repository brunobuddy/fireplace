import { http } from '@/lib/api/http';
import type { EntranceMessageResponse } from '@/lib/types';

export const entranceMessageApi = {
  get: (familyId: string) =>
    http.get<EntranceMessageResponse>(`/families/${familyId}/entrance-message`),

  /** Replaces the message; an empty text clears it. */
  set: (familyId: string, text: string) =>
    http.put<EntranceMessageResponse>(
      `/families/${familyId}/entrance-message`,
      { text },
    ),
};
