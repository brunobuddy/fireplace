import { Member } from '../family/entities/member.entity';
import { SparkQuestion } from './entities/spark-question.entity';
import { SparkAnswer } from './entities/spark-answer.entity';

/**
 * A participant's slot in the view. `text` is redacted to `null` unless it is
 * the viewer's own answer OR the question has been revealed (both parents have
 * answered). This is the heart of the "answer secretly" guarantee.
 */
export interface SparkParticipantView {
  memberId: string;
  name: string;
  color: string;
  hasAnswered: boolean;
  answeredAt: string | null;
  text: string | null;
  isViewer: boolean;
}

export interface SparkView {
  question: { id: string; text: string; createdAt: string } | null;
  participants: SparkParticipantView[];
  /** Both parents have answered → both texts are now visible to everyone. */
  revealed: boolean;
  /** Is the requesting member one of the two parents (i.e. allowed to answer)? */
  viewerIsParticipant: boolean;
  viewerHasAnswered: boolean;
}

export interface SparkAnswerSummary {
  answeredMemberIds: string[];
  revealed: boolean;
}

const EMPTY_VIEW: SparkView = {
  question: null,
  participants: [],
  revealed: false,
  viewerIsParticipant: false,
  viewerHasAnswered: false,
};

/**
 * Who has answered and whether that completes the pair. Used both to build the
 * view and to shape the (text-free) realtime broadcast — keeping the "revealed
 * when both parents answered" rule in exactly one place.
 */
export function summarizeAnswers(
  answers: SparkAnswer[],
  participants: Member[],
): SparkAnswerSummary {
  const participantIds = new Set(participants.map((p) => p.id));
  const answeredMemberIds = answers
    .map((answer) => answer.memberId)
    .filter((id) => participantIds.has(id));
  const revealed =
    participants.length >= 2 &&
    answeredMemberIds.length === participants.length;
  return { answeredMemberIds, revealed };
}

/**
 * Build the member-specific, secrecy-preserving view of the current question.
 * Each parent only ever sees their own answer text until BOTH have answered;
 * after that the question is revealed and both texts are returned. Pure and
 * side-effect free, so the redaction can be unit-tested in isolation.
 */
export function buildSparkView(
  question: SparkQuestion | null,
  answers: SparkAnswer[],
  participants: Member[],
  viewerMemberId: string | undefined,
): SparkView {
  if (!question) {
    return EMPTY_VIEW;
  }

  const answerByMember = new Map(
    answers.map((answer): [string, SparkAnswer] => [answer.memberId, answer]),
  );
  const { revealed } = summarizeAnswers(answers, participants);
  const viewerIsParticipant = participants.some((p) => p.id === viewerMemberId);

  const slots = participants.map<SparkParticipantView>((member) => {
    const answer = answerByMember.get(member.id) ?? null;
    const isViewer = member.id === viewerMemberId;
    // You always see your own answer; the partner's only after the reveal, and
    // only the two parents ever see the texts — a spectating child never does.
    const canSeeText = isViewer || (revealed && viewerIsParticipant);
    return {
      memberId: member.id,
      name: member.name,
      color: member.color,
      hasAnswered: answer !== null,
      answeredAt: answer ? toIso(answer.createdAt) : null,
      text: answer && canSeeText ? answer.text : null,
      isViewer,
    };
  });

  return {
    question: {
      id: question.id,
      text: question.text,
      createdAt: toIso(question.createdAt),
    },
    participants: slots,
    revealed,
    viewerIsParticipant,
    viewerHasAnswered: viewerMemberId
      ? answerByMember.has(viewerMemberId)
      : false,
  };
}

/** Dates round-trip as `Date` on Postgres and ISO strings on SQLite — normalise. */
export function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
