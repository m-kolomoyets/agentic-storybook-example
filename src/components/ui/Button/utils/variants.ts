import { cva } from 'class-variance-authority';

/*
 * State classes gate on `data-disabled` / `data-loading`, not bare `:hover` / `:active`: a loading
 * button is deliberately not `disabled`, so its pseudo-classes still fire. Data attributes rather
 * than `:disabled` because `render` can make this an `<a>`.
 *
 * `data-popup-open` (written by every Base UI trigger) holds the hover cell while the surface the
 * button opened is on screen. The `not-active:not-focus-visible:` gates keep the precedence
 * `disabled > loading > focused/pressed > open > hover > default` independent of emitted order.
 */
export const buttonVariants = cva(
    `
        inline-flex shrink-0 items-center justify-center text-center
        rounded-s whitespace-nowrap outline-none transition-colors
        data-[disabled=true]:cursor-not-allowed data-[loading=true]:cursor-progress
        hover:cursor-pointer
    `,
    {
        variants: {
            variant: {
                primary: `
                    bg-button-primary-default text-text-on-surface-strong
                    shadow-button inset-shadow-button
                    data-[disabled=true]:bg-button-primary-disabled data-[disabled=true]:text-text-on-surface-disabled
                    data-[disabled=false]:data-[loading=true]:bg-button-primary-loading
                    data-[disabled=false]:data-[loading=false]:active:bg-button-primary-pressed
                    data-[disabled=false]:data-[loading=false]:hover:bg-button-primary-hover
                    data-[disabled=false]:data-[loading=false]:not-active:not-focus-visible:data-popup-open:bg-button-primary-hover
                    data-[disabled=false]:data-[loading=false]:focus-visible:bg-button-primary-focused
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-1
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-border-focused
                `,
                // Figma 9642:177476 draws no focus stroke and no loading spinner; both added
                // (WCAG 2.4.7; a loading state identical to idle invites double activation).
                'primary-on-surface': `
                    bg-button-primary-on-surface-default text-text-general-strong
                    shadow-button inset-shadow-button
                    data-[disabled=true]:bg-button-primary-on-surface-disabled data-[disabled=true]:text-text-on-surface-disabled
                    data-[disabled=false]:data-[loading=true]:bg-button-primary-on-surface-loading
                    data-[disabled=false]:data-[loading=false]:active:bg-button-primary-on-surface-pressed
                    data-[disabled=false]:data-[loading=false]:hover:bg-button-primary-on-surface-hover
                    data-[disabled=false]:data-[loading=false]:not-active:not-focus-visible:data-popup-open:bg-button-primary-on-surface-hover
                    data-[disabled=false]:data-[loading=false]:focus-visible:bg-button-primary-on-surface-focused
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-1
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-border-focused
                `,
                /* Figma strokes are 1px inset: inset rings, so the box height does not grow. */
                secondary: `
                    bg-button-secondary-default text-text-general-strong
                    inset-ring-1 inset-ring-border-secondary-button
                    shadow-button inset-shadow-button
                    data-[disabled=true]:bg-button-secondary-disabled data-[disabled=true]:text-text-on-surface-disabled data-[disabled=true]:inset-ring-border-secondary-disabled
                    data-[disabled=false]:data-[loading=true]:bg-button-secondary-loading
                    data-[disabled=false]:data-[loading=false]:active:bg-button-secondary-pressed
                    data-[disabled=false]:data-[loading=false]:hover:bg-button-secondary-hover
                    data-[disabled=false]:data-[loading=false]:not-active:not-focus-visible:data-popup-open:bg-button-secondary-hover
                    data-[disabled=false]:data-[loading=false]:focus-visible:bg-button-secondary-focused
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-border-focused
                `,
                /* `secondary` over a photo (Figma 12963:8280): opaque-ish dark fill reads against any image. */
                'secondary-elevated': `
                    bg-button-secondary-on-surface-default text-text-general-strong
                    inset-ring-1 inset-ring-border-secondary-button
                    shadow-button inset-shadow-button
                    data-[disabled=true]:bg-button-secondary-on-surface-disabled data-[disabled=true]:text-text-on-surface-disabled
                    data-[disabled=false]:data-[loading=true]:bg-button-secondary-on-surface-loading
                    data-[disabled=false]:data-[loading=false]:active:bg-button-secondary-on-surface-pressed
                    data-[disabled=false]:data-[loading=false]:hover:bg-button-secondary-on-surface-hover
                    data-[disabled=false]:data-[loading=false]:not-active:not-focus-visible:data-popup-open:bg-button-secondary-on-surface-hover
                    data-[disabled=false]:data-[loading=false]:focus-visible:bg-button-secondary-on-surface-focused
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-border-focused
                `,
                /* No shadow: Figma 8274:18709 has no effect style (reported to design). */
                destructive: `
                    bg-button-destructive-default text-text-general-strong
                    data-[disabled=true]:bg-button-destructive-disabled data-[disabled=true]:text-text-destructive-button-disabled
                    data-[disabled=false]:data-[loading=true]:bg-button-destructive-loading
                    data-[disabled=false]:data-[loading=false]:active:bg-button-destructive-pressed
                    data-[disabled=false]:data-[loading=false]:hover:bg-button-destructive-hover
                    data-[disabled=false]:data-[loading=false]:not-active:not-focus-visible:data-popup-open:bg-button-destructive-hover
                    data-[disabled=false]:data-[loading=false]:focus-visible:bg-button-destructive-focused
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-1
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-border-focused
                `,
                remote: `
                    bg-button-remote-default text-text-general-strong
                    inset-ring-1 inset-ring-border-remote-default
                    shadow-button-remote inset-shadow-button-remote
                    data-[disabled=true]:bg-button-remote-disabled data-[disabled=true]:text-text-on-surface-disabled data-[disabled=true]:inset-ring-border-remote-disabled
                    data-[disabled=false]:data-[loading=true]:bg-button-remote-loading
                    data-[disabled=false]:data-[loading=false]:active:bg-button-remote-pressed
                    data-[disabled=false]:data-[loading=false]:hover:bg-button-remote-hover
                    data-[disabled=false]:data-[loading=false]:not-active:not-focus-visible:data-popup-open:bg-button-remote-hover
                    data-[disabled=false]:data-[loading=false]:focus-visible:bg-button-remote-focused
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-border-focused
                `,
                /*
                 * Link sets (8887:16205, 9275:43776, 9315:49693): no box, only ink changes. The focus
                 * ring is added — Figma's Focused differs from Default only in ink (WCAG 2.4.7).
                 * Written out three times because Tailwind cannot see classes built from a name.
                 */
                'link-primary': `
                    text-text-link-primary-default
                    data-[disabled=true]:text-text-link-primary-disabled
                    data-[disabled=false]:data-[loading=true]:text-text-link-primary-loading
                    data-[disabled=false]:data-[loading=false]:active:text-text-link-primary-pressed
                    data-[disabled=false]:data-[loading=false]:hover:text-text-link-primary-hover
                    data-[disabled=false]:data-[loading=false]:not-active:not-focus-visible:data-popup-open:text-text-link-primary-hover
                    data-[disabled=false]:data-[loading=false]:focus-visible:text-text-link-primary-focused
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-1
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-border-focused
                `,
                'link-secondary': `
                    text-text-link-secondary-default
                    data-[disabled=true]:text-text-link-secondary-disabled
                    data-[disabled=false]:data-[loading=true]:text-text-link-secondary-loading
                    data-[disabled=false]:data-[loading=false]:active:text-text-link-secondary-pressed
                    data-[disabled=false]:data-[loading=false]:hover:text-text-link-secondary-hover
                    data-[disabled=false]:data-[loading=false]:not-active:not-focus-visible:data-popup-open:text-text-link-secondary-hover
                    data-[disabled=false]:data-[loading=false]:focus-visible:text-text-link-secondary-focused
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-1
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-border-focused
                `,
                'link-tertiary': `
                    text-text-link-tertiary-default
                    data-[disabled=true]:text-text-link-tertiary-disabled
                    data-[disabled=false]:data-[loading=true]:text-text-link-tertiary-loading
                    data-[disabled=false]:data-[loading=false]:active:text-text-link-tertiary-pressed
                    data-[disabled=false]:data-[loading=false]:hover:text-text-link-tertiary-hover
                    data-[disabled=false]:data-[loading=false]:not-active:not-focus-visible:data-popup-open:text-text-link-tertiary-hover
                    data-[disabled=false]:data-[loading=false]:focus-visible:text-text-link-tertiary-focused
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-1
                    data-[disabled=false]:data-[loading=false]:focus-visible:inset-ring-border-focused
                `,
            },
            /* 40 / 48 / 56 ramp; Figma `Spacings/6` gap. Heights explicit: `sm`'s 10px v-pad has no token. */
            size: {
                sm: 'h-5xl gap-s px-l text-body-s-semibold',
                md: 'h-6xl gap-s px-xl text-body-m-semibold',
                lg: 'h-7xl gap-s px-3xl text-body-m-semibold',
            },
            fullWidth: {
                true: 'w-full',
                false: '',
            },
        },
        compoundVariants: [
            { variant: ['secondary', 'secondary-elevated'], size: 'sm', class: 'gap-xs' },
            /* `primary-on-surface` runs one step short: md 40px, sm 36px. */
            { variant: 'primary-on-surface', size: 'md', class: 'h-5xl px-l text-body-s-semibold' },
            { variant: 'primary-on-surface', size: 'sm', class: 'h-on-surface-sm px-l text-body-s-semibold' },
            /*
             * Links drop horizontal padding but keep the 40/48 height: Figma's hug frame is a 20px hit
             * target, under WCAG 2.5.8; the drawn toast "Undo" (9004:41365) is 40 tall.
             */
            { variant: ['link-primary', 'link-secondary', 'link-tertiary'], class: 'px-none' },
        ],
        defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
    }
);

/** SVGR icons have no intrinsic size; the slot supplies Figma's 20px (lg/md) or 16px (sm, on-surface). */
export const iconSlotVariants = cva('inline-flex shrink-0 items-center justify-center', {
    variants: {
        variant: {
            primary: '',
            'primary-on-surface': 'size-xl',
            secondary: '',
            'secondary-elevated': '',
            destructive: '',
            remote: '',
            'link-primary': '',
            'link-secondary': '',
            'link-tertiary': '',
        },
        size: {
            sm: 'size-xl',
            md: 'size-2xl',
            lg: 'size-2xl',
        },
    },
    compoundVariants: [{ variant: 'primary-on-surface', size: 'md', class: 'size-xl' }],
    defaultVariants: { variant: 'primary', size: 'md' },
});
