import { type Accessor, createEffect, on, onCleanup, onMount } from 'solid-js';
import { type SetStoreFunction, createStore } from 'solid-js/store';
import type {
  EntranceMessage,
  EntranceMessageUpdate,
  Member,
} from '@/lib/types';
import type { Socket } from 'socket.io-client';
import { ENTRANCE_MESSAGE_EVENTS, getSocket } from '@/lib/socket/socket';
import { entranceMessageApi } from '../api/entrance-message.api';
import {
  applyUpdate,
  normalizeDraft,
  optimisticMessage,
} from './entrance-message.helpers';

type Status = 'loading' | 'ready' | 'error';

interface State {
  status: Status;
  error: string | null;
  saving: boolean;
  message: EntranceMessage | null;
}

const INITIAL_STATE: State = {
  status: 'loading',
  error: null,
  saving: false,
  message: null,
};

/**
 * Reactive state for the entrance message. Every write replaces the whole
 * message, so the optimistic guess, the HTTP response and the socket
 * broadcast all converge on the same value without flicker.
 */
export function createEntranceMessageController(
  familyId: Accessor<string | undefined>,
  member: Accessor<Member | undefined>,
) {
  const [state, setState] = createStore<State>({ ...INITIAL_STATE });

  async function reload(): Promise<void> {
    const id = familyId();
    if (!id) return;
    setState({ status: 'loading', error: null });
    try {
      const res = await entranceMessageApi.get(id);
      setState({ status: 'ready', message: res.message });
      joinRealtime(id);
    } catch (err) {
      setState({ status: 'error', error: describe(err) });
    }
  }

  const onUpdated = (update: EntranceMessageUpdate): void => {
    setState('message', applyUpdate(state.message, update, familyId()));
  };
  const socket = getSocket();
  onMount(() => socket.on(ENTRANCE_MESSAGE_EVENTS.UPDATED, onUpdated));
  onCleanup(() => socket.off(ENTRANCE_MESSAGE_EVENTS.UPDATED, onUpdated));
  const joinRealtime = roomJoiner(socket);

  createEffect(on(familyId, () => void reload()));

  const publish = (text: string): Promise<boolean> =>
    publishMessage(
      { state, setState, familyId: familyId(), me: member() },
      text,
    );

  return {
    state,
    actions: {
      publish,
      clear: (): Promise<boolean> => publish(''),
      reload,
      clearError: (): void => setState('error', null),
    },
  };
}

export type EntranceMessageController = ReturnType<
  typeof createEntranceMessageController
>;

interface PublishContext {
  state: State;
  setState: SetStoreFunction<State>;
  familyId: string | undefined;
  me: Member | undefined;
}

/**
 * Publish `text` (or clear the screen when it is blank): optimistic guess
 * first, then the server's answer; the previous message comes back on error.
 */
async function publishMessage(
  ctx: PublishContext,
  text: string,
): Promise<boolean> {
  const { state, setState, familyId, me } = ctx;
  if (!familyId || !me) return false;
  const previous = state.message;
  const next = normalizeDraft(text);
  setState({
    saving: true,
    error: null,
    message: next ? optimisticMessage(next, me) : null,
  });
  try {
    const res = await entranceMessageApi.set(familyId, next);
    setState('message', res.message);
    return true;
  } catch (err) {
    setState({ message: previous, error: describe(err) });
    return false;
  } finally {
    setState('saving', false);
  }
}

/** "Join my family's room", deduplicated so a reload doesn't re-join. */
function roomJoiner(socket: Socket): (familyId: string) => void {
  let joinedFamily: string | null = null;
  return (familyId) => {
    if (joinedFamily === familyId) return;
    joinedFamily = familyId;
    socket.emit(ENTRANCE_MESSAGE_EVENTS.JOIN, familyId);
  };
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : 'Une erreur est survenue';
}
