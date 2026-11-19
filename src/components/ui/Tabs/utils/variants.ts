import { cva } from 'class-variance-authority';

/*
 * Base UI emits `data-active` (not `data-selected`) on the selected tab.
 * Height falls out of padding + line-height; `shrink-0` makes a too-wide row overflow, not compress.
 * The selected edge is an always-present inset ring (transparent when unselected) so nothing shifts 1px.
 * Hover/pressed/focus/disabled are invented (Figma draws none). Focus is an `outline`, not the inset-ring
 * idiom, because the selected edge already owns `--tw-inset-ring-color` (WCAG 2.4.7).
 * Disabled is presentation only: Base UI refuses activation and sets `aria-disabled`.
 */
const TAB_BASE_CLASSES = `
    inline-flex shrink-0 items-center justify-center gap-s whitespace-nowrap
    cursor-pointer outline-none font-sans
    inset-ring-1 inset-ring-transparent transition-colors
    bg-transparent text-text-general-medium
    hover:bg-surface-control hover:text-text-general-strong
    active:bg-surface-control-pressed
    focus-visible:outline-solid focus-visible:outline-1 focus-visible:-outline-offset-1
    focus-visible:outline-border-focused
    data-[active]:inset-ring-border-primary data-[active]:bg-surface-control
    data-[active]:text-text-general-strong
    data-[active]:shadow-button data-[active]:inset-shadow-button
    data-[disabled]:cursor-not-allowed data-[disabled]:text-text-disabled
    data-[disabled]:hover:bg-transparent
    data-[disabled]:inset-ring-transparent
`;

/*
 * Mobile in the base, desktop in `md:`. `sm` has no desktop cell; `md` (12/16 type) is the chart-legend
 * tab, smaller text in a taller box. Figma `Radius/m` 8px = `rounded-s`.
 */
export const tabVariants = cva(TAB_BASE_CLASSES, {
    variants: {
        size: {
            sm: 'rounded-icon-xs text-body-s-medium px-xl py-xxs',
            md: 'rounded-xs text-caption-m-medium px-l py-m md:px-xl md:py-tab-y-desktop',
            lg: 'rounded-s text-body-s-medium px-l py-m md:py-tab-y-desktop',
        },
    },
    defaultVariants: { size: 'lg' },
});
