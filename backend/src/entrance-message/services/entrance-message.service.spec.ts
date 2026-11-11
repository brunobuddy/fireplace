import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntranceMessageService, excerpt } from './entrance-message.service';
import { IEntranceMessageRepository } from '../repositories/entrance-message.repository';
import { EntranceMessage } from '../entities/entrance-message.entity';
import { AuthUser } from '../../auth/auth.types';

const user: AuthUser = {
  memberId: 'mem-1',
  familyId: 'fam-1',
  email: 'audrey@example.com',
  name: 'Audrey',
  role: 'parent',
  color: '#d97706',
};

const makeMessage = (over: Partial<EntranceMessage> = {}): EntranceMessage =>
  ({
    id: 'msg-1',
    familyId: 'fam-1',
    text: 'Pense aux clés',
    authorId: 'mem-1',
    author: { id: 'mem-1', name: 'Audrey' },
    updatedAt: new Date('2026-11-10T08:00:00.000Z'),
    ...over,
  }) as EntranceMessage;

describe('EntranceMessageService', () => {
  let messages: jest.Mocked<IEntranceMessageRepository>;
  let families: { findOne: jest.Mock };
  let gateway: { emitUpdated: jest.Mock };
  let notifications: { notifyOthers: jest.Mock };
  let service: EntranceMessageService;

  beforeEach(() => {
    messages = {
      findByFamily: jest.fn(),
      upsert: jest.fn(),
      clear: jest.fn(),
    };
    families = { findOne: jest.fn().mockResolvedValue({ id: 'fam-1' }) };
    gateway = { emitUpdated: jest.fn() };
    notifications = { notifyOthers: jest.fn().mockResolvedValue(undefined) };
    service = new EntranceMessageService(
      messages,
      families as never,
      gateway as never,
      notifications as never,
    );
  });

  describe('get', () => {
    it('returns null when there is no message', async () => {
      messages.findByFamily.mockResolvedValue(null);
      await expect(service.get('fam-1', user)).resolves.toEqual({
        message: null,
      });
    });

    it('projects the message with its author name and ISO timestamp', async () => {
      messages.findByFamily.mockResolvedValue(makeMessage());
      await expect(service.get('fam-1', user)).resolves.toEqual({
        message: {
          text: 'Pense aux clés',
          authorId: 'mem-1',
          authorName: 'Audrey',
          updatedAt: '2026-11-10T08:00:00.000Z',
        },
      });
    });

    it('refuses another family', async () => {
      await expect(service.get('fam-2', user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('set', () => {
    it('trims, stamps the signed-in member, broadcasts and notifies', async () => {
      messages.upsert.mockResolvedValue(makeMessage());

      const result = await service.set('fam-1', '  Pense aux clés  ', user);

      expect(messages.upsert).toHaveBeenCalledWith({
        familyId: 'fam-1',
        text: 'Pense aux clés',
        authorId: 'mem-1',
      });
      expect(gateway.emitUpdated).toHaveBeenCalledWith({
        familyId: 'fam-1',
        message: result.message,
      });
      expect(result.message?.authorName).toBe('Audrey');
      expect(notifications.notifyOthers).toHaveBeenCalledWith(
        'mem-1',
        'fam-1',
        expect.any(Function),
      );
      const build = notifications.notifyOthers.mock.calls[0][2];
      expect(build('Audrey')).toEqual(
        expect.objectContaining({
          title: 'Message pour l’entrée 📌',
          body: 'Audrey : Pense aux clés',
        }),
      );
    });

    it('clears on a whitespace-only text, broadcasts null, does not notify', async () => {
      const result = await service.set('fam-1', '  \n\t ', user);

      expect(result).toEqual({ message: null });
      expect(messages.clear).toHaveBeenCalledWith('fam-1');
      expect(messages.upsert).not.toHaveBeenCalled();
      expect(gateway.emitUpdated).toHaveBeenCalledWith({
        familyId: 'fam-1',
        message: null,
      });
      expect(notifications.notifyOthers).not.toHaveBeenCalled();
    });

    it('rejects an unknown family', async () => {
      families.findOne.mockResolvedValue(null);
      await expect(service.set('fam-1', 'Coucou', user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(messages.upsert).not.toHaveBeenCalled();
    });

    it('refuses to write to another family', async () => {
      await expect(service.set('fam-2', 'Coucou', user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(messages.upsert).not.toHaveBeenCalled();
    });
  });
});

describe('excerpt', () => {
  it('folds newlines into one line', () => {
    expect(excerpt('Pense\naux   clés')).toBe('Pense aux clés');
  });

  it('cuts long texts with an ellipsis', () => {
    const cut = excerpt('a'.repeat(280));
    expect(cut).toHaveLength(100);
    expect(cut.endsWith('…')).toBe(true);
  });
});
