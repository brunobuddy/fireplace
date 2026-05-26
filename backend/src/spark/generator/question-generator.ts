export const QUESTION_GENERATOR = Symbol('QUESTION_GENERATOR');

export interface GenerateQuestionOptions {
  /** Recent question texts, fed to the model so it steers away from repeats. */
  recent?: string[];
}

/**
 * Port for "produce one bonding question". Bound to the OpenAI adapter in the
 * module (and a deterministic stub under test). Keeping this an interface lets
 * the service stay ignorant of the LLM and makes it trivial to fake (DIP).
 */
export interface IQuestionGenerator {
  generate(options?: GenerateQuestionOptions): Promise<string>;
}
