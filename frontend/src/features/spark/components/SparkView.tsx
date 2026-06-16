import { type Component, Match, Show, Switch } from 'solid-js';
import { useFamily } from '@/features/family/family-context';
import { Spinner } from '@/shared/ui/Spinner';
import { ErrorToast } from '@/shared/ui/ErrorToast';
import {
  type SparkController,
  createSparkController,
} from '../store/spark-store';
import {
  deriveSparkPhase,
  hasUnrevealedAnswers,
  partnerSlot,
  viewerSlot,
} from '../spark.helpers';
import { QuestionCard } from './QuestionCard';
import { AnswerComposer } from './AnswerComposer';
import { RevealedAnswers } from './RevealedAnswers';
import {
  EmptyState,
  NewQuestionButton,
  SparkError,
  SparkIntro,
  SpectatorNote,
  WaitingNote,
} from './SparkStates';

/**
 * The Spark screen — wires the family identity to the realtime store and shows
 * the phase-appropriate body: answer secretly, wait for your partner, reveal
 * both, spectate (for the kids), or an empty "spark one" state.
 */
export const SparkView: Component = () => {
  const family = useFamily();
  const ctrl = createSparkController(
    () => family.family()?.id,
    family.currentMember,
  );

  return (
    <Show
      when={ctrl.state.status !== 'loading'}
      fallback={<Spinner label="On prépare Spark…" />}
    >
      <Show
        when={ctrl.state.status !== 'error'}
        fallback={
          <SparkError
            message={ctrl.state.error}
            onRetry={() => void ctrl.actions.reload()}
          />
        }
      >
        <div class="flex flex-col gap-4">
          <SparkIntro />
          <SparkBody ctrl={ctrl} />
        </div>
        <ErrorToast
          message={ctrl.state.error}
          onDismiss={() => ctrl.actions.clearError()}
        />
      </Show>
    </Show>
  );
};

const SparkBody: Component<{ ctrl: SparkController }> = (props) => {
  const view = () => props.ctrl.state.view;
  const onNew = (): void => void props.ctrl.actions.regenerate();

  return (
    <Show
      when={view()?.question}
      fallback={
        <EmptyState generating={props.ctrl.state.generating} onNew={onNew} />
      }
    >
      {(question) => (
        <>
          <QuestionCard text={question().text} />
          <PhaseSection ctrl={props.ctrl} />
          <NewQuestionButton
            generating={props.ctrl.state.generating}
            needsConfirm={hasUnrevealedAnswers(view())}
            onNew={onNew}
          />
        </>
      )}
    </Show>
  );
};

const PhaseSection: Component<{ ctrl: SparkController }> = (props) => {
  const view = () => props.ctrl.state.view;
  const phase = () => deriveSparkPhase(view());

  return (
    <Switch>
      <Match when={phase() === 'answering'}>
        <AnswerComposer
          partner={partnerSlot(view())}
          onSubmit={(text) => void props.ctrl.actions.submitAnswer(text)}
        />
      </Match>
      <Match when={phase() === 'waiting'}>
        <WaitingNote me={viewerSlot(view())} partner={partnerSlot(view())} />
      </Match>
      <Match when={phase() === 'revealed'}>
        <RevealedAnswers participants={view()?.participants ?? []} />
      </Match>
      <Match when={phase() === 'spectator'}>
        <SpectatorNote participants={view()?.participants ?? []} />
      </Match>
    </Switch>
  );
};
