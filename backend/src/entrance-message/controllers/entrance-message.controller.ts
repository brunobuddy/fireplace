import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { UpdateEntranceMessageDto } from '../dto/update-entrance-message.dto';
import { EntranceMessageService } from '../services/entrance-message.service';
import { EntranceMessageResponse } from '../services/entrance-message.view';

@Controller('families/:familyId/entrance-message')
export class EntranceMessageController {
  constructor(private readonly messages: EntranceMessageService) {}

  @Get()
  get(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<EntranceMessageResponse> {
    return this.messages.get(familyId, user);
  }

  /** Replace the message; an empty text clears it. */
  @Put()
  set(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: UpdateEntranceMessageDto,
    @CurrentUser() user: AuthUser,
  ): Promise<EntranceMessageResponse> {
    return this.messages.set(familyId, dto.text, user);
  }
}
