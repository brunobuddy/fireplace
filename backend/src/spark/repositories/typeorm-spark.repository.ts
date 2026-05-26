import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SparkQuestion } from '../entities/spark-question.entity';
import { SparkAnswer } from '../entities/spark-answer.entity';
import {
  ISparkRepository,
  NewSparkAnswer,
  NewSparkQuestion,
} from './spark.repository';

@Injectable()
export class TypeOrmSparkRepository implements ISparkRepository {
  constructor(
    @InjectRepository(SparkQuestion)
    private readonly questions: Repository<SparkQuestion>,
    @InjectRepository(SparkAnswer)
    private readonly answers: Repository<SparkAnswer>,
  ) {}

  findActiveQuestion(familyId: string): Promise<SparkQuestion | null> {
    return this.questions.findOne({
      where: { familyId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  async recentQuestionTexts(
    familyId: string,
    limit: number,
  ): Promise<string[]> {
    const rows = await this.questions.find({
      where: { familyId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.map((row) => row.text);
  }

  createQuestion(data: NewSparkQuestion): Promise<SparkQuestion> {
    return this.questions.save(
      this.questions.create({ ...data, status: 'active' }),
    );
  }

  async archiveActiveQuestions(familyId: string): Promise<void> {
    await this.questions.update(
      { familyId, status: 'active' },
      { status: 'archived' },
    );
  }

  findAnswers(questionId: string): Promise<SparkAnswer[]> {
    return this.answers.find({
      where: { questionId },
      relations: { member: true },
      order: { createdAt: 'ASC' },
    });
  }

  async upsertAnswer(data: NewSparkAnswer): Promise<SparkAnswer> {
    const existing = await this.answers.findOne({
      where: { questionId: data.questionId, memberId: data.memberId },
    });
    const saved = existing
      ? await this.answers.save({ ...existing, text: data.text })
      : await this.answers.save(this.answers.create(data));
    const withMember = await this.answers.findOne({
      where: { id: saved.id },
      relations: { member: true },
    });
    if (!withMember) {
      throw new Error(`Spark answer ${saved.id} vanished after write`);
    }
    return withMember;
  }
}
