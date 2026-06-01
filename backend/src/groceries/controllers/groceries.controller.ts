import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { GroceriesService, ListSnapshot } from '../services/groceries.service';
import { GroceryCategory } from '../entities/grocery-category.entity';
import { GroceryItem } from '../entities/grocery-item.entity';
import { CreateGroceryItemDto } from '../dto/create-grocery-item.dto';
import { UpdateGroceryItemDto } from '../dto/update-grocery-item.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';

/**
 * Thin HTTP layer. No logic here — every endpoint delegates straight to the
 * service. "Who did this" comes from the authenticated session, not the body,
 * so the client never has to declare itself. Real-time peers are updated by
 * the service via the gateway.
 */
@Controller()
export class GroceriesController {
  constructor(private readonly groceries: GroceriesService) {}

  @Get('grocery-categories')
  categories(): Promise<GroceryCategory[]> {
    return this.groceries.listCategories();
  }

  @Get('families/:familyId/grocery-list')
  snapshot(
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<ListSnapshot> {
    return this.groceries.getSnapshotForFamily(familyId);
  }

  @Post('grocery-lists/:listId/items')
  addItem(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: CreateGroceryItemDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GroceryItem> {
    return this.groceries.addItem(listId, dto, user.memberId);
  }

  @Patch('grocery-items/:id')
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroceryItemDto,
  ): Promise<GroceryItem> {
    return this.groceries.updateItem(id, dto);
  }

  @Post('grocery-items/:id/toggle')
  toggleItem(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<GroceryItem> {
    return this.groceries.toggleItem(id, user.memberId);
  }

  @Delete('grocery-items/:id')
  @HttpCode(204)
  removeItem(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.groceries.removeItem(id);
  }

  @Delete('grocery-lists/:listId/cart')
  clearCart(
    @Param('listId', ParseUUIDPipe) listId: string,
  ): Promise<{ removedIds: string[] }> {
    return this.groceries
      .clearCart(listId)
      .then((removedIds) => ({ removedIds }));
  }
}
