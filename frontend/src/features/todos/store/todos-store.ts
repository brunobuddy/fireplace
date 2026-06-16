import {
  type Accessor,
  createEffect,
  createMemo,
  on,
  onCleanup,
  onMount,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import type { Member, Todo, TodoComment, TodoCriticality } from '@/lib/types';
import { TODO_EVENTS, getSocket } from '@/lib/socket/socket';
import { todosApi } from '../api/todos.api';
import {
  doneTodos,
  groupOpenByCriticality,
  openCount,
  removeById,
  upsert,
} from './todos.helpers';

type Status = 'loading' | 'ready' | 'error';

interface State {
  status: Status;
  error: string | null;
  todos: Todo[];
}

export interface QuickAddTodoInput {
  title: string;
  criticality: TodoCriticality;
}

export interface TodoEdits {
  title?: string;
  description?: string | null;
  criticality?: TodoCriticality;
}

/** Callbacks a to-do row needs — passed down to each accordion item. */
export interface TodoItemActions {
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onEdit: (todo: Todo, changes: TodoEdits) => void;
  onAddComment: (todo: Todo, body: string) => void;
  onRemoveComment: (todo: Todo, commentId: string) => void;
}

/**
 * Reactive heart of the to-do board: one source of truth that applies
 * optimistic local changes and merges realtime updates from other devices.
 * Everything is idempotent by todo id, so HTTP responses and socket
 * broadcasts converge without flicker (comment writes re-broadcast the whole
 * todo, so there's a single upsert path).
 */
export function createTodosController(
  familyId: Accessor<string | undefined>,
  member: Accessor<Member | undefined>,
) {
  const [state, setState] = createStore<State>({
    status: 'loading',
    error: null,
    todos: [],
  });

  const setTodos = (next: Todo[]): void => setState('todos', next);

  async function reload(): Promise<void> {
    const id = familyId();
    if (!id) return;
    setState({ status: 'loading', error: null });
    try {
      const snap = await todosApi.snapshot(id);
      setState({ status: 'ready', todos: snap.todos });
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
    socket.emit(TODO_EVENTS.JOIN, id);
  }

  const onAdded = (t: Todo) => setTodos(upsert(state.todos, t));
  const onUpdated = (t: Todo) => setTodos(upsert(state.todos, t));
  const onRemoved = (p: { id: string }) =>
    setTodos(removeById(state.todos, p.id));

  onMount(() => {
    socket.on(TODO_EVENTS.TODO_ADDED, onAdded);
    socket.on(TODO_EVENTS.TODO_UPDATED, onUpdated);
    socket.on(TODO_EVENTS.TODO_REMOVED, onRemoved);
  });

  onCleanup(() => {
    socket.off(TODO_EVENTS.TODO_ADDED, onAdded);
    socket.off(TODO_EVENTS.TODO_UPDATED, onUpdated);
    socket.off(TODO_EVENTS.TODO_REMOVED, onRemoved);
  });

  // Load once the family resolves. The family resource is usually still
  // in-flight when this view mounts, so a one-shot reload in onMount would bail
  // on an undefined id and never retry (the page would hang on the spinner).
  // An effect re-runs the moment familyId becomes available.
  createEffect(on(familyId, () => void reload()));

  // ---- mutations (optimistic) ------------------------------------------
  async function addTodo(input: QuickAddTodoInput): Promise<void> {
    const me = member();
    const id = familyId();
    if (!id || !me) return;
    const temp = optimisticTodo(input, id, me);
    setTodos(upsert(state.todos, temp));
    try {
      const saved = await todosApi.addTodo(id, {
        title: input.title,
        criticality: input.criticality,
      });
      setTodos(upsert(removeById(state.todos, temp.id), saved));
    } catch (err) {
      setTodos(removeById(state.todos, temp.id));
      setState('error', describe(err));
    }
  }

  async function toggle(todo: Todo): Promise<void> {
    const me = member();
    if (!me) return;
    const isDone = todo.status === 'done';
    setTodos(
      upsert(state.todos, {
        ...todo,
        status: isDone ? 'open' : 'done',
        completedById: isDone ? null : me.id,
        completedBy: isDone ? null : me,
        completedAt: isDone ? null : new Date().toISOString(),
      }),
    );
    try {
      const saved = await todosApi.toggleTodo(todo.id);
      setTodos(upsert(state.todos, saved));
    } catch (err) {
      setTodos(upsert(state.todos, todo));
      setState('error', describe(err));
    }
  }

  async function remove(todo: Todo): Promise<void> {
    setTodos(removeById(state.todos, todo.id));
    try {
      await todosApi.removeTodo(todo.id);
    } catch (err) {
      setTodos(upsert(state.todos, todo));
      setState('error', describe(err));
    }
  }

  async function edit(todo: Todo, changes: TodoEdits): Promise<void> {
    setTodos(upsert(state.todos, { ...todo, ...changes }));
    try {
      const saved = await todosApi.updateTodo(todo.id, changes);
      setTodos(upsert(state.todos, saved));
    } catch (err) {
      setTodos(upsert(state.todos, todo));
      setState('error', describe(err));
    }
  }

  async function addComment(todo: Todo, body: string): Promise<void> {
    const me = member();
    if (!me) return;
    const temp = optimisticComment(todo.id, me, body);
    setTodos(
      upsert(state.todos, { ...todo, comments: [...todo.comments, temp] }),
    );
    try {
      const saved = await todosApi.addComment(todo.id, { body });
      setTodos(upsert(state.todos, saved));
    } catch (err) {
      setTodos(upsert(state.todos, todo));
      setState('error', describe(err));
    }
  }

  async function removeComment(todo: Todo, commentId: string): Promise<void> {
    setTodos(
      upsert(state.todos, {
        ...todo,
        comments: todo.comments.filter((c) => c.id !== commentId),
      }),
    );
    try {
      const saved = await todosApi.removeComment(todo.id, commentId);
      setTodos(upsert(state.todos, saved));
    } catch (err) {
      setTodos(upsert(state.todos, todo));
      setState('error', describe(err));
    }
  }

  // ---- derived view models ---------------------------------------------
  const groups = createMemo(() => groupOpenByCriticality(state.todos));
  const done = createMemo(() => doneTodos(state.todos));
  const open = createMemo(() => openCount(state.todos));
  const findById = (id: string): Todo | undefined =>
    state.todos.find((t) => t.id === id);

  function clearError(): void {
    setState('error', null);
  }

  return {
    state,
    groups,
    done,
    open,
    findById,
    actions: {
      addTodo,
      toggle,
      remove,
      edit,
      addComment,
      removeComment,
      reload,
      clearError,
    },
  };
}

function optimisticTodo(
  input: QuickAddTodoInput,
  familyId: string,
  me: Member,
): Todo {
  return {
    id: `tmp-${crypto.randomUUID()}`,
    title: input.title,
    description: null,
    criticality: input.criticality,
    status: 'open',
    familyId,
    createdById: me.id,
    completedById: null,
    completedAt: null,
    createdBy: me,
    completedBy: null,
    comments: [],
    createdAt: new Date().toISOString(),
  };
}

function optimisticComment(
  todoId: string,
  me: Member,
  body: string,
): TodoComment {
  return {
    id: `tmp-${crypto.randomUUID()}`,
    todoId,
    authorId: me.id,
    author: me,
    body,
    createdAt: new Date().toISOString(),
  };
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : 'Une erreur est survenue';
}
