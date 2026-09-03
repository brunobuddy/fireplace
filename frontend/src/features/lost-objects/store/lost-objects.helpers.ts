import type { LostObject, LostObjectComment } from '@/lib/types';

/** Pure list operations — kept side-effect free so they're unit-testable. */

export function upsert(objects: LostObject[], next: LostObject): LostObject[] {
  const idx = objects.findIndex((o) => o.id === next.id);
  if (idx === -1) {
    return [...objects, next];
  }
  const copy = objects.slice();
  copy[idx] = next;
  return copy;
}

export function removeById(objects: LostObject[], id: string): LostObject[] {
  return objects.filter((o) => o.id !== id);
}

/** Still-missing objects, most recently reported first. */
export const lostObjects = (objects: LostObject[]): LostObject[] =>
  objects
    .filter((o) => o.status === 'lost')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Recovered objects, most recently found first. */
export const foundObjects = (objects: LostObject[]): LostObject[] =>
  objects
    .filter((o) => o.status === 'found')
    .sort((a, b) =>
      (b.foundAt ?? b.createdAt).localeCompare(a.foundAt ?? a.createdAt),
    );

export const lostCount = (objects: LostObject[]): number =>
  objects.filter((o) => o.status === 'lost').length;

export const commentCount = (object: LostObject): number =>
  object.comments?.length ?? 0;

/** Comments oldest-first (chat order, newest at the bottom). */
export const sortComments = (
  comments: LostObjectComment[],
): LostObjectComment[] =>
  [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
