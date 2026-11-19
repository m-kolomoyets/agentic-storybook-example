import { cva } from 'class-variance-authority';

/*
 * Figma 8256:13650: 24px header, 24px gap, 24px weekday row, 16px to the first week. Day cells are 48px tall and
 * never under 48px wide (WCAG 2.5.8), so the grid is never narrower than 7 × 48 = 336px.
 */
export const rootVariants = cva('flex shrink-0 flex-col gap-3xl', {
    variants: {
        fullWidth: {
            false: 'mx-auto w-fit',
            true: 'w-full min-w-[calc(var(--spacing-6xl)*7)]',
        },
    },
});

/** Seven equal columns: 48px each, or an equal share of the parent. */
export const tableVariants = cva('table-fixed border-collapse', {
    variants: { fullWidth: { false: '', true: 'w-full' } },
});

/** The box every day, blank or not, is drawn in. */
export const daySizeVariants = cva('', {
    variants: {
        fullWidth: { false: 'size-6xl', true: 'h-6xl w-full min-w-6xl' },
    },
});
