import { Todo } from '../entities/todo.entity';
import { TodoComment } from '../entities/todo-comment.entity';

export const TODO_REPOSITORY = Symbol('TODO_REPOSITORY');

export type NewTodo = Pick<
  Todo,
  'title' | 'description' | 'criticality' | 'familyId' | 'createdById'
>;

export type TodoChanges = Partial<
  Pick<
    Todo,
    | 'title'
    | 'description'
    | 'criticality'
    | 'status'
    | 'completedById'
    | 'completedAt'
  >
>;

export type NewTodoComment = Pick<TodoComment, 'todoId' | 'authorId' | 'body'>;

/**
 * Persistence port for the Todo aggregate (the to-do plus its comment
 * thread). Bound to a TypeORM adapter in the module — swap it or fake it in
 * tests with a one-line change (Dependency Inversion).
 */
export interface ITodoRepository {
  findByFamily(familyId: string): Promise<Todo[]>;
  findById(id: string): Promise<Todo | null>;
  create(data: NewTodo): Promise<Todo>;
  update(id: string, changes: TodoChanges): Promise<Todo>;
  remove(id: string): Promise<void>;
  addComment(data: NewTodoComment): Promise<TodoComment>;
  findCommentById(id: string): Promise<TodoComment | null>;
  removeComment(id: string): Promise<void>;
}
