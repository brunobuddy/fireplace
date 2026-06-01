import { Injectable } from '@nestjs/common';
import { IQuestionGenerator } from './question-generator';

/**
 * Deterministic generator used only under NODE_ENV=test so suites never reach
 * out to Manifest. It is NOT a production fallback — outside tests a missing
 * MANIFEST_API_KEY fails closed (see ManifestQuestionGenerator). The counter
 * makes each call return a distinct question, which lets the regenerate path
 * be asserted ("the question changed").
 */
@Injectable()
export class StubQuestionGenerator implements IQuestionGenerator {
  private counter = 0;

  generate(): Promise<string> {
    this.counter += 1;
    return Promise.resolve(
      `What is a small thing you appreciated about each other recently? (#${this.counter})`,
    );
  }
}
