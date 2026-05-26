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

const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_LENGTH = 500; // matches the SparkQuestion.text column width

const SYSTEM_PROMPT =
  'You write a single bonding question for a couple who are also parents. ' +
  'It should be warm and a little playful or curious — sometimes light, ' +
  'sometimes tender or intimate — and answerable in a sentence or two. ' +
  'Keep it to ONE sentence. Output only the question itself: no preamble, ' +
  'no quotation marks, no numbering, no emoji.';

/**
 * Generates questions with the OpenAI Chat Completions API. The model is read
 * from `OPENAI_MODEL` (default `gpt-4o-mini`). The client is built lazily so
 * the app still boots without a key — only generating actually needs one.
 * There is no static fallback by design: a missing/invalid key fails closed,
 * the same posture as a missing JWT_SECRET in production.
 */
@Injectable()
export class OpenAiQuestionGenerator implements IQuestionGenerator {
  private readonly logger = new Logger(OpenAiQuestionGenerator.name);
  private readonly model: string;
  private client: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {
    this.model =
      this.config.get<string>('OPENAI_MODEL')?.trim() || DEFAULT_MODEL;
  }

  async generate(options: GenerateQuestionOptions = {}): Promise<string> {
    const client = this.getClient();
    const completion = await client.chat.completions.create({
      model: this.model,
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
    this.logger.log(`Generated a Spark question with ${this.model}`);
    return text;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
      if (!apiKey) {
        throw new ServiceUnavailableException(
          'OPENAI_API_KEY is not configured — cannot generate a question',
        );
      }
      this.client = new OpenAI({ apiKey });
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
