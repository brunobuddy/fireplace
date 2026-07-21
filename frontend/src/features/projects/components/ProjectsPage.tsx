import { type Component, For, Show, createSignal } from 'solid-js';
import { useFamily } from '@/features/family/family-context';
import { Spinner } from '@/shared/ui/Spinner';
import { ErrorToast } from '@/shared/ui/ErrorToast';
import { Button } from '@/components/ui/button';
import {
  type ProjectItemActions,
  createProjectsController,
} from '../store/projects-store';
import { AddProjectBar } from './AddProjectBar';
import { ProjectCard } from './ProjectCard';
import { ArchivedProjects } from './ArchivedProjects';

/** The projects screen — wires the family identity to the realtime store. */
export const ProjectsPage: Component = () => {
  const family = useFamily();
  const ctrl = createProjectsController(
    () => family.family()?.id,
    family.currentMember,
  );

  // Accordion: one expanded project at a time, tracked by id.
  const [expandedId, setExpandedId] = createSignal<string | null>(null);
  const toggleExpand = (id: string): void => {
    setExpandedId((cur) => (cur === id ? null : id));
  };

  const hasAny = (): boolean => ctrl.state.projects.length > 0;

  const actions: ProjectItemActions = {
    onRename: (p, name) => void ctrl.actions.rename(p, name),
    onArchive: (p) => void ctrl.actions.setArchived(p, true),
    onUnarchive: (p) => void ctrl.actions.setArchived(p, false),
    onDelete: (p) => {
      void ctrl.actions.removeProject(p);
      setExpandedId((cur) => (cur === p.id ? null : cur));
    },
    onAddTask: (p, input) => void ctrl.actions.addTask(p, input),
    onToggleTask: (p, t) => void ctrl.actions.toggleTask(p, t),
    onEditTask: (p, t, changes) => void ctrl.actions.editTask(p, t, changes),
    onDeleteTask: (p, t) => void ctrl.actions.removeTask(p, t),
    onAddComment: (p, t, body) => void ctrl.actions.addComment(p, t, body),
    onRemoveComment: (p, t, id) => void ctrl.actions.removeComment(p, t, id),
  };

  // Open the fresh project right away — adding its first tasks is the
  // natural next gesture.
  const create = async (name: string): Promise<void> => {
    const saved = await ctrl.actions.addProject(name);
    if (saved) setExpandedId(saved.id);
  };

  return (
    <Show
      when={ctrl.state.status !== 'loading'}
      fallback={<Spinner label="Préparation de vos projets…" />}
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
        <AddProjectBar onAdd={(name) => void create(name)} />
        <ErrorToast
          message={ctrl.state.error}
          onDismiss={() => ctrl.actions.clearError()}
        />

        <Show when={hasAny()} fallback={<EmptyProjects />}>
          <ul class="flex flex-col gap-3">
            <For each={ctrl.active()}>
              {(project) => (
                <ProjectCard
                  project={project}
                  me={family.currentMember()}
                  members={ctrl.state.members}
                  expanded={expandedId() === project.id}
                  onToggleExpand={() => toggleExpand(project.id)}
                  actions={actions}
                />
              )}
            </For>
          </ul>

          <Show when={ctrl.active().length === 0}>
            <div class="py-6 text-center text-sm text-muted-foreground">
              Aucun projet en cours — les archivés t’attendent juste en
              dessous. 👇
            </div>
          </Show>

          <Show when={ctrl.archived().length > 0}>
            <ArchivedProjects
              projects={ctrl.archived()}
              me={family.currentMember()}
              members={ctrl.state.members}
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

const EmptyProjects: Component = () => (
  <div class="flex flex-col items-center px-6 py-14 text-center">
    <div class="mb-3 text-6xl" aria-hidden="true">
      🏗️
    </div>
    <h2 class="font-display text-lg font-extrabold">
      Aucun projet… pour l’instant
    </h2>
    <p class="mt-2 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">
      Lance le premier projet de la famille — des travaux, un voyage, une
      grande idée — puis découpe-le en tâches à cocher ensemble. 🏡
    </p>
  </div>
);
