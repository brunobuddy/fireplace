import { http } from '@/lib/api/http';
import type { Member } from '@/lib/types';

/**
 * Read-side family API. The signed-in member comes from the JWT (see
 * `family-context`); this endpoint is for the *other* members — e.g. the
 * assignee picker on a project task needs the whole household.
 */
export const familyApi = {
  members: (familyId: string) =>
    http.get<Member[]>(`/families/${familyId}/members`),
};
