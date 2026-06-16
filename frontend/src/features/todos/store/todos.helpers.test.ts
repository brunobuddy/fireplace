import { describe, expect, it } from 'vitest';
import type { Todo, TodoComment } from '@/lib/types';
import {
  commentCount,
  doneTodos,
  groupOpenByCriticality,
  openCount,
  relativeTime,
  removeById,
  sortComments,
  upsert,
} from './todos.helpers';

const todo = (over: Partial<Todo>): Todo =>
  ({
    id: 'i',
    title: 'X',
    description: null,
    criticality: 'medium',
    status: 'open',
    familyId: 'f',
    createdById: 'm',
    completedById: null,
    completedAt: null,
    comments: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }) as Todo;

const comment = (id: string, createdAt: string): TodoComment => ({
  id,
  todoId: 't',
  authorId: 'm',
  body: id,
  createdAt,
});

describe('todos.helpers', () => {
  it('upsert appends when new and replaces when existing', () => {
    const a = todo({ id: 'a' });
    const list = upsert([], a);
    expect(list).toHaveLength(1);

    const updated = upsert(list, { ...a, title: 'Renamed' });
    expect(updated).toHaveLength(1);
    expect(updated[0].title).toBe('Renamed');
  });

  it('removeById drops the right row', () => {
    const list = [todo({ id: 'a' }), todo({ id: 'b' })];
    expect(removeById(list, 'a').map((t) => t.id)).toEqual(['b']);
  });

  it('groups open todos by criticality (important first), newest first, dropping empties', () => {
    const todos = [
      todo({ id: '1', criticality: 'low', createdAt: '2026-01-01T00:00:00Z' }),
      todo({
        id: '2',
        criticality: 'high',
        createdAt: '2026-01-02T00:00:00Z',
      }),
      todo({
        id: '3',
        criticality: 'high',
        createdAt: '2026-01-03T00:00:00Z',
      }),
      todo({ id: '4', criticality: 'medium', status: 'done' }),
    ];

    const groups = groupOpenByCriticality(todos);

    expect(groups.map((g) => g.criticality)).toEqual(['high', 'low']);
    expect(groups[0].todos.map((t) => t.id)).toEqual(['3', '2']);
  });

  it('counts open todos and collects done todos newest-completed first', () => {
    const todos = [
      todo({ id: '1', status: 'open' }),
      todo({ id: '2', status: 'done', completedAt: '2026-02-01T00:00:00Z' }),
      todo({ id: '3', status: 'done', completedAt: '2026-03-01T00:00:00Z' }),
    ];
    expect(openCount(todos)).toBe(1);
    expect(doneTodos(todos).map((t) => t.id)).toEqual(['3', '2']);
  });

  it('counts and sorts comments oldest-first', () => {
    const t = todo({
      comments: [
        comment('c2', '2026-01-02T00:00:00Z'),
        comment('c1', '2026-01-01T00:00:00Z'),
      ],
    });
    expect(commentCount(t)).toBe(2);
    expect(sortComments(t.comments).map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('formats relative time in human units', () => {
    const now = new Date('2026-05-21T12:00:00Z');
    expect(relativeTime('2026-05-21T11:59:30Z', now)).toBe('à l’instant');
    expect(relativeTime('2026-05-21T11:30:00Z', now)).toBe('30m');
    expect(relativeTime('2026-05-21T09:00:00Z', now)).toBe('3h');
    expect(relativeTime('2026-05-20T09:00:00Z', now)).toBe('hier');
  });
});
