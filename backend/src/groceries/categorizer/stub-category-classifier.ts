import { Injectable } from '@nestjs/common';
import { ClassifyInput, ICategoryClassifier } from './category-classifier';

/**
 * Deterministic keyword-based classifier used only under NODE_ENV=test so
 * suites never reach out to Manifest. It is NOT a production fallback — outside
 * tests the Manifest adapter is used (and degrades to `null` when no API key
 * is set). Mapping covers the seeded aisle catalogue with the minimum keywords
 * needed to make the e2e tests realistic.
 */
@Injectable()
export class StubCategoryClassifier implements ICategoryClassifier {
  private readonly rules: ReadonlyArray<{
    slug: string;
    keywords: ReadonlyArray<string>;
  }> = [
    {
      slug: 'produce',
      keywords: ['banana', 'apple', 'tomato', 'lettuce', 'carrot', 'fruit'],
    },
    { slug: 'bakery', keywords: ['bread', 'baguette', 'croissant', 'bun'] },
    {
      slug: 'meat-fish',
      keywords: ['chicken', 'beef', 'salmon', 'tuna', 'pork', 'fish'],
    },
    {
      slug: 'dairy',
      keywords: ['milk', 'cheese', 'yogurt', 'butter', 'egg', 'cream'],
    },
    { slug: 'frozen', keywords: ['frozen', 'ice cream', 'ice-cream'] },
    {
      slug: 'pantry',
      keywords: ['pasta', 'rice', 'flour', 'sugar', 'salt', 'oil', 'beans'],
    },
    {
      slug: 'snacks',
      keywords: ['chocolate', 'chips', 'crisps', 'candy', 'cookie', 'biscuit'],
    },
    {
      slug: 'drinks',
      keywords: ['water', 'juice', 'soda', 'beer', 'wine', 'coffee', 'tea'],
    },
    {
      slug: 'household',
      keywords: ['toilet paper', 'detergent', 'soap', 'sponge', 'cleaner'],
    },
    {
      slug: 'baby-kids',
      keywords: ['diaper', 'wipes', 'formula', 'baby'],
    },
  ];

  classify(input: ClassifyInput): Promise<string | null> {
    const slugs = new Set(input.categories.map((c) => c.slug));
    const text = input.name.toLowerCase();
    for (const rule of this.rules) {
      if (!slugs.has(rule.slug)) continue;
      if (rule.keywords.some((kw) => text.includes(kw))) {
        return Promise.resolve(rule.slug);
      }
    }
    return Promise.resolve(slugs.has('other') ? 'other' : null);
  }
}
