import { type Accessor, createEffect, on, onCleanup, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { Member, SparkView } from '@/lib/types';
import { SPARK_EVENTS, getSocket } from '@/lib/socket/socket';
import { sparkApi } from '../api/spark.api';

type Status = 'loading' | 'ready' | 'error';

interface State {
  status: Status;
  error: string | null;
  view: SparkView | null;
  generating: boolean;
}

export type SparkController = ReturnType<typeof createSparkController>;

/**
 * Reactive heart of the Spark page. Holds the server's already-redacted view
 * (so the partner's answer text simply never reaches this client before the
 * reveal) and reconciles realtime nudges. Because the view depends on *who the
 * viewer is*, it refetches whenever the active family member changes — that's
 * how each phone shows its own side of the secret.
 */
export function createSparkController(
  familyId: Accessor<string | undefined>,
  member: Accessor<Member | undefined>,
) {
  const [state, setState] = createStore<State>({
    status: 'loading',
    error: null,
    view: null,
    generating: false,
  });

  async function reload(): Promise<void> {
    const fid = familyId();
    const me = member();
    if (!fid || !me) return;
    setState({ status: 'loading', error: null });
    try {
      const view = await sparkApi.view(fid);
      setState({ status: 'ready', view });
      joinRealtime(fid);
    } catch (err) {
      setState({ status: 'error', error: describe(err) });
    }
  }

  // ---- realtime ---------------------------------------------------------
  const socket = getSocket();
  let joinedFamily: string | null = null;

  function joinRealtime(fid: string): void {
    if (joinedFamily === fid) return;
    joinedFamily = fid;
    socket.emit(SPARK_EVENTS.JOIN, fid);
  }

  // A partner answered (or it's now revealed) → refetch our own redacted view.
  const onUpdated = (payload: { questionId: string }): void => {
    if (payload.questionId === state.view?.question?.id) {
      void reload();
    }
  };
  // A brand-new question was generated elsewhere → reset to it.
  const onQuestion = (): void => void reload();

  onMount(() => {
    socket.on(SPARK_EVENTS.UPDATED, onUpdated);
    socket.on(SPARK_EVENTS.QUESTION, onQuestion);
  });
  onCleanup(() => {
    socket.off(SPARK_EVENTS.UPDATED, onUpdated);
    socket.off(SPARK_EVENTS.QUESTION, onQuestion);
  });

  // Initial load + reload on family/member switch (redaction is per-member).
  createEffect(
    on(
      () => [familyId(), member()?.id] as const,
      () => void reload(),
    ),
  );

  // ---- mutations --------------------------------------------------------
  async function submitAnswer(text: string): Promise<void> {
    const fid = familyId();
    const me = member();
    const trimmed = text.trim();
    if (!fid || !me || !state.view || !trimmed) return;
    const previous = state.view;
    setState({ view: applyOwnAnswer(previous, me.id, trimmed), error: null }); // optimistic
    try {
      const view = await sparkApi.answer(fid, { text: trimmed });
      setState({ view, error: null });
    } catch (err) {
      // Revert the optimistic answer and surface the failure. No reload here —
      // that would clear the error before it's ever shown.
      setState({ view: previous, error: describe(err) });
    }
  }

  async function regenerate(): Promise<void> {
    const fid = familyId();
    const me = member();
    if (!fid || !me) return;
    setState({ generating: true, error: null });
    try {
      const view = await sparkApi.regenerate(fid);
      setState({ view, generating: false });
    } catch (err) {
      setState({ generating: false, error: describe(err) });
    }
  }

  function clearError(): void {
    setState('error', null);
  }

  return {
    state,
    actions: { reload, submitAnswer, regenerate, clearError },
  };
}

/** Optimistically fill in the viewer's own slot (their text is never a secret). */
function applyOwnAnswer(
  view: SparkView,
  memberId: string,
  text: string,
): SparkView {
  return {
    ...view,
    viewerHasAnswered: true,
    participants: view.participants.map((p) =>
      p.memberId === memberId
        ? {
            ...p,
            hasAnswered: true,
            text,
            answeredAt: new Date().toISOString(),
          }
        : p,
    ),
  };
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : 'Une erreur est survenue';
}
