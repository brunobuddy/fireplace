import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { SparkService } from './spark.service';
import { ISparkRepository } from '../repositories/spark.repository';
import { IQuestionGenerator } from '../generator/question-generator';
import { SparkGateway } from '../gateways/spark.gateway';
import { Member } from '../../family/entities/member.entity';
import { SparkQuestion } from '../entities/spark-question.entity';
import { SparkAnswer } from '../entities/spark-answer.entity';

const parent = (id: string, name: string): Member =>
  ({
    id,
    name,
    email: `${name.toLowerCase()}@x`,
    role: 'parent',
    color: '#fff',
    familyId: 'fam-1',
  }) as Member;

const activeQuestion = (over: Partial<SparkQuestion> = {}): SparkQuestion =>
  ({
    id: 'q1',
    text: 'A question?',
    status: 'active',
    source: 'seed',
    familyId: 'fam-1',
    createdAt: new Date('2026-05-23T10:00:00.000Z'),
    ...over,
  }) as SparkQuestion;

const answerRow = (memberId: string, text = 'hi'): SparkAnswer =>
  ({
    id: `a-${memberId}`,
    questionId: 'q1',
    memberId,
    text,
    createdAt: new Date('2026-05-23T11:00:00.000Z'),
  }) as SparkAnswer;

describe('SparkService', () => {
  let spark: jest.Mocked<ISparkRepository>;
  let generator: jest.Mocked<IQuestionGenerator>;
  let gateway: jest.Mocked<Pick<SparkGateway, 'emitUpdated' | 'emitQuestion'>>;
  let members: { find: jest.Mock };
  let families: { findOne: jest.Mock; find: jest.Mock };
  let service: SparkService;

  const bruno = parent('m-bruno', 'Bruno');
  const audrey = parent('m-audrey', 'Audrey');

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    spark = {
      findActiveQuestion: jest.fn(),
      recentQuestionTexts: jest.fn().mockResolvedValue([]),
      createQuestion: jest.fn(),
      archiveActiveQuestions: jest.fn(),
      findAnswers: jest.fn(),
      upsertAnswer: jest.fn(),
    };
    generator = { generate: jest.fn() };
    gateway = { emitUpdated: jest.fn(), emitQuestion: jest.fn() };
    members = { find: jest.fn().mockResolvedValue([bruno, audrey]) };
    families = {
      findOne: jest.fn().mockResolvedValue({ id: 'fam-1' }),
      find: jest.fn(),
    };
    service = new SparkService(
      spark,
      generator,
      members as never,
      families as never,
      gateway as never,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe('answer', () => {
    it('records the answer, keeps it secret, and broadcasts who answered', async () => {
      spark.findActiveQuestion.mockResolvedValue(activeQuestion());
      spark.findAnswers
        .mockResolvedValueOnce([]) // existing check
        .mockResolvedValueOnce([answerRow('m-bruno', 'mine')]); // after write
      spark.upsertAnswer.mockResolvedValue(answerRow('m-bruno', 'mine'));

      const view = await service.answer(
        'fam-1',
        { text: '  mine  ' },
        'm-bruno',
      );

      expect(spark.upsertAnswer).toHaveBeenCalledWith({
        questionId: 'q1',
        memberId: 'm-bruno',
        text: 'mine',
      });
      expect(gateway.emitUpdated).toHaveBeenCalledWith({
        familyId: 'fam-1',
        questionId: 'q1',
        answeredMemberIds: ['m-bruno'],
        revealed: false,
      });
      expect(view.viewerHasAnswered).toBe(true);
      expect(view.revealed).toBe(false);
      expect(
        view.participants.find((p) => p.memberId === 'm-audrey')?.text,
      ).toBeNull();
    });

    it('reveals once the second parent answers', async () => {
      spark.findActiveQuestion.mockResolvedValue(activeQuestion());
      spark.findAnswers
        .mockResolvedValueOnce([answerRow('m-bruno', 'bruno')])
        .mockResolvedValueOnce([
          answerRow('m-bruno', 'bruno'),
          answerRow('m-audrey', 'audrey'),
        ]);
      spark.upsertAnswer.mockResolvedValue(answerRow('m-audrey', 'audrey'));

      const view = await service.answer(
        'fam-1',
        { text: 'audrey' },
        'm-audrey',
      );

      expect(gateway.emitUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          revealed: true,
          answeredMemberIds: ['m-bruno', 'm-audrey'],
        }),
      );
      expect(view.revealed).toBe(true);
    });

    it('rejects an answer from a member id that is not one of the parents', async () => {
      spark.findActiveQuestion.mockResolvedValue(activeQuestion());
      spark.findAnswers.mockResolvedValue([]);
      await expect(
        service.answer('fam-1', { text: 'hi' }, 'm-stranger'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(spark.upsertAnswer).not.toHaveBeenCalled();
    });

    it('locks further answers once both have answered', async () => {
      spark.findActiveQuestion.mockResolvedValue(activeQuestion());
      spark.findAnswers.mockResolvedValue([
        answerRow('m-bruno'),
        answerRow('m-audrey'),
      ]);
      await expect(
        service.answer('fam-1', { text: 'changed' }, 'm-bruno'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(spark.upsertAnswer).not.toHaveBeenCalled();
    });

    it('throws when there is no active question', async () => {
      spark.findActiveQuestion.mockResolvedValue(null);
      await expect(
        service.answer('fam-1', { text: 'hi' }, 'm-bruno'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('regenerate', () => {
    it('archives the old question, generates a new one, and broadcasts it', async () => {
      generator.generate.mockResolvedValue('A brand new question?');
      spark.createQuestion.mockResolvedValue(
        activeQuestion({
          id: 'q2',
          text: 'A brand new question?',
          source: 'openai',
        }),
      );

      const view = await service.regenerate('fam-1', 'm-bruno');

      expect(spark.archiveActiveQuestions).toHaveBeenCalledWith('fam-1');
      expect(spark.createQuestion).toHaveBeenCalledWith({
        familyId: 'fam-1',
        text: 'A brand new question?',
        source: 'openai',
      });
      expect(gateway.emitQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          familyId: 'fam-1',
          question: expect.objectContaining({ id: 'q2' }),
        }),
      );
      expect(view.question?.text).toBe('A brand new question?');
      expect(view.participants).toHaveLength(2);
    });

    it('archives before creating, so two questions are never active at once', async () => {
      const order: string[] = [];
      spark.archiveActiveQuestions.mockImplementation(async () => {
        order.push('archive');
      });
      spark.createQuestion.mockImplementation(async () => {
        order.push('create');
        return activeQuestion({ id: 'q2' });
      });
      generator.generate.mockResolvedValue('Q?');

      await service.regenerate('fam-1');

      expect(order).toEqual(['archive', 'create']);
    });
  });

  describe('rolloverAllFamilies', () => {
    it('regenerates only families whose question is fully answered', async () => {
      families.find.mockResolvedValue([{ id: 'fam-done' }, { id: 'fam-wait' }]);
      generator.generate.mockResolvedValue('Next?');
      spark.createQuestion.mockResolvedValue(activeQuestion({ id: 'qN' }));
      spark.findActiveQuestion.mockImplementation((familyId: string) =>
        Promise.resolve(activeQuestion({ id: `q-${familyId}` })),
      );
      spark.findAnswers.mockImplementation((questionId: string) =>
        Promise.resolve(
          questionId === 'q-fam-done'
            ? [answerRow('m-bruno'), answerRow('m-audrey')]
            : [answerRow('m-bruno')],
        ),
      );

      await service.rolloverAllFamilies();

      expect(spark.createQuestion).toHaveBeenCalledTimes(1);
    });

    it('does not crash the batch when one family fails (e.g. no API key)', async () => {
      families.find.mockResolvedValue([{ id: 'fam-1' }]);
      spark.findActiveQuestion.mockResolvedValue(null);
      generator.generate.mockRejectedValue(new Error('OPENAI_API_KEY missing'));

      await expect(service.rolloverAllFamilies()).resolves.toBeUndefined();
    });
  });
});
