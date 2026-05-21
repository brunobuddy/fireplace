import { http } from '@/lib/api/http';
import type { AuthUser } from '@/lib/types';

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  login: (email: string, password: string) =>
    http.post<LoginResponse>('/auth/login', { email, password }),
  me: () => http.get<AuthUser>('/auth/me'),
};
