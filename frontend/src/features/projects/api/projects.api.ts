import { http } from '@/lib/api/http';
import type {
  Project,
  ProjectSnapshot,
  ProjectTaskPriority,
} from '@/lib/types';

interface CreateTaskInput {
  title: string;
  priority?: ProjectTaskPriority;
  assigneeId?: string;
}

interface UpdateTaskInput {
  title?: string;
  priority?: ProjectTaskPriority;
  /** `null` unassigns; omit to leave the assignee unchanged. */
  assigneeId?: string | null;
}

/**
 * Every task/comment mutation answers with the full updated project — the
 * same payload the websocket broadcasts — so the store has a single
 * "upsert a project" path.
 */
export const projectsApi = {
  snapshot: (familyId: string) =>
    http.get<ProjectSnapshot>(`/families/${familyId}/projects`),

  addProject: (familyId: string, input: { name: string }) =>
    http.post<Project>(`/families/${familyId}/projects`, input),

  renameProject: (id: string, name: string) =>
    http.patch<Project>(`/projects/${id}`, { name }),

  archiveProject: (id: string) => http.post<Project>(`/projects/${id}/archive`),

  unarchiveProject: (id: string) =>
    http.post<Project>(`/projects/${id}/unarchive`),

  removeProject: (id: string) => http.del<void>(`/projects/${id}`),

  addTask: (projectId: string, input: CreateTaskInput) =>
    http.post<Project>(`/projects/${projectId}/tasks`, input),

  updateTask: (projectId: string, taskId: string, changes: UpdateTaskInput) =>
    http.patch<Project>(`/projects/${projectId}/tasks/${taskId}`, changes),

  toggleTask: (projectId: string, taskId: string) =>
    http.post<Project>(`/projects/${projectId}/tasks/${taskId}/toggle`),

  removeTask: (projectId: string, taskId: string) =>
    http.del<Project>(`/projects/${projectId}/tasks/${taskId}`),

  addComment: (projectId: string, taskId: string, input: { body: string }) =>
    http.post<Project>(`/projects/${projectId}/tasks/${taskId}/comments`, input),

  removeComment: (projectId: string, taskId: string, commentId: string) =>
    http.del<Project>(
      `/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
    ),
};
