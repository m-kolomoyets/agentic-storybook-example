import type { MouseEvent, ReactNode } from 'react';
import type { ButtonProps, ButtonSize } from './types';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/cn';
import { Loader } from '@/components/ui/Loader';
import { buttonVariants, iconSlotVariants } from './utils/variants';

type IconSlotProps = {
    children: ReactNode;
    loading: boolean;
    className: string;
};

/*
 * `Loader variant="inherit"` takes the slot's per-state ink, so the variant colour ramps live in
 * one place. `size-full`: the slot is already the drawn box and the ring's stroke is proportional.
 */
function IconSlot({ children, loading, className }: IconSlotProps) {
    return (
        <span className={className} aria-hidden={loading || undefined}>
            {loading ? <Loader variant="inherit" className="size-full" /> : children}
        </span>
    );
}

/**
 * Text button covering the kit's button sets. Figma: Primary `8696:12170`, Primary On Surface
 * `9642:177476`, Secondary `8038:2005`, Destructive `8274:18709`, Remote `9263:22344`.
 */
function Button({
    children,
    startIcon,
    endIcon,
    loading = false,
    fullWidth = false,
    render,
    variant = 'primary',
    size,
    className,
    disabled = false,
    onClick,
    type = 'button',
    ...rest
}: ButtonProps) {
    // `remote` is locked to the 48px `md` cell, `secondary-elevated` to the 40px `sm` cell.
    let resolvedSize: ButtonSize = size ?? 'md';
    if (variant === 'remote') {
        resolvedSize = 'md';
    } else if (variant === 'secondary-elevated') {
        resolvedSize = 'sm';
    }
    // Through `cn`: `primary-on-surface md` collects two `size-*` classes and stylesheet order would pick 20px.
    const slotClassName = cn`${iconSlotVariants({ variant, size: resolvedSize })}`;

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
    // A caller may mark the button busy before the spinner is due.
    const ariaBusy = loading ? true : rest['aria-busy'];

    return useRender({
        render,
        defaultTagName: 'button',
        props: {
            ...rest,
            type: isNativeButton ? type : undefined,
            disabled: isNativeButton ? disabled : undefined,
            'aria-disabled': disabled ? true : undefined,
            'aria-busy': ariaBusy,
            'data-loading': loading ? 'true' : 'false',
            'data-disabled': disabled ? 'true' : 'false',
            onClick: handleClick,
            className: cn`${buttonVariants({ variant, size: resolvedSize, fullWidth })} ${className}`,
            children: (
                <>
                    {loading || startIcon ? (
                        <IconSlot loading={loading} className={slotClassName}>
                            {startIcon}
                        </IconSlot>
                    ) : null}
                    {children}
                    {endIcon ? (
                        <IconSlot loading={loading} className={slotClassName}>
                            {endIcon}
                        </IconSlot>
                    ) : null}
                </>
            ),
        },
    });
}

export { Button };
