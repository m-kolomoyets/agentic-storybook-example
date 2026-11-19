import type { MouseEvent } from 'react';
import type { InputAddonButtonProps, InputProps } from './types';
import { Input as BaseInput } from '@base-ui/react/input';
import { cn } from '@/lib/cn';
import {
    CONTROL_BORDER,
    CONTROL_SURFACE_FILL,
    CONTROL_SURFACE_FRAME,
    CONTROL_SURFACE_HEIGHT,
    CONTROL_SURFACE_LAYOUT,
    CONTROL_SURFACE_MIN_WIDTH,
} from '@/lib/ui/controlSurface';

/*
 * The body reads state off the inner `<input>` via `:has()`/`:focus-within`, so one class set covers
 * standalone (`error` → `data-invalid`) and in-Field (context → `data-invalid`). The ramp is mutually
 * exclusive by gating, not cascade order: disabled > focus > invalid > hover. Without the gates
 * `:has(input[data-invalid])` outranks `:focus-within` and a focused invalid field loses its
 * focus indicator (WCAG 2.4.7). State colours are spelled out: Tailwind can't see interpolated prefixes.
 */
const BODY_CLASSES = `
    group ${CONTROL_SURFACE_LAYOUT} ${CONTROL_SURFACE_MIN_WIDTH} ${CONTROL_SURFACE_HEIGHT} cursor-text
    ${CONTROL_SURFACE_FRAME} ${CONTROL_BORDER.default} ${CONTROL_SURFACE_FILL} p-l
    not-has-[input:disabled]:not-focus-within:hover:border-border-control-hover
    not-has-[input:disabled]:not-focus-within:has-[input[data-invalid]]:border-border-negative
    not-has-[input:disabled]:focus-within:border-border-focused
    has-[input:disabled]:border-border-control-disabled
`;

/*
 * Bare glyph button, not `IconButton` (that is a filled pill; Figma draws the addon as a plain glyph).
 * Fixed 20px box; `rounded-icon-xs` shapes the outset focus ring — the body's `focus-within` border
 * can't say which child has focus. `outline-solid` is load-bearing: `outline-none` zeroes the style.
 */
const ADDON_BUTTON_CLASSES = `
    flex size-2xl cursor-pointer items-center justify-center rounded-icon-xs border-none bg-transparent p-none
    text-text-general-strong outline-none group-has-[input:disabled]:text-text-disabled
    focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-border-focused
    focus-visible:outline-solid
`;

/*
 * ≥20px, grows for text units (`ft`, `lbs/bu`). `[&>svg]:size-2xl`: SVGR strips width/height and Safari
 * falls back to 300px in an auto-width slot. `pointer-events-none` when disabled because addons are caller
 * JSX — a reveal button would otherwise stay clickable. No `overflow-clip`: it would clip the addon's focus ring.
 */
const SLOT_CLASSES = `
    inline-flex h-2xl min-w-2xl shrink-0 items-center justify-center [&>svg]:size-2xl
    group-has-[input:disabled]:pointer-events-none
`;

/*
 * `Filled`/`Typing` need no code: value vs placeholder colour comes free from `<input>`.
 * Password masks swap to Verdana's x-height disc (Urbanist's `•` is tiny); placeholder keeps Urbanist.
 */
const CONTROL_CLASSES = `
    min-w-px flex-1 appearance-none border-none bg-transparent p-none outline-none
    text-body-m text-text-general-strong placeholder:text-text-general-medium disabled:text-text-disabled
    [&[type=password]:not(:placeholder-shown)]:font-[Verdana,sans-serif]
    [&[type=password]:not(:placeholder-shown)]:tracking-[0.125em]
`;

/**
 * Interactive addon — password reveal, `SearchInput`'s clear. `type="button"` is fixed so it never submits a form.
 */
function InputAddonButton({ icon, className, ...rest }: InputAddonButtonProps) {
    return (
        <button {...rest} type="button" className={cn`${ADDON_BUTTON_CLASSES} ${className}`}>
            <span aria-hidden className="size-full">
                {icon}
            </span>
        </button>
    );
}

/**
 * Single-line text input: the body of Figma `Input` set 8067:6633. Body only — wrap in `Field.Root` for
 * label/helper/error. No `size`/`state` props: one geometry; states reduce to `disabled`, `error` and CSS.
 */
function Input({ error = false, startAddon, endAddon, className, ...rest }: InputProps) {
    // Spread, not `data-invalid={undefined}`: a present-but-undefined key would clobber the Field's attribute.
    const invalidAttribute = error ? { 'data-invalid': '' } : undefined;

    /*
     * The whole body is the click target (≈⅓ of it is padding). Not a wrapping `<label>` (would double the
     * accessible name). Interactive descendants inside the body keep their click; the match is bounded to
     * the body because a dialog popup carries `tabindex="-1"`. `preventDefault` stops focus landing on the body.
     */
    function handleMouseDown(event: MouseEvent<HTMLDivElement>) {
        const target = event.target as Element;
        const interactive = target.closest('button, a, input, select, textarea, [role="button"], [tabindex]');
        if (interactive && event.currentTarget.contains(interactive)) {
            return;
        }

        const control = event.currentTarget.querySelector('input');
        if (!control || control.disabled) {
            return;
        }

        event.preventDefault();
        control.focus();
    }

    return (
        // Pointer convenience only; the `<input>` itself is the keyboard target.
        // eslint-disable-next-line jsx-a11y-x/no-static-element-interactions
        <div className={cn`${BODY_CLASSES} ${className}`} onMouseDown={handleMouseDown}>
            {startAddon ? <span className={SLOT_CLASSES}>{startAddon}</span> : null}
            <BaseInput {...rest} {...invalidAttribute} className={CONTROL_CLASSES} />
            {endAddon ? <span className={SLOT_CLASSES}>{endAddon}</span> : null}
        </div>
    );
}

export { Input, InputAddonButton };
