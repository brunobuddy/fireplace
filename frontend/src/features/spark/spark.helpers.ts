import type { SparkParticipantView, SparkView } from '@/lib/types';

/**
 * The five UI states of the Spark page, derived purely from the (already
 * redacted) view so the component never re-implements the reveal rule:
 * - `empty`     — no question yet.
 * - `spectator` — the viewer isn't a parent; read-only.
 * - `answering` — the viewer is a parent and hasn't answered.
 * - `waiting`   — the viewer answered; waiting on their partner.
 * - `revealed`  — both answered; both texts are visible.
 */
export type SparkPhase =
  | 'empty'
  | 'spectator'
  | 'answering'
  | 'waiting'
  | 'revealed';

type MaybeView = SparkView | null | undefined;

export function deriveSparkPhase(view: MaybeView): SparkPhase {
  if (!view || !view.question) {
    return 'empty';
  }
  if (view.revealed) {
    return 'revealed';
  }
  if (!view.viewerIsParticipant) {
    return 'spectator';
  }
  return view.viewerHasAnswered ? 'waiting' : 'answering';
}

export function viewerSlot(view: MaybeView): SparkParticipantView | undefined {
  return view?.participants.find((p) => p.isViewer);
}

export function partnerSlot(view: MaybeView): SparkParticipantView | undefined {
  return view?.participants.find((p) => !p.isViewer);
}

/** True when someone has answered but the pair isn't revealed — regenerating
 *  here discards an in-flight answer, so the UI confirms first. */
export function hasUnrevealedAnswers(view: MaybeView): boolean {
  return (
    !!view && !view.revealed && view.participants.some((p) => p.hasAnswered)
  );
}
