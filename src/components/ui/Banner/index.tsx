import type { BannerAction, BannerItemProps, BannerOrientation, BannerProps, BannerStatus } from './types';
import { Children } from 'react';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg?react';
import { Collapsible } from '@base-ui/react/collapsible';
import { cn } from '@/lib/cn';
import { OVERLAY_DURATION_SHORT } from '@/lib/ui/overlayMotion';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';

/*
 * `w-full`: a fixed 351px clips at 320 (WCAG 1.4.10). Block padding only: panel rules run full
 * width, inline padding lives on the children.
 */
const ROOT_CLASSES = 'relative flex w-full flex-col rounded-s py-xl';

/*
 * 1px three-stop gradient stroke (Figma 8357:8017) as a masked pseudo-element, since the fill is
 * translucent. Mask longhands only: the shorthand resets `mask-composite`.
 */
const GRADIENT_BORDER_CLASSES = `
    before:pointer-events-none before:absolute before:inset-none before:content-['']
    before:rounded-[inherit] before:p-[1px]
    before:[background:linear-gradient(165deg,var(--color-lavender-100)_0%,var(--color-violet-750)_76%,var(--color-light-blue-300)_100%)]
    before:[mask-image:linear-gradient(#000_0_0),linear-gradient(#000_0_0)]
    before:[mask-clip:content-box,border-box] before:[mask-composite:exclude]
`;

/* Only `default` carries an edge, as drawn (ADR-0002). */
const STATUS_CLASSES: Record<BannerStatus, string> = {
    default: `${GRADIENT_BORDER_CLASSES} bg-surface-control`,
    negative: 'bg-surface-negative-secondary',
    warning: 'bg-surface-warning',
    neutral: 'bg-surface-updating',
};

/* Orientations draw different inline padding (16 vs 12); shipped as drawn. */
const HEADER_CLASSES: Record<BannerOrientation, string> = {
    horizontal: 'flex gap-l px-xl',
    vertical: 'flex gap-l px-l',
};

/*
 * The header is the trigger, never the card: a `<button>` cannot contain buttons. Whole header for
 * WCAG 2.5.8. Focus ring is undrawn (WCAG 2.4.7); inset since the trigger sits flush.
 */
const TRIGGER_CLASSES = `
    w-full bg-transparent text-left [font:inherit] text-inherit
    outline-none hover:cursor-pointer
    focus-visible:inset-ring-1 focus-visible:inset-ring-border-focused
`;

/* Ink pinned with `!`: the trigger is `text-inherit`, so the glyph would take the host's colour. */
const CHEVRON_CLASSES = `
    size-2xl shrink-0 text-text-general-strong!
    transition-transform ${OVERLAY_DURATION_SHORT} motion-reduce:transition-none
    in-data-[panel-open]:rotate-180
`;

/* Height animates against Base UI's `--collapsible-panel-height`; `flex` beats the UA `[hidden]` rule. */
const PANEL_CLASSES = `
    flex flex-col gap-xl overflow-hidden
    h-[var(--collapsible-panel-height)]
    transition-[height] ${OVERLAY_DURATION_SHORT} motion-reduce:transition-none
    data-[starting-style]:h-[0px] data-[ending-style]:h-[0px]
    [&[hidden]:not([hidden='until-found'])]:hidden
`;

const ITEM_CLASSES = 'flex flex-col gap-l px-l';

const ITEM_TEXT_CLASSES = 'flex min-w-[0px] flex-col gap-s wrap-anywhere';

/* `min-w-[0px]`: a long label would push the buttons out. `wrap-anywhere`: the longest word would overrun. */
const TEXT_COLUMN_CLASSES = 'flex min-w-[0px] flex-1 flex-col gap-s wrap-anywhere text-left';

/* `mt-[2px]` centres the 16px glyph on the label's first 20px line. */
const ICON_CLASSES = 'mt-[2px] flex size-xl shrink-0 *:size-full';

const LEADING_CLASSES = 'flex min-w-[0px] flex-1 items-start gap-s';

const LABEL_CLASSES = 'text-body-s-medium text-text-general-strong';

const DESCRIPTOR_CLASSES = 'text-caption-m text-text-general-medium';

/* The severity the fill paints, said in words before the label (WCAG 1.4.1, 1.3.3). */
const SEVERITY_TEXT: Record<BannerStatus, string | null> = {
    default: null,
    negative: 'Error',
    warning: 'Warning',
    neutral: null,
};

type ActionButtonProps =
    | { variant: 'primary' | 'secondary'; size: 'sm' }
    | { variant: 'primary' | 'secondary'; size: 'md'; fullWidth: true };

/*
 * Treatment, placement and row in one record so they cannot drift. Drawn: horizontal 40px = `sm`,
 * vertical 48px = `md`; `fullWidth` on both vertical cells so the labels centre alike.
 */
const ACTION_BUTTON: Record<
    BannerOrientation,
    { primary: ActionButtonProps; secondary: ActionButtonProps; row: string; placement: 'header' | 'block' }
> = {
    horizontal: {
        primary: { variant: 'primary', size: 'sm' },
        secondary: { variant: 'secondary', size: 'sm' },
        row: 'flex shrink-0 items-center gap-s',
        placement: 'header',
    },
    vertical: {
        primary: { variant: 'primary', size: 'md', fullWidth: true },
        secondary: { variant: 'secondary', size: 'md', fullWidth: true },
        row: 'flex gap-s *:flex-1 px-l mt-l',
        placement: 'block',
    },
};

/* Own cell: must not move when the vertical row is retuned. */
const ITEM_ACTION_BUTTON: ActionButtonProps = { variant: 'primary', size: 'md', fullWidth: true };

/* Primary first in DOM in both orientations, as drawn. */
const ACTION_ORDER = ['primary', 'secondary'] as const;

type ActionButtonPartProps = {
    action: BannerAction;
    treatment: ActionButtonProps;
};

/** `stopPropagation`: a banner is dropped into pages it knows nothing about. */
function ActionButton({ action, treatment }: ActionButtonPartProps) {
    return (
        <Button
            {...treatment}
            disabled={action.disabled}
            endIcon={action.endIcon}
            loading={action.loading}
            onClick={(event) => {
                event.stopPropagation();
                action.onClick();
            }}
            startIcon={action.startIcon}
        >
            {action.label}
        </Button>
    );
}

function isPresent(node: unknown) {
    return node !== undefined && node !== null && node !== '';
}

/**
 * In-flow advisory with the buttons that act on it. `Banner.Item` children make it collapsible.
 * Figma's decorative `showCheckbox` glyph is not shipped: a false affordance (WCAG 1.3.1).
 */
function BannerCard({
    status = 'default',
    orientation = 'horizontal',
    label,
    icon,
    descriptor,
    primaryAction,
    secondaryAction,
    role,
    children,
    defaultOpen,
    open,
    onOpenChange,
    className,
}: BannerProps) {
    const hasActions = primaryAction !== undefined || secondaryAction !== undefined;
    // `Children.toArray` drops `null`/`undefined`/`false`, so none draws a chevron over an empty panel.
    // eslint-disable-next-line @eslint-react/no-children-to-array
    const items = Children.toArray(children);
    const isCollapsible = items.length > 0;
    const treatment = ACTION_BUTTON[orientation];
    const severity = SEVERITY_TEXT[status];

    // With children the horizontal row moves out of the header and loses its inline padding.
    const actionsRowClasses = isCollapsible && treatment.placement === 'header' ? 'mt-l px-xl' : '';
    const actionsRow = hasActions ? (
        <div className={cn`${treatment.row} ${actionsRowClasses}`}>
            {ACTION_ORDER.map((slot) => {
                const action = slot === 'primary' ? primaryAction : secondaryAction;
                if (action === undefined) {
                    return null;
                }
                return <ActionButton action={action} key={slot} treatment={treatment[slot]} />;
            })}
        </div>
    ) : null;

    const text = (
        <div className={TEXT_COLUMN_CLASSES}>
            <span className={LABEL_CLASSES}>
                {severity && <span className="sr-only">{severity}: </span>}
                {label}
            </span>
            {isPresent(descriptor) && <p className={DESCRIPTOR_CLASSES}>{descriptor}</p>}
        </div>
    );

    const textColumn = isPresent(icon) ? (
        <div className={LEADING_CLASSES}>
            <span className={ICON_CLASSES}>{icon}</span>
            {text}
        </div>
    ) : (
        text
    );

    const card = (
        <div className={cn`${ROOT_CLASSES} ${STATUS_CLASSES[status]} ${className}`} role={role}>
            {isCollapsible ? (
                <Collapsible.Trigger className={cn`${TRIGGER_CLASSES} ${HEADER_CLASSES[orientation]}`}>
                    {textColumn}
                    <ChevronDownIcon aria-hidden="true" className={CHEVRON_CLASSES} />
                </Collapsible.Trigger>
            ) : (
                <div className={HEADER_CLASSES[orientation]}>
                    {textColumn}
                    {treatment.placement === 'header' && actionsRow}
                </div>
            )}
            {/* Figma's `expanded` cell drops the top-level buttons; kept: unmounting the control
                the operator reached for is a change of context (WCAG 3.2.2). */}
            {(isCollapsible || treatment.placement === 'block') && actionsRow}
            {isCollapsible && (
                <Collapsible.Panel className={PANEL_CLASSES}>
                    {items.flatMap((item, index) => {
                        // Header↔panel gap inside the panel: a margin outside the animated box jumps on open.
                        return [
                            // eslint-disable-next-line @eslint-react/no-array-index-key -- a rule holds no state
                            <Divider className={index === 0 ? 'mt-xl' : undefined} key={`rule-${index}`} />,
                            item,
                        ];
                    })}
                </Collapsible.Panel>
            )}
        </div>
    );

    if (!isCollapsible) {
        return card;
    }
    return (
        <Collapsible.Root defaultOpen={defaultOpen} onOpenChange={onOpenChange} open={open}>
            {card}
        </Collapsible.Root>
    );
}

/** Panel row: label, optional descriptor, one full-width primary action. */
function BannerItem({ label, descriptor, action }: BannerItemProps) {
    return (
        <div className={ITEM_CLASSES}>
            <div className={ITEM_TEXT_CLASSES}>
                <span className={LABEL_CLASSES}>{label}</span>
                {isPresent(descriptor) && <p className={DESCRIPTOR_CLASSES}>{descriptor}</p>}
            </div>
            {action !== undefined && <ActionButton action={action} treatment={ITEM_ACTION_BUTTON} />}
        </div>
    );
}

/** Figma: `Banner` (gradient edge 8357:8017, collapsible 11046:248194). */
const Banner = Object.assign(BannerCard, { Item: BannerItem });

export { Banner, BannerItem };
