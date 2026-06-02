import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  CATEGORIZE_TAG,
  CATEGORIZE_TAG_HEADER,
  ClassifyInput,
  ICategoryClassifier,
} from './category-classifier';

const DEFAULT_BASE_URL = 'https://app.manifest.build/v1';
/** Manifest's only valid request model — the router picks the provider. */
const MODEL = 'manifest/auto';

const SYSTEM_PROMPT =
  'You are a supermarket-aisle classifier. Given the name of a grocery item ' +
  'and a list of aisles (each with a slug and a human name), reply with ONLY ' +
  'the slug of the aisle the item best belongs to. If you are not sure, ' +
  'reply with "other". Reply with the slug and nothing else — no quotes, ' +
  'no punctuation, no explanation.';

/**
 * Manifest-backed auto-categorizer (manifest.build, OpenAI-compatible router).
 * `manifest/auto` is the only valid request model; routing is done at
 * Manifest's side. Every call is tagged with {@link CATEGORIZE_TAG} both via
 * the `X-Manifest-Tag` header and the OpenAI `user` field so Bruno can pin
 * this traffic to a small/cheap model in app.manifest.build.
 *
 * Unlike the Spark generator, a missing key here does NOT throw — the
 * grocery feature still works without categorization (items land in
 * Uncategorized and the user can re-bucket them by tap or drag). The
 * classifier simply returns `null` in that case.
 */
@Injectable()
export class ManifestCategoryClassifier implements ICategoryClassifier {
  private readonly logger = new Logger(ManifestCategoryClassifier.name);
  private readonly baseURL: string;
  private client: OpenAI | null = null;
  private warnedNoKey = false;

  constructor(private readonly config: ConfigService) {
    this.baseURL =
      this.config.get<string>('MANIFEST_BASE_URL')?.trim() || DEFAULT_BASE_URL;
  }

  async classify(input: ClassifyInput): Promise<string | null> {
    const client = this.getClient();
    if (!client) {
      return null;
    }

    const slugs = new Set(input.categories.map((c) => c.slug));
    if (slugs.size === 0) {
      return null;
    }

    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0,
        max_completion_tokens: 16,
        user: CATEGORIZE_TAG,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: this.userPrompt(input) },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? '';
      const slug = sanitize(raw);
      if (!slug || !slugs.has(slug)) {
        this.logger.warn(
          `Classifier returned "${raw.trim()}" — not in catalogue, leaving uncategorized`,
        );
        return null;
      }
      return slug;
    } catch (error) {
      this.logger.warn(
        `Categorize call failed for "${input.name}": ${describe(error)}`,
      );
      return null;
    }
  }

  private getClient(): OpenAI | null {
    if (this.client) {
      return this.client;
    }
    const apiKey = this.config.get<string>('MANIFEST_API_KEY')?.trim();
    if (!apiKey) {
      if (!this.warnedNoKey) {
        this.logger.warn(
          'MANIFEST_API_KEY not set — grocery auto-categorization is disabled. ' +
            'Items will land in Uncategorized; users can re-bucket manually.',
        );
        this.warnedNoKey = true;
      }
      return null;
    }
    this.client = new OpenAI({
      apiKey,
      baseURL: this.baseURL,
      defaultHeaders: { [CATEGORIZE_TAG_HEADER]: CATEGORIZE_TAG },
    });
    return this.client;
  }

  private userPrompt(input: ClassifyInput): string {
    const list = input.categories
      .map((c) => `- ${c.slug}: ${c.name}`)
      .join('\n');
    return `Aisles:\n${list}\n\nItem: ${input.name}\n\nWhich aisle slug?`;
  }
}

function sanitize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^["'`]+|["'`.,!?]+$/g, '')
    .split(/\s+/)[0];
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
