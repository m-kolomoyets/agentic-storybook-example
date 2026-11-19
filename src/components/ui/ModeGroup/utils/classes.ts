import type { AerationModeVariant } from '@/components/ui/Badge/utils/modeDot';

/**
 * Bumps every tile from 76px to 106px on desktop only (`md:*:`). The edit-schedule dialogs and fan setup
 * draw taller desktop tiles (Figma `11679:9488`, `13264:374521`).
 */
export const MODE_GROUP_DESKTOP_TILE_CLASSES = 'md:*:h-[6.625rem]';

/*
 * Pressed stroke: a 1px inside gradient at 60% in the tile's own colourway (Figma `Mode` 9262:41931). Same
 * masked pseudo-element as `Banner`'s edge; a border would take 1px from the content. Written out literally:
 * Tailwind never sees a class built from a template. Recondition's tail is `light-blue-200`, not the dot's.
 */
export const TILE_STROKE_BY_MODE: Record<AerationModeVariant, string> = {
    // #31B0FF -> #69FCFF
    cool: 'before:[background:linear-gradient(134deg,var(--color-blue-650)_0%,var(--color-cyan-500)_100%)]',
    // #FF8D1A -> #E5DD4E
    dry: 'before:[background:linear-gradient(134deg,var(--color-orange-600)_0%,var(--color-yellow-250)_100%)]',
    // #CA71FF -> #A0CFFF at 76% -> #C6E0FF
    recondition:
        'before:[background:linear-gradient(134deg,var(--color-purple-450)_0%,var(--color-light-blue-250)_76%,var(--color-light-blue-200)_100%)]',
    // #53EF7B -> #397649
    custom: 'before:[background:linear-gradient(134deg,var(--color-schedule-custom-stroke-start)_0%,var(--color-schedule-custom-stroke-end)_100%)]',
};
