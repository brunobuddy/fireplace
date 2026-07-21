import {
  type Accessor,
  createEffect,
  createMemo,
  on,
  onCleanup,
  onMount,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import type {
  Member,
  Project,
  ProjectTask,
  ProjectTaskComment,
  ProjectTaskPriority,
} from '@/lib/types';
import { PROJECT_EVENTS, getSocket } from '@/lib/socket/socket';
import { familyApi } from '@/features/family/family.api';
import { projectsApi } from '../api/projects.api';
import {
  activeProjects,
  archivedProjects,
  removeProjectById,
  upsertProject,
  withTask,
  withoutTask,
} from './projects.helpers';

type Status = 'loading' | 'ready' | 'error';

interface State {
  status: Status;
  error: string | null;
  projects: Project[];
  /** The whole household — feeds the assignee picker. */
  members: Member[];
}

export interface QuickAddTaskInput {
  title: string;
  priority: ProjectTaskPriority;
  assigneeId: string | null;
}

export interface TaskEdits {
  title?: string;
  priority?: ProjectTaskPriority;
  assigneeId?: string | null;
}

/** Callbacks a project card needs — passed down to each accordion item. */
export interface ProjectItemActions {
  onRename: (project: Project, name: string) => void;
  onArchive: (project: Project) => void;
  onUnarchive: (project: Project) => void;
  onDelete: (project: Project) => void;
  onAddTask: (project: Project, input: QuickAddTaskInput) => void;
  onToggleTask: (project: Project, task: ProjectTask) => void;
  onEditTask: (project: Project, task: ProjectTask, changes: TaskEdits) => void;
  onDeleteTask: (project: Project, task: ProjectTask) => void;
  onAddComment: (project: Project, task: ProjectTask, body: string) => void;
  onRemoveComment: (
    project: Project,
    task: ProjectTask,
    commentId: string,
  ) => void;
}

/**
 * Reactive heart of the projects board: one source of truth that applies
 * optimistic local changes and merges realtime updates from other devices.
 * Every mutation — down to a comment — resolves to the same idempotent
 * "upsert a project by id", because the server always answers (and
 * broadcasts) the whole aggregate.
 */
export function createProjectsController(
  familyId: Accessor<string | undefined>,
  member: Accessor<Member | undefined>,
) {
  const [state, setState] = createStore<State>({
    status: 'loading',
    error: null,
    projects: [],
    members: [],
  });

  const setProjects = (next: Project[]): void => setState('projects', next);
  const apply = (p: Project): void =>
    setProjects(upsertProject(state.projects, p));

  async function reload(): Promise<void> {
    const id = familyId();
    if (!id) return;
    setState({ status: 'loading', error: null });
    try {
      const [snap, members] = await Promise.all([
        projectsApi.snapshot(id),
        familyApi.members(id),
      ]);
      setState({ status: 'ready', projects: snap.projects, members });
      joinRealtime(id);
    } catch (err) {
      setState({ status: 'error', error: describe(err) });
    }
  }

  // ---- realtime ---------------------------------------------------------
  const socket = getSocket();
  let joinedFamily: string | null = null;

  function joinRealtime(id: string): void {
    if (joinedFamily === id) return;
    joinedFamily = id;
    socket.emit(PROJECT_EVENTS.JOIN, id);
  }

  const onUpserted = (p: Project) => apply(p);
  const onRemoved = (p: { id: string }) =>
    setProjects(removeProjectById(state.projects, p.id));

  onMount(() => {
    socket.on(PROJECT_EVENTS.PROJECT_ADDED, onUpserted);
    socket.on(PROJECT_EVENTS.PROJECT_UPDATED, onUpserted);
    socket.on(PROJECT_EVENTS.PROJECT_REMOVED, onRemoved);
  });

  onCleanup(() => {
    socket.off(PROJECT_EVENTS.PROJECT_ADDED, onUpserted);
    socket.off(PROJECT_EVENTS.PROJECT_UPDATED, onUpserted);
    socket.off(PROJECT_EVENTS.PROJECT_REMOVED, onRemoved);
  });

  // Load once the family resolves (see todos-store for why an effect, not
  // a one-shot onMount: the family id is usually still in-flight on mount).
  createEffect(on(familyId, () => void reload()));

  // ---- project mutations (optimistic) -----------------------------------
  async function addProject(name: string): Promise<Project | undefined> {
    const me = member();
    const id = familyId();
    if (!id || !me) return undefined;
    const temp = optimisticProject(name, id, me);
    apply(temp);
    try {
      const saved = await projectsApi.addProject(id, { name });
      setProjects(upsertProject(removeProjectById(state.projects, temp.id), saved));
      return saved;
    } catch (err) {
      setProjects(removeProjectById(state.projects, temp.id));
      setState('error', describe(err));
      return undefined;
    }
  }

  async function rename(project: Project, name: string): Promise<void> {
    apply({ ...project, name });
    await sync(project, () => projectsApi.renameProject(project.id, name));
  }

  async function setArchived(project: Project, archived: boolean): Promise<void> {
    apply({
      ...project,
      status: archived ? 'archived' : 'active',
      archivedAt: archived ? new Date().toISOString() : null,
    });
    await sync(project, () =>
      archived
        ? projectsApi.archiveProject(project.id)
        : projectsApi.unarchiveProject(project.id),
    );
  }

  async function removeProject(project: Project): Promise<void> {
    setProjects(removeProjectById(state.projects, project.id));
    try {
      await projectsApi.removeProject(project.id);
    } catch (err) {
      apply(project);
      setState('error', describe(err));
    }
  }

  // ---- task mutations (optimistic) --------------------------------------
  async function addTask(
    project: Project,
    input: QuickAddTaskInput,
  ): Promise<void> {
    const me = member();
    if (!me) return;
    apply(withTask(project, optimisticTask(project.id, input, me, state.members)));
    await sync(project, () =>
      projectsApi.addTask(project.id, {
        title: input.title,
        priority: input.priority,
        assigneeId: input.assigneeId ?? undefined,
      }),
    );
  }

  async function toggleTask(project: Project, task: ProjectTask): Promise<void> {
    const me = member();
    if (!me) return;
    const isDone = task.status === 'done';
    apply(
      withTask(project, {
        ...task,
        status: isDone ? 'open' : 'done',
        completedById: isDone ? null : me.id,
        completedBy: isDone ? null : me,
        completedAt: isDone ? null : new Date().toISOString(),
      }),
    );
    await sync(project, () => projectsApi.toggleTask(project.id, task.id));
  }

  async function editTask(
    project: Project,
    task: ProjectTask,
    changes: TaskEdits,
  ): Promise<void> {
    const assignee =
      changes.assigneeId === undefined
        ? task.assignee
        : (state.members.find((m) => m.id === changes.assigneeId) ?? null);
    apply(withTask(project, { ...task, ...changes, assignee }));
    await sync(project, () =>
      projectsApi.updateTask(project.id, task.id, changes),
    );
  }

  async function removeTask(project: Project, task: ProjectTask): Promise<void> {
    apply(withoutTask(project, task.id));
    await sync(project, () => projectsApi.removeTask(project.id, task.id));
  }

  async function addComment(
    project: Project,
    task: ProjectTask,
    body: string,
  ): Promise<void> {
    const me = member();
    if (!me) return;
    const temp = optimisticComment(task.id, me, body);
    apply(withTask(project, { ...task, comments: [...task.comments, temp] }));
    await sync(project, () =>
      projectsApi.addComment(project.id, task.id, { body }),
    );
  }

  async function removeComment(
    project: Project,
    task: ProjectTask,
    commentId: string,
  ): Promise<void> {
    apply(
      withTask(project, {
        ...task,
        comments: task.comments.filter((c) => c.id !== commentId),
      }),
    );
    await sync(project, () =>
      projectsApi.removeComment(project.id, task.id, commentId),
    );
  }

  /** Push a mutation; converge on the server's truth, roll back on failure. */
  async function sync(
    before: Project,
    push: () => Promise<Project>,
  ): Promise<void> {
    try {
      apply(await push());
    } catch (err) {
      apply(before);
      setState('error', describe(err));
    }
  }

  // ---- derived view models ---------------------------------------------
  const active = createMemo(() => activeProjects(state.projects));
  const archived = createMemo(() => archivedProjects(state.projects));

  function clearError(): void {
    setState('error', null);
  }

  return {
    state,
    active,
    archived,
    actions: {
      addProject,
      rename,
      setArchived,
      removeProject,
      addTask,
      toggleTask,
      editTask,
      removeTask,
      addComment,
      removeComment,
      reload,
      clearError,
    },
  };
}

function optimisticProject(name: string, familyId: string, me: Member): Project {
  return {
    id: `tmp-${crypto.randomUUID()}`,
    name,
    status: 'active',
    familyId,
    createdById: me.id,
    createdBy: me,
    archivedAt: null,
    tasks: [],
    createdAt: new Date().toISOString(),
  };
}

function optimisticTask(
  projectId: string,
  input: QuickAddTaskInput,
  me: Member,
  members: Member[],
): ProjectTask {
  return {
    id: `tmp-${crypto.randomUUID()}`,
    title: input.title,
    priority: input.priority,
    status: 'open',
    projectId,
    assigneeId: input.assigneeId,
    assignee: input.assigneeId
      ? (members.find((m) => m.id === input.assigneeId) ?? null)
      : null,
    createdById: me.id,
    createdBy: me,
    completedById: null,
    completedBy: null,
    completedAt: null,
    comments: [],
    createdAt: new Date().toISOString(),
  };
}

function optimisticComment(
  taskId: string,
  me: Member,
  body: string,
): ProjectTaskComment {
  return {
    id: `tmp-${crypto.randomUUID()}`,
    taskId,
    authorId: me.id,
    author: me,
    body,
    createdAt: new Date().toISOString(),
  };
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : 'Une erreur est survenue';
}
