import { type Component, Show, createSignal } from 'solid-js';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TextField, TextFieldInput } from '@/components/ui/text-field';
import type { ProjectItemActions } from '../store/projects-store';

interface Props {
  project: Project;
  actions: ProjectItemActions;
}

/** Rename / archive (or reactivate) / delete, at the foot of the panel. */
export const ProjectActions: Component<Props> = (props) => {
  const [renaming, setRenaming] = createSignal(false);
  const [confirming, setConfirming] = createSignal(false);
  const archived = (): boolean => props.project.status === 'archived';

  return (
    <div class="mt-3 border-t border-border/60 pt-3">
      <Show
        when={!renaming()}
        fallback={
          <RenameProjectForm
            name={props.project.name}
            onSave={(name) => {
              props.actions.onRename(props.project, name);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        }
      >
        <Show
          when={!confirming()}
          fallback={
            <div class="flex items-center gap-2 rounded-lg bg-muted/60 p-2">
              <span class="px-1 text-xs font-semibold text-muted-foreground">
                Supprimer le projet et ses tâches ?
              </span>
              <Button
                size="sm"
                variant="ghost"
                class="ml-auto"
                onClick={() => setConfirming(false)}
              >
                Garder
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => props.actions.onDelete(props.project)}
              >
                Supprimer
              </Button>
            </div>
          }
        >
          <div class="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              class="flex-1"
              onClick={() => setRenaming(true)}
            >
              ✏️ Renommer
            </Button>
            <Show
              when={!archived()}
              fallback={
                <Button
                  variant="ghost"
                  size="sm"
                  class="flex-1"
                  onClick={() => props.actions.onUnarchive(props.project)}
                >
                  ↩️ Réactiver
                </Button>
              }
            >
              <Button
                variant="ghost"
                size="sm"
                class="flex-1"
                onClick={() => props.actions.onArchive(props.project)}
              >
                📦 Archiver
              </Button>
            </Show>
            <Button
              variant="ghost"
              size="sm"
              class="flex-1 text-destructive"
              onClick={() => setConfirming(true)}
            >
              🗑 Supprimer
            </Button>
          </div>
        </Show>
      </Show>
    </div>
  );
};

const RenameProjectForm: Component<{
  name: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}> = (props) => {
  // Seeded once on purpose — the form remounts each time it opens, and a
  // realtime update must not reset the field mid-edit.
  // eslint-disable-next-line solid/reactivity
  const [name, setName] = createSignal(props.name);

  const save = (e: Event): void => {
    e.preventDefault();
    const trimmed = name().trim();
    if (!trimmed) return;
    props.onSave(trimmed);
  };

  return (
    <form class="flex flex-col gap-3" onSubmit={save}>
      <TextField value={name()} onChange={setName}>
        <TextFieldInput aria-label="Nom du projet" placeholder="Nom du projet" />
      </TextField>
      <div class="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          class="flex-1"
          onClick={() => props.onCancel()}
        >
          Annuler
        </Button>
        <Button type="submit" class="flex-1" disabled={!name().trim()}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
};
