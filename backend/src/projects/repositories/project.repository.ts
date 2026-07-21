import { Project } from '../entities/project.entity';
import { ProjectTask } from '../entities/project-task.entity';
import { ProjectTaskComment } from '../entities/project-task-comment.entity';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

export type NewProject = Pick<Project, 'name' | 'familyId' | 'createdById'>;

export type ProjectChanges = Partial<
  Pick<Project, 'name' | 'status' | 'archivedAt'>
>;

export type NewProjectTask = Pick<
  ProjectTask,
  'projectId' | 'title' | 'priority' | 'assigneeId' | 'createdById'
>;

export type ProjectTaskChanges = Partial<
  Pick<
    ProjectTask,
    | 'title'
    | 'priority'
    | 'assigneeId'
    | 'status'
    | 'completedById'
    | 'completedAt'
  >
>;

export type NewTaskComment = Pick<
  ProjectTaskComment,
  'taskId' | 'authorId' | 'body'
>;

/**
 * Persistence port for the Project aggregate (the project, its tasks and
 * their comment threads). Bound to a TypeORM adapter in the module — swap it
 * or fake it in tests with a one-line change (Dependency Inversion).
 *
 * Task and comment writes return no aggregate on purpose: every mutation is
 * followed by a full re-read of the project (the broadcast payload), so the
 * write methods stay dumb.
 */
export interface IProjectRepository {
  findByFamily(familyId: string): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  create(data: NewProject): Promise<Project>;
  update(id: string, changes: ProjectChanges): Promise<Project>;
  remove(id: string): Promise<void>;
  findTaskById(id: string): Promise<ProjectTask | null>;
  addTask(data: NewProjectTask): Promise<ProjectTask>;
  updateTask(id: string, changes: ProjectTaskChanges): Promise<void>;
  removeTask(id: string): Promise<void>;
  addComment(data: NewTaskComment): Promise<ProjectTaskComment>;
  findCommentById(id: string): Promise<ProjectTaskComment | null>;
  removeComment(id: string): Promise<void>;
}
