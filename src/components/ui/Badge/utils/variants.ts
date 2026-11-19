import { cva } from 'class-variance-authority';

/*
 * State cells gate on `data-selected` / `data-disabled`, never `:disabled`: `render` can make the
 * root an `<a>`, which `:disabled` never matches. Both gates on every cell keep them exclusive.
 */
export const badgeVariants = cva(
    [
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap',
        // tracking-[0.4px]: the generated text-caption-s-medium drops Figma's letter-spacing.
        'rounded-badge text-caption-s-medium tracking-[0.4px] uppercase',
        // SVGR icons have width/height stripped; unsized they stretch the badge. 14px has no spacing step.
        '[&>svg]:size-[14px] [&>svg]:shrink-0',
    ],
    {
        variants: {
            // One `bg-*` and one `text-*` per cell; a child SVG with `fill="currentColor"` inherits the ink.
            variant: {
                neutral: 'bg-surface-control text-text-general-strong',
                positive: 'bg-surface-tag-positive text-text-positive',
                negative: 'bg-surface-tag-negative text-text-negative',
                warning: 'bg-surface-warning text-text-warning',
                info: 'bg-surface-tag-septenary text-text-tag-senary',
                cool: 'bg-surface-tag-quaternary text-text-tag-quinary',
                dry: 'bg-surface-tag-octenary text-text-tag-septenary',
                recondition: 'bg-surface-tag-septenary text-text-tag-senary',
                // Same pair as `positive`; the dot tells them apart.
                custom: 'bg-surface-tag-positive text-text-positive',
            },
            // Padding and gap only; heights 22/24/30 fall out of padding plus the 14px line-height.
            size: {
                sm: 'gap-xs px-xs py-xxs',
                md: 'gap-xxs px-m py-xs',
                // Spacings/10 has no step on the scale -> --spacing-badge-px.
                lg: 'gap-xxs px-badge-px py-m',
            },
            // Chip state cells. Hover/pressed/focus are undrawn in Figma; the focus ring is required (WCAG 2.4.7).
            interactive: {
                true: [
                    'outline-none transition-colors',
                    'data-[disabled=true]:cursor-not-allowed data-[disabled=false]:cursor-pointer',
                    'data-[selected=true]:bg-surface-tertiary',
                    'data-[disabled=false]:data-[selected=true]:text-text-on-surface-strong',
                    'data-[disabled=true]:text-text-on-surface-disabled',
                    // Hover, unselected only: nothing sits above `Surface/tertiary` for a selected chip.
                    'data-[disabled=false]:data-[selected=false]:hover:bg-surface-control-pressed',
                    // Holds the hover fill while a popup this chip opened is on screen.
                    'data-[disabled=false]:data-[selected=false]:not-active:not-focus-visible:data-popup-open:bg-surface-control-pressed',
                    'data-[disabled=false]:data-[selected=false]:active:bg-surface-badge-pressed',
                    // Ungated: a disabled chip stays in the tab order on non-`<button>` render forms.
                    'focus-visible:inset-ring-1 focus-visible:inset-ring-border-focused',
                ],
                false: '',
            },
        },
        defaultVariants: { variant: 'neutral', size: 'md', interactive: false },
    }
);
