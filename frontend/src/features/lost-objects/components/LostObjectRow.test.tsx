import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@solidjs/testing-library';
import type { LostObject } from '@/lib/types';
import type { LostObjectActions } from '../store/lost-objects-store';
import { LostObjectRow } from './LostObjectRow';

const base: LostObject = {
  id: 'a',
  name: 'Doudou lapin',
  status: 'lost',
  familyId: 'f',
  reportedById: 'm',
  reportedBy: {
    id: 'm',
    name: 'Sam',
    role: 'parent',
    color: '#abc',
    familyId: 'f',
  },
  foundById: null,
  foundBy: null,
  foundAt: null,
  comments: [
    {
      id: 'c1',
      lostObjectId: 'a',
      authorId: 'm',
      body: 'Regarde sous le lit',
      createdAt: '2026-01-01',
    },
  ],
  createdAt: new Date().toISOString(),
};

const stubActions = (): LostObjectActions => ({
  onToggleFound: vi.fn(),
  onRemove: vi.fn(),
  onAddComment: vi.fn(),
  onRemoveComment: vi.fn(),
});

describe('<LostObjectRow>', () => {
  it('renders the name, who reported it and the suggestion count', () => {
    const { getByText, getByLabelText } = render(() => (
      <LostObjectRow
        object={base}
        me={undefined}
        expanded={false}
        onToggleExpand={() => {}}
        actions={stubActions()}
      />
    ));
    expect(getByText('Doudou lapin')).toBeInTheDocument();
    expect(getByText(/signalé par Sam/)).toBeInTheDocument();
    expect(getByLabelText('1 suggestion')).toBeInTheDocument();
  });

  it('marks found via the check circle and expands via the body', () => {
    const actions = stubActions();
    const onToggleExpand = vi.fn();
    const { getByLabelText } = render(() => (
      <LostObjectRow
        object={base}
        me={undefined}
        expanded={false}
        onToggleExpand={onToggleExpand}
        actions={actions}
      />
    ));
    fireEvent.click(
      getByLabelText('Marquer comme retrouvé : Doudou lapin'),
    );
    expect(actions.onToggleFound).toHaveBeenCalledWith(base);
    expect(onToggleExpand).not.toHaveBeenCalled();
    fireEvent.click(getByLabelText('Ouvrir Doudou lapin'));
    expect(onToggleExpand).toHaveBeenCalled();
  });

  it('reveals the suggestion composer when expanded', () => {
    const { getByLabelText } = render(() => (
      <LostObjectRow
        object={base}
        me={undefined}
        expanded={true}
        onToggleExpand={() => {}}
        actions={stubActions()}
      />
    ));
    expect(getByLabelText('Suggérer un endroit')).toBeInTheDocument();
  });

  it('shows who found it and offers the undo label once found', () => {
    const found: LostObject = {
      ...base,
      status: 'found',
      foundById: 'm2',
      foundBy: {
        id: 'm2',
        name: 'Alex',
        role: 'parent',
        color: '#cba',
        familyId: 'f',
      },
      foundAt: new Date().toISOString(),
    };
    const { getByText, getByLabelText } = render(() => (
      <LostObjectRow
        object={found}
        me={undefined}
        expanded={false}
        onToggleExpand={() => {}}
        actions={stubActions()}
      />
    ));
    expect(getByText(/Retrouvé par Alex/)).toBeInTheDocument();
    expect(
      getByLabelText('Marquer comme perdu : Doudou lapin'),
    ).toBeInTheDocument();
  });

  it('deletes only via the trash button', () => {
    const actions = stubActions();
    const { getByLabelText } = render(() => (
      <LostObjectRow
        object={base}
        me={undefined}
        expanded={false}
        onToggleExpand={() => {}}
        actions={actions}
      />
    ));
    fireEvent.click(getByLabelText('Retirer Doudou lapin'));
    expect(actions.onRemove).toHaveBeenCalledWith(base);
    expect(actions.onToggleFound).not.toHaveBeenCalled();
  });
});
