import { type Component, Show } from 'solid-js';
import type { Member, Project } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/cn';
import type { ProjectItemActions } from '../store/projects-store';
import { isComplete, projectProgress } from '../store/projects.helpers';
import { ProjectPanel } from './ProjectPanel';

interface Props {
  project: Project;
  me: Member | undefined;
  members: Member[];
  expanded: boolean;
  onToggleExpand: () => void;
  actions: ProjectItemActions;
}

/**
 * One accordion card: a tappable header — name, done/total and a slim
 * progress bar, the whole state of the project at a glance — that unfolds
 * the checklist below. One project open at a time keeps the board calm.
 */
export const ProjectCard: Component<Props> = (props) => {
  const progress = () => projectProgress(props.project);
  const archived = (): boolean => props.project.status === 'archived';
  const panelId = (): string => `project-panel-${props.project.id}`;

  return (
    <li
      class={cn(
        'animate-fade-in-up overflow-hidden rounded-xl border border-border/60 bg-card shadow-cosy transition-all',
        archived() && 'opacity-70',
      )}
    >
      <button
        class="flex w-full items-center gap-3 px-4 pb-1 pt-3 text-left active:bg-muted/40"
        onClick={() => props.onToggleExpand()}
        aria-expanded={props.expanded}
        aria-controls={panelId()}
        aria-label={`${props.expanded ? 'Réduire' : 'Ouvrir'} le projet ${props.project.name}`}
      >
        <span class="flex min-w-0 flex-1 items-center gap-2">
          <span class="truncate font-display text-base font-extrabold">
            {props.project.name}
          </span>
          <Show when={archived()}>
            <Badge variant="muted" size="sm" class="flex-shrink-0">
              📦 Archivé
            </Badge>
          </Show>
          <Show when={!archived() && isComplete(props.project)}>
            <Badge variant="success" size="sm" class="flex-shrink-0">
              Terminé ✓
            </Badge>
          </Show>
        </span>
        <span class="flex-shrink-0 text-xs font-bold text-muted-foreground">
          <Show when={progress().total > 0} fallback="Aucune tâche">
            {progress().done}/{progress().total}
          </Show>
        </span>
        <span
          class={cn(
            'flex-shrink-0 text-muted-foreground transition-transform duration-200',
            props.expanded && 'rotate-180',
          )}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <div class="px-4 pb-3 pt-1.5">
        <Progress value={progress().percent} />
      </div>

      <Show when={props.expanded}>
        <div
          id={panelId()}
          role="region"
          aria-label={`Tâches de ${props.project.name}`}
          class="animate-fade-in-up border-t border-border/60 px-3 pb-3 pt-3"
        >
          <ProjectPanel
            project={props.project}
            me={props.me}
            members={props.members}
            actions={props.actions}
          />
        </div>
      </Show>
    </li>
  );
};
