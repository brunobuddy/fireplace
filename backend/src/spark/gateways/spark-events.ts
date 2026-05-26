/**
 * Websocket event contract for Spark — the frontend mirrors these names.
 * Crucially, neither broadcast carries answer text: `UPDATED` only reports who
 * has answered and whether it is now revealed, so a curious partner can't read
 * the other's answer off the wire before the reveal.
 */
export const SPARK_EVENTS = {
  JOIN: 'spark:join',
  UPDATED: 'spark:updated',
  QUESTION: 'spark:question',
} as const;

export const familySparkRoom = (familyId: string): string =>
  `family-spark:${familyId}`;

export interface SparkUpdatedPayload {
  familyId: string;
  questionId: string;
  answeredMemberIds: string[];
  revealed: boolean;
}

export interface SparkQuestionPayload {
  familyId: string;
  question: { id: string; text: string; createdAt: string };
}
