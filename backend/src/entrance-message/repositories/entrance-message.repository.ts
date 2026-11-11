import { EntranceMessage } from '../entities/entrance-message.entity';

export const ENTRANCE_MESSAGE_REPOSITORY = Symbol(
  'ENTRANCE_MESSAGE_REPOSITORY',
);

export type EntranceMessageWrite = Pick<
  EntranceMessage,
  'familyId' | 'text' | 'authorId'
>;

/**
 * Persistence port for the entrance message (one per family). Bound to a
 * TypeORM adapter in the module — swap it or fake it in tests with a one-line
 * change (Dependency Inversion), like every other feature repository here.
 */
export interface IEntranceMessageRepository {
  /** The family's current message with its author, or null when cleared. */
  findByFamily(familyId: string): Promise<EntranceMessage | null>;
  /** Insert or replace the family's message; returns it with its author. */
  upsert(data: EntranceMessageWrite): Promise<EntranceMessage>;
  clear(familyId: string): Promise<void>;
}
