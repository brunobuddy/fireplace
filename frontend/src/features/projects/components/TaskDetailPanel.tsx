import { type Component, Show, createSignal } from 'solid-js';
import type { Member, Project, ProjectTask } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TextField, TextFieldInput } from '@/components/ui/text-field';
import { Avatar } from '@/shared/ui/Avatar';
import { relativeTime } from '@/lib/relative-time';
import type { ProjectItemActions } from '../store/projects-store';
import { PrioritySegmented } from './PrioritySegmented';
import { AssigneePicker } from './AssigneePicker';

interface Props {
  project: Project;
  task: ProjectTask;
  members: Member[];
  actions: ProjectItemActions;
}

/**
 * The detail body revealed when a task expands: provenance, the priority and
 * responsible pickers, rename and delete. Title, pill and checkbox live in
 * the row header, so they're not repeated here.
 */
export const TaskDetailPanel: Component<Props> = (props) => {
  const [editing, setEditing] = createSignal(false);
  const [confirming, setConfirming] = createSignal(false);

  return (
    <Show
      when={!editing()}
      fallback={
        <RenameTaskForm
          title={props.task.title}
          onSave={(title) => {
            props.actions.onEditTask(props.project, props.task, { title });
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      }
    >
      <Provenance task={props.task} />

      <div class="mt-3 flex flex-col gap-2">
        <PrioritySegmented
          label="Changer la priorité"
          value={props.task.priority}
          onChange={(priority) =>
            props.actions.onEditTask(props.project, props.task, { priority })
          }
        />
        <AssigneePicker
          members={props.members}
          value={props.task.assigneeId}
          onChange={(assigneeId) =>
            props.actions.onEditTask(props.project, props.task, { assigneeId })
          }
        />
      </div>

      <Show
        when={!confirming()}
        fallback={
          <div class="mt-3 flex items-center gap-2 rounded-lg bg-muted/60 p-2">
            <span class="px-1 text-xs font-semibold text-muted-foreground">
              Supprimer pour tout le monde ?
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
              onClick={() =>
                props.actions.onDeleteTask(props.project, props.task)
              }
            >
              Supprimer
            </Button>
          </div>
        }
      >
        <div class="mt-3 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            class="flex-1"
            onClick={() => setEditing(true)}
          >
            ✏️ Renommer
          </Button>
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
  );
};

const Provenance: Component<{ task: ProjectTask }> = (props) => (
  <>
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <Show when={props.task.createdBy}>
        {(m) => <Avatar name={m().name} color={m().color} size="sm" />}
      </Show>
      <span>
        Ajouté par{' '}
        <b class="text-foreground">{props.task.createdBy?.name ?? 'quelqu’un'}</b>{' '}
        · {relativeTime(props.task.createdAt)}
      </span>
    </div>
    <Show when={props.task.status === 'done' && props.task.completedBy}>
      {(m) => (
        <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar name={m().name} color={m().color} size="sm" />
          <span>
            Terminé par <b class="text-foreground">{m().name}</b>
            {props.task.completedAt
              ? ` · ${relativeTime(props.task.completedAt)}`
              : ''}
          </span>
        </div>
      )}
    </Show>
  </>
);

const RenameTaskForm: Component<{
  title: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}> = (props) => {
  // Seeded once on purpose — the form remounts each time it opens, and a
  // realtime update must not reset the field mid-edit.
  // eslint-disable-next-line solid/reactivity
  const [title, setTitle] = createSignal(props.title);

  const save = (e: Event): void => {
    e.preventDefault();
    const trimmed = title().trim();
    if (!trimmed) return;
    props.onSave(trimmed);
  };

  return (
    <form class="flex flex-col gap-3" onSubmit={save}>
      <TextField value={title()} onChange={setTitle}>
        <TextFieldInput aria-label="Titre de la tâche" placeholder="Titre" />
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
        <Button type="submit" class="flex-1" disabled={!title().trim()}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
};
