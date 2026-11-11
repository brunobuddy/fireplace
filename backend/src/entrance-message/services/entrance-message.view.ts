import { EntranceMessage } from '../entities/entrance-message.entity';

/** What the app (HTTP + socket) sees of the entrance message. */
export interface EntranceMessageView {
  text: string;
  authorId: string | null;
  authorName: string | null;
  /** ISO 8601. */
  updatedAt: string;
}

export interface EntranceMessageResponse {
  message: EntranceMessageView | null;
}

export function toEntranceMessageView(
  message: EntranceMessage,
): EntranceMessageView {
  return {
    text: message.text,
    authorId: message.authorId ?? null,
    authorName: message.author?.name ?? null,
    updatedAt: new Date(message.updatedAt).toISOString(),
  };
}

/**
 * Plain-text rendering for the entrance screen, which only has busybox sh and
 * sed — no JSON parser. Two `key=value` lines, one blank line, then the raw
 * text (CR stripped, newlines kept), ending with a newline so `read` loops see
 * the last line:
 *
 *     author=Audrey
 *     updated=1762790400
 *
 *     Pense aux clés !
 */
export function formatForDevice(view: EntranceMessageView): string {
  const author = (view.authorName ?? '').replace(/[\r\n]/g, ' ');
  const updated = Math.floor(new Date(view.updatedAt).getTime() / 1000);
  const text = view.text.replace(/\r/g, '');
  return `author=${author}\nupdated=${updated}\n\n${text}\n`;
}
