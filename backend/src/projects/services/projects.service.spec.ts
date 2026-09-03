import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { IProjectRepository } from '../repositories/project.repository';
import { Project } from '../entities/project.entity';
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

const makeRepo = (): jest.Mocked<IProjectRepository> => ({
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
});

describe('ProjectsService', () => {
  let projects: jest.Mocked<IProjectRepository>;
  let gateway: jest.Mocked<
    Pick<
      ProjectsGateway,
      'emitProjectAdded' | 'emitProjectUpdated' | 'emitProjectRemoved'
    >
  >;
  let families: { findOne: jest.Mock };
  let notifications: { notifyOthers: jest.Mock };
  let service: ProjectsService;

  beforeEach(() => {
    projects = makeRepo();
    gateway = {
      emitProjectAdded: jest.fn(),
      emitProjectUpdated: jest.fn(),
      emitProjectRemoved: jest.fn(),
    };
    families = { findOne: jest.fn() };
    notifications = { notifyOthers: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectsService(
      projects,
      families as never,
      gateway as never,
      notifications as never,
    );
  });

  describe('addProject', () => {
    it('trims the name, stamps the signed-in member, broadcasts', async () => {
      families.findOne.mockResolvedValue({ id: 'fam-1' });
      const created = makeProject();
      projects.create.mockResolvedValue(created);

      const result = await service.addProject(
        'fam-1',
        { name: '  Redo the bathroom  ' },
        'mem-1',
      );

      expect(projects.create).toHaveBeenCalledWith({
        familyId: 'fam-1',
        name: 'Redo the bathroom',
        createdById: 'mem-1',
      });
      expect(gateway.emitProjectAdded).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('rejects when the family does not exist', async () => {
      families.findOne.mockResolvedValue(null);
      await expect(
        service.addProject('missing', { name: 'X' }, 'mem-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(projects.create).not.toHaveBeenCalled();
    });
  });

  describe('updateProject', () => {
    it('renames (trimmed) and broadcasts', async () => {
      projects.findById.mockResolvedValue(makeProject());
      const renamed = makeProject({ name: 'Summer trip' });
      projects.update.mockResolvedValue(renamed);

      const result = await service.updateProject('proj-1', {
        name: '  Summer trip ',
      });

      expect(projects.update).toHaveBeenCalledWith('proj-1', {
        name: 'Summer trip',
      });
      expect(gateway.emitProjectUpdated).toHaveBeenCalledWith(renamed);
      expect(result).toBe(renamed);
    });

    it('is a no-op (no write, no broadcast) when no name is sent', async () => {
      const current = makeProject();
      projects.findById.mockResolvedValue(current);

      const result = await service.updateProject('proj-1', {});

      expect(projects.update).not.toHaveBeenCalled();
      expect(gateway.emitProjectUpdated).not.toHaveBeenCalled();
      expect(result).toBe(current);
    });
  });

  describe('setArchived', () => {
    it('archives an active project, stamping when', async () => {
      projects.findById.mockResolvedValue(makeProject({ status: 'active' }));
      const archived = makeProject({ status: 'archived' });
      projects.update.mockResolvedValue(archived);

      const result = await service.setArchived('proj-1', true);

      expect(projects.update).toHaveBeenCalledWith('proj-1', {
        status: 'archived',
        archivedAt: expect.any(String),
      });
      expect(gateway.emitProjectUpdated).toHaveBeenCalledWith(archived);
      expect(result.status).toBe('archived');
    });

    it('unarchives and clears the stamp', async () => {
      projects.findById.mockResolvedValue(makeProject({ status: 'archived' }));
      projects.update.mockResolvedValue(makeProject({ status: 'active' }));

      await service.setArchived('proj-1', false);

      expect(projects.update).toHaveBeenCalledWith('proj-1', {
        status: 'active',
        archivedAt: null,
      });
    });

    it('is idempotent: archiving an archived project writes nothing', async () => {
      const current = makeProject({ status: 'archived' });
      projects.findById.mockResolvedValue(current);

      const result = await service.setArchived('proj-1', true);

      expect(projects.update).not.toHaveBeenCalled();
      expect(gateway.emitProjectUpdated).not.toHaveBeenCalled();
      expect(result).toBe(current);
    });
  });

  describe('removeProject', () => {
    it('removes the project and broadcasts the removal', async () => {
      projects.findById.mockResolvedValue(makeProject({ familyId: 'fam-9' }));

      await service.removeProject('proj-1');

      expect(projects.remove).toHaveBeenCalledWith('proj-1');
      expect(gateway.emitProjectRemoved).toHaveBeenCalledWith({
        id: 'proj-1',
        familyId: 'fam-9',
      });
    });

    it('rejects an unknown project', async () => {
      projects.findById.mockResolvedValue(null);
      await expect(service.removeProject('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(projects.remove).not.toHaveBeenCalled();
    });
  });
});
