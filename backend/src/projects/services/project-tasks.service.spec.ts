import { NotFoundException } from '@nestjs/common';
import { ProjectTasksService } from './project-tasks.service';
import { IProjectRepository } from '../repositories/project.repository';
import { Project } from '../entities/project.entity';
import { ProjectTask } from '../entities/project-task.entity';
import { ProjectsGateway } from '../gateways/projects.gateway';

const makeProject = (over: Partial<Project> = {}): Project =>
  ({
    id: 'proj-1',
    name: 'Redo the bathroom',
    status: 'active',
    familyId: 'fam-1',
    createdById: 'mem-1',
    archivedAt: null,
    tasks: [],
    ...over,
  }) as Project;

const makeTask = (over: Partial<ProjectTask> = {}): ProjectTask =>
  ({
    id: 'task-1',
    title: 'Choose the tiles',
    priority: 'medium',
    status: 'open',
    projectId: 'proj-1',
    assigneeId: null,
    createdById: 'mem-1',
    completedById: null,
    completedAt: null,
    comments: [],
    ...over,
  }) as ProjectTask;

describe('ProjectTasksService', () => {
  let repo: jest.Mocked<IProjectRepository>;
  let gateway: jest.Mocked<Pick<ProjectsGateway, 'emitProjectUpdated'>>;
  let members: { findOne: jest.Mock };
  let notifications: { notifyOthers: jest.Mock };
  let service: ProjectTasksService;

  beforeEach(() => {
    repo = {
      findByFamily: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findTaskById: jest.fn(),
      addTask: jest.fn(),
      updateTask: jest.fn(),
      removeTask: jest.fn(),
      addComment: jest.fn(),
      findCommentById: jest.fn(),
      removeComment: jest.fn(),
    };
    gateway = { emitProjectUpdated: jest.fn() };
    members = { findOne: jest.fn() };
    notifications = { notifyOthers: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectTasksService(
      repo,
      members as never,
      gateway as never,
      notifications as never,
    );
  });

  describe('addTask', () => {
    it('trims the title, defaults priority, stamps the creator, re-broadcasts the project', async () => {
      const project = makeProject();
      repo.findById.mockResolvedValue(project);

      const result = await service.addTask(
        'proj-1',
        { title: '  Choose the tiles  ' },
        'mem-1',
      );

      expect(repo.addTask).toHaveBeenCalledWith({
        projectId: 'proj-1',
        title: 'Choose the tiles',
        priority: 'medium',
        assigneeId: null,
        createdById: 'mem-1',
      });
      expect(gateway.emitProjectUpdated).toHaveBeenCalledWith(project);
      expect(result).toBe(project);
    });

    it('accepts an assignee from the same family', async () => {
      repo.findById.mockResolvedValue(makeProject({ familyId: 'fam-1' }));
      members.findOne.mockResolvedValue({ id: 'mem-2' });

      await service.addTask(
        'proj-1',
        { title: 'Paint', priority: 'blocking', assigneeId: 'mem-2' },
        'mem-1',
      );

      expect(members.findOne).toHaveBeenCalledWith({
        where: { id: 'mem-2', familyId: 'fam-1' },
      });
      expect(repo.addTask).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: 'mem-2', priority: 'blocking' }),
      );
    });

    it('rejects an assignee outside the family', async () => {
      repo.findById.mockResolvedValue(makeProject());
      members.findOne.mockResolvedValue(null);

      await expect(
        service.addTask('proj-1', { title: 'X', assigneeId: 'ghost' }, 'mem-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.addTask).not.toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('unassigns with an explicit null without looking up a member', async () => {
      repo.findById.mockResolvedValue(makeProject());
      repo.findTaskById.mockResolvedValue(makeTask({ assigneeId: 'mem-2' }));

      await service.updateTask('proj-1', 'task-1', { assigneeId: null });

      expect(members.findOne).not.toHaveBeenCalled();
      expect(repo.updateTask).toHaveBeenCalledWith('task-1', {
        assigneeId: null,
      });
    });

    it('rejects a task that belongs to another project', async () => {
      repo.findById.mockResolvedValue(makeProject());
      repo.findTaskById.mockResolvedValue(makeTask({ projectId: 'other' }));

      await expect(
        service.updateTask('proj-1', 'task-1', { title: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.updateTask).not.toHaveBeenCalled();
    });

    it('is a no-op (no write, no broadcast) when nothing changes', async () => {
      const project = makeProject();
      repo.findById.mockResolvedValue(project);
      repo.findTaskById.mockResolvedValue(makeTask());

      const result = await service.updateTask('proj-1', 'task-1', {});

      expect(repo.updateTask).not.toHaveBeenCalled();
      expect(gateway.emitProjectUpdated).not.toHaveBeenCalled();
      expect(result).toBe(project);
    });
  });

  describe('toggleTask', () => {
    it('marks an open task done, stamping who and when', async () => {
      repo.findById.mockResolvedValue(makeProject());
      repo.findTaskById.mockResolvedValue(makeTask({ status: 'open' }));

      await service.toggleTask('proj-1', 'task-1', 'mem-2');

      expect(repo.updateTask).toHaveBeenCalledWith('task-1', {
        status: 'done',
        completedById: 'mem-2',
        completedAt: expect.any(String),
      });
      expect(gateway.emitProjectUpdated).toHaveBeenCalled();
    });

    it('reopens a done task and clears the completion stamps', async () => {
      repo.findById.mockResolvedValue(makeProject());
      repo.findTaskById.mockResolvedValue(makeTask({ status: 'done' }));

      await service.toggleTask('proj-1', 'task-1', 'mem-2');

      expect(repo.updateTask).toHaveBeenCalledWith('task-1', {
        status: 'open',
        completedById: null,
        completedAt: null,
      });
    });
  });

  describe('comments', () => {
    it('persists a trimmed comment stamped with the signed-in member', async () => {
      repo.findById.mockResolvedValue(makeProject());
      repo.findTaskById.mockResolvedValue(makeTask());

      await service.addComment(
        'proj-1',
        'task-1',
        { body: '  On it!  ' },
        'mem-2',
      );

      expect(repo.addComment).toHaveBeenCalledWith({
        taskId: 'task-1',
        authorId: 'mem-2',
        body: 'On it!',
      });
      expect(gateway.emitProjectUpdated).toHaveBeenCalled();
    });

    it('rejects removing a comment that belongs to another task', async () => {
      repo.findById.mockResolvedValue(makeProject());
      repo.findTaskById.mockResolvedValue(makeTask());
      repo.findCommentById.mockResolvedValue({
        id: 'c1',
        taskId: 'other',
      } as never);

      await expect(
        service.removeComment('proj-1', 'task-1', 'c1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.removeComment).not.toHaveBeenCalled();
    });
  });

  describe('removeTask', () => {
    it('removes the task and re-broadcasts the project', async () => {
      const project = makeProject();
      repo.findById.mockResolvedValue(project);
      repo.findTaskById.mockResolvedValue(makeTask());

      const result = await service.removeTask('proj-1', 'task-1');

      expect(repo.removeTask).toHaveBeenCalledWith('task-1');
      expect(gateway.emitProjectUpdated).toHaveBeenCalledWith(project);
      expect(result).toBe(project);
    });
  });
});
