import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@solidjs/testing-library';
import type { Project, ProjectTask } from '@/lib/types';
import type { ProjectItemActions } from '../store/projects-store';
import { ProjectCard } from './ProjectCard';

const task = (id: string, status: 'open' | 'done'): ProjectTask => ({
  id,
  title: `Tâche ${id}`,
  priority: 'medium',
  status,
  projectId: 'p1',
  assigneeId: null,
  createdById: 'm1',
  completedById: null,
  completedAt: null,
  comments: [],
  createdAt: '2026-01-01',
});

const baseProject: Project = {
  id: 'p1',
  name: 'Salle de bain',
  status: 'active',
  familyId: 'f',
  createdById: 'm1',
  archivedAt: null,
  tasks: [task('a', 'done'), task('b', 'open'), task('c', 'open')],
  createdAt: '2026-01-01',
};

const stubActions = (): ProjectItemActions => ({
  onRename: vi.fn(),
  onArchive: vi.fn(),
  onUnarchive: vi.fn(),
  onDelete: vi.fn(),
  onAddTask: vi.fn(),
  onToggleTask: vi.fn(),
  onEditTask: vi.fn(),
  onDeleteTask: vi.fn(),
  onAddComment: vi.fn(),
  onRemoveComment: vi.fn(),
});

const renderCard = (
  project: Project,
  over: Partial<Parameters<typeof ProjectCard>[0]> = {},
) =>
  render(() => (
    <ProjectCard
      project={project}
      me={undefined}
      members={[]}
      expanded={false}
      onToggleExpand={() => {}}
      actions={stubActions()}
      {...over}
    />
  ));

describe('<ProjectCard>', () => {
  it('shows the name and the done/total fraction', () => {
    const { getByText } = renderCard(baseProject);
    expect(getByText('Salle de bain')).toBeInTheDocument();
    expect(getByText('1/3')).toBeInTheDocument();
  });

  it('says so when the project has no task yet', () => {
    const { getByText } = renderCard({ ...baseProject, tasks: [] });
    expect(getByText('Aucune tâche')).toBeInTheDocument();
  });

  it('celebrates a fully-done project', () => {
    const done = {
      ...baseProject,
      tasks: [task('a', 'done'), task('b', 'done')],
    };
    const { getByText } = renderCard(done);
    expect(getByText('Terminé ✓')).toBeInTheDocument();
  });

  it('expands via the header', () => {
    const onToggleExpand = vi.fn();
    const { getByLabelText } = renderCard(baseProject, { onToggleExpand });
    fireEvent.click(getByLabelText('Ouvrir le projet Salle de bain'));
    expect(onToggleExpand).toHaveBeenCalled();
  });

  it('reveals the checklist and a folded composer that opens on demand', () => {
    const { getByText, getByLabelText, queryByLabelText } = renderCard(
      baseProject,
      { expanded: true },
    );
    expect(getByText('Tâche b')).toBeInTheDocument();
    expect(getByText('📦 Archiver')).toBeInTheDocument();
    // The form stays folded behind the "Ajouter une tâche" row…
    expect(queryByLabelText('Titre de la tâche')).toBeNull();
    fireEvent.click(getByText('Ajouter une tâche'));
    // …and unfolds on demand.
    expect(getByLabelText('Titre de la tâche')).toBeInTheDocument();
  });

  it('offers Réactiver instead of the composer on an archived project', () => {
    const archived: Project = {
      ...baseProject,
      status: 'archived',
      archivedAt: '2026-02-01',
    };
    const { getByText, queryByText } = renderCard(archived, {
      expanded: true,
    });
    expect(getByText('📦 Archivé')).toBeInTheDocument();
    expect(getByText('↩️ Réactiver')).toBeInTheDocument();
    expect(queryByText('Ajouter une tâche')).toBeNull();
  });
});
