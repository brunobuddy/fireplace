import {
  type Accessor,
  createEffect,
  createMemo,
  on,
  onCleanup,
  onMount,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import type { LostObject, LostObjectComment, Member } from '@/lib/types';
import { LOST_OBJECT_EVENTS, getSocket } from '@/lib/socket/socket';
import { lostObjectsApi } from '../api/lost-objects.api';
import {
  foundObjects,
  lostCount,
  lostObjects,
  removeById,
  upsert,
} from './lost-objects.helpers';

type Status = 'loading' | 'ready' | 'error';

interface State {
  status: Status;
  error: string | null;
  objects: LostObject[];
}

/** Callbacks a lost-object row needs — passed down to each accordion item. */
export interface LostObjectActions {
  onToggleFound: (object: LostObject) => void;
  onRemove: (object: LostObject) => void;
  onAddComment: (object: LostObject, body: string) => void;
  onRemoveComment: (object: LostObject, commentId: string) => void;
}

/**
 * Reactive heart of the lost-objects list — the same optimistic +
 * idempotent-by-id merge strategy as the other boards, so HTTP responses and
 * socket broadcasts converge without flicker.
 */
export function createLostObjectsController(
  familyId: Accessor<string | undefined>,
  member: Accessor<Member | undefined>,
) {
  const [state, setState] = createStore<State>({
    status: 'loading',
    error: null,
    objects: [],
  });

  const setObjects = (next: LostObject[]): void => setState('objects', next);

  async function reload(): Promise<void> {
    const id = familyId();
    if (!id) return;
    setState({ status: 'loading', error: null });
    try {
      const snap = await lostObjectsApi.snapshot(id);
      setState({ status: 'ready', objects: snap.objects });
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
    socket.emit(LOST_OBJECT_EVENTS.JOIN, id);
  }

  const onAdded = (o: LostObject) => setObjects(upsert(state.objects, o));
  const onUpdated = (o: LostObject) => setObjects(upsert(state.objects, o));
  const onRemoved = (p: { id: string }) =>
    setObjects(removeById(state.objects, p.id));

  onMount(() => {
    socket.on(LOST_OBJECT_EVENTS.ADDED, onAdded);
    socket.on(LOST_OBJECT_EVENTS.UPDATED, onUpdated);
    socket.on(LOST_OBJECT_EVENTS.REMOVED, onRemoved);
  });

  onCleanup(() => {
    socket.off(LOST_OBJECT_EVENTS.ADDED, onAdded);
    socket.off(LOST_OBJECT_EVENTS.UPDATED, onUpdated);
    socket.off(LOST_OBJECT_EVENTS.REMOVED, onRemoved);
  });

  // Load once the family resolves (see todos-store for why an effect, not a
  // one-shot onMount call).
  createEffect(on(familyId, () => void reload()));

  // ---- mutations (optimistic) ------------------------------------------
  async function report(name: string): Promise<void> {
    const me = member();
    const id = familyId();
    if (!id || !me) return;
    const temp = optimisticObject(name, id, me);
    setObjects(upsert(state.objects, temp));
    try {
      const saved = await lostObjectsApi.report(id, { name });
      setObjects(upsert(removeById(state.objects, temp.id), saved));
    } catch (err) {
      setObjects(removeById(state.objects, temp.id));
      setState('error', describe(err));
    }
  }

  async function toggleFound(object: LostObject): Promise<void> {
    const me = member();
    if (!me) return;
    const isFound = object.status === 'found';
    setObjects(
      upsert(state.objects, {
        ...object,
        status: isFound ? 'lost' : 'found',
        foundById: isFound ? null : me.id,
        foundBy: isFound ? null : me,
        foundAt: isFound ? null : new Date().toISOString(),
      }),
    );
    try {
      const saved = await lostObjectsApi.toggleFound(object.id);
      setObjects(upsert(state.objects, saved));
    } catch (err) {
      setObjects(upsert(state.objects, object));
      setState('error', describe(err));
    }
  }

  async function remove(object: LostObject): Promise<void> {
    setObjects(removeById(state.objects, object.id));
    try {
      await lostObjectsApi.remove(object.id);
    } catch (err) {
      setObjects(upsert(state.objects, object));
      setState('error', describe(err));
    }
  }

  async function addComment(object: LostObject, body: string): Promise<void> {
    const me = member();
    if (!me) return;
    const temp = optimisticComment(object.id, me, body);
    setObjects(
      upsert(state.objects, {
        ...object,
        comments: [...object.comments, temp],
      }),
    );
    try {
      const saved = await lostObjectsApi.addComment(object.id, { body });
      setObjects(upsert(state.objects, saved));
    } catch (err) {
      setObjects(upsert(state.objects, object));
      setState('error', describe(err));
    }
  }

  async function removeComment(
    object: LostObject,
    commentId: string,
  ): Promise<void> {
    setObjects(
      upsert(state.objects, {
        ...object,
        comments: object.comments.filter((c) => c.id !== commentId),
      }),
    );
    try {
      const saved = await lostObjectsApi.removeComment(object.id, commentId);
      setObjects(upsert(state.objects, saved));
    } catch (err) {
      setObjects(upsert(state.objects, object));
      setState('error', describe(err));
    }
  }

  // ---- derived view models ---------------------------------------------
  const lost = createMemo(() => lostObjects(state.objects));
  const found = createMemo(() => foundObjects(state.objects));
  const missing = createMemo(() => lostCount(state.objects));

  function clearError(): void {
    setState('error', null);
  }

  return {
    state,
    lost,
    found,
    missing,
    actions: {
      report,
      toggleFound,
      remove,
      addComment,
      removeComment,
      reload,
      clearError,
    },
  };
}

function optimisticObject(
  name: string,
  familyId: string,
  me: Member,
): LostObject {
  return {
    id: `tmp-${crypto.randomUUID()}`,
    name,
    status: 'lost',
    familyId,
    reportedById: me.id,
    reportedBy: me,
    foundById: null,
    foundBy: null,
    foundAt: null,
    comments: [],
    createdAt: new Date().toISOString(),
  };
}

function optimisticComment(
  lostObjectId: string,
  me: Member,
  body: string,
): LostObjectComment {
  return {
    id: `tmp-${crypto.randomUUID()}`,
    lostObjectId,
    authorId: me.id,
    author: me,
    body,
    createdAt: new Date().toISOString(),
  };
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : 'Une erreur est survenue';
}
