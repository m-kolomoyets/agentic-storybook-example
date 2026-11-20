/** Shared enter/exit motion for Base UI popups (`data-starting-style` / `data-ending-style`). */

export const OVERLAY_DURATION_SHORT = 'duration-150 ease-out';

export const OVERLAY_TRANSITION = `transition-[opacity,transform] ${OVERLAY_DURATION_SHORT}`;

/** Longer travel for sheets and panels that slide in from an edge. */
export const OVERLAY_TRANSITION_TRAVEL = 'transition-[opacity,transform] duration-250 ease-out';

export const OVERLAY_FADE = 'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0';

export const OVERLAY_MOTION = `${OVERLAY_TRANSITION} ${OVERLAY_FADE}`;
