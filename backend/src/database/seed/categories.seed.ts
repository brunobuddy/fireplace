/**
 * The default aisle catalogue, ordered the way you walk a typical
 * supermarket. Seeded once; shared by every family.
 */
export const CATEGORY_SEED: ReadonlyArray<{
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
}> = [
  { slug: 'produce', name: 'Fruit & Vegetables', icon: '🥬', sortOrder: 10 },
  { slug: 'bakery', name: 'Bakery', icon: '🥖', sortOrder: 20 },
  { slug: 'meat-fish', name: 'Meat & Fish', icon: '🥩', sortOrder: 30 },
  { slug: 'dairy', name: 'Dairy & Eggs', icon: '🧀', sortOrder: 40 },
  { slug: 'frozen', name: 'Frozen', icon: '🧊', sortOrder: 50 },
  { slug: 'pantry', name: 'Pantry & Dry goods', icon: '🥫', sortOrder: 60 },
  { slug: 'snacks', name: 'Snacks & Sweets', icon: '🍫', sortOrder: 70 },
  { slug: 'drinks', name: 'Drinks', icon: '🧃', sortOrder: 80 },
  { slug: 'household', name: 'Household', icon: '🧻', sortOrder: 90 },
  { slug: 'baby-kids', name: 'Baby & Kids', icon: '🍼', sortOrder: 95 },
  { slug: 'other', name: 'Other', icon: '🛒', sortOrder: 999 },
];
