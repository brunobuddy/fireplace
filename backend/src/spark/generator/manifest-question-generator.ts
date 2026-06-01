import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  GenerateQuestionOptions,
  IQuestionGenerator,
} from './question-generator';

const DEFAULT_BASE_URL = 'https://app.manifest.build/v1';
/** Manifest's only valid request model — the router picks the provider. */
const MODEL = 'manifest/auto';
const MAX_LENGTH = 500; // matches the SparkQuestion.text column width

const SYSTEM_PROMPT =
  'You write a single bonding question for a couple who are also parents. ' +
  'It should be warm and a little playful or curious — sometimes light, ' +
  'sometimes tender or intimate — and answerable in a sentence or two. ' +
  'Keep it to ONE sentence. Output only the question itself: no preamble, ' +
  'no quotation marks, no numbering, no emoji.';

/**
 * Generates questions through Manifest (manifest.build), an OpenAI-compatible
 * LLM router. `manifest/auto` is the only valid request model — the router
 * picks the actual provider; provider-specific names (`gpt-4o-mini`, etc.) are
 * not accepted. Self-hosted instances are supported via `MANIFEST_BASE_URL`.
 * The client is built lazily so the app still boots without a key — only
 * generating actually needs one. There is no static fallback by design: a
 * missing/invalid key fails closed, the same posture as a missing JWT_SECRET
 * in production.
 */
@Injectable()
export class ManifestQuestionGenerator implements IQuestionGenerator {
  private readonly logger = new Logger(ManifestQuestionGenerator.name);
  private readonly baseURL: string;
  private client: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {
    this.baseURL =
      this.config.get<string>('MANIFEST_BASE_URL')?.trim() || DEFAULT_BASE_URL;
  }

  async generate(options: GenerateQuestionOptions = {}): Promise<string> {
    const client = this.getClient();
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 1,
      max_completion_tokens: 120,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: this.userPrompt(options.recent) },
      ],
    });

    const text = sanitize(completion.choices[0]?.message?.content ?? '');
    if (!text) {
      throw new ServiceUnavailableException(
        'The question generator returned an empty response',
      );
    }
    this.logger.log(`Generated a Spark question via ${MODEL}`);
    return text;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = this.config.get<string>('MANIFEST_API_KEY')?.trim();
      if (!apiKey) {
        throw new ServiceUnavailableException(
          'MANIFEST_API_KEY is not configured — cannot generate a question',
        );
      }
      this.client = new OpenAI({ apiKey, baseURL: this.baseURL });
    }
    return this.client;
  }

  private userPrompt(recent?: string[]): string {
    const base = 'Give me a fresh question for today.';
    if (!recent?.length) {
      return base;
    }
    const list = recent.map((question) => `- ${question}`).join('\n');
    return `${base}\n\nDon't repeat or closely echo any of these recent ones:\n${list}`;
  }
}

/** Trim, drop wrapping quotes, keep the first line, and cap to the column width. */
function sanitize(raw: string): string {
  const firstLine = raw.trim().split('\n')[0]?.trim() ?? '';
  const unquoted = firstLine.replace(/^["'“”]+|["'“”]+$/g, '').trim();
  return unquoted.slice(0, MAX_LENGTH);
}
