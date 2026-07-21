import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectTask } from '../entities/project-task.entity';
import { ProjectTaskComment } from '../entities/project-task-comment.entity';
import {
  IProjectRepository,
  NewProject,
  NewProjectTask,
  NewTaskComment,
  ProjectChanges,
  ProjectTaskChanges,
} from './project.repository';

@Injectable()
export class TypeOrmProjectRepository implements IProjectRepository {
  constructor(
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    @InjectRepository(ProjectTask)
    private readonly tasks: Repository<ProjectTask>,
    @InjectRepository(ProjectTaskComment)
    private readonly comments: Repository<ProjectTaskComment>,
  ) {}

  private readonly relations = {
    createdBy: true,
    tasks: {
      assignee: true,
      createdBy: true,
      completedBy: true,
      comments: { author: true },
    },
  };

  findByFamily(familyId: string): Promise<Project[]> {
    return this.projects.find({
      where: { familyId },
      relations: this.relations,
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string): Promise<Project | null> {
    return this.projects.findOne({ where: { id }, relations: this.relations });
  }

  async create(data: NewProject): Promise<Project> {
    const saved = await this.projects.save(this.projects.create(data));
    return this.requireById(saved.id);
  }

  async update(id: string, changes: ProjectChanges): Promise<Project> {
    await this.projects.update({ id }, changes);
    return this.requireById(id);
  }

  async remove(id: string): Promise<void> {
    await this.projects.delete({ id });
  }

  findTaskById(id: string): Promise<ProjectTask | null> {
    return this.tasks.findOne({ where: { id } });
  }

  async addTask(data: NewProjectTask): Promise<ProjectTask> {
    return this.tasks.save(this.tasks.create(data));
  }

  async updateTask(id: string, changes: ProjectTaskChanges): Promise<void> {
    await this.tasks.update({ id }, changes);
  }

  async removeTask(id: string): Promise<void> {
    await this.tasks.delete({ id });
  }

  async addComment(data: NewTaskComment): Promise<ProjectTaskComment> {
    return this.comments.save(this.comments.create(data));
  }

  findCommentById(id: string): Promise<ProjectTaskComment | null> {
    return this.comments.findOne({ where: { id } });
  }

  async removeComment(id: string): Promise<void> {
    await this.comments.delete({ id });
  }

  private async requireById(id: string): Promise<Project> {
    const project = await this.findById(id);
    if (!project) {
      throw new Error(`Project ${id} vanished after write`);
    }
    return project;
  }
}
