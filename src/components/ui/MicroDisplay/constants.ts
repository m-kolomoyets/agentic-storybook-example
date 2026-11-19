import type { MicroDisplayStatus, MicroDisplayTone } from './types';

/*
 * 160px column at a fixed 15px gap (measured off Figma `12591:368155`), not `justify-between`,
 * which only matches for these exact child heights. `overflow-hidden` keeps the meter's pointer
 * inside the rounded corner at either end of the range.
 */
export const MICRO_DISPLAY_ROOT_CLASSES = `
    flex h-micro-display-h w-full flex-col gap-micro-display-gap
    overflow-hidden rounded-micro-display bg-surface-card p-micro-display-p
`;

/* Figma sets the title's line-height to its 14px size; a 20px line would push the meter into the clip. */
export const MICRO_DISPLAY_TITLE_CLASSES =
    'text-body-s-medium leading-[14px] tracking-[0.42px] text-text-general-strong';

/** The 6px status dot (used by the `Size=Medium` fan card). `shrink-0`: the halo is a shadow, no layout. */
export const MICRO_DISPLAY_DOT_CLASSES = 'size-s shrink-0 rounded-full';

/** Dot paints. `default` is a reading with no status, drawn only on the fan card. */
export const MICRO_DISPLAY_DOT_PAINT: Record<MicroDisplayStatus | 'default', string> = {
    default: 'bg-surface-datavis-micro-display-default shadow-dot-default',
    positive: 'bg-surface-datavis-dotindicator-positive shadow-dot-positive',
    warning: 'bg-surface-datavis-dotindicator-warning shadow-dot-warning',
    negative: 'bg-surface-datavis-dotindicator-negative shadow-dot-negative',
};

/** The label's white-10% wrapper around the boxed value. */
export const MICRO_DISPLAY_VALUE_BLOCK_CLASSES = `
    flex w-full flex-col items-center gap-xs
    rounded-s bg-surface-datavis-surface-micro-display p-xs
`;

/** The boxed value: `Surface/base` inside a 1px `Border/datavis/micro-display` stroke. */
export const MICRO_DISPLAY_VALUE_BOX_CLASSES = `
    flex w-full flex-col items-center justify-center
    rounded-xs border border-border-datavis-micro-display bg-surface-ground
    px-none py-micro-display-p
`;

export const MICRO_DISPLAY_VALUE_PAINT: Record<MicroDisplayTone, string> = {
    default: 'text-text-general-strong',
    positive: 'text-text-positive',
    negative: 'text-text-negative',
};

/** The status in words — the colour alone says nothing to a screen reader (WCAG 1.1.1, 1.4.1). */
export const MICRO_DISPLAY_STATUS_TEXT: Record<MicroDisplayStatus, string> = {
    positive: 'normal',
    warning: 'warning',
    negative: 'critical',
};
