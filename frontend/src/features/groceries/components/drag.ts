/**
 * Shared HTML5 drag-and-drop contract for moving an item between categories.
 * The grocery row is the drag source; each CategorySection is a drop target.
 * On drop the section calls `move(item, categoryId)` on the store, which
 * fires the same PATCH the per-row picker uses — DnD is just an alternative
 * input on the same path.
 *
 * Touch devices (where HTML5 DnD doesn't work well) use the row's category
 * chip picker instead — that's why the dropdown carries the same list.
 */
export const DRAG_MIME = 'application/x-fireplace-grocery-item';

export interface DragPayload {
  itemId: string;
}
