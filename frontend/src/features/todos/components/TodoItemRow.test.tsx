import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@solidjs/testing-library';
import type { Todo } from '@/lib/types';
import type { TodoItemActions } from '../store/todos-store';
import { TodoItemRow } from './TodoItemRow';

const base: Todo = {
  id: 'a',
  title: 'Book the dentist',
  description: null,
  criticality: 'high',
  status: 'open',
  familyId: 'f',
  createdById: 'm',
  completedById: null,
  completedAt: null,
  createdBy: {
    id: 'm',
    name: 'Sam',
    role: 'parent',
    color: '#abc',
    familyId: 'f',
  },
  completedBy: null,
  comments: [
    {
      id: 'c1',
      todoId: 'a',
      authorId: 'm',
      body: 'hi',
      createdAt: '2026-01-01',
    },
  ],
  createdAt: '2026-01-01',
};

const stubActions = (): TodoItemActions => ({
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onAddComment: vi.fn(),
  onRemoveComment: vi.fn(),
});

describe('<TodoItemRow>', () => {
  it('renders the title, criticality pill and comment count', () => {
    const { getByText, getByLabelText } = render(() => (
      <TodoItemRow
        todo={base}
        me={undefined}
        expanded={false}
        onToggleExpand={() => {}}
        actions={stubActions()}
      />
    ));
    expect(getByText('Book the dentist')).toBeInTheDocument();
    expect(getByText(/High/)).toBeInTheDocument();
    expect(getByLabelText('1 comment')).toBeInTheDocument();
  });

  it('hides the pill for low criticality', () => {
    const low: Todo = { ...base, criticality: 'low' };
    const { queryByText } = render(() => (
      <TodoItemRow
        todo={low}
        me={undefined}
        expanded={false}
        onToggleExpand={() => {}}
        actions={stubActions()}
      />
    ));
    expect(queryByText(/Low/)).toBeNull();
  });

  it('toggles done via the checkbox and expands via the body', () => {
    const actions = stubActions();
    const onToggleExpand = vi.fn();
    const { getByLabelText } = render(() => (
      <TodoItemRow
        todo={base}
        me={undefined}
        expanded={false}
        onToggleExpand={onToggleExpand}
        actions={actions}
      />
    ));
    fireEvent.click(getByLabelText('Mark done: Book the dentist'));
    expect(actions.onToggle).toHaveBeenCalledWith(base);
    fireEvent.click(getByLabelText('Open Book the dentist'));
    expect(onToggleExpand).toHaveBeenCalled();
  });

  it('reveals the comment composer when expanded', () => {
    const { getByLabelText } = render(() => (
      <TodoItemRow
        todo={base}
        me={undefined}
        expanded={true}
        onToggleExpand={() => {}}
        actions={stubActions()}
      />
    ));
    expect(getByLabelText('Write a comment')).toBeInTheDocument();
  });
});
