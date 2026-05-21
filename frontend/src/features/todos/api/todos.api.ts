import { http } from '@/lib/api/http';
import type { Todo, TodoCriticality, TodoSnapshot } from '@/lib/types';

interface CreateTodoInput {
  title: string;
  description?: string;
  criticality?: TodoCriticality;
  createdById: string;
}

interface UpdateTodoInput {
  title?: string;
  description?: string | null;
  criticality?: TodoCriticality;
}

export const todosApi = {
  snapshot: (familyId: string) =>
    http.get<TodoSnapshot>(`/families/${familyId}/todos`),

  addTodo: (familyId: string, input: CreateTodoInput) =>
    http.post<Todo>(`/families/${familyId}/todos`, input),

  updateTodo: (id: string, changes: UpdateTodoInput) =>
    http.patch<Todo>(`/todos/${id}`, changes),

  toggleTodo: (id: string, memberId: string) =>
    http.post<Todo>(`/todos/${id}/toggle`, { memberId }),

  removeTodo: (id: string) => http.del<void>(`/todos/${id}`),

  addComment: (id: string, input: { authorId: string; body: string }) =>
    http.post<Todo>(`/todos/${id}/comments`, input),

  removeComment: (todoId: string, commentId: string) =>
    http.del<Todo>(`/todos/${todoId}/comments/${commentId}`),
};
