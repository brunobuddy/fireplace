import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../../family/entities/family.entity';
import { Project } from '../entities/project.entity';
import {
  IProjectRepository,
  PROJECT_REPOSITORY,
} from '../repositories/project.repository';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectsGateway } from '../gateways/projects.gateway';
import { NotificationsService } from '../../notifications/services/notifications.service';

export interface ProjectSnapshot {
  projects: Project[];
}

/**
 * Project-level use cases: list, create, rename, archive/unarchive, delete.
 * Task-level operations live in `ProjectTasksService` so each class keeps a
 * single reason to change (SRP).
 */
@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projects: IProjectRepository,
    @InjectRepository(Family)
    private readonly families: Repository<Family>,
    private readonly gateway: ProjectsGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async getSnapshotForFamily(familyId: string): Promise<ProjectSnapshot> {
    const projects = await this.projects.findByFamily(familyId);
    return { projects };
  }

  async addProject(
    familyId: string,
    dto: CreateProjectDto,
    memberId: string,
  ): Promise<Project> {
    await this.requireFamily(familyId);
    const project = await this.projects.create({
      familyId,
      name: dto.name.trim(),
      createdById: memberId,
    });
    this.gateway.emitProjectAdded(project);
    // Fire-and-forget: tell the rest of the family, never block the create.
    void this.notifications.notifyOthers(memberId, familyId, (actor) => ({
      title: 'Projets 🎯',
      body: `${actor} a créé le projet « ${project.name} »`,
      url: '/projects',
      tag: `project-${project.id}`,
    }));
    return project;
  }

  async updateProject(id: string, dto: UpdateProjectDto): Promise<Project> {
    const current = await this.requireProject(id);
    if (dto.name === undefined) {
      return current;
    }
    const updated = await this.projects.update(id, { name: dto.name.trim() });
    this.gateway.emitProjectUpdated(updated);
    return updated;
  }

  /**
   * Archiving closes a project without losing its history; unarchiving brings
   * it back to the board. Idempotent — re-archiving an archived project is a
   * no-op (no write, no broadcast).
   */
  async setArchived(id: string, archived: boolean): Promise<Project> {
    const current = await this.requireProject(id);
    const status = archived ? 'archived' : 'active';
    if (current.status === status) {
      return current;
    }
    const updated = await this.projects.update(id, {
      status,
      archivedAt: archived ? new Date().toISOString() : null,
    });
    this.gateway.emitProjectUpdated(updated);
    return updated;
  }

  async removeProject(id: string): Promise<void> {
    const project = await this.requireProject(id);
    await this.projects.remove(id);
    this.gateway.emitProjectRemoved({ id, familyId: project.familyId });
  }

  private async requireFamily(familyId: string): Promise<Family> {
    const family = await this.families.findOne({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException(`Famille ${familyId} introuvable`);
    }
    return family;
  }

  private async requireProject(id: string): Promise<Project> {
    const project = await this.projects.findById(id);
    if (!project) {
      throw new NotFoundException(`Projet ${id} introuvable`);
    }
    return project;
  }
}
