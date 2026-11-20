import type { MouseEvent } from 'react';
import type { BadgeProps } from './types';
import { useState } from 'react';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/cn';
import { isBadgeModeVariant, MODE_DOT, MODE_DOT_ROUND } from './utils/modeDot';
import { badgeVariants } from './utils/variants';

/**
 * Label with a tint, or a toggle-button chip when `selected` is defined. Pass natural case; the kit
 * draws the caps. Aeration variants draw their own gradient dot before `children`. Figma: `Badge` 8673:4388.
 */
function Badge({
    children,
    variant = 'neutral',
    size = 'md',
    className,
    render,
    selected,
    disabled = false,
    onClick,
    ref,
    ...rest
}: BadgeProps) {
    const isChip = selected !== undefined;
    const rootClassName = cn`${badgeVariants({ variant, size, interactive: isChip })} ${className}`;
    const dotClassName = isBadgeModeVariant(variant) ? cn`size-l ${MODE_DOT_ROUND} ${MODE_DOT[variant]}` : undefined;

    // Guarded: the `disabled` attribute is inert on non-`<button>` render forms.
    function handleClick(event: MouseEvent<HTMLElement>) {
        if (disabled) {
            event.preventDefault();
            return;
        }
        onClick?.(event);
    }

    // `type`/`disabled` are `<button>`-only; `aria-disabled` carries state for any element.
    const isNativeButton = render === undefined;
    /*
     * `aria-pressed` is only allowed on buttons (ARIA 1.2; axe aria-allowed-attr), so a chip rendered as a link
     * drops it — ADR-0002 deviation from amber. Read from the DOM: a `render` function's tag is unknowable here.
     */
    const [rendersButton, setRendersButton] = useState(true);
    function detectButton(element: HTMLElement | null) {
        if (element) {
            setRendersButton(element.tagName === 'BUTTON' || element.getAttribute('role') === 'button');
        }
    }
    const chipProps = isChip
        ? {
              type: isNativeButton ? ('button' as const) : undefined,
              disabled: isNativeButton ? disabled : undefined,
              'aria-pressed': rendersButton ? selected : undefined,
              'aria-disabled': disabled ? true : undefined,
              'data-selected': selected ? 'true' : 'false',
              'data-disabled': disabled ? 'true' : 'false',
              onClick: handleClick,
          }
        : undefined;

    return useRender({
        render,
        defaultTagName: isChip ? 'button' : 'span',
        ref: isChip ? [ref ?? null, detectButton] : ref,
        props: {
            ...rest,
            ...chipProps,
            className: rootClassName,
            children: (
                <>
                    {/* Decorative: the word beside it already names the mode. */}
                    {dotClassName === undefined ? null : <span aria-hidden="true" className={dotClassName} />}
                    {children}
                </>
            ),
        },
    });
}

export { Badge };
// Mode-dot paints shared with ModeGroup and fan-stats composites.
export { MANUAL_MODE_DOT, MODE_DOT, MODE_DOT_ROUND } from './utils/modeDot';
