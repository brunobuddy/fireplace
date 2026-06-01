import { http } from '@/lib/api/http';
import type { CreateItemInput, GroceryItem, ListSnapshot } from '@/lib/types';

interface UpdateItemInput {
  name?: string;
  quantity?: number;
  unit?: string | null;
  note?: string | null;
  categoryId?: string | null;
}

export const groceriesApi = {
  snapshot: (familyId: string) =>
    http.get<ListSnapshot>(`/families/${familyId}/grocery-list`),

  addItem: (listId: string, input: CreateItemInput) =>
    http.post<GroceryItem>(`/grocery-lists/${listId}/items`, input),

  updateItem: (id: string, changes: UpdateItemInput) =>
    http.patch<GroceryItem>(`/grocery-items/${id}`, changes),

  toggleItem: (id: string) =>
    http.post<GroceryItem>(`/grocery-items/${id}/toggle`),

  removeItem: (id: string) => http.del<void>(`/grocery-items/${id}`),

  clearCart: (listId: string) =>
    http.del<{ removedIds: string[] }>(`/grocery-lists/${listId}/cart`),
};
