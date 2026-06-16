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
  'Tu écris une seule question de complicité pour un couple qui est aussi parent. ' +
  'Elle doit être chaleureuse et un peu joueuse ou curieuse — parfois légère, ' +
  'parfois tendre ou intime — et pouvoir trouver sa réponse en une phrase ou deux. ' +
  'Limite-toi à UNE seule phrase, rédigée EN FRANÇAIS. Donne uniquement la question ' +
  'elle-même : pas de préambule, pas de guillemets, pas de numérotation, pas d’emoji.';

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
        'Le générateur de questions a renvoyé une réponse vide',
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
          'MANIFEST_API_KEY n’est pas configurée — impossible de générer une question',
        );
      }
      this.client = new OpenAI({ apiKey, baseURL: this.baseURL });
    }
    return this.client;
  }

  private userPrompt(recent?: string[]): string {
    const base = 'Donne-moi une nouvelle question pour aujourd’hui.';
    if (!recent?.length) {
      return base;
    }
    const list = recent.map((question) => `- ${question}`).join('\n');
    return `${base}\n\nNe répète pas et ne reformule pas de trop près l’une de ces questions récentes :\n${list}`;
  }
}

/** Trim, drop wrapping quotes, keep the first line, and cap to the column width. */
function sanitize(raw: string): string {
  const firstLine = raw.trim().split('\n')[0]?.trim() ?? '';
  const unquoted = firstLine.replace(/^["'“”]+|["'“”]+$/g, '').trim();
  return unquoted.slice(0, MAX_LENGTH);
}
