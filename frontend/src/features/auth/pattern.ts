/**
 * Unlock-pattern maths, duplicated verbatim in the API
 * (`backend/src/auth/pattern.ts`). Both copies are pinned to
 * `test-fixtures/pattern-vectors.json`, so drift fails the suites rather than
 * silently minting a hash that nobody can log in with.
 *
 * A pattern is an ordered walk over a 3x3 grid, indexed row-major:
 *
 *     0 1 2
 *     3 4 5
 *     6 7 8
 *
 * Its canonical form is just the visited cells joined — `"03678"` — so the
 * pattern *is* the password: it travels in the existing `password` field and is
 * bcrypt-compared server-side like any other secret.
 */

export const GRID_SIZE = 3;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

/**
 * Android permits 4 cells, but a 4-cell pattern has only 1,624 possibilities —
 * fewer than a 4-digit PIN. Demanding 6 keeps 380,336 of the 389,112 reachable
 * patterns (a 2.26% cut) while discarding the short ones humans actually pick.
 *
 * This does not make the secret strong: the whole space is ~18.5 bits either
 * way. Login throttling is what keeps it out of reach.
 */
export const MIN_PATTERN_LENGTH = 6;
export const MAX_PATTERN_LENGTH = CELL_COUNT;

/**
 * The cell a straight move from `a` to `b` passes over, or `null` when it
 * obstructs nothing. A midpoint exists exactly when the row sum and the column
 * sum are both even — which yields Android's eight skip pairs and correctly
 * leaves knight-moves such as 0 -> 5 unobstructed.
 */
export function intermediateCell(a: number, b: number): number | null {
  const rowA = Math.floor(a / GRID_SIZE);
  const colA = a % GRID_SIZE;
  const rowB = Math.floor(b / GRID_SIZE);
  const colB = b % GRID_SIZE;
  if ((rowA + rowB) % 2 !== 0 || (colA + colB) % 2 !== 0) {
    return null;
  }
  return ((rowA + rowB) / 2) * GRID_SIZE + (colA + colB) / 2;
}

/**
 * Land on `next`, applying the skip rule: a move that crosses a still-unvisited
 * cell drags that cell in first. Cells already in the walk are passed straight
 * over, and re-touching one is a no-op.
 */
export function extendPattern(
  sequence: readonly number[],
  next: number,
): number[] {
  if (!Number.isInteger(next) || next < 0 || next >= CELL_COUNT) {
    return [...sequence];
  }
  if (sequence.includes(next)) {
    return [...sequence];
  }
  const last = sequence[sequence.length - 1];
  if (last === undefined) {
    return [next];
  }
  const via = intermediateCell(last, next);
  return via !== null && !sequence.includes(via)
    ? [...sequence, via, next]
    : [...sequence, next];
}

/** Fold the raw cells a finger touched into the walk it actually traced. */
export function patternFromTaps(taps: readonly number[]): number[] {
  return taps.reduce<number[]>(extendPattern, []);
}

/** The wire/storage form: visited cells joined, e.g. `[0,3,6] -> "036"`. */
export function serializePattern(sequence: readonly number[]): string {
  return sequence.join('');
}

const ZERO = '0'.charCodeAt(0);

/**
 * True when `value` is a walk a finger could actually trace: the right length,
 * on-grid, no cell twice, and never skipping over a cell it had not yet
 * visited. The API enforces this too — this copy just keeps the submit button
 * honest.
 */
export function isValidPattern(value: string): boolean {
  if (value.length < MIN_PATTERN_LENGTH || value.length > MAX_PATTERN_LENGTH) {
    return false;
  }
  const visited: number[] = [];
  for (const character of value) {
    const cell = character.charCodeAt(0) - ZERO;
    if (cell < 0 || cell >= CELL_COUNT) {
      return false;
    }
    if (visited.includes(cell)) {
      return false;
    }
    const last = visited[visited.length - 1];
    if (last !== undefined) {
      const via = intermediateCell(last, cell);
      if (via !== null && !visited.includes(via)) {
        return false;
      }
    }
    visited.push(cell);
  }
  return true;
}
