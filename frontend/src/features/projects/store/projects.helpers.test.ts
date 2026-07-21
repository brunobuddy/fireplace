import { describe, expect, it } from 'vitest';
import type { Project, ProjectTask, ProjectTaskComment } from '@/lib/types';
import {
  activeProjects,
  archivedProjects,
  commentCount,
  isComplete,
  projectProgress,
  removeProjectById,
  sortComments,
  sortTasks,
  upsertProject,
  withTask,
  withoutTask,
} from './projects.helpers';

const task = (over: Partial<ProjectTask>): ProjectTask =>
  ({
    id: 't',
    title: 'X',
    priority: 'medium',
    status: 'open',
    projectId: 'p',
    assigneeId: null,
    createdById: 'm',
    completedById: null,
    completedAt: null,
    comments: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }) as ProjectTask;

const project = (over: Partial<Project>): Project =>
  ({
    id: 'p',
    name: 'P',
    status: 'active',
    familyId: 'f',
    createdById: 'm',
    archivedAt: null,
    tasks: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }) as Project;

const comment = (id: string, createdAt: string): ProjectTaskComment => ({
  id,
  taskId: 't',
  authorId: 'm',
  body: id,
  createdAt,
});

describe('projects.helpers', () => {
  it('upsertProject appends when new and replaces when existing', () => {
    const a = project({ id: 'a' });
    const list = upsertProject([], a);
    expect(list).toHaveLength(1);

    const updated = upsertProject(list, { ...a, name: 'Renamed' });
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Renamed');
  });

  it('removeProjectById drops the right row', () => {
    const list = [project({ id: 'a' }), project({ id: 'b' })];
    expect(removeProjectById(list, 'a').map((p) => p.id)).toEqual(['b']);
  });

  it('splits active (newest first) from archived (latest archived first)', () => {
    const projects = [
      project({ id: '1', createdAt: '2026-01-01T00:00:00Z' }),
      project({ id: '2', createdAt: '2026-02-01T00:00:00Z' }),
      project({
        id: '3',
        status: 'archived',
        archivedAt: '2026-03-01T00:00:00Z',
      }),
      project({
        id: '4',
        status: 'archived',
        archivedAt: '2026-04-01T00:00:00Z',
      }),
    ];
    expect(activeProjects(projects).map((p) => p.id)).toEqual(['2', '1']);
    expect(archivedProjects(projects).map((p) => p.id)).toEqual(['4', '3']);
  });

  it('measures progress, rounding, and never divides by zero', () => {
    expect(projectProgress(project({}))).toEqual({
      done: 0,
      total: 0,
      percent: 0,
    });

    const oneOfThree = project({
      tasks: [
        task({ id: '1', status: 'done' }),
        task({ id: '2' }),
        task({ id: '3' }),
      ],
    });
    expect(projectProgress(oneOfThree)).toEqual({
      done: 1,
      total: 3,
      percent: 33,
    });
  });

  it('marks a project complete only when it has tasks and all are done', () => {
    expect(isComplete(project({}))).toBe(false);
    expect(
      isComplete(project({ tasks: [task({ status: 'done' })] })),
    ).toBe(true);
    expect(
      isComplete(project({ tasks: [task({ status: 'done' }), task({})] })),
    ).toBe(false);
  });

  it('sorts tasks: open by priority (blocking first) then oldest, done last by latest completion', () => {
    const tasks = [
      task({ id: 'low', priority: 'low', createdAt: '2026-01-01T00:00:00Z' }),
      task({
        id: 'done-old',
        status: 'done',
        completedAt: '2026-01-05T00:00:00Z',
      }),
      task({
        id: 'blocking',
        priority: 'blocking',
        createdAt: '2026-01-04T00:00:00Z',
      }),
      task({
        id: 'high-1',
        priority: 'high',
        createdAt: '2026-01-02T00:00:00Z',
      }),
      task({
        id: 'high-2',
        priority: 'high',
        createdAt: '2026-01-03T00:00:00Z',
      }),
      task({
        id: 'done-new',
        status: 'done',
        completedAt: '2026-01-06T00:00:00Z',
      }),
    ];
    expect(sortTasks(tasks).map((t) => t.id)).toEqual([
      'blocking',
      'high-1',
      'high-2',
      'low',
      'done-new',
      'done-old',
    ]);
  });

  it('withTask upserts inside the project, withoutTask removes', () => {
    const p = project({ tasks: [task({ id: 'a', title: 'A' })] });

    const replaced = withTask(p, task({ id: 'a', title: 'A2' }));
    expect(replaced.tasks.map((t) => t.title)).toEqual(['A2']);

    const appended = withTask(p, task({ id: 'b' }));
    expect(appended.tasks.map((t) => t.id)).toEqual(['a', 'b']);

    expect(withoutTask(appended, 'a').tasks.map((t) => t.id)).toEqual(['b']);
  });

  it('counts and sorts comments oldest-first', () => {
    const t = task({
      comments: [
        comment('c2', '2026-01-02T00:00:00Z'),
        comment('c1', '2026-01-01T00:00:00Z'),
      ],
    });
    expect(commentCount(t)).toBe(2);
    expect(sortComments(t.comments).map((c) => c.id)).toEqual(['c1', 'c2']);
  });
});
