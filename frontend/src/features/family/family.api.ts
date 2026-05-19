import { http } from '@/lib/api/http';
import type { Family, Member } from '@/lib/types';

export const familyApi = {
  listFamilies: () => http.get<Family[]>('/families'),
  listMembers: (familyId: string) =>
    http.get<Member[]>(`/families/${familyId}/members`),
};
