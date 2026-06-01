import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SparkService } from './spark.service';

/**
 * Once a day, roll any fully-answered Spark question over to a fresh one (a new
 * Manifest call). Families still waiting on a parent keep today's question.
 * Kept separate from SparkService so the cron wiring stays out of the domain
 * logic (SRP); the manual "✨ New question" button hits the same service path
 * on demand. If MANIFEST_API_KEY is unset the generation throws and is
 * logged — the cron never crashes the app.
 */
@Injectable()
export class SparkScheduler {
  private readonly logger = new Logger(SparkScheduler.name);

  constructor(private readonly spark: SparkService) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM, { name: 'spark-daily-rollover' })
  async handleDailyRollover(): Promise<void> {
    this.logger.log('Running the daily Spark rollover');
    await this.spark.rolloverAllFamilies();
  }
}
