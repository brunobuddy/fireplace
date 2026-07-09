import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@solidjs/testing-library';
import { PatternLock } from './PatternLock';

/** Cell `n` (0-based) carries a 1-based label. */
const dot = (cell: number): string => `Point ${cell + 1} sur 9`;

/** A keyboard-issued click; pointer clicks carry `detail >= 1`. */
const tap = (element: HTMLElement): void => {
  fireEvent.click(element, { detail: 0 });
};

/**
 * jsdom gives every element a zero-sized rect, so the grid has no geometry to
 * hit-test against until we give it one. 300px square maps 1:1 onto the viewBox.
 */
function stubGeometry(grid: HTMLElement): void {
  vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
    width: 300,
    height: 300,
    left: 0,
    top: 0,
    right: 300,
    bottom: 300,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

/**
 * jsdom implements no `PointerEvent`, and Testing Library's fallback silently
 * drops `clientX`/`clientY` — which is every coordinate the grid hit-tests on.
 * A `MouseEvent` carries them and dispatches under the pointer event name just
 * fine, since Solid delegates `pointer*` and only ever reads those two fields.
 */
function drag(grid: HTMLElement, type: string, cell: number): void {
  grid.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: (cell % 3) * 100 + 50,
      clientY: Math.floor(cell / 3) * 100 + 50,
    }),
  );
}

describe('<PatternLock>', () => {
  it('builds a walk by tapping, then submits the canonical pattern', () => {
    const onComplete = vi.fn();
    const { getByLabelText, getByRole } = render(() => (
      <PatternLock onComplete={onComplete} />
    ));

    for (const cell of [0, 1, 2, 5, 8, 7]) {
      tap(getByLabelText(dot(cell)));
    }
    fireEvent.click(getByRole('button', { name: /valider/i }));

    expect(onComplete).toHaveBeenCalledWith('012587');
  });

  it('drags in the cell it crosses, exactly as a finger would', () => {
    const onComplete = vi.fn();
    const { getByLabelText, getByText } = render(() => (
      <PatternLock onComplete={onComplete} />
    ));

    // Tapping 0 then 2 must pull in the unvisited 1 between them.
    tap(getByLabelText(dot(0)));
    tap(getByLabelText(dot(2)));

    expect(getByText('3 points reliés')).toBeInTheDocument();
  });

  it('refuses to submit a walk shorter than six cells', () => {
    const onComplete = vi.fn();
    const { getByLabelText, getByRole } = render(() => (
      <PatternLock onComplete={onComplete} />
    ));

    for (const cell of [0, 1, 2]) {
      tap(getByLabelText(dot(cell)));
    }

    expect(getByRole('button', { name: /valider/i })).toBeDisabled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('submits on release when the pattern is drawn as one drag', () => {
    const onComplete = vi.fn();
    const { getByTestId } = render(() => (
      <PatternLock onComplete={onComplete} />
    ));

    const grid = getByTestId('pattern-lock');
    stubGeometry(grid);

    drag(grid, 'pointerdown', 0);
    for (const cell of [1, 2, 5, 8, 7]) {
      drag(grid, 'pointermove', cell);
    }
    drag(grid, 'pointerup', 7);

    expect(onComplete).toHaveBeenCalledWith('012587');
  });

  it('warns instead of submitting when a drag is too short', () => {
    const onComplete = vi.fn();
    const { getByTestId, getByRole } = render(() => (
      <PatternLock onComplete={onComplete} />
    ));

    const grid = getByTestId('pattern-lock');
    stubGeometry(grid);

    drag(grid, 'pointerdown', 0);
    drag(grid, 'pointermove', 3);
    drag(grid, 'pointerup', 3);

    expect(onComplete).not.toHaveBeenCalled();
    expect(getByRole('alert')).toHaveTextContent(/relie au moins 6 points/i);
  });

  it('clears the trail as soon as it hands the pattern over', () => {
    const onComplete = vi.fn();
    const { getByTestId, getByText } = render(() => (
      <PatternLock onComplete={onComplete} />
    ));

    const grid = getByTestId('pattern-lock');
    stubGeometry(grid);

    drag(grid, 'pointerdown', 0);
    for (const cell of [1, 2, 5, 8, 7]) {
      drag(grid, 'pointermove', cell);
    }
    drag(grid, 'pointerup', 7);

    // Nothing lingers on screen for someone glancing over your shoulder.
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(getByText('0 points reliés')).toBeInTheDocument();
  });
});
