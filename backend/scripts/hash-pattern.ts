/**
 * Turn an unlock pattern into the bcrypt hash that goes in `AUTH_USERS`.
 *
 *   npm run auth:hash-pattern --workspace=backend -- 0-3-6-7-8-5-2
 *
 * Separators are ignored, so `03678`, `0,3,6,7,8` and `0-3-6-7-8` are the same
 * input. The cells run through the very canonicalizer the SPA uses, so a walk
 * that crosses a cell you did not list picks it up here exactly as it would
 * under a finger — otherwise this script could mint a hash the UI can never
 * reproduce, and nobody could log in.
 */
import { hashSync } from 'bcryptjs';
import {
  GRID_SIZE,
  MAX_PATTERN_LENGTH,
  MIN_PATTERN_LENGTH,
  isValidPattern,
  patternFromTaps,
  serializePattern,
} from '../src/auth/pattern';

const BCRYPT_ROUNDS = 10;

function fail(message: string): never {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

/** Draw the walk, numbering each cell by the order it is visited. */
function render(pattern: string): string {
  const order = new Map(
    [...pattern].map((cell, index) => [Number(cell), index + 1] as const),
  );
  const rows: string[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const cells: string[] = [];
    for (let column = 0; column < GRID_SIZE; column++) {
      const step = order.get(row * GRID_SIZE + column);
      cells.push(step === undefined ? ' .' : String(step).padStart(2, ' '));
    }
    rows.push(`  ${cells.join(' ')}`);
  }
  return rows.join('\n');
}

const raw = process.argv[2];
if (!raw) {
  fail('usage: npm run auth:hash-pattern --workspace=backend -- 0-3-6-7-8-5-2');
}

const cleaned = raw.replace(/[^0-9]/g, '');
if (!/^[0-8]+$/.test(cleaned)) {
  fail(`"${raw}" must name only the cells 0-8 (separators are ignored)`);
}

const canonical = serializePattern(patternFromTaps([...cleaned].map(Number)));
if (!isValidPattern(canonical)) {
  fail(
    `that walk is ${canonical.length} cell(s); it must be ${MIN_PATTERN_LENGTH}-${MAX_PATTERN_LENGTH} and never revisit one`,
  );
}

if (canonical !== cleaned) {
  process.stdout.write(
    `note: the walk crosses cells you did not list — canonicalized to ${canonical}\n`,
  );
}

process.stdout.write(`\n${render(canonical)}\n\n`);
process.stdout.write(`pattern: ${canonical}\n`);
process.stdout.write(`hash:    ${hashSync(canonical, BCRYPT_ROUNDS)}\n`);
