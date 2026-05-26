import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { SparkService } from '../services/spark.service';
import { SparkView } from '../spark.view';
import { AnswerSparkDto } from '../dto/answer-spark.dto';

/**
 * Thin transport for Spark. `memberId` is passed explicitly (the profile
 * switcher is the identity, not the JWT) so the service can redact each
 * member's view. Answer text never leaves the service un-redacted.
 */
@Controller('families/:familyId/spark')
export class SparkController {
  constructor(private readonly spark: SparkService) {}

  @Get()
  view(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<SparkView> {
    return this.spark.getView(familyId, memberId);
  }

  @Post('answer')
  answer(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: AnswerSparkDto,
  ): Promise<SparkView> {
    return this.spark.answer(familyId, dto);
  }

  @Post('regenerate')
  regenerate(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query('memberId', new ParseUUIDPipe({ optional: true }))
    memberId?: string,
  ): Promise<SparkView> {
    return this.spark.regenerate(familyId, memberId);
  }
}
