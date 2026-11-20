import type { BadgeVariant } from '../types';

/**
 * Aeration mode dot — the gradient circle Badge and ModeGroup draw before a mode's name.
 * The box (size) is the caller's; this module owns only the paint and the shape.
 */

/** The four `FanRunWindowRecommendedOption` colourways that draw a dot; `MANUAL` uses `MANUAL_MODE_DOT`. */
const MODE_VARIANTS = ['cool', 'dry', 'recondition', 'custom'] as const;

export type AerationModeVariant = (typeof MODE_VARIANTS)[number];

function isAerationModeVariant(variant: string): variant is AerationModeVariant {
    return (MODE_VARIANTS as readonly string[]).includes(variant);
}

export function isBadgeModeVariant(variant: BadgeVariant): variant is AerationModeVariant {
    return isAerationModeVariant(variant);
}

/*
 * One 134deg gradient (Figma's 43.74° vector + 90°) in four colourways; stops are palette steps.
 * Written out literally: Tailwind scans this file as text, so assembled class names are never emitted.
 */
export const MODE_DOT: Record<AerationModeVariant, string> = {
    // #31B0FF -> #69FCFF
    cool: 'bg-[linear-gradient(134deg,var(--color-blue-650)_0%,var(--color-cyan-500)_100%)]',
    // #FF8D1A -> #E5DD4E
    dry: 'bg-[linear-gradient(134deg,var(--color-orange-600)_0%,var(--color-yellow-250)_100%)]',
    // #CA71FF -> #A0CFFF at 75.96% -> #9ADCFF
    recondition:
        'bg-[linear-gradient(134deg,var(--color-purple-450)_0%,var(--color-light-blue-250)_75.96%,var(--color-blue-200)_100%)]',
    // #53EF7B -> #397649
    custom: 'bg-[linear-gradient(134deg,var(--color-schedule-custom-stroke-start)_0%,var(--color-schedule-custom-stroke-end)_100%)]',
};

/** Manual-override dot (fan stats row); not a `MODE_DOT` row since no badge or mode tile draws manual. */
// #EFF5FE -> #868B92
export const MANUAL_MODE_DOT =
    'bg-[linear-gradient(134deg,var(--color-schedule-manual-stroke-start)_0%,var(--color-schedule-manual-stroke-end)_100%)]';

/** Shape only — every consumer supplies its own `size-*`. */
export const MODE_DOT_ROUND = 'shrink-0 rounded-full';
