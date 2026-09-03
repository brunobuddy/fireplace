import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushSubscription } from '../entities/push-subscription.entity';
import { StubPushSender } from '../sender/stub-push-sender';

const sub = (over: Partial<PushSubscription> = {}): PushSubscription =>
  ({
    id: 'sub-1',
    endpoint: 'https://push.example/abc',
    p256dh: 'p256dh-key',
    auth: 'auth-secret',
    memberId: 'm-audrey',
    familyId: 'fam-1',
    ...over,
  }) as PushSubscription;

describe('NotificationsService', () => {
  let subscriptions: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let members: { findOne: jest.Mock };
  let sender: StubPushSender;
  let service: NotificationsService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    subscriptions = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue({}),
      save: jest.fn(),
      delete: jest.fn(),
    };
    members = {
      findOne: jest.fn().mockResolvedValue({ id: 'm-bruno', name: 'Bruno' }),
    };
    sender = new StubPushSender();
    service = new NotificationsService(
      subscriptions as never,
      members as never,
      sender,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  const payload = (actor: string) => ({
    title: 'Courses 🧺',
    body: `${actor} a ajouté « Œufs » à la liste`,
    url: '/groceries',
    tag: 'grocery-1',
  });

  describe('notifyOthers', () => {
    it("delivers the actor-named payload to the family's other devices", async () => {
      subscriptions.find.mockResolvedValue([sub()]);

      await service.notifyOthers('m-bruno', 'fam-1', payload);

      expect(sender.sent).toHaveLength(1);
      expect(sender.sent[0].payload.body).toBe(
        'Bruno a ajouté « Œufs » à la liste',
      );
      // The query itself excludes the actor: memberId != m-bruno.
      const where = subscriptions.find.mock.calls[0][0].where;
      expect(where.familyId).toBe('fam-1');
      expect(where.memberId).toMatchObject({ _type: 'not' });
    });

    it('does nothing when nobody else has subscribed', async () => {
      await service.notifyOthers('m-bruno', 'fam-1', payload);
      expect(sender.sent).toHaveLength(0);
      expect(members.findOne).not.toHaveBeenCalled();
    });

    it('prunes a subscription the push service reports gone, still serving the rest', async () => {
      subscriptions.find.mockResolvedValue([
        sub({ endpoint: 'https://push.example/gone-device' }),
        sub({ id: 'sub-2', endpoint: 'https://push.example/alive' }),
      ]);

      await service.notifyOthers('m-bruno', 'fam-1', payload);

      expect(sender.sent).toHaveLength(1);
      expect(sender.sent[0].target.endpoint).toBe('https://push.example/alive');
      expect(subscriptions.delete).toHaveBeenCalledWith({
        endpoint: 'https://push.example/gone-device',
      });
    });

    it('never throws — a failing repository is logged and swallowed', async () => {
      subscriptions.find.mockRejectedValue(new Error('db down'));
      await expect(
        service.notifyOthers('m-bruno', 'fam-1', payload),
      ).resolves.toBeUndefined();
    });

    it('stays silent when push is not configured (no VAPID keys)', async () => {
      const disabled = new NotificationsService(
        subscriptions as never,
        members as never,
        { publicKey: null, send: jest.fn() },
      );
      await disabled.notifyOthers('m-bruno', 'fam-1', payload);
      expect(subscriptions.find).not.toHaveBeenCalled();
    });
  });

  describe('saveSubscription', () => {
    it('re-owns an existing endpoint instead of duplicating it', async () => {
      const existing = sub({ memberId: 'm-bruno' });
      subscriptions.findOne.mockResolvedValue(existing);

      await service.saveSubscription('m-audrey', 'fam-1', {
        endpoint: existing.endpoint,
        keys: { p256dh: 'new-p256dh', auth: 'new-auth' },
      });

      expect(subscriptions.create).not.toHaveBeenCalled();
      expect(subscriptions.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'sub-1',
          memberId: 'm-audrey',
          p256dh: 'new-p256dh',
        }),
      );
    });
  });

  describe('removeSubscription', () => {
    it('only deletes rows owned by the caller', async () => {
      await service.removeSubscription('m-bruno', 'https://push.example/abc');
      expect(subscriptions.delete).toHaveBeenCalledWith({
        endpoint: 'https://push.example/abc',
        memberId: 'm-bruno',
      });
    });
  });
});
