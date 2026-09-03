import { type Component, For, Show, createSignal } from 'solid-js';
import { useFamily } from '@/features/family/family-context';
import { Spinner } from '@/shared/ui/Spinner';
import { ErrorToast } from '@/shared/ui/ErrorToast';
import { Button } from '@/components/ui/button';
import {
  type LostObjectActions,
  createLostObjectsController,
} from '../store/lost-objects-store';
import { AddLostObjectBar } from './AddLostObjectBar';
import { FoundSection } from './FoundSection';
import { LostObjectRow } from './LostObjectRow';

/** The lost-objects screen — wires the family identity to the realtime store. */
export const LostObjectsView: Component = () => {
  const family = useFamily();
  const ctrl = createLostObjectsController(
    () => family.family()?.id,
    family.currentMember,
  );

  // Accordion: one expanded thread at a time, tracked by id.
  const [expandedId, setExpandedId] = createSignal<string | null>(null);
  const toggleExpand = (id: string): void => {
    setExpandedId((cur) => (cur === id ? null : id));
  };

  const hasAny = (): boolean => ctrl.state.objects.length > 0;

  const actions: LostObjectActions = {
    onToggleFound: (o) => void ctrl.actions.toggleFound(o),
    onRemove: (o) => {
      void ctrl.actions.remove(o);
      setExpandedId((cur) => (cur === o.id ? null : cur));
    },
    onAddComment: (o, body) => void ctrl.actions.addComment(o, body),
    onRemoveComment: (o, id) => void ctrl.actions.removeComment(o, id),
  };

  return (
    <Show
      when={ctrl.state.status !== 'loading'}
      fallback={<Spinner label="Recherche des objets perdus…" />}
    >
      <Show
        when={ctrl.state.status !== 'error'}
        fallback={
          <div class="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <p class="font-semibold text-destructive">{ctrl.state.error}</p>
            <Button onClick={() => void ctrl.actions.reload()}>
              Réessayer
            </Button>
          </div>
        }
      >
        <AddLostObjectBar onReport={(name) => void ctrl.actions.report(name)} />
        <ErrorToast
          message={ctrl.state.error}
          onDismiss={() => ctrl.actions.clearError()}
        />

        <Show when={hasAny()} fallback={<EmptyLostObjects />}>
          <ul class="mb-6 flex flex-col gap-2">
            <For each={ctrl.lost()}>
              {(object) => (
                <LostObjectRow
                  object={object}
                  me={family.currentMember()}
                  expanded={expandedId() === object.id}
                  onToggleExpand={() => toggleExpand(object.id)}
                  actions={actions}
                />
              )}
            </For>
          </ul>

          <Show when={ctrl.missing() === 0 && ctrl.found().length > 0}>
            <div class="animate-pop-in py-8 text-center font-display text-lg font-extrabold text-success">
              🎉 Tout a été retrouvé — rien ne se perd ici !
            </div>
          </Show>

          <Show when={ctrl.found().length > 0}>
            <FoundSection
              objects={ctrl.found()}
              me={family.currentMember()}
              expandedId={expandedId()}
              onToggleExpand={toggleExpand}
              actions={actions}
            />
          </Show>
        </Show>
      </Show>
    </Show>
  );
};

const EmptyLostObjects: Component = () => (
  <div class="flex flex-col items-center px-6 py-14 text-center">
    <div class="mb-3 text-6xl" aria-hidden="true">
      🔍
    </div>
    <h2 class="font-display text-lg font-extrabold">Rien n’est perdu !</h2>
    <p class="mt-2 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">
      Un doudou introuvable, des clés envolées ? Signale l’objet ici et
      marque-le retrouvé en un geste. 🏡
    </p>
  </div>
);
