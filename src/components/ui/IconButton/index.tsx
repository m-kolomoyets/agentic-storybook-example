import type { MouseEvent } from 'react';
import type { IconButtonProps } from './types';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/cn';
import { Loader } from '@/components/ui/Loader';
import { iconButtonVariants, iconSlotVariants } from './utils/variants';

/**
 * Icon-only button, `aria-label` required. Figma: `Icon Button/Secondary` `8016:314`.
 * `xs` is a 20px hit target, under WCAG 2.5.8's 24px — prefer `sm`/`md` where the layout allows.
 */
function IconButton({
    icon,
    size = 'md',
    variant = 'secondary',
    loading = false,
    render,
    className,
    disabled = false,
    onClick,
    type = 'button',
    ...rest
}: IconButtonProps) {
    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        // Guarded rather than `disabled` — the control stays focusable and announced.
        if (loading || disabled) {
            event.preventDefault();
            return;
        }
        onClick?.(event);
    }

    // `type` / `disabled` are `<button>`-only; `aria-disabled` carries the state for any element.
    const isNativeButton = render === undefined;
    // `null` skips the `md` default, so no size cell fights `elevated`'s box.
    const resolvedSize = variant === 'elevated' ? null : size;

    return useRender({
        render,
        defaultTagName: 'button',
        props: {
            ...rest,
            type: isNativeButton ? type : undefined,
            disabled: isNativeButton ? disabled : undefined,
            'aria-disabled': disabled ? true : undefined,
            'aria-busy': loading ? true : undefined,
            'data-loading': loading ? 'true' : 'false',
            'data-disabled': disabled ? 'true' : 'false',
            onClick: handleClick,
            className: cn`${iconButtonVariants({ variant, size: resolvedSize })} ${className}`,
            // The glyph is always hidden: `aria-label` is the name.
            children: (
                <span className={cn`${iconSlotVariants({ variant, size: resolvedSize })}`} aria-hidden="true">
                    {loading ? <Loader variant="inherit" className="size-full" /> : icon}
                </span>
            ),
        },
    });
}

export { IconButton };
