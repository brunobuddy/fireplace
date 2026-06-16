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
  { slug: 'produce', name: 'Fruits & Légumes', icon: '🥬', sortOrder: 10 },
  { slug: 'bakery', name: 'Boulangerie', icon: '🥖', sortOrder: 20 },
  { slug: 'meat-fish', name: 'Viande & Poisson', icon: '🥩', sortOrder: 30 },
  { slug: 'dairy', name: 'Crèmerie & Œufs', icon: '🧀', sortOrder: 40 },
  { slug: 'frozen', name: 'Surgelés', icon: '🧊', sortOrder: 50 },
  { slug: 'pantry', name: 'Épicerie', icon: '🥫', sortOrder: 60 },
  { slug: 'snacks', name: 'Snacks & Sucreries', icon: '🍫', sortOrder: 70 },
  { slug: 'drinks', name: 'Boissons', icon: '🧃', sortOrder: 80 },
  { slug: 'household', name: 'Entretien', icon: '🧻', sortOrder: 90 },
  { slug: 'baby-kids', name: 'Bébé & Enfants', icon: '🍼', sortOrder: 95 },
  { slug: 'other', name: 'Autre', icon: '🛒', sortOrder: 999 },
];
