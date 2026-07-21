/**
 * Domain types mirrored from the backend API contract. Kept in one place so
 * the store, components and socket handlers all speak the same shape.
 */
export type MemberRole = 'parent' | 'child';

/**
 * The signed-in user. Login = identity in this app — the JWT carries the full
 * member profile so writes are attributed server-side without the client ever
 * declaring "who I am" in a request body.
 */
export interface AuthUser {
  memberId: string;
  familyId: string;
  email: string;
  name: string;
  role: MemberRole;
  color: string;
}

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  color: string;
  familyId: string;
}

export interface Family {
  id: string;
  name: string;
}

export interface GroceryCategory {
  id: string;
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
}

export type GroceryItemStatus = 'pending' | 'done';

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  note: string | null;
  status: GroceryItemStatus;
  listId: string;
  categoryId: string | null;
  addedById: string;
  checkedById: string | null;
  addedBy?: Member | null;
  checkedBy?: Member | null;
  createdAt: string;
}

export interface GroceryList {
  id: string;
  name: string;
  familyId: string;
}

export interface ListSnapshot {
  list: GroceryList;
  categories: GroceryCategory[];
  items: GroceryItem[];
}

/**
 * The add-item payload. The category is intentionally not here — the server
 * auto-categorizes via the LLM router. Users re-bucket via the per-row
 * picker (or drag-and-drop) using the PATCH endpoint.
 */
export interface CreateItemInput {
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
}

export type TodoCriticality = 'low' | 'medium' | 'high';
export type TodoStatus = 'open' | 'done';

export interface TodoComment {
  id: string;
  todoId: string;
  authorId: string;
  author?: Member | null;
  body: string;
  createdAt: string;
}

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  criticality: TodoCriticality;
  status: TodoStatus;
  familyId: string;
  createdById: string;
  completedById: string | null;
  completedAt: string | null;
  createdBy?: Member | null;
  completedBy?: Member | null;
  comments: TodoComment[];
  createdAt: string;
}

export interface TodoSnapshot {
  todos: Todo[];
}

// ── Projects (task batches with a responsible member per task) ────────────
export type ProjectStatus = 'active' | 'archived';
/** Adds `blocking` above the to-do levels: the step the project is stuck on. */
export type ProjectTaskPriority = 'low' | 'medium' | 'high' | 'blocking';
export type ProjectTaskStatus = 'open' | 'done';

export interface ProjectTaskComment {
  id: string;
  taskId: string;
  authorId: string;
  author?: Member | null;
  body: string;
  createdAt: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  priority: ProjectTaskPriority;
  status: ProjectTaskStatus;
  projectId: string;
  /** Exactly one responsible member — or nobody. */
  assigneeId: string | null;
  assignee?: Member | null;
  createdById: string;
  createdBy?: Member | null;
  completedById: string | null;
  completedBy?: Member | null;
  completedAt: string | null;
  comments: ProjectTaskComment[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  familyId: string;
  createdById: string;
  createdBy?: Member | null;
  archivedAt: string | null;
  tasks: ProjectTask[];
  createdAt: string;
}

export interface ProjectSnapshot {
  projects: Project[];
}

// ── Spark (daily two-parent bonding question) ─────────────────────────────
export interface SparkQuestionView {
  id: string;
  text: string;
  createdAt: string;
}

export interface SparkParticipantView {
  memberId: string;
  name: string;
  color: string;
  hasAnswered: boolean;
  answeredAt: string | null;
  /** Redacted to null unless it's the viewer's own answer, or both have answered. */
  text: string | null;
  isViewer: boolean;
}

export interface SparkView {
  question: SparkQuestionView | null;
  participants: SparkParticipantView[];
  /** Both parents have answered → both texts are visible. */
  revealed: boolean;
  /** Is the viewer one of the two parents (allowed to answer)? */
  viewerIsParticipant: boolean;
  viewerHasAnswered: boolean;
}
