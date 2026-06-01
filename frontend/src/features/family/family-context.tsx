import {
  type Accessor,
  type Component,
  type JSX,
  createContext,
  createMemo,
  useContext,
} from 'solid-js';
import type { Family, Member } from '@/lib/types';
import { useAuth } from '@/features/auth/auth-context';

interface FamilyContextValue {
  family: Accessor<Family | undefined>;
  currentMember: Accessor<Member | undefined>;
}

const FamilyContext = createContext<FamilyContextValue>();

/**
 * Thin shim over the auth context: login is identity. Every signed-in request
 * carries the member's UUID inside the JWT, so we don't need to fetch a
 * separate "who am I" — we just project the `AuthUser` into the `Family` /
 * `Member` shapes the rest of the UI expects.
 */
export const FamilyProvider: Component<{ children: JSX.Element }> = (props) => {
  const { user } = useAuth();

  const family = createMemo<Family | undefined>(() => {
    const u = user();
    return u ? { id: u.familyId, name: 'Home' } : undefined;
  });

  const currentMember = createMemo<Member | undefined>(() => {
    const u = user();
    return u
      ? {
          id: u.memberId,
          name: u.name,
          role: u.role,
          color: u.color,
          familyId: u.familyId,
        }
      : undefined;
  });

  const value: FamilyContextValue = { family, currentMember };

  return (
    <FamilyContext.Provider value={value}>
      {props.children}
    </FamilyContext.Provider>
  );
};

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) {
    throw new Error('useFamily must be used within <FamilyProvider>');
  }
  return ctx;
}
