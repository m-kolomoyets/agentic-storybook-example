import { cva } from 'class-variance-authority';

/*
 * One `text-*` on the Root; both glyph layers inherit via `currentColor`. Selected is white, as `Checkbox`.
 * Chain: disabled → checked → focus → pressed → hover → rest. `State=Active` ships as `focus-visible`
 * (WCAG 2.4.7; a ring would eat a 12px glyph). Unselected plate: `Surface/control` disc at 83.33% (no token).
 * Invalid: own `data-invalid` (Field) or under a `data-invalid` wrapper; one variant more than hover so red holds.
 * Rest `border-primary` ≈1.4:1 is a token defect.
 */
export const radioVariants = cva(
    `
        group relative inline-flex shrink-0 outline-none transition-colors
        before:absolute before:inset-[8.33%] before:rounded-full data-[unchecked]:before:bg-surface-control
        text-border-primary
        data-[checked]:text-icons-general-strong
        data-[disabled]:cursor-not-allowed data-[disabled]:text-border-control-disabled
        not-data-[disabled]:hover:cursor-pointer
        not-data-[disabled]:not-data-[checked]:hover:text-border-control-hover
        not-data-[disabled]:not-data-[checked]:active:text-border-control-pressed
        not-data-[disabled]:focus-visible:text-border-focused
        not-data-[disabled]:not-data-[checked]:not-focus-visible:data-[invalid]:text-border-negative
        not-data-[disabled]:not-data-[checked]:not-focus-visible:in-data-[invalid]:text-border-negative
    `,
    {
        variants: {
            size: {
                sm: 'size-l',
                md: 'size-xl',
                lg: 'size-2xl',
            },
        },
        defaultVariants: { size: 'md' },
    }
);
