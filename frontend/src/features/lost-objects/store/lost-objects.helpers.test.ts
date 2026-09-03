import { describe, expect, it } from 'vitest';
import type { LostObject } from '@/lib/types';
import {
  foundObjects,
  lostCount,
  lostObjects,
  removeById,
  upsert,
} from './lost-objects.helpers';

const make = (over: Partial<LostObject> = {}): LostObject => ({
  id: 'a',
  name: 'Doudou',
  status: 'lost',
  familyId: 'f',
  reportedById: 'm',
  foundById: null,
  foundAt: null,
  comments: [],
  createdAt: '2026-01-01T10:00:00.000Z',
  ...over,
});

describe('upsert', () => {
  it('appends an unknown object', () => {
    const next = make({ id: 'b' });
    expect(upsert([make()], next)).toHaveLength(2);
  });

  it('replaces an existing object in place', () => {
    const updated = make({ name: 'Doudou lapin' });
    const result = upsert([make(), make({ id: 'b' })], updated);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Doudou lapin');
  });
});

describe('removeById', () => {
  it('drops the matching object and keeps the rest', () => {
    const result = removeById([make(), make({ id: 'b' })], 'a');
    expect(result.map((o) => o.id)).toEqual(['b']);
  });
});

describe('lostObjects', () => {
  it('keeps only lost objects, newest report first', () => {
    const older = make({ id: 'old', createdAt: '2026-01-01T08:00:00.000Z' });
    const newer = make({ id: 'new', createdAt: '2026-01-02T08:00:00.000Z' });
    const found = make({ id: 'found', status: 'found' });
    expect(lostObjects([older, found, newer]).map((o) => o.id)).toEqual([
      'new',
      'old',
    ]);
  });
});

describe('foundObjects', () => {
  it('keeps only found objects, most recently found first', () => {
    const first = make({
      id: 'first',
      status: 'found',
      foundAt: '2026-01-03T08:00:00.000Z',
    });
    const second = make({
      id: 'second',
      status: 'found',
      foundAt: '2026-01-04T08:00:00.000Z',
    });
    expect(foundObjects([first, make(), second]).map((o) => o.id)).toEqual([
      'second',
      'first',
    ]);
  });
});

describe('lostCount', () => {
  it('counts only the still-missing objects', () => {
    expect(lostCount([make(), make({ id: 'b', status: 'found' })])).toBe(1);
  });
});
