import type { MouseEvent } from 'react';
import type { BadgeProps } from './types';
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

    // `type`/`disabled` are `<button>`-only; `aria-disabled`/`aria-pressed` carry state for any element.
    const isNativeButton = render === undefined;
    const chipProps = isChip
        ? {
              type: isNativeButton ? ('button' as const) : undefined,
              disabled: isNativeButton ? disabled : undefined,
              'aria-pressed': selected,
              'aria-disabled': disabled ? true : undefined,
              'data-selected': selected ? 'true' : 'false',
              'data-disabled': disabled ? 'true' : 'false',
              onClick: handleClick,
          }
        : undefined;

    return useRender({
        render,
        defaultTagName: isChip ? 'button' : 'span',
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
