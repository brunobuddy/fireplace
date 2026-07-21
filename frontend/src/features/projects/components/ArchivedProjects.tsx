import { type Component, For, Show, createSignal } from 'solid-js';
import type { Member, Project } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { ProjectItemActions } from '../store/projects-store';
import { ProjectCard } from './ProjectCard';

interface Props {
  projects: Project[];
  me: Member | undefined;
  members: Member[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  actions: ProjectItemActions;
}

/** Closed projects, tucked into a collapsible shelf — hidden by default. */
export const ArchivedProjects: Component<Props> = (props) => {
  const [open, setOpen] = createSignal(false);
  return (
    <section class="mb-6 mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open()}
        class="mb-2 flex w-full items-center gap-2 rounded-lg px-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted/60"
      >
        <span class="text-lg" aria-hidden="true">
          📦
        </span>
        <h2 class="font-display text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          Projets archivés
        </h2>
        <Badge variant="muted" size="sm" class="ml-auto">
          {props.projects.length}
        </Badge>
        <span
          class={cn(
            'text-muted-foreground transition-transform',
            open() && 'rotate-180',
          )}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      <Show when={open()}>
        <ul class="flex animate-fade-in-up flex-col gap-3">
          <For each={props.projects}>
            {(project) => (
              <ProjectCard
                project={project}
                me={props.me}
                members={props.members}
                expanded={props.expandedId === project.id}
                onToggleExpand={() => props.onToggleExpand(project.id)}
                actions={props.actions}
              />
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
};
