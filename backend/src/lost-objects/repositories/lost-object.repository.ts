import { LostObject } from '../entities/lost-object.entity';
import { LostObjectComment } from '../entities/lost-object-comment.entity';

export const LOST_OBJECT_REPOSITORY = Symbol('LOST_OBJECT_REPOSITORY');

export type NewLostObject = Pick<
  LostObject,
  'name' | 'familyId' | 'reportedById'
>;

export type LostObjectChanges = Partial<
  Pick<LostObject, 'status' | 'foundById' | 'foundAt'>
>;

export type NewLostObjectComment = Pick<
  LostObjectComment,
  'lostObjectId' | 'authorId' | 'body'
>;

/**
 * Persistence port for the lost-object aggregate (the object plus its
 * comment thread of search suggestions). Bound to a TypeORM adapter in the
 * module — swap it or fake it in tests with a one-line change (Dependency
 * Inversion), like every other feature repository here.
 */
export interface ILostObjectRepository {
  findByFamily(familyId: string): Promise<LostObject[]>;
  findById(id: string): Promise<LostObject | null>;
  create(data: NewLostObject): Promise<LostObject>;
  update(id: string, changes: LostObjectChanges): Promise<LostObject>;
  remove(id: string): Promise<void>;
  addComment(data: NewLostObjectComment): Promise<LostObjectComment>;
  findCommentById(id: string): Promise<LostObjectComment | null>;
  removeComment(id: string): Promise<void>;
}
