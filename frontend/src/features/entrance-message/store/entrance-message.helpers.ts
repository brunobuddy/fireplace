import type { EntranceMessage, Member } from '@/lib/types';

/** Same limit as the backend DTO, counted on the trimmed text. */
export const ENTRANCE_MESSAGE_MAX_LENGTH = 280;

/** What the server will actually store. */
export const normalizeDraft = (draft: string): string => draft.trim();

/** Characters left before the limit (negative once over). */
export const remainingChars = (draft: string): number =>
  ENTRANCE_MESSAGE_MAX_LENGTH - normalizeDraft(draft).length;

/** A draft can be posted when it fits and differs from what's shown. */
export function canPublish(
  draft: string,
  current: EntranceMessage | null,
): boolean {
  const text = normalizeDraft(draft);
  return (
    text.length > 0 &&
    text.length <= ENTRANCE_MESSAGE_MAX_LENGTH &&
    text !== current?.text
  );
}

/** The local guess shown while the write is in flight. */
export function optimisticMessage(
  text: string,
  me: Member,
  now: Date = new Date(),
): EntranceMessage {
  return {
    text: normalizeDraft(text),
    authorId: me.id,
    authorName: me.name,
    updatedAt: now.toISOString(),
  };
}

/**
 * Socket updates only apply to our own family; the payload is the whole new
 * state, so applying it twice (HTTP response + broadcast) is harmless.
 */
export function applyUpdate(
  current: EntranceMessage | null,
  update: { familyId: string; message: EntranceMessage | null },
  familyId: string | undefined,
): EntranceMessage | null {
  return update.familyId === familyId ? update.message : current;
}
