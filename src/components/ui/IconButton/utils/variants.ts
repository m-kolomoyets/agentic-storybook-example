import { cva } from 'class-variance-authority';

/*
 * State gates follow Button: `data-disabled` / `data-loading` instead of bare pseudo-classes
 * (loading is not disabled), and `data-popup-open` holds the hover cell while a triggered surface
 * is open.
 */

/*
 * Figma binds raw `white-alfa/10%` on md/sm; the semantic token (same value) is used instead.
 * 1px inset stroke, not a border: a border would grow the 44/40 boxes.
 */
const SECONDARY_RAMP = `
    bg-button-secondary-default text-icons-general-strong
    inset-ring-1 inset-ring-border-secondary-button
    data-[disabled=true]:bg-button-secondary-disabled data-[disabled=true]:text-icons-on-surface-disabled data-[disabled=true]:inset-ring-border-secondary-disabled
    data-[disabled=false]:data-[loading=true]:bg-button-secondary-loading
    data-[disabled=false]:data-[loading=false]:active:bg-button-secondary-pressed
    data-[disabled=false]:data-[loading=false]:hover:bg-button-secondary-hover
    data-[disabled=false]:data-[loading=false]:not-active:not-focus-visible:data-popup-open:bg-button-secondary-hover
    data-[disabled=false]:data-[loading=false]:focus-visible:bg-button-secondary-focused
    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-border-focused
`;

/* Figma draws `xs` from the primary family although it sits in the Secondary set — as drawn. */
const PRIMARY_XS_RAMP = `
    bg-button-primary-default text-icons-on-surface-strong
    data-[disabled=true]:bg-button-primary-disabled data-[disabled=true]:text-icons-on-surface-disabled
    data-[disabled=false]:data-[loading=true]:bg-button-primary-loading
    data-[disabled=false]:data-[loading=false]:active:bg-button-primary-pressed
    data-[disabled=false]:data-[loading=false]:hover:bg-button-primary-hover
    data-[disabled=false]:data-[loading=false]:not-active:not-focus-visible:data-popup-open:bg-button-primary-hover
    data-[disabled=false]:data-[loading=false]:focus-visible:bg-button-primary-focused
    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-1
    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-border-focused
`;

/* No fill in any state — the glyph is the control. Focus still gets a ring (WCAG 2.4.7). */
const GHOST_RAMP = `
    bg-transparent text-icons-general-strong
    data-[disabled=true]:text-icons-on-surface-disabled
    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-1
    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-border-focused
`;

/* Button's `secondary-elevated` ramp in a 32px square. */
const ELEVATED_RAMP = `
    size-4xl rounded-s
    bg-button-secondary-on-surface-default text-icons-general-strong
    inset-ring-1 inset-ring-border-secondary-button
    shadow-button inset-shadow-button
    data-[disabled=true]:bg-button-secondary-on-surface-disabled data-[disabled=true]:text-icons-on-surface-disabled
    data-[disabled=false]:data-[loading=true]:bg-button-secondary-on-surface-loading
    data-[disabled=false]:data-[loading=false]:active:bg-button-secondary-on-surface-pressed
    data-[disabled=false]:data-[loading=false]:hover:bg-button-secondary-on-surface-hover
    data-[disabled=false]:data-[loading=false]:not-active:not-focus-visible:data-popup-open:bg-button-secondary-on-surface-hover
    data-[disabled=false]:data-[loading=false]:focus-visible:bg-button-secondary-on-surface-focused
    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-border-focused
`;

export const iconButtonVariants = cva(
    `
        inline-flex shrink-0 items-center justify-center outline-none transition-colors
        data-[disabled=true]:cursor-not-allowed data-[loading=true]:cursor-progress
        hover:cursor-pointer
    `,
    {
        variants: {
            variant: {
                secondary: '',
                ghost: GHOST_RAMP,
                elevated: ELEVATED_RAMP,
            },
            size: {
                /* 44px from its padding: 12 + 20 + 12. */
                md: 'rounded-s p-l',
                /*
                 * 40px fixed (Figma's 8px padding is dead metadata). On a coarse pointer an invisible
                 * `::before` grows the hit area to 44px without moving the drawn box.
                 */
                sm: `
                    rounded-s size-5xl relative
                    pointer-coarse:before:absolute pointer-coarse:before:-inset-xxs pointer-coarse:before:content-['']
                `,
                /* 20px; Figma `Radius/xs` 4px is the provisional `--radius-icon-xs`. */
                xs: 'rounded-icon-xs size-2xl',
            },
        },
        compoundVariants: [
            { variant: 'secondary', size: ['md', 'sm'], class: SECONDARY_RAMP },
            { variant: 'secondary', size: 'xs', class: PRIMARY_XS_RAMP },
        ],
        defaultVariants: { variant: 'secondary', size: 'md' },
    }
);

/*
 * The glyph box: 20px on md/sm secondary, 12px on xs. Ghost fills the control (the glyph is the
 * hit target) except `sm`, a centred 20px glyph. Sizes live only in compounds so no node ever
 * carries two `size-*` classes.
 */
export const iconSlotVariants = cva('inline-flex shrink-0 items-center justify-center', {
    variants: {
        variant: {
            secondary: '',
            ghost: '',
            elevated: 'size-xl',
        },
        size: {
            md: '',
            sm: '',
            xs: '',
        },
    },
    compoundVariants: [
        { variant: 'ghost', size: ['md', 'xs'], class: 'size-full' },
        { variant: 'ghost', size: 'sm', class: 'size-2xl' },
        { variant: 'secondary', size: ['md', 'sm'], class: 'size-2xl' },
        { variant: 'secondary', size: 'xs', class: 'size-l' },
    ],
    defaultVariants: { variant: 'secondary', size: 'md' },
});
