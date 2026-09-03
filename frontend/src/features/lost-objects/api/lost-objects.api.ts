import { http } from '@/lib/api/http';
import type { LostObject, LostObjectSnapshot } from '@/lib/types';

export const lostObjectsApi = {
  snapshot: (familyId: string) =>
    http.get<LostObjectSnapshot>(`/families/${familyId}/lost-objects`),

  report: (familyId: string, input: { name: string }) =>
    http.post<LostObject>(`/families/${familyId}/lost-objects`, input),

  toggleFound: (id: string) => http.post<LostObject>(`/lost-objects/${id}/toggle`),

  remove: (id: string) => http.del<void>(`/lost-objects/${id}`),

  addComment: (id: string, input: { body: string }) =>
    http.post<LostObject>(`/lost-objects/${id}/comments`, input),

  removeComment: (objectId: string, commentId: string) =>
    http.del<LostObject>(`/lost-objects/${objectId}/comments/${commentId}`),
};
