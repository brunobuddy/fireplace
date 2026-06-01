import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { SparkService } from '../services/spark.service';
import { SparkView } from '../spark.view';
import { AnswerSparkDto } from '../dto/answer-spark.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';

/**
 * Thin transport for Spark. The viewing/answering member is the signed-in
 * session — never a client-supplied id — so the service can redact each
 * member's view without trusting the client. Answer text never leaves the
 * service un-redacted.
 */
@Controller('families/:familyId/spark')
export class SparkController {
  constructor(private readonly spark: SparkService) {}

  @Get()
  view(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SparkView> {
    return this.spark.getView(familyId, user.memberId);
  }

  @Post('answer')
  answer(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: AnswerSparkDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SparkView> {
    return this.spark.answer(familyId, dto, user.memberId);
  }

  @Post('regenerate')
  regenerate(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SparkView> {
    return this.spark.regenerate(familyId, user.memberId);
  }
}
