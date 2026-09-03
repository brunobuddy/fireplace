import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  LostObjectSnapshot,
  LostObjectsService,
} from '../services/lost-objects.service';
import { LostObject } from '../entities/lost-object.entity';
import { CreateLostObjectDto } from '../dto/create-lost-object.dto';
import { CreateLostObjectCommentDto } from '../dto/create-lost-object-comment.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';

@Controller()
export class LostObjectsController {
  constructor(private readonly lostObjects: LostObjectsService) {}

  @Get('families/:familyId/lost-objects')
  snapshot(
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<LostObjectSnapshot> {
    return this.lostObjects.getSnapshotForFamily(familyId);
  }

  @Post('families/:familyId/lost-objects')
  report(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateLostObjectDto,
    @CurrentUser() user: AuthUser,
  ): Promise<LostObject> {
    return this.lostObjects.report(familyId, dto, user.memberId);
  }

  @Post('lost-objects/:id/toggle')
  toggle(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<LostObject> {
    return this.lostObjects.toggleFound(id, user.memberId);
  }

  @Delete('lost-objects/:id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.lostObjects.remove(id);
  }

  @Post('lost-objects/:id/comments')
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLostObjectCommentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<LostObject> {
    return this.lostObjects.addComment(id, dto, user.memberId);
  }

  @Delete('lost-objects/:objectId/comments/:commentId')
  removeComment(
    @Param('objectId', ParseUUIDPipe) objectId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ): Promise<LostObject> {
    return this.lostObjects.removeComment(objectId, commentId);
  }
}
