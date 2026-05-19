import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroceryItem } from '../entities/grocery-item.entity';
import {
  GroceryItemChanges,
  IGroceryItemRepository,
  NewGroceryItem,
} from './grocery-item.repository';

/** TypeORM-backed implementation of the grocery-item persistence port. */
@Injectable()
export class TypeOrmGroceryItemRepository implements IGroceryItemRepository {
  constructor(
    @InjectRepository(GroceryItem)
    private readonly repo: Repository<GroceryItem>,
  ) {}

  /** Eager-load the relations the UI renders (who added it, who checked it). */
  private readonly relations = {
    category: true,
    addedBy: true,
    checkedBy: true,
  };

  findByList(listId: string): Promise<GroceryItem[]> {
    return this.repo.find({
      where: { listId },
      relations: this.relations,
      order: { createdAt: 'ASC' },
    });
  }

  findById(id: string): Promise<GroceryItem | null> {
    return this.repo.findOne({ where: { id }, relations: this.relations });
  }

  async create(data: NewGroceryItem): Promise<GroceryItem> {
    const saved = await this.repo.save(this.repo.create(data));
    return this.requireById(saved.id);
  }

  async update(id: string, changes: GroceryItemChanges): Promise<GroceryItem> {
    await this.repo.update({ id }, changes);
    return this.requireById(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async removeDoneByList(listId: string): Promise<string[]> {
    const done = await this.repo.find({
      where: { listId, status: 'done' },
      select: { id: true },
    });
    const ids = done.map((item) => item.id);
    if (ids.length > 0) {
      await this.repo.delete(ids);
    }
    return ids;
  }

  private async requireById(id: string): Promise<GroceryItem> {
    const item = await this.findById(id);
    if (!item) {
      // Unreachable in practice — the row was just written in the same tx.
      throw new Error(`Grocery item ${id} vanished after write`);
    }
    return item;
  }
}
