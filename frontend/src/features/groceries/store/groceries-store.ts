import {
  type Accessor,
  createEffect,
  createMemo,
  on,
  onCleanup,
  onMount,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import type { GroceryCategory, GroceryItem, Member } from '@/lib/types';
import { GROCERY_EVENTS, getSocket } from '@/lib/socket/socket';
import { groceriesApi } from '../api/groceries.api';
import {
  doneItems,
  groupPendingByCategory,
  pendingCount,
  removeById,
  removeManyByIds,
  upsert,
} from './groceries.helpers';

type Status = 'loading' | 'ready' | 'error';

interface State {
  status: Status;
  error: string | null;
  listId: string | null;
  categories: GroceryCategory[];
  items: GroceryItem[];
}

export interface QuickAddInput {
  name: string;
  quantity?: number;
}

/**
 * The reactive heart of the grocery feature: one source of truth that
 * applies optimistic local changes *and* merges real-time updates from
 * other devices (everything is idempotent by item id, so HTTP responses and
 * socket broadcasts converge without flicker). Categorization happens
 * server-side after add, so the local optimistic row starts uncategorized
 * and the socket flips it once the LLM has answered.
 */
export function createGroceriesController(
  familyId: Accessor<string | undefined>,
  member: Accessor<Member | undefined>,
) {
  const [state, setState] = createStore<State>({
    status: 'loading',
    error: null,
    listId: null,
    categories: [],
    items: [],
  });

  const setItems = (next: GroceryItem[]): void => setState('items', next);

  async function reload(): Promise<void> {
    const id = familyId();
    if (!id) return;
    setState({ status: 'loading', error: null });
    try {
      const snap = await groceriesApi.snapshot(id);
      setState({
        status: 'ready',
        listId: snap.list.id,
        categories: snap.categories,
        items: snap.items,
      });
      joinRealtime(snap.list.id);
    } catch (err) {
      setState({ status: 'error', error: describe(err) });
    }
  }

  // ---- realtime ---------------------------------------------------------
  const socket = getSocket();
  let joinedList: string | null = null;

  function joinRealtime(listId: string): void {
    if (joinedList === listId) return;
    joinedList = listId;
    socket.emit(GROCERY_EVENTS.JOIN, listId);
  }

  const onAdded = (i: GroceryItem) => setItems(upsert(state.items, i));
  const onUpdated = (i: GroceryItem) => setItems(upsert(state.items, i));
  const onRemoved = (p: { id: string }) =>
    setItems(removeById(state.items, p.id));
  const onCleared = (p: { removedIds: string[] }) =>
    setItems(removeManyByIds(state.items, p.removedIds));

  onMount(() => {
    socket.on(GROCERY_EVENTS.ITEM_ADDED, onAdded);
    socket.on(GROCERY_EVENTS.ITEM_UPDATED, onUpdated);
    socket.on(GROCERY_EVENTS.ITEM_REMOVED, onRemoved);
    socket.on(GROCERY_EVENTS.CART_CLEARED, onCleared);
  });

  onCleanup(() => {
    socket.off(GROCERY_EVENTS.ITEM_ADDED, onAdded);
    socket.off(GROCERY_EVENTS.ITEM_UPDATED, onUpdated);
    socket.off(GROCERY_EVENTS.ITEM_REMOVED, onRemoved);
    socket.off(GROCERY_EVENTS.CART_CLEARED, onCleared);
  });

  // Load once the family resolves. The family resource is usually still
  // in-flight when this view mounts, so a one-shot reload in onMount would bail
  // on an undefined id and never retry (the page would hang on the spinner).
  // An effect re-runs the moment familyId becomes available.
  createEffect(on(familyId, () => void reload()));

  // ---- mutations (optimistic) ------------------------------------------
  async function addItem(input: QuickAddInput): Promise<void> {
    const me = member();
    if (!state.listId || !me) return;
    const temp = optimisticItem(input, state.listId, me);
    setItems(upsert(state.items, temp));
    try {
      const saved = await groceriesApi.addItem(state.listId, {
        name: input.name,
        quantity: input.quantity,
      });
      setItems(upsert(removeById(state.items, temp.id), saved));
    } catch (err) {
      setItems(removeById(state.items, temp.id));
      setState('error', describe(err));
    }
  }

  async function toggle(item: GroceryItem): Promise<void> {
    const me = member();
    if (!me) return;
    const isDone = item.status === 'done';
    setItems(
      upsert(state.items, {
        ...item,
        status: isDone ? 'pending' : 'done',
        checkedById: isDone ? null : me.id,
        checkedBy: isDone ? null : me,
      }),
    );
    try {
      const saved = await groceriesApi.toggleItem(item.id);
      setItems(upsert(state.items, saved));
    } catch (err) {
      setItems(upsert(state.items, item));
      setState('error', describe(err));
    }
  }

  async function remove(item: GroceryItem): Promise<void> {
    setItems(removeById(state.items, item.id));
    try {
      await groceriesApi.removeItem(item.id);
    } catch (err) {
      setItems(upsert(state.items, item));
      setState('error', describe(err));
    }
  }

  async function clearCart(): Promise<void> {
    if (!state.listId) return;
    const snapshot = state.items;
    setItems(state.items.filter((i) => i.status !== 'done'));
    try {
      await groceriesApi.clearCart(state.listId);
    } catch (err) {
      setItems(snapshot);
      setState('error', describe(err));
    }
  }

  /**
   * Manual re-categorize (drag-and-drop on desktop, picker tap on mobile).
   * Optimistic, idempotent: if the row is already in `categoryId`, no-op.
   */
  async function move(
    item: GroceryItem,
    categoryId: string | null,
  ): Promise<void> {
    if (item.categoryId === categoryId) return;
    const previous = item;
    setItems(upsert(state.items, { ...item, categoryId }));
    try {
      const saved = await groceriesApi.updateItem(item.id, { categoryId });
      setItems(upsert(state.items, saved));
    } catch (err) {
      setItems(upsert(state.items, previous));
      setState('error', describe(err));
    }
  }

  // ---- derived view models ---------------------------------------------
  const groups = createMemo(() =>
    groupPendingByCategory(state.items, state.categories),
  );
  const cart = createMemo(() => doneItems(state.items));
  const remaining = createMemo(() => pendingCount(state.items));

  function clearError(): void {
    setState('error', null);
  }

  return {
    state,
    groups,
    cart,
    remaining,
    actions: { addItem, toggle, remove, clearCart, move, reload, clearError },
  };
}

function optimisticItem(
  input: QuickAddInput,
  listId: string,
  me: Member,
): GroceryItem {
  return {
    id: `tmp-${crypto.randomUUID()}`,
    name: input.name,
    quantity: input.quantity ?? 1,
    unit: null,
    note: null,
    status: 'pending',
    listId,
    categoryId: null,
    addedById: me.id,
    checkedById: null,
    addedBy: me,
    checkedBy: null,
    createdAt: new Date().toISOString(),
  };
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}
