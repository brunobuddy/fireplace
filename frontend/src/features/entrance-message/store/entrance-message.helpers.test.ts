import { describe, expect, it } from 'vitest';
import type { EntranceMessage, Member } from '@/lib/types';
import {
  applyUpdate,
  canPublish,
  normalizeDraft,
  optimisticMessage,
  remainingChars,
} from './entrance-message.helpers';

const current: EntranceMessage = {
  text: 'Pense aux clés',
  authorId: 'm',
  authorName: 'Audrey',
  updatedAt: '2026-11-10T08:00:00.000Z',
};

const me: Member = {
  id: 'm2',
  name: 'Bruno',
  role: 'parent',
  color: '#c2410c',
  familyId: 'f',
};

describe('normalizeDraft / remainingChars', () => {
  it('trims before counting', () => {
    expect(normalizeDraft('  salut \n')).toBe('salut');
    expect(remainingChars('  salut  ')).toBe(275);
  });

  it('goes negative past the limit', () => {
    expect(remainingChars('a'.repeat(281))).toBe(-1);
  });
});

describe('canPublish', () => {
  it('needs non-blank text within the limit', () => {
    expect(canPublish('   ', null)).toBe(false);
    expect(canPublish('a'.repeat(281), null)).toBe(false);
    expect(canPublish('a'.repeat(280), null)).toBe(true);
  });

  it('refuses re-posting exactly what is already shown', () => {
    expect(canPublish(' Pense aux clés ', current)).toBe(false);
    expect(canPublish('Pense aux clés !', current)).toBe(true);
  });
});

describe('optimisticMessage', () => {
  it('stamps the signed-in member and now', () => {
    const now = new Date('2026-11-10T09:00:00.000Z');
    expect(optimisticMessage('  Coucou ', me, now)).toEqual({
      text: 'Coucou',
      authorId: 'm2',
      authorName: 'Bruno',
      updatedAt: '2026-11-10T09:00:00.000Z',
    });
  });
});

describe('applyUpdate', () => {
  it('replaces the message for our family, including clearing it', () => {
    const next = { ...current, text: 'Nouveau' };
    expect(applyUpdate(current, { familyId: 'f', message: next }, 'f')).toBe(
      next,
    );
    expect(applyUpdate(current, { familyId: 'f', message: null }, 'f')).toBe(
      null,
    );
  });

  it('ignores another family', () => {
    expect(
      applyUpdate(current, { familyId: 'other', message: null }, 'f'),
    ).toBe(current);
  });

  it('is idempotent', () => {
    const update = { familyId: 'f', message: current };
    expect(applyUpdate(applyUpdate(null, update, 'f'), update, 'f')).toBe(
      current,
    );
  });
});
