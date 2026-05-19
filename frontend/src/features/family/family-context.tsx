import {
  type Accessor,
  type Component,
  type JSX,
  createContext,
  createMemo,
  createResource,
  createSignal,
  useContext,
} from 'solid-js';
import type { Family, Member } from '@/lib/types';
import { familyApi } from './family.api';

const STORAGE_KEY = 'fireplace.memberId';

interface FamilyContextValue {
  family: Accessor<Family | undefined>;
  members: Accessor<Member[]>;
  currentMember: Accessor<Member | undefined>;
  selectMember: (id: string) => void;
  loading: Accessor<boolean>;
  error: Accessor<unknown>;
}

const FamilyContext = createContext<FamilyContextValue>();

/**
 * Loads the (single) family + its members and owns the "who am I" profile
 * selection, persisted to localStorage so it survives reloads. This is the
 * seam where real auth slots in later.
 */
export const FamilyProvider: Component<{ children: JSX.Element }> = (props) => {
  const [bundle] = createResource(async () => {
    const families = await familyApi.listFamilies();
    const family = families[0];
    const members = family ? await familyApi.listMembers(family.id) : [];
    return { family, members };
  });

  const stored =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null;
  const [selectedId, setSelectedId] = createSignal<string | null>(stored);

  const members = createMemo(() => bundle()?.members ?? []);
  const currentMember = createMemo(
    () => members().find((m) => m.id === selectedId()) ?? members()[0],
  );

  const selectMember = (id: string): void => {
    setSelectedId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const value: FamilyContextValue = {
    family: () => bundle()?.family,
    members,
    currentMember,
    selectMember,
    loading: () => bundle.loading,
    error: () => bundle.error,
  };

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
