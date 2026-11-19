import type { MouseEvent, ReactNode } from 'react';
import type {
    SplitButtonActionProps,
    SplitButtonDisclosureProps,
    SplitButtonProps,
    SplitButtonZone,
    SplitButtonZonePosition,
} from './types';
import { Children, Fragment, use } from 'react';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg?react';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/cn';
import { Loader } from '@/components/ui/Loader';
import { SplitButtonContext, SplitButtonPositionContext } from './utils/context';
import {
    CHEVRON_CLASSES,
    DIVIDER_CLASSES,
    DIVIDER_RULE_CLASSES,
    ICON_SLOT_CLASSES,
    PILL_SHADOW_CLASSES,
    SPLIT_BUTTON_ROOT_CLASSES,
    splitButtonZoneVariants,
} from './utils/variants';

/* `Loader variant="inherit"` takes the zone's own per-state ink — each half has its own hover. */
function IconSlot({ children, loading }: { children: ReactNode; loading: boolean }) {
    return (
        <span className={ICON_SLOT_CLASSES} aria-hidden={loading || undefined}>
            {loading ? <Loader variant="inherit" className="size-full" /> : children}
        </span>
    );
}

type ZoneProps = useRender.ElementProps<'button'> & {
    render?: useRender.RenderProp;
    zone: SplitButtonZone;
    startSlot?: ReactNode;
    endSlot?: ReactNode;
    hasPopup?: boolean;
};

/** One real `<button>` per zone, with its own state and feedback. */
function Zone({
    zone,
    startSlot,
    endSlot,
    hasPopup = false,
    render,
    children,
    className,
    disabled = false,
    onClick,
    type = 'button',
    ...rest
}: ZoneProps) {
    const group = use(SplitButtonContext);
    const position = use(SplitButtonPositionContext);
    const isLoading = group.loading;
    const isDisabled = group.disabled || disabled;

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        // Guarded rather than `disabled` — the zone stays focusable and announced.
        if (isLoading || isDisabled) {
            event.preventDefault();
            return;
        }
        onClick?.(event);
    }

    const isNativeButton = render === undefined;

    return useRender({
        render,
        defaultTagName: 'button',
        props: {
            // Above the spread so a caller can name the popup kind (`dialog`, `menu`) over the bare `true`.
            'aria-haspopup': hasPopup ? true : undefined,
            ...rest,
            type: isNativeButton ? type : undefined,
            disabled: isNativeButton ? isDisabled : undefined,
            'aria-disabled': isDisabled ? true : undefined,
            'aria-busy': isLoading ? true : undefined,
            'data-loading': isLoading ? 'true' : 'false',
            'data-disabled': isDisabled ? 'true' : 'false',
            'data-position': position,
            onClick: handleClick,
            className: cn`${splitButtonZoneVariants({ zone })} ${className}`,
            children: (
                <>
                    {startSlot ? <IconSlot loading={isLoading}>{startSlot}</IconSlot> : null}
                    {children}
                    {endSlot ? <IconSlot loading={isLoading}>{endSlot}</IconSlot> : null}
                </>
            ),
        },
    });
}

/** The action zone: an icon slot plus a label. */
function SplitButtonAction({ startIcon, ...rest }: SplitButtonActionProps) {
    return <Zone {...rest} zone="action" startSlot={startIcon} />;
}

/**
 * The disclosure zone: a value plus a chevron. Gains `aria-haspopup` only when given a `render`
 * (typically a `Popover.Trigger`) — a plain second button announcing a popup would be a lie.
 */
function SplitButtonDisclosure({ value, render, ...rest }: SplitButtonDisclosureProps) {
    return (
        <Zone
            {...rest}
            zone="disclosure"
            render={render}
            hasPopup={render !== undefined}
            endSlot={<ChevronDownIcon className={CHEVRON_CLASSES} />}
        >
            {value}
        </Zone>
    );
}

/**
 * Split button: two independently activatable zones on one pill, divided by a 1px rule.
 * Figma: `Secondary Button/Combo` `9153:36710`. No `variant`/`size`: Figma draws neither axis.
 */
function SplitButton({ children, loading = false, disabled = false, className, ...rest }: SplitButtonProps) {
    // Zones are arbitrary children; the root must count them to place dividers and outer corners.
    // eslint-disable-next-line @eslint-react/no-children-to-array
    const zones = Children.toArray(children);

    function getPosition(index: number): SplitButtonZonePosition | undefined {
        if (index === 0) {
            return 'first';
        }
        if (index === zones.length - 1) {
            return 'last';
        }
        return undefined;
    }

    return (
        // `group`, never `button`: the wrapper is not activatable and would hide the two real buttons.
        <div
            {...rest}
            role="group"
            aria-busy={loading || undefined}
            data-loading={loading ? 'true' : 'false'}
            data-disabled={disabled ? 'true' : 'false'}
            className={cn`${SPLIT_BUTTON_ROOT_CLASSES} ${className}`}
        >
            <SplitButtonContext value={{ loading, disabled }}>
                {zones.map((zone, index) => {
                    return (
                        // Children.toArray already keyed each child; zones are never reordered.
                        // eslint-disable-next-line @eslint-react/no-array-index-key
                        <Fragment key={index}>
                            {index > 0 ? (
                                <span aria-hidden="true" className={DIVIDER_CLASSES}>
                                    <span className={DIVIDER_RULE_CLASSES} />
                                </span>
                            ) : null}
                            <SplitButtonPositionContext value={getPosition(index)}>{zone}</SplitButtonPositionContext>
                        </Fragment>
                    );
                })}
            </SplitButtonContext>
            <span aria-hidden="true" className={PILL_SHADOW_CLASSES} />
        </div>
    );
}

SplitButton.Action = SplitButtonAction;
SplitButton.Disclosure = SplitButtonDisclosure;

export { SplitButton, SplitButtonAction, SplitButtonDisclosure };
