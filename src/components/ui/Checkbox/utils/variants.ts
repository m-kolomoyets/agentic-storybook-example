import { cva } from 'class-variance-authority';

/*
 * One `text-*` on the Root; every glyph layer inherits via `currentColor`. Selected (checked or mixed) is
 * white so a ticked row reads as ticked; invalid takes `border-negative` (Field context writes
 * `data-invalid`) and persists under hover. Figma `State=Active` ships as `focus-visible` (WCAG 2.4.7) —
 * a ring would eat a 16–20px glyph; `border-control-pressed` restores pointer-down feedback. Pointer and
 * focus rules come last so they win by source order. Rest `border-primary` ≈1.4:1 is a token defect.
 */
export const checkboxVariants = cva(
    `
        group relative inline-flex shrink-0 outline-none transition-colors
        text-border-primary
        data-[checked]:text-icons-general-strong data-[indeterminate]:text-icons-general-strong
        data-[disabled]:cursor-not-allowed data-[disabled]:text-border-control-disabled
        data-[invalid]:text-border-negative
        not-data-[disabled]:hover:cursor-pointer
        not-data-[disabled]:not-data-[invalid]:hover:text-border-control-hover
        not-data-[disabled]:active:text-border-control-pressed
        not-data-[disabled]:focus-visible:text-border-focused
    `,
    {
        variants: {
            // Figma 9183:5528: Big 20px, Medium 16px.
            size: {
                md: 'size-xl',
                lg: 'size-2xl',
            },
        },
        defaultVariants: { size: 'md' },
    }
);
