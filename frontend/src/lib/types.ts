/**
 * Domain types mirrored from the backend API contract. Kept in one place so
 * the store, components and socket handlers all speak the same shape.
 */
export type MemberRole = 'parent' | 'child';

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

export interface CreateItemInput {
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
  categoryId?: string;
  addedById: string;
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
