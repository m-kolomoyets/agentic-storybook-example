import { cva } from 'class-variance-authority';

/*
 * The pill owns shape only; each zone paints its own `remote` ramp. Grid, not flex: `1fr` tracks
 * size both halves to the wider zone so the seam sits dead centre; the middle `auto` track is the
 * zero-width divider slot. No `overflow-hidden` — zones round their own outer corners so focus
 * rings follow the corner instead of being clipped.
 */
export const SPLIT_BUTTON_ROOT_CLASSES = `
    relative inline-grid h-6xl shrink-0 grid-cols-[1fr_auto_1fr] items-stretch rounded-s
    whitespace-nowrap transition-colors
    data-[disabled=true]:cursor-not-allowed data-[loading=true]:cursor-progress
`;

/*
 * Figma `Gray Style Modes` drawn once for the whole pill as an overlay: per-zone copies would smudge
 * the seam, and an inset shadow on the root would render under the zones' fills.
 */
export const PILL_SHADOW_CLASSES =
    'pointer-events-none absolute inset-none rounded-s shadow-button-remote inset-shadow-button-remote';

/* Zero-width, 14px slot (`--spacing-split-divider` is provisional — no 14px step). */
export const DIVIDER_CLASSES = 'relative h-split-divider w-[0px] shrink-0 self-center';

/* Out of flow so the zones touch; the 1px rule straddles the seam like Figma's zero-width vector. */
export const DIVIDER_RULE_CLASSES =
    'pointer-events-none absolute inset-y-none left-none w-px -translate-x-1/2 bg-border-primary';

/*
 * Each zone is a full `remote` button in miniature, so hover/press shows which half a click will
 * hit (Figma's single shared hover is a misfire risk on an actuation control). Borders on three
 * sides only — never the side meeting the divider — so the seam reads as one line. `data-position`
 * is set by the root, not `:first-child`, because an open `Popover.Trigger` can inject a sibling.
 * `group` lets the chevron read the zone's own `data-popup-open`.
 */
export const splitButtonZoneVariants = cva(
    `
        group inline-flex items-center justify-center px-xl py-none
        data-[position=first]:rounded-l-s data-[position=last]:rounded-r-s
        whitespace-nowrap outline-none transition-colors
        text-body-m-semibold text-text-general-strong
        bg-button-remote-default
        border-y border-border-remote-default
        data-[position=first]:border-l data-[position=last]:border-r
        data-[disabled=true]:text-text-on-surface-disabled data-[disabled=true]:cursor-not-allowed
        data-[disabled=true]:bg-button-remote-disabled data-[disabled=true]:border-border-remote-disabled
        data-[loading=true]:cursor-progress
        data-[disabled=false]:data-[loading=true]:bg-button-remote-loading
        hover:cursor-pointer
        data-[disabled=false]:data-[loading=false]:hover:bg-button-remote-hover
        data-[disabled=false]:data-[loading=false]:not-active:not-focus-visible:data-popup-open:bg-button-remote-hover
        data-[disabled=false]:data-[loading=false]:active:bg-button-remote-pressed
        data-[disabled=false]:data-[loading=false]:focus-visible:bg-button-remote-focused
        data-[disabled=false]:data-[loading=false]:focus-visible:border-border-focused
    `,
    {
        variants: {
            // Figma's internal gaps, 8 and 4.
            zone: {
                action: 'gap-m',
                disclosure: 'gap-xs',
            },
        },
    }
);

/** 20px icon box on both zones. */
export const ICON_SLOT_CLASSES = 'inline-flex size-2xl shrink-0 items-center justify-center';

/* Flips while the zone's trigger is open — read from Base UI's attribute, not local state. */
export const CHEVRON_CLASSES = 'transition-transform duration-150 group-data-[popup-open]:rotate-180';
