import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Family } from '../family/entities/family.entity';
import { Member } from '../family/entities/member.entity';
import { SparkQuestion } from './entities/spark-question.entity';
import { SparkAnswer } from './entities/spark-answer.entity';
import { SparkService } from './services/spark.service';
import { SparkScheduler } from './services/spark-scheduler.service';
import { SparkController } from './controllers/spark.controller';
import { SparkGateway } from './gateways/spark.gateway';
import { SPARK_REPOSITORY } from './repositories/spark.repository';
import { TypeOrmSparkRepository } from './repositories/typeorm-spark.repository';
import { QUESTION_GENERATOR } from './generator/question-generator';
import { OpenAiQuestionGenerator } from './generator/openai-question-generator';
import { StubQuestionGenerator } from './generator/stub-question-generator';

/**
 * Spark — the daily two-parent bonding question. The persistence port and the
 * question generator are both bound here (DIP): swap the DB adapter, and under
 * NODE_ENV=test use a deterministic generator so suites never hit OpenAI.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([SparkQuestion, SparkAnswer, Family, Member]),
    AuthModule,
  ],
  controllers: [SparkController],
  providers: [
    SparkService,
    SparkScheduler,
    SparkGateway,
    { provide: SPARK_REPOSITORY, useClass: TypeOrmSparkRepository },
    {
      provide: QUESTION_GENERATOR,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        process.env.NODE_ENV === 'test'
          ? new StubQuestionGenerator()
          : new OpenAiQuestionGenerator(config),
    },
  ],
  exports: [SparkService],
})
export class SparkModule {}
