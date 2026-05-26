import { buildSparkView, summarizeAnswers } from './spark.view';
import { Member } from '../family/entities/member.entity';
import { SparkQuestion } from './entities/spark-question.entity';
import { SparkAnswer } from './entities/spark-answer.entity';

const member = (id: string, name: string): Member =>
  ({ id, name, color: '#fff', role: 'parent', familyId: 'fam-1' }) as Member;

const question = (): SparkQuestion =>
  ({
    id: 'q1',
    text: 'What made you smile today?',
    status: 'active',
    source: 'seed',
    familyId: 'fam-1',
    createdAt: new Date('2026-05-23T10:00:00.000Z'),
  }) as SparkQuestion;

const answer = (memberId: string, text: string): SparkAnswer =>
  ({
    id: `a-${memberId}`,
    questionId: 'q1',
    memberId,
    text,
    createdAt: new Date('2026-05-23T11:00:00.000Z'),
  }) as SparkAnswer;

const alex = member('m-alex', 'Alex');
const sam = member('m-sam', 'Sam');

describe('buildSparkView', () => {
  it('returns an empty view when there is no question', () => {
    const view = buildSparkView(null, [], [alex, sam], 'm-alex');
    expect(view.question).toBeNull();
    expect(view.participants).toHaveLength(0);
    expect(view.revealed).toBe(false);
  });

  it('shows the viewer their own answer but hides the partner before the reveal', () => {
    const view = buildSparkView(
      question(),
      [answer('m-alex', 'Alex answer')],
      [alex, sam],
      'm-alex',
    );

    const alexSlot = view.participants.find((p) => p.memberId === 'm-alex');
    const samSlot = view.participants.find((p) => p.memberId === 'm-sam');
    expect(alexSlot?.text).toBe('Alex answer');
    expect(alexSlot?.hasAnswered).toBe(true);
    expect(samSlot?.text).toBeNull();
    expect(samSlot?.hasAnswered).toBe(false);
    expect(view.revealed).toBe(false);
    expect(view.viewerIsParticipant).toBe(true);
    expect(view.viewerHasAnswered).toBe(true);
  });

  it("hides an answered parent's text from the other parent until both answer", () => {
    const view = buildSparkView(
      question(),
      [answer('m-alex', 'secret')],
      [alex, sam],
      'm-sam',
    );
    const alexSlot = view.participants.find((p) => p.memberId === 'm-alex');
    expect(alexSlot?.hasAnswered).toBe(true);
    expect(alexSlot?.text).toBeNull();
    expect(view.viewerHasAnswered).toBe(false);
  });

  it('reveals both answers to a parent once both have answered', () => {
    const view = buildSparkView(
      question(),
      [answer('m-alex', 'A'), answer('m-sam', 'S')],
      [alex, sam],
      'm-sam',
    );
    expect(view.revealed).toBe(true);
    expect(view.participants.find((p) => p.memberId === 'm-alex')?.text).toBe(
      'A',
    );
    expect(view.participants.find((p) => p.memberId === 'm-sam')?.text).toBe(
      'S',
    );
  });

  it('keeps answers hidden from a spectating child, even after the reveal', () => {
    const view = buildSparkView(
      question(),
      [answer('m-alex', 'A'), answer('m-sam', 'S')],
      [alex, sam],
      'm-robin',
    );
    expect(view.revealed).toBe(true);
    expect(view.viewerIsParticipant).toBe(false);
    expect(view.participants.every((p) => p.text === null)).toBe(true);
  });
});

describe('summarizeAnswers', () => {
  it('is not revealed with a single answer', () => {
    const summary = summarizeAnswers([answer('m-alex', 'A')], [alex, sam]);
    expect(summary.answeredMemberIds).toEqual(['m-alex']);
    expect(summary.revealed).toBe(false);
  });

  it('is revealed when both parents have answered', () => {
    const summary = summarizeAnswers(
      [answer('m-alex', 'A'), answer('m-sam', 'S')],
      [alex, sam],
    );
    expect(summary.revealed).toBe(true);
  });

  it('ignores answers from non-participants', () => {
    const summary = summarizeAnswers(
      [answer('m-alex', 'A'), answer('m-robin', 'kid')],
      [alex, sam],
    );
    expect(summary.answeredMemberIds).toEqual(['m-alex']);
    expect(summary.revealed).toBe(false);
  });
});
