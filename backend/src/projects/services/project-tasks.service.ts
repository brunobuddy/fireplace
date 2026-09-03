import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../../family/entities/member.entity';
import { Project } from '../entities/project.entity';
import { ProjectTask } from '../entities/project-task.entity';
import {
  IProjectRepository,
  PROJECT_REPOSITORY,
  ProjectTaskChanges,
} from '../repositories/project.repository';
import { CreateProjectTaskDto } from '../dto/create-project-task.dto';
import { UpdateProjectTaskDto } from '../dto/update-project-task.dto';
import { CreateTaskCommentDto } from '../dto/create-task-comment.dto';
import { ProjectsGateway } from '../gateways/projects.gateway';
import { NotificationsService } from '../../notifications/services/notifications.service';

/**
 * Task- and comment-level use cases inside a project. Every mutation ends the
 * same way: re-read the whole project and broadcast it, so HTTP responses and
 * socket payloads are the same idempotent "here is the project now" truth.
 */
@Injectable()
export class ProjectTasksService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projects: IProjectRepository,
    @InjectRepository(Member)
    private readonly members: Repository<Member>,
    private readonly gateway: ProjectsGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async addTask(
    projectId: string,
    dto: CreateProjectTaskDto,
    memberId: string,
  ): Promise<Project> {
    const project = await this.requireProject(projectId);
    const assigneeId = await this.resolveAssignee(
      dto.assigneeId,
      project.familyId,
    );
    const title = dto.title.trim();
    await this.projects.addTask({
      projectId,
      title,
      priority: dto.priority ?? 'medium',
      assigneeId,
      createdById: memberId,
    });
    // Fire-and-forget: tell the rest of the family, never block the add.
    void this.notifications.notifyOthers(
      memberId,
      project.familyId,
      (actor) => ({
        title: 'Projets 🎯',
        body: `${actor} a ajouté « ${title} » au projet « ${project.name} »`,
        url: '/projects',
        tag: `project-task-${projectId}`,
      }),
    );
    return this.broadcast(projectId);
  }

  async updateTask(
    projectId: string,
    taskId: string,
    dto: UpdateProjectTaskDto,
  ): Promise<Project> {
    const { project } = await this.requireTask(projectId, taskId);
    const changes = await this.buildTaskChanges(dto, project.familyId);
    if (Object.keys(changes).length === 0) {
      return project;
    }
    await this.projects.updateTask(taskId, changes);
    return this.broadcast(projectId);
  }

  async toggleTask(
    projectId: string,
    taskId: string,
    memberId: string,
  ): Promise<Project> {
    const { task } = await this.requireTask(projectId, taskId);
    const nowDone = task.status !== 'done';
    await this.projects.updateTask(taskId, {
      status: nowDone ? 'done' : 'open',
      completedById: nowDone ? memberId : null,
      completedAt: nowDone ? new Date().toISOString() : null,
    });
    return this.broadcast(projectId);
  }

  async removeTask(projectId: string, taskId: string): Promise<Project> {
    await this.requireTask(projectId, taskId);
    await this.projects.removeTask(taskId);
    return this.broadcast(projectId);
  }

  async addComment(
    projectId: string,
    taskId: string,
    dto: CreateTaskCommentDto,
    memberId: string,
  ): Promise<Project> {
    const { project, task } = await this.requireTask(projectId, taskId);
    await this.projects.addComment({
      taskId,
      authorId: memberId,
      body: dto.body.trim(),
    });
    void this.notifications.notifyOthers(
      memberId,
      project.familyId,
      (actor) => ({
        title: 'Projets 💬',
        body: `${actor} a commenté « ${task.title} »`,
        url: '/projects',
        tag: `project-comment-${taskId}`,
      }),
    );
    return this.broadcast(projectId);
  }

  async removeComment(
    projectId: string,
    taskId: string,
    commentId: string,
  ): Promise<Project> {
    await this.requireTask(projectId, taskId);
    const comment = await this.projects.findCommentById(commentId);
    if (!comment || comment.taskId !== taskId) {
      throw new NotFoundException(`Commentaire ${commentId} introuvable`);
    }
    await this.projects.removeComment(commentId);
    return this.broadcast(projectId);
  }

  private async buildTaskChanges(
    dto: UpdateProjectTaskDto,
    familyId: string,
  ): Promise<ProjectTaskChanges> {
    const changes: ProjectTaskChanges = {};
    if (dto.title !== undefined) {
      changes.title = dto.title.trim();
    }
    if (dto.priority !== undefined) {
      changes.priority = dto.priority;
    }
    if (dto.assigneeId !== undefined) {
      changes.assigneeId = await this.resolveAssignee(dto.assigneeId, familyId);
    }
    return changes;
  }

  /**
   * `null`/`undefined` → unassigned; otherwise the member must belong to the
   * project's family — the API never lets a task point outside the household.
   */
  private async resolveAssignee(
    assigneeId: string | null | undefined,
    familyId: string,
  ): Promise<string | null> {
    if (!assigneeId) {
      return null;
    }
    const member = await this.members.findOne({
      where: { id: assigneeId, familyId },
    });
    if (!member) {
      throw new NotFoundException(
        `Membre ${assigneeId} introuvable dans cette famille`,
      );
    }
    return assigneeId;
  }

  /** Re-read the aggregate and push it to the family room. */
  private async broadcast(projectId: string): Promise<Project> {
    const project = await this.requireProject(projectId);
    this.gateway.emitProjectUpdated(project);
    return project;
  }

  private async requireProject(id: string): Promise<Project> {
    const project = await this.projects.findById(id);
    if (!project) {
      throw new NotFoundException(`Projet ${id} introuvable`);
    }
    return project;
  }

  private async requireTask(
    projectId: string,
    taskId: string,
  ): Promise<{ project: Project; task: ProjectTask }> {
    const project = await this.requireProject(projectId);
    const task = await this.projects.findTaskById(taskId);
    if (!task || task.projectId !== projectId) {
      throw new NotFoundException(`Tâche ${taskId} introuvable`);
    }
    return { project, task };
  }
}
