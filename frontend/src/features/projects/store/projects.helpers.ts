import type { Project, ProjectTask, ProjectTaskComment } from '@/lib/types';
import { PRIORITY_ORDER } from '../task-priority';

/** Pure list operations — kept side-effect free so they're unit-testable. */

export function upsertProject(projects: Project[], next: Project): Project[] {
  const idx = projects.findIndex((p) => p.id === next.id);
  if (idx === -1) {
    return [...projects, next];
  }
  const copy = projects.slice();
  copy[idx] = next;
  return copy;
}

export function removeProjectById(projects: Project[], id: string): Project[] {
  return projects.filter((p) => p.id !== id);
}

/** Open projects, newest first — the board. */
export const activeProjects = (projects: Project[]): Project[] =>
  projects
    .filter((p) => p.status === 'active')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Closed projects, most recently archived first — the shelf. */
export const archivedProjects = (projects: Project[]): Project[] =>
  projects
    .filter((p) => p.status === 'archived')
    .sort((a, b) =>
      (b.archivedAt ?? b.createdAt).localeCompare(a.archivedAt ?? a.createdAt),
    );

export interface ProjectProgress {
  done: number;
  total: number;
  /** 0–100, rounded; 0 when the project has no task yet. */
  percent: number;
}

export function projectProgress(project: Project): ProjectProgress {
  const total = project.tasks?.length ?? 0;
  const done =
    project.tasks?.filter((t) => t.status === 'done').length ?? 0;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/** Every task done (and at least one exists) — ready to archive. */
export const isComplete = (project: Project): boolean => {
  const { done, total } = projectProgress(project);
  return total > 0 && done === total;
};

/**
 * Checklist order: open tasks first (most pressing priority, then oldest
 * first — the order they were planned), finished tasks at the bottom
 * (most recently completed first).
 */
export function sortTasks(tasks: ProjectTask[]): ProjectTask[] {
  const rank = (t: ProjectTask): number => PRIORITY_ORDER.indexOf(t.priority);
  const open = tasks
    .filter((t) => t.status === 'open')
    .sort((a, b) =>
      rank(a) !== rank(b)
        ? rank(a) - rank(b)
        : a.createdAt.localeCompare(b.createdAt),
    );
  const done = tasks
    .filter((t) => t.status === 'done')
    .sort((a, b) =>
      (b.completedAt ?? b.createdAt).localeCompare(
        a.completedAt ?? a.createdAt,
      ),
    );
  return [...open, ...done];
}

/** The project with one task replaced (or appended) — the local upsert. */
export function withTask(project: Project, task: ProjectTask): Project {
  const idx = project.tasks.findIndex((t) => t.id === task.id);
  const tasks =
    idx === -1
      ? [...project.tasks, task]
      : project.tasks.map((t) => (t.id === task.id ? task : t));
  return { ...project, tasks };
}

export function withoutTask(project: Project, taskId: string): Project {
  return { ...project, tasks: project.tasks.filter((t) => t.id !== taskId) };
}

export const commentCount = (task: ProjectTask): number =>
  task.comments?.length ?? 0;

/** Comments oldest-first (chat order, newest at the bottom). */
export const sortComments = (
  comments: ProjectTaskComment[],
): ProjectTaskComment[] =>
  [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
