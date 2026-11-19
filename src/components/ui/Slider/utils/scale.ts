import type { ReactNode } from 'react';

/** More ticks than this is a continuous range wearing the wrong prop; none are drawn. */
const MAX_TICKS = 100;

/** Slack for an exact positional match, scaled to the range (float error only, never "close enough"). */
const POSITION_EPSILON = 1e-9;

/** Fraction of the axis at position `index`. The one spacing law, for both drawing and matching. */
export function fractionAtPosition(index: number, count: number) {
    return index / (count - 1);
}

/** One tick per step, `min…max` inclusive. `undefined` for a non-whole, single or too-dense range. */
export function tickCount(min: number, max: number, step: number): number | undefined {
    if (!(step > 0) || !(max > min)) {
        return undefined;
    }
    const steps = (max - min) / step;
    const count = Math.round(steps) + 1;
    if (Math.abs(steps - Math.round(steps)) > POSITION_EPSILON * Math.max(1, steps)) {
        return undefined;
    }

    return count < 2 || count > MAX_TICKS + 1 ? undefined : count;
}

function valueAtPosition(index: number, count: number, min: number, max: number) {
    return min + fractionAtPosition(index, count) * (max - min);
}

/** Index of the position the value lands exactly on; `undefined` between positions. */
export function positionOfValue(value: number, count: number, min: number, max: number) {
    // `Math.max(1, …)` keeps a zero-width range from making the tolerance zero.
    const tolerance = POSITION_EPSILON * Math.max(1, Math.abs(max - min));
    for (let index = 0; index < count; index += 1) {
        if (Math.abs(value - valueAtPosition(index, count, min, max)) <= tolerance) {
            return index;
        }
    }

    return undefined;
}

/**
 * `aria-valuetext`: the string label the value sits on. `undefined` (ReactNode label or between positions)
 * is Base UI's own default for a single thumb without `format`. Base UI signature: formatted value first.
 */
export function scaleValueText(labels: ReactNode[], min: number, max: number) {
    return function getAriaValueText(_formattedValue: string, value: number) {
        const index = positionOfValue(value, labels.length, min, max);
        const label = index === undefined ? undefined : labels[index];

        return typeof label === 'string' ? label : undefined;
    };
}
