import {
  type Component,
  For,
  Show,
  createMemo,
  createSignal,
} from 'solid-js';
import { cn } from '@/lib/cn';
import {
  CELL_COUNT,
  GRID_SIZE,
  MIN_PATTERN_LENGTH,
  extendPattern,
  isValidPattern,
  serializePattern,
} from '../pattern';

/** The trail is drawn in a square viewBox; cell centres land on 50/150/250. */
const VIEWBOX = 300;
const CELL_SPAN = VIEWBOX / GRID_SIZE;
/** Generous, but short of the 50-unit half-cell, so the zones never overlap. */
const HIT_RADIUS = CELL_SPAN * 0.42;

const CELLS = Array.from({ length: CELL_COUNT }, (_, cell) => cell);

interface Point {
  x: number;
  y: number;
}

function centreOf(cell: number): Point {
  return {
    x: (cell % GRID_SIZE) * CELL_SPAN + CELL_SPAN / 2,
    y: Math.floor(cell / GRID_SIZE) * CELL_SPAN + CELL_SPAN / 2,
  };
}

function buzz(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(8);
  }
}

interface PatternLockProps {
  /** Fired with the canonical pattern once a walk of at least 6 cells is done. */
  onComplete: (pattern: string) => void;
  disabled?: boolean;
}

/**
 * The Android-style unlock grid, built for a thumb.
 *
 * Drag across the dots and the walk submits on release. A single tap instead
 * enters tap-to-build mode, where each dot appends and an explicit button
 * submits — that path is what makes the grid reachable by keyboard and screen
 * reader, since a drag surface on its own is not.
 *
 * The trail is wiped the instant it is handed over, so a completed pattern never
 * lingers on screen for someone glancing across the kitchen table.
 */
export const PatternLock: Component<PatternLockProps> = (props) => {
  let container!: HTMLDivElement;

  const [cells, setCells] = createSignal<number[]>([]);
  const [pointer, setPointer] = createSignal<Point | null>(null);
  const [drawing, setDrawing] = createSignal(false);
  const [tapping, setTapping] = createSignal(false);
  const [hint, setHint] = createSignal<string | null>(null);

  // Whether the current stroke ever left its first cell — a tap never does.
  let moved = false;

  const trail = createMemo(() =>
    cells()
      .map((cell) => {
        const centre = centreOf(cell);
        return `${centre.x},${centre.y}`;
      })
      .join(' '),
  );

  const liveSegment = createMemo(() => {
    const to = pointer();
    const visited = cells();
    if (!drawing() || !to || visited.length === 0) {
      return null;
    }
    const from = centreOf(visited[visited.length - 1]);
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
  });

  const reset = (): void => {
    setCells([]);
    setPointer(null);
    setDrawing(false);
    setTapping(false);
    moved = false;
  };

  const addCell = (cell: number): boolean => {
    const next = extendPattern(cells(), cell);
    if (next.length === cells().length) {
      return false;
    }
    setCells(next);
    buzz();
    return true;
  };

  const finish = (): void => {
    const pattern = serializePattern(cells());
    reset();
    if (!isValidPattern(pattern)) {
      setHint(`Relie au moins ${MIN_PATTERN_LENGTH} points.`);
      return;
    }
    setHint(null);
    props.onComplete(pattern);
  };

  const toViewbox = (event: PointerEvent): Point => {
    const rect = container.getBoundingClientRect();
    const size = rect.width || 1;
    return {
      x: ((event.clientX - rect.left) / size) * VIEWBOX,
      y: ((event.clientY - rect.top) / size) * VIEWBOX,
    };
  };

  const cellAt = (point: Point): number | null => {
    for (const cell of CELLS) {
      const centre = centreOf(cell);
      if (Math.hypot(point.x - centre.x, point.y - centre.y) <= HIT_RADIUS) {
        return cell;
      }
    }
    return null;
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (props.disabled) {
      return;
    }
    const point = toViewbox(event);
    const cell = cellAt(point);
    if (cell === null) {
      return;
    }
    event.preventDefault();
    // Absent in jsdom, and on a few older mobile browsers.
    if (typeof container.setPointerCapture === 'function') {
      container.setPointerCapture(event.pointerId);
    }
    setHint(null);
    moved = false;
    // A fresh stroke starts over; a stroke begun mid tap-sequence continues it.
    if (!tapping()) {
      setCells([]);
    }
    addCell(cell);
    setPointer(point);
    setDrawing(true);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!drawing()) {
      return;
    }
    const point = toViewbox(event);
    setPointer(point);
    const cell = cellAt(point);
    if (cell !== null && addCell(cell)) {
      moved = true;
      setTapping(false);
    }
  };

  const onPointerUp = (): void => {
    if (!drawing()) {
      return;
    }
    setDrawing(false);
    setPointer(null);
    if (moved) {
      finish();
    } else {
      setTapping(true);
    }
  };

  return (
    <div class="flex flex-col items-center gap-3">
      <div
        ref={container}
        data-testid="pattern-lock"
        class={cn(
          'relative aspect-square w-full max-w-72 touch-none select-none',
          hint() && 'animate-shake',
          props.disabled && 'pointer-events-none opacity-60',
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={reset}
        onContextMenu={(event) => event.preventDefault()}
      >
        <svg
          class={cn(
            'pointer-events-none absolute inset-0 h-full w-full',
            hint() ? 'text-destructive' : 'text-primary',
          )}
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          aria-hidden="true"
        >
          <polyline
            points={trail()}
            fill="none"
            stroke="currentColor"
            stroke-width="6"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.75"
          />
          <Show when={liveSegment()}>
            {(segment) => (
              <line
                x1={segment().x1}
                y1={segment().y1}
                x2={segment().x2}
                y2={segment().y2}
                stroke="currentColor"
                stroke-width="6"
                stroke-linecap="round"
                opacity="0.4"
              />
            )}
          </Show>
        </svg>

        <div class="absolute inset-0 grid grid-cols-3 place-items-center">
          <For each={CELLS}>
            {(cell) => {
              const visited = createMemo(() => cells().includes(cell));
              return (
                <button
                  type="button"
                  // Pointer input is handled by the container so a drag reads as
                  // one gesture. Keyboard activation still fires `click` here.
                  class={cn(
                    'pointer-events-none h-6 w-6 rounded-full border-2 transition-transform',
                    'focus-visible:pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    visited()
                      ? hint()
                        ? 'scale-125 border-destructive bg-destructive/20'
                        : 'scale-125 border-primary bg-primary/20'
                      : 'border-border bg-background',
                  )}
                  aria-label={`Point ${cell + 1} sur ${CELL_COUNT}`}
                  aria-pressed={visited()}
                  disabled={props.disabled}
                  onClick={(event) => {
                    // `detail === 0` means the click came from the keyboard.
                    if (event.detail !== 0 || props.disabled) {
                      return;
                    }
                    setHint(null);
                    setTapping(true);
                    addCell(cell);
                  }}
                />
              );
            }}
          </For>
        </div>
      </div>

      <p class="sr-only" aria-live="polite">
        {`${cells().length} points reliés`}
      </p>

      <div class="flex min-h-10 items-center gap-2">
        <Show when={hint()}>
          {(message) => (
            <p role="alert" class="text-sm font-semibold text-destructive">
              {message()}
            </p>
          )}
        </Show>
        <Show when={tapping() && cells().length > 0}>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
            onClick={reset}
          >
            Effacer
          </button>
          <button
            type="button"
            class="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            disabled={cells().length < MIN_PATTERN_LENGTH}
            onClick={finish}
          >
            Valider
          </button>
        </Show>
      </div>
    </div>
  );
};
