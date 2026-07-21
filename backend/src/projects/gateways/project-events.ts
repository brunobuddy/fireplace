import { Project } from '../entities/project.entity';

/**
 * Websocket event contract for the projects board — the frontend mirrors
 * these names. Task and comment changes fold into `PROJECT_UPDATED`: any
 * mutation re-emits the full project (tasks + threads), so clients keep a
 * single idempotent "upsert a project by id" code path — the same design the
 * to-do board uses one aggregate level down.
 */
export const PROJECT_EVENTS = {
  JOIN: 'project:join',
  PROJECT_ADDED: 'project:added',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_REMOVED: 'project:removed',
} as const;

export const familyProjectsRoom = (familyId: string): string =>
  `family-projects:${familyId}`;

export interface ProjectRemovedPayload {
  id: string;
  familyId: string;
}

export type ProjectPayload = Project;
