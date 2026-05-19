import { NotFoundException } from '@nestjs/common';
import { GroceriesService } from './groceries.service';
import { IGroceryItemRepository } from '../repositories/grocery-item.repository';
import { GroceryItem } from '../entities/grocery-item.entity';
import { GroceriesGateway } from '../gateways/groceries.gateway';

/** Builds a GroceryItem-shaped object without touching the DB. */
const makeItem = (over: Partial<GroceryItem> = {}): GroceryItem =>
  ({
    id: 'item-1',
    name: 'Milk',
    quantity: 1,
    unit: null,
    note: null,
    status: 'pending',
    listId: 'list-1',
    categoryId: null,
    addedById: 'mem-1',
    checkedById: null,
    ...over,
  }) as GroceryItem;

describe('GroceriesService', () => {
  let items: jest.Mocked<IGroceryItemRepository>;
  let gateway: jest.Mocked<
    Pick<
      GroceriesGateway,
      | 'emitItemAdded'
      | 'emitItemUpdated'
      | 'emitItemRemoved'
      | 'emitCartCleared'
    >
  >;
  let lists: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let categories: { find: jest.Mock };
  let service: GroceriesService;

  beforeEach(() => {
    items = {
      findByList: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      removeDoneByList: jest.fn(),
    };
    gateway = {
      emitItemAdded: jest.fn(),
      emitItemUpdated: jest.fn(),
      emitItemRemoved: jest.fn(),
      emitCartCleared: jest.fn(),
    };
    lists = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    categories = { find: jest.fn() };
    service = new GroceriesService(
      items,
      lists as never,
      categories as never,
      gateway as never,
    );
  });

  describe('addItem', () => {
    it('creates the item, trims input and broadcasts it', async () => {
      lists.findOne.mockResolvedValue({ id: 'list-1' });
      const created = makeItem({ name: 'Eggs' });
      items.create.mockResolvedValue(created);

      const result = await service.addItem('list-1', {
        name: '  Eggs  ',
        addedById: 'mem-1',
      });

      expect(items.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Eggs',
          quantity: 1,
          listId: 'list-1',
        }),
      );
      expect(gateway.emitItemAdded).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('rejects when the list does not exist', async () => {
      lists.findOne.mockResolvedValue(null);
      await expect(
        service.addItem('missing', { name: 'X', addedById: 'm' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(items.create).not.toHaveBeenCalled();
    });
  });

  describe('toggleItem', () => {
    it('marks a pending item done and records the member', async () => {
      items.findById.mockResolvedValue(makeItem({ status: 'pending' }));
      const done = makeItem({ status: 'done', checkedById: 'mem-2' });
      items.update.mockResolvedValue(done);

      const result = await service.toggleItem('item-1', { memberId: 'mem-2' });

      expect(items.update).toHaveBeenCalledWith('item-1', {
        status: 'done',
        checkedById: 'mem-2',
      });
      expect(gateway.emitItemUpdated).toHaveBeenCalledWith(done);
      expect(result.status).toBe('done');
    });

    it('un-checks a done item and clears the checker', async () => {
      items.findById.mockResolvedValue(makeItem({ status: 'done' }));
      items.update.mockResolvedValue(makeItem({ status: 'pending' }));

      await service.toggleItem('item-1', { memberId: 'mem-2' });

      expect(items.update).toHaveBeenCalledWith('item-1', {
        status: 'pending',
        checkedById: null,
      });
    });
  });

  describe('removeItem', () => {
    it('throws when the item is unknown', async () => {
      items.findById.mockResolvedValue(null);
      await expect(service.removeItem('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deletes and broadcasts removal', async () => {
      items.findById.mockResolvedValue(makeItem());
      await service.removeItem('item-1');
      expect(items.remove).toHaveBeenCalledWith('item-1');
      expect(gateway.emitItemRemoved).toHaveBeenCalledWith({
        id: 'item-1',
        listId: 'list-1',
      });
    });
  });

  describe('clearCart', () => {
    it('removes done items and broadcasts the cleared ids', async () => {
      lists.findOne.mockResolvedValue({ id: 'list-1' });
      items.removeDoneByList.mockResolvedValue(['a', 'b']);

      const removed = await service.clearCart('list-1');

      expect(removed).toEqual(['a', 'b']);
      expect(gateway.emitCartCleared).toHaveBeenCalledWith({
        listId: 'list-1',
        removedIds: ['a', 'b'],
      });
    });
  });
});
