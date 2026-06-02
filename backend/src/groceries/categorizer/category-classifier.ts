import { GroceryCategory } from '../entities/grocery-category.entity';

/** DI token for the auto-categorizer port. */
export const CATEGORY_CLASSIFIER = Symbol('CATEGORY_CLASSIFIER');

/**
 * Stable identifier sent on every categorize call so Manifest's dashboard can
 * route this traffic to a smaller/cheaper model. Sent two ways for redundancy:
 *   • as the `X-Manifest-Tag` HTTP header,
 *   • as the OpenAI-standard `user` field on the request body.
 *
 * Bruno: this is the string to filter on in app.manifest.build when you build
 * the routing rule.
 */
export const CATEGORIZE_TAG = 'fireplace.groceries.categorize';
export const CATEGORIZE_TAG_HEADER = 'X-Manifest-Tag';

export interface ClassifyInput {
  /** The item name the user typed, already trimmed. */
  name: string;
  /** The aisle catalogue the classifier may pick from. */
  categories: Pick<GroceryCategory, 'id' | 'slug' | 'name'>[];
}

/**
 * Port for "pick the best aisle for this item". The Manifest-backed adapter is
 * the production binding; a deterministic stub is used under NODE_ENV=test so
 * suites never hit the network (mirrors the Spark generator pattern). Returning
 * `null` means "no confident bucket" — the row stays in Uncategorized and the
 * user can drag it where it belongs.
 */
export interface ICategoryClassifier {
  classify(input: ClassifyInput): Promise<string | null>;
}
