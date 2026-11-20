/**
 * The bordered control surface shared by `Input`'s body and `Select`'s trigger: one token set,
 * two state ramps (Input reads its inner `<input>` via `:has()`/`:focus-within`; Select reads
 * Base UI `data-*` attributes). Only unprefixed classes travel as constants — Tailwind cannot
 * see a variant-prefixed class assembled by interpolation, so consumers write state rules in full.
 */

/** Control, addons and trailing glyph on one row with the drawn 6px gap. */
export const CONTROL_SURFACE_LAYOUT = 'flex w-full items-center gap-s';

/**
 * Lets the surface shrink below the `<input>`'s intrinsic width inside flex/grid tracks.
 * `min-w-px`, not `min-w-0`: the numeric spacing scale is reset in `tokens.css`.
 */
export const CONTROL_SURFACE_MIN_WIDTH = 'min-w-px';

export const CONTROL_SURFACE_FRAME = 'rounded-s border';

export const CONTROL_SURFACE_FILL = 'bg-surface-input';

/** 48px — the standard control height. */
export const CONTROL_SURFACE_HEIGHT = 'h-6xl';

/** Border colour per state. Consumers spell out the variant prefix (`hover:${...}` compiles to nothing). */
export const CONTROL_BORDER = {
    default: 'border-border-primary',
    hover: 'border-border-control-hover',
    focused: 'border-border-focused',
    invalid: 'border-border-negative',
    disabled: 'border-border-control-disabled',
} as const;
