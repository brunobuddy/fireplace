import { NotFoundException } from '@nestjs/common';
import { LostObjectsService } from './lost-objects.service';
import { ILostObjectRepository } from '../repositories/lost-object.repository';
import { LostObject } from '../entities/lost-object.entity';
import { LostObjectsGateway } from '../gateways/lost-objects.gateway';

const makeObject = (over: Partial<LostObject> = {}): LostObject =>
  ({
    id: 'obj-1',
    name: 'Doudou lapin',
    status: 'lost',
    familyId: 'fam-1',
    reportedById: 'mem-1',
    foundById: null,
    foundAt: null,
    comments: [],
    ...over,
  }) as LostObject;

describe('LostObjectsService', () => {
  let objects: jest.Mocked<ILostObjectRepository>;
  let gateway: jest.Mocked<
    Pick<LostObjectsGateway, 'emitAdded' | 'emitUpdated' | 'emitRemoved'>
  >;
  let families: { findOne: jest.Mock };
  let service: LostObjectsService;

  beforeEach(() => {
    objects = {
      findByFamily: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      addComment: jest.fn(),
      findCommentById: jest.fn(),
      removeComment: jest.fn(),
    };
    gateway = {
      emitAdded: jest.fn(),
      emitUpdated: jest.fn(),
      emitRemoved: jest.fn(),
    };
    families = { findOne: jest.fn() };
    service = new LostObjectsService(
      objects,
      families as never,
      gateway as never,
    );
  });

  describe('report', () => {
    it('trims the name, stamps the signed-in member, broadcasts', async () => {
      families.findOne.mockResolvedValue({ id: 'fam-1' });
      const created = makeObject();
      objects.create.mockResolvedValue(created);

      const result = await service.report(
        'fam-1',
        { name: '  Doudou lapin  ' },
        'mem-1',
      );

      expect(objects.create).toHaveBeenCalledWith({
        name: 'Doudou lapin',
        familyId: 'fam-1',
        reportedById: 'mem-1',
      });
      expect(gateway.emitAdded).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('rejects when the family does not exist', async () => {
      families.findOne.mockResolvedValue(null);
      await expect(
        service.report('missing', { name: 'Clés' }, 'mem-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(objects.create).not.toHaveBeenCalled();
    });
  });

  describe('toggleFound', () => {
    it('marks a lost object found, stamping who and when', async () => {
      objects.findById.mockResolvedValue(makeObject({ status: 'lost' }));
      const found = makeObject({ status: 'found', foundById: 'mem-2' });
      objects.update.mockResolvedValue(found);

      const result = await service.toggleFound('obj-1', 'mem-2');

      expect(objects.update).toHaveBeenCalledWith(
        'obj-1',
        expect.objectContaining({
          status: 'found',
          foundById: 'mem-2',
          foundAt: expect.any(String),
        }),
      );
      expect(gateway.emitUpdated).toHaveBeenCalledWith(found);
      expect(result.status).toBe('found');
    });

    it('marks a found object lost again and clears the found stamps', async () => {
      objects.findById.mockResolvedValue(makeObject({ status: 'found' }));
      objects.update.mockResolvedValue(makeObject({ status: 'lost' }));

      await service.toggleFound('obj-1', 'mem-2');

      expect(objects.update).toHaveBeenCalledWith('obj-1', {
        status: 'lost',
        foundById: null,
        foundAt: null,
      });
    });

    it('rejects an unknown object', async () => {
      objects.findById.mockResolvedValue(null);
      await expect(
        service.toggleFound('missing', 'mem-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('addComment', () => {
    it('persists the suggestion with the signed-in member, then re-broadcasts the whole object', async () => {
      const withComment = makeObject({
        comments: [{ id: 'c1', body: 'Regarde sous le canapé' } as never],
      });
      objects.findById.mockResolvedValue(withComment);
      objects.addComment.mockResolvedValue({ id: 'c1' } as never);

      const result = await service.addComment(
        'obj-1',
        { body: '  Regarde sous le canapé  ' },
        'mem-2',
      );

      expect(objects.addComment).toHaveBeenCalledWith({
        lostObjectId: 'obj-1',
        authorId: 'mem-2',
        body: 'Regarde sous le canapé',
      });
      expect(gateway.emitUpdated).toHaveBeenCalledWith(withComment);
      expect(result).toBe(withComment);
    });
  });

  describe('removeComment', () => {
    it('rejects a comment that belongs to another object', async () => {
      objects.findById.mockResolvedValue(makeObject());
      objects.findCommentById.mockResolvedValue({
        id: 'c1',
        lostObjectId: 'other-object',
      } as never);

      await expect(service.removeComment('obj-1', 'c1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(objects.removeComment).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes the object and broadcasts the removal', async () => {
      objects.findById.mockResolvedValue(makeObject({ familyId: 'fam-9' }));

      await service.remove('obj-1');

      expect(objects.remove).toHaveBeenCalledWith('obj-1');
      expect(gateway.emitRemoved).toHaveBeenCalledWith({
        id: 'obj-1',
        familyId: 'fam-9',
      });
    });
  });
});
