import { type Component, For, Show, createSignal } from 'solid-js';
import type { Member, Project } from '@/lib/types';
import type { ProjectItemActions } from '../store/projects-store';
import { isComplete, sortTasks } from '../store/projects.helpers';
import { TaskRow } from './TaskRow';
import { AddTaskBar } from './AddTaskBar';
import { ProjectActions } from './ProjectActions';

interface Props {
  project: Project;
  me: Member | undefined;
  members: Member[];
  actions: ProjectItemActions;
}

/**
 * The unfolded body of a project card: its checklist (tasks accordion —
 * one open at a time), the task composer, then the project actions. An
 * archived project keeps its history readable but loses the composer.
 */
export const ProjectPanel: Component<Props> = (props) => {
  const [expandedTaskId, setExpandedTaskId] = createSignal<string | null>(null);
  const toggleTask = (id: string): void => {
    setExpandedTaskId((cur) => (cur === id ? null : id));
  };

  const tasks = () => sortTasks(props.project.tasks);
  const archived = (): boolean => props.project.status === 'archived';

  return (
    <>
      <Show
        when={tasks().length > 0}
        fallback={
          <p class="py-2 text-center text-sm text-muted-foreground">
            Aucune tâche — découpe le projet en premières étapes. 🧩
          </p>
        }
      >
        <ul class="flex flex-col gap-2">
          <For each={tasks()}>
            {(task) => (
              <TaskRow
                project={props.project}
                task={task}
                me={props.me}
                members={props.members}
                expanded={expandedTaskId() === task.id}
                onToggleExpand={() => toggleTask(task.id)}
                actions={props.actions}
              />
            )}
          </For>
        </ul>
      </Show>

      <Show when={!archived() && isComplete(props.project)}>
        <div class="mt-3 animate-pop-in rounded-lg bg-success/10 px-3 py-2 text-center text-sm font-bold text-success">
          🎉 Toutes les tâches sont faites — tu peux archiver le projet !
        </div>
      </Show>

      <Show when={!archived()}>
        <AddTaskBar
          members={props.members}
          onAdd={(input) => props.actions.onAddTask(props.project, input)}
        />
      </Show>

      <ProjectActions project={props.project} actions={props.actions} />
    </>
  );
};
