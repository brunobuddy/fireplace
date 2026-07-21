import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@solidjs/testing-library';
import type { Member, Project, ProjectTask } from '@/lib/types';
import type { ProjectItemActions } from '../store/projects-store';
import { TaskRow } from './TaskRow';

const audrey: Member = {
  id: 'm2',
  name: 'Audrey',
  role: 'parent',
  color: '#c96',
  familyId: 'f',
};

const baseTask: ProjectTask = {
  id: 't1',
  title: 'Choisir le carrelage',
  priority: 'blocking',
  status: 'open',
  projectId: 'p1',
  assigneeId: 'm2',
  assignee: audrey,
  createdById: 'm1',
  createdBy: {
    id: 'm1',
    name: 'Bruno',
    role: 'parent',
    color: '#abc',
    familyId: 'f',
  },
  completedById: null,
  completedBy: null,
  completedAt: null,
  comments: [
    {
      id: 'c1',
      taskId: 't1',
      authorId: 'm1',
      body: 'ok',
      createdAt: '2026-01-01',
    },
  ],
  createdAt: '2026-01-01',
};

const baseProject: Project = {
  id: 'p1',
  name: 'Salle de bain',
  status: 'active',
  familyId: 'f',
  createdById: 'm1',
  archivedAt: null,
  tasks: [baseTask],
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

const renderRow = (
  task: ProjectTask,
  over: Partial<Parameters<typeof TaskRow>[0]> = {},
) =>
  render(() => (
    <TaskRow
      project={baseProject}
      task={task}
      me={undefined}
      members={[audrey]}
      expanded={false}
      onToggleExpand={() => {}}
      actions={stubActions()}
      {...over}
    />
  ));

describe('<TaskRow>', () => {
  it('renders the title, the blocking pill, the comment count and the assignee', () => {
    const { getByText, getByLabelText, getByTitle } = renderRow(baseTask);
    expect(getByText('Choisir le carrelage')).toBeInTheDocument();
    expect(getByText(/Bloquant/)).toBeInTheDocument();
    expect(getByLabelText('1 commentaire')).toBeInTheDocument();
    expect(getByTitle('Responsable : Audrey')).toBeInTheDocument();
  });

  it('keeps medium priority quiet (no pill)', () => {
    const { queryByText } = renderRow({ ...baseTask, priority: 'medium' });
    expect(queryByText(/Moyenne/)).toBeNull();
  });

  it('toggles done via the checkbox and expands via the body', () => {
    const actions = stubActions();
    const onToggleExpand = vi.fn();
    const { getByLabelText } = renderRow(baseTask, {
      actions,
      onToggleExpand,
    });
    fireEvent.click(
      getByLabelText('Marquer comme fait : Choisir le carrelage'),
    );
    expect(actions.onToggleTask).toHaveBeenCalledWith(baseProject, baseTask);
    fireEvent.click(getByLabelText('Ouvrir Choisir le carrelage'));
    expect(onToggleExpand).toHaveBeenCalled();
  });

  it('reveals the pickers and the comment composer when expanded', () => {
    const { getByLabelText } = renderRow(baseTask, { expanded: true });
    expect(getByLabelText('Changer la priorité')).toBeInTheDocument();
    expect(getByLabelText('Responsable')).toBeInTheDocument();
    expect(getByLabelText('Écrire un commentaire')).toBeInTheDocument();
  });
});
