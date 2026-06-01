import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroceryList } from '../entities/grocery-list.entity';
import { GroceryCategory } from '../entities/grocery-category.entity';
import { GroceryItem } from '../entities/grocery-item.entity';
import {
  GROCERY_ITEM_REPOSITORY,
  IGroceryItemRepository,
} from '../repositories/grocery-item.repository';
import { CreateGroceryItemDto } from '../dto/create-grocery-item.dto';
import { UpdateGroceryItemDto } from '../dto/update-grocery-item.dto';
import { GroceriesGateway } from '../gateways/groceries.gateway';

export interface ListSnapshot {
  list: GroceryList;
  categories: GroceryCategory[];
  items: GroceryItem[];
}

/**
 * All grocery-list use cases. Orchestrates persistence (through the
 * `IGroceryItemRepository` port) and broadcasts every mutation so other
 * devices stay in sync. "Who did this" is always the signed-in member —
 * controllers pass it in from the JWT.
 */
@Injectable()
export class GroceriesService {
  constructor(
    @Inject(GROCERY_ITEM_REPOSITORY)
    private readonly items: IGroceryItemRepository,
    @InjectRepository(GroceryList)
    private readonly lists: Repository<GroceryList>,
    @InjectRepository(GroceryCategory)
    private readonly categories: Repository<GroceryCategory>,
    private readonly gateway: GroceriesGateway,
  ) {}

  listCategories(): Promise<GroceryCategory[]> {
    return this.categories.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  /** The single screen-load payload: list + its items + the aisle catalogue. */
  async getSnapshotForFamily(familyId: string): Promise<ListSnapshot> {
    const list = await this.resolveDefaultList(familyId);
    const [items, categories] = await Promise.all([
      this.items.findByList(list.id),
      this.listCategories(),
    ]);
    return { list, categories, items };
  }

  async addItem(
    listId: string,
    dto: CreateGroceryItemDto,
    memberId: string,
  ): Promise<GroceryItem> {
    await this.requireList(listId);
    const item = await this.items.create({
      listId,
      name: dto.name.trim(),
      quantity: dto.quantity ?? 1,
      unit: dto.unit?.trim() || null,
      note: dto.note?.trim() || null,
      categoryId: dto.categoryId ?? null,
      addedById: memberId,
    });
    this.gateway.emitItemAdded(item);
    return item;
  }

  async updateItem(
    id: string,
    dto: UpdateGroceryItemDto,
  ): Promise<GroceryItem> {
    await this.requireItem(id);
    const updated = await this.items.update(id, { ...dto });
    this.gateway.emitItemUpdated(updated);
    return updated;
  }

  /** Flip pending ⇄ done, recording who did it (the signed-in member). */
  async toggleItem(id: string, memberId: string): Promise<GroceryItem> {
    const current = await this.requireItem(id);
    const nowDone = current.status !== 'done';
    const updated = await this.items.update(id, {
      status: nowDone ? 'done' : 'pending',
      checkedById: nowDone ? memberId : null,
    });
    this.gateway.emitItemUpdated(updated);
    return updated;
  }

  async removeItem(id: string): Promise<void> {
    const item = await this.requireItem(id);
    await this.items.remove(id);
    this.gateway.emitItemRemoved({ id, listId: item.listId });
  }

  /** "Clear cart" — delete everything already picked up. */
  async clearCart(listId: string): Promise<string[]> {
    await this.requireList(listId);
    const removedIds = await this.items.removeDoneByList(listId);
    this.gateway.emitCartCleared({ listId, removedIds });
    return removedIds;
  }

  private async resolveDefaultList(familyId: string): Promise<GroceryList> {
    const existing = await this.lists.findOne({
      where: { familyId },
      order: { createdAt: 'ASC' },
    });
    if (existing) {
      return existing;
    }
    return this.lists.save(
      this.lists.create({ familyId, name: 'Shopping list' }),
    );
  }

  private async requireList(listId: string): Promise<GroceryList> {
    const list = await this.lists.findOne({ where: { id: listId } });
    if (!list) {
      throw new NotFoundException(`Grocery list ${listId} not found`);
    }
    return list;
  }

  private async requireItem(id: string): Promise<GroceryItem> {
    const item = await this.items.findById(id);
    if (!item) {
      throw new NotFoundException(`Grocery item ${id} not found`);
    }
    return item;
  }
}
