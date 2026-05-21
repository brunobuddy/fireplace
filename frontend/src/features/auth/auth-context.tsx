import {
  type Accessor,
  type Component,
  type JSX,
  createContext,
  createSignal,
  useContext,
} from 'solid-js';
import type { AuthUser } from '@/lib/types';
import { setAuthToken, setUnauthorizedHandler } from '@/lib/api/auth-token';
import { disconnectSocket } from '@/lib/socket/socket';
import { authApi } from './auth.api';

const TOKEN_KEY = 'fireplace.token';
const USER_KEY = 'fireplace.user';

interface AuthContextValue {
  user: Accessor<AuthUser | null>;
  isAuthenticated: Accessor<boolean>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>();

/**
 * Owns the app login session: the bearer token (persisted to localStorage so
 * it survives reloads) and the signed-in user. A 401 on any authenticated
 * request flows back here via the http layer and logs the session out, so an
 * expired token self-heals to the login screen.
 */
export const AuthProvider: Component<{ children: JSX.Element }> = (props) => {
  const storedToken = readStorage(TOKEN_KEY);
  // Prime the http layer before any child fires a request on mount.
  setAuthToken(storedToken);

  const [token, setToken] = createSignal<string | null>(storedToken);
  const [user, setUser] = createSignal<AuthUser | null>(readStoredUser());

  const login = async (email: string, password: string): Promise<void> => {
    const res = await authApi.login(email, password);
    setAuthToken(res.token);
    writeStorage(TOKEN_KEY, res.token);
    writeStorage(USER_KEY, JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const logout = (): void => {
    setAuthToken(null);
    clearStorage(TOKEN_KEY);
    clearStorage(USER_KEY);
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  setUnauthorizedHandler(logout);

  const value: AuthContextValue = {
    user,
    isAuthenticated: () => token() !== null,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}

function readStorage(key: string): string | null {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
}

function writeStorage(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

function clearStorage(key: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

function readStoredUser(): AuthUser | null {
  const raw = readStorage(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
