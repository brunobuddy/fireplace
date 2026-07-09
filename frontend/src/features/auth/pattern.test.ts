import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CELL_COUNT,
  MAX_PATTERN_LENGTH,
  MIN_PATTERN_LENGTH,
  extendPattern,
  intermediateCell,
  isValidPattern,
  patternFromTaps,
  serializePattern,
} from './pattern';

interface PatternVectors {
  minLength: number;
  maxLength: number;
  patternCounts: Record<string, number>;
  totalReachableFrom4: number;
  totalReachableFrom6: number;
  intermediates: { from: number; to: number; via: number }[];
  noIntermediate: [number, number][];
  canonical: { name: string; taps: number[]; canonical: string }[];
  valid: string[];
  invalid: { value: string; reason: string }[];
}

/**
 * Walk up for the repo-root fixture. Vite rewrites `import.meta.url` to a
 * non-`file:` URL under jsdom, and the cwd differs between `npm test` at the
 * root and in this workspace — so neither is a safe anchor.
 */
function findFixture(name: string): string {
  let directory = process.cwd();
  for (let depth = 0; depth < 5; depth++) {
    const candidate = join(directory, 'test-fixtures', name);
    if (existsSync(candidate)) {
      return candidate;
    }
    directory = dirname(directory);
  }
  throw new Error(`no test-fixtures/${name} above ${process.cwd()}`);
}

// The same fixture the API's `pattern.spec.ts` reads. If these two copies of the
// canonicalizer ever diverge, one of the suites goes red — which is the whole
// reason the duplication is safe.
const vectors = JSON.parse(
  readFileSync(findFixture('pattern-vectors.json'), 'utf8'),
) as PatternVectors;

/** Every walk a finger could trace, counted by length. */
function countReachablePatterns(): number[] {
  const counts = new Array<number>(CELL_COUNT + 1).fill(0);
  const visited = new Array<boolean>(CELL_COUNT).fill(false);

  const walk = (last: number, depth: number): void => {
    if (depth > 0) {
      counts[depth]++;
    }
    if (depth === CELL_COUNT) {
      return;
    }
    for (let next = 0; next < CELL_COUNT; next++) {
      if (visited[next]) {
        continue;
      }
      if (last >= 0) {
        const via = intermediateCell(last, next);
        if (via !== null && !visited[via]) {
          continue;
        }
      }
      visited[next] = true;
      walk(next, depth + 1);
      visited[next] = false;
    }
  };

  walk(-1, 0);
  return counts;
}

describe('pattern', () => {
  it('agrees with the fixture on the length bounds', () => {
    expect(MIN_PATTERN_LENGTH).toBe(vectors.minLength);
    expect(MAX_PATTERN_LENGTH).toBe(vectors.maxLength);
  });

  describe('intermediateCell', () => {
    it.each(vectors.intermediates)(
      '$from -> $to passes over $via (and back again)',
      ({ from, to, via }) => {
        expect(intermediateCell(from, to)).toBe(via);
        expect(intermediateCell(to, from)).toBe(via);
      },
    );

    it.each(vectors.noIntermediate)(
      '%i -> %i obstructs nothing (and back again)',
      (from, to) => {
        expect(intermediateCell(from, to)).toBeNull();
        expect(intermediateCell(to, from)).toBeNull();
      },
    );
  });

  describe('patternFromTaps', () => {
    it.each(vectors.canonical)('$name', ({ taps, canonical }) => {
      expect(serializePattern(patternFromTaps(taps))).toBe(canonical);
    });
  });

  describe('extendPattern', () => {
    it('ignores a cell that is already in the walk', () => {
      expect(extendPattern([0, 1, 2], 1)).toEqual([0, 1, 2]);
    });

    it('ignores a cell that is off the grid', () => {
      expect(extendPattern([0], 9)).toEqual([0]);
      expect(extendPattern([0], -1)).toEqual([0]);
    });

    it('drags in the skipped cell, then the destination', () => {
      expect(extendPattern([0], 2)).toEqual([0, 1, 2]);
    });

    it('moves straight through a skipped cell already visited', () => {
      expect(extendPattern([1, 0], 2)).toEqual([1, 0, 2]);
    });
  });

  describe('isValidPattern', () => {
    it.each(vectors.valid)('accepts %s', (value) => {
      expect(isValidPattern(value)).toBe(true);
    });

    it.each(vectors.invalid)('rejects "$value" ($reason)', ({ value }) => {
      expect(isValidPattern(value)).toBe(false);
    });
  });

  describe('the reachable pattern space', () => {
    const counts = countReachablePatterns();

    it.each(Object.entries(vectors.patternCounts))(
      'has %s-cell patterns matching the published Android count',
      (length, expected) => {
        expect(counts[Number(length)]).toBe(expected);
      },
    );

    it('still leaves 380,336 once we demand 6 cells', () => {
      const total = counts
        .slice(MIN_PATTERN_LENGTH)
        .reduce((sum, n) => sum + n, 0);
      expect(total).toBe(vectors.totalReachableFrom6);
    });
  });
});
