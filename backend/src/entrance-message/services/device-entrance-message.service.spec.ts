import { DeviceEntranceMessageService } from './device-entrance-message.service';
import { formatForDevice } from './entrance-message.view';

const TOKEN = 'a'.repeat(64);

describe('DeviceEntranceMessageService', () => {
  let env: Record<string, string | undefined>;
  let families: { findOne: jest.Mock };
  let messages: { findView: jest.Mock };
  let service: DeviceEntranceMessageService;

  beforeEach(() => {
    env = { DEVICE_TOKEN: TOKEN };
    families = { findOne: jest.fn().mockResolvedValue({ id: 'home' }) };
    messages = { findView: jest.fn().mockResolvedValue(null) };
    const config = { get: (key: string) => env[key] };
    service = new DeviceEntranceMessageService(
      config as never,
      families as never,
      messages as never,
    );
  });

  describe('isAuthorized', () => {
    it('accepts the configured bearer token', () => {
      expect(service.isAuthorized(`Bearer ${TOKEN}`)).toBe(true);
    });

    it('rejects a missing, malformed or wrong token', () => {
      expect(service.isAuthorized(undefined)).toBe(false);
      expect(service.isAuthorized(TOKEN)).toBe(false);
      expect(service.isAuthorized('Bearer ')).toBe(false);
      expect(service.isAuthorized(`Bearer ${TOKEN}x`)).toBe(false);
      expect(service.isAuthorized('Bearer short')).toBe(false);
    });

    it('fails closed when DEVICE_TOKEN is unset or blank', () => {
      env.DEVICE_TOKEN = undefined;
      expect(service.isAuthorized('Bearer ')).toBe(false);
      expect(service.isAuthorized('Bearer undefined')).toBe(false);
      env.DEVICE_TOKEN = '   ';
      expect(service.isAuthorized('Bearer    ')).toBe(false);
    });
  });

  describe('render', () => {
    it('returns null when there is no message', async () => {
      await expect(service.render()).resolves.toBeNull();
      expect(messages.findView).toHaveBeenCalledWith('home');
    });

    it('prefers DEVICE_FAMILY_ID over the seeded household', async () => {
      env.DEVICE_FAMILY_ID = 'fam-x';
      await service.render();
      expect(messages.findView).toHaveBeenCalledWith('fam-x');
      expect(families.findOne).not.toHaveBeenCalled();
    });

    it('returns null when no family exists at all', async () => {
      families.findOne.mockResolvedValue(null);
      await expect(service.render()).resolves.toBeNull();
      expect(messages.findView).not.toHaveBeenCalled();
    });

    it('renders the plain-text format', async () => {
      messages.findView.mockResolvedValue({
        text: 'Pense aux clés',
        authorId: 'm',
        authorName: 'Audrey',
        updatedAt: '2026-11-10T08:00:00.000Z',
      });
      await expect(service.render()).resolves.toBe(
        'author=Audrey\nupdated=1794297600\n\nPense aux clés\n',
      );
    });
  });
});

describe('formatForDevice', () => {
  it('strips CR, keeps newlines and leaves author empty when unknown', () => {
    expect(
      formatForDevice({
        text: 'Ligne 1\r\nLigne 2',
        authorId: null,
        authorName: null,
        updatedAt: '1970-01-01T00:01:40.900Z',
      }),
    ).toBe('author=\nupdated=100\n\nLigne 1\nLigne 2\n');
  });
});
