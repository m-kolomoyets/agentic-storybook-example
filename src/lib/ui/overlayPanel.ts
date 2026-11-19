import { OVERLAY_MOTION } from './overlayMotion';

/** The floating panel behind dropdowns, menus and tooltips-with-content. */
export const OVERLAY_PANEL = `flex min-w-px flex-col gap-xxs rounded-m border border-border-primary bg-surface-solid p-xs ${OVERLAY_MOTION}`;

/** Gap between a popup and its anchor, in px (Base UI `sideOffset`). */
export const OVERLAY_SIDE_OFFSET = 4;

/** Positioner for anchor-width dropdowns, clamped to the available viewport width. */
export const DROPDOWN_POSITIONER =
    'z-[1400] w-[var(--anchor-width)] min-w-[var(--size-dropdown-min-width)] max-w-[var(--available-width)] font-sans';
