import { NotFoundException } from '@nestjs/common';
import { GroceriesService } from './groceries.service';
import { IGroceryItemRepository } from '../repositories/grocery-item.repository';
import { GroceryItem } from '../entities/grocery-item.entity';
import { GroceriesGateway } from '../gateways/groceries.gateway';
import { ICategoryClassifier } from '../categorizer/category-classifier';

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
  let classifier: jest.Mocked<ICategoryClassifier>;
  let notifications: { notifyOthers: jest.Mock };
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
    classifier = { classify: jest.fn().mockResolvedValue(null) };
    notifications = { notifyOthers: jest.fn().mockResolvedValue(undefined) };
    service = new GroceriesService(
      items,
      lists as never,
      categories as never,
      classifier,
      gateway as never,
      notifications as never,
    );
  });

  describe('addItem', () => {
    it('creates the item, trims input, stamps the signed-in member, and broadcasts', async () => {
      lists.findOne.mockResolvedValue({ id: 'list-1' });
      const created = makeItem({ name: 'Eggs', addedById: 'mem-1' });
      items.create.mockResolvedValue(created);
      categories.find.mockResolvedValue([]);

      const result = await service.addItem(
        'list-1',
        { name: '  Eggs  ' },
        'mem-1',
      );

      expect(items.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Eggs',
          quantity: 1,
          listId: 'list-1',
          categoryId: null,
          addedById: 'mem-1',
        }),
      );
      expect(gateway.emitItemAdded).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('rejects when the list does not exist', async () => {
      lists.findOne.mockResolvedValue(null);
      await expect(
        service.addItem('missing', { name: 'X' }, 'mem-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(items.create).not.toHaveBeenCalled();
    });
  });

  describe('categorizeInBackground', () => {
    const dairy = { id: 'cat-dairy', slug: 'dairy', name: 'Crèmerie & Œufs' };

    it('classifies the item, persists the category and broadcasts an update', async () => {
      categories.find.mockResolvedValue([dairy]);
      classifier.classify.mockResolvedValue('dairy');
      const fresh = makeItem({ name: 'Milk', categoryId: null });
      items.findById.mockResolvedValue(fresh);
      const updated = makeItem({ name: 'Milk', categoryId: 'cat-dairy' });
      items.update.mockResolvedValue(updated);

      await service.categorizeInBackground(fresh);

      expect(classifier.classify).toHaveBeenCalledWith({
        name: 'Milk',
        categories: [{ id: dairy.id, slug: dairy.slug, name: dairy.name }],
      });
      expect(items.update).toHaveBeenCalledWith('item-1', {
        categoryId: 'cat-dairy',
      });
      expect(gateway.emitItemUpdated).toHaveBeenCalledWith(updated);
    });

    it('no-ops when the classifier returns null', async () => {
      categories.find.mockResolvedValue([dairy]);
      classifier.classify.mockResolvedValue(null);

      await service.categorizeInBackground(makeItem({ name: 'Mystery' }));

      expect(items.update).not.toHaveBeenCalled();
      expect(gateway.emitItemUpdated).not.toHaveBeenCalled();
    });

    it('no-ops when the row has been re-categorized in the meantime', async () => {
      categories.find.mockResolvedValue([dairy]);
      classifier.classify.mockResolvedValue('dairy');
      items.findById.mockResolvedValue(
        makeItem({ name: 'Milk', categoryId: 'cat-other' }),
      );

      await service.categorizeInBackground(makeItem({ name: 'Milk' }));

      expect(items.update).not.toHaveBeenCalled();
    });

    it('swallows classifier errors so the user is never blocked', async () => {
      categories.find.mockResolvedValue([dairy]);
      classifier.classify.mockRejectedValue(new Error('boom'));

      await expect(
        service.categorizeInBackground(makeItem({ name: 'Milk' })),
      ).resolves.toBeUndefined();
      expect(items.update).not.toHaveBeenCalled();
    });
  });

  describe('toggleItem', () => {
    it('marks a pending item done and records the member', async () => {
      items.findById.mockResolvedValue(makeItem({ status: 'pending' }));
      const done = makeItem({ status: 'done', checkedById: 'mem-2' });
      items.update.mockResolvedValue(done);

      const result = await service.toggleItem('item-1', 'mem-2');

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

      await service.toggleItem('item-1', 'mem-2');

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
