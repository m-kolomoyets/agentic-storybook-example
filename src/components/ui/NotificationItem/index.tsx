import type { NotificationItemActionVariant, NotificationItemDetailRowProps, NotificationItemProps } from './types';
import MobileOffIcon from '@/assets/icons/mobile-off.svg?react';
import SmartphoneIcon from '@/assets/icons/smartphone.svg?react';
import { DateTime } from 'luxon';
import { cn } from '@/lib/cn';
import { OVERLAY_DURATION_SHORT } from '@/lib/ui/overlayMotion';
import { Button } from '@/components/ui/Button';
import { StatusIcon } from '@/components/ui/StatusIcon';

/* Colours only: not the dot (an unread marker fading slowly is unreadable), not weight (reflows). */
const TRANSITION = `transition-colors ${OVERLAY_DURATION_SHORT} motion-reduce:transition-none`;

/*
 * `relative` is load-bearing: the label button's `::after` is positioned against it.
 * `@container`: filled buttons stretch on a narrow card and hug on a wide one.
 */
const ROOT_CLASSES = `@container relative flex w-full gap-s px-l py-xl ${TRANSITION}`;

/* An openable row lights on hover, read or unread; `hover:` beats the unread fill by source order. */
const OPENABLE_CLASSES = 'hover:bg-white-alpha-8';

/* `min-w-[0px]` so a long label wraps instead of pushing the time out. */
const LABEL_CLASSES = `flex min-w-[0px] flex-1 ${TRANSITION}`;

/* One line, ellipsised, as drawn; the full text rides on `title` when it is a string. */
const DESCRIPTOR_CLASSES = `truncate text-left ${TRANSITION}`;

const COLUMN_CLASSES = 'flex min-w-[0px] flex-1 flex-col gap-l';

const BODY_CLASSES = 'flex flex-col gap-m';

const HEAD_CLASSES = 'flex flex-col gap-xs';

/* `items-start`: the timestamp pins to the label's first line. */
const HEAD_ROW_CLASSES = 'flex items-start gap-l text-left';

const META_CLASSES = 'flex shrink-0 items-center gap-xs';

/* `relative` lifts interactive detail content above the label's `::after`. */
const INFO_CLASSES = 'relative flex items-end gap-xxs';

const DETAIL_CLASSES = 'flex min-w-[0px] flex-1 flex-col gap-xxs';

/* `ml-auto` keeps the glyph right when there are no detail lines beside it. */
const DELIVERY_CLASSES = 'ml-auto size-2xl shrink-0 text-icons-general-medium';

const DETAIL_ROW_CLASSES = 'flex items-baseline gap-m';

/* Unread dot: `invisible`, never unmounted, so nothing shifts on read. Not the chart alias Figma binds. */
const DOT_CLASSES = 'size-s shrink-0 rounded-full bg-lavender-100';

/* Stretched link: `::after` covers the root; focus ring on it so the whole row shows focus. */
const LABEL_BUTTON_CLASSES = `
    bg-transparent text-left [font:inherit] text-inherit
    outline-none hover:cursor-pointer
    after:absolute after:inset-none after:content-['']
    focus-visible:after:inset-ring-1 focus-visible:after:inset-ring-border-focused
`;

/* Read as drawn: no fill, Medium→Regular, primary→secondary ink. Same metrics, no reflow. */
const READ_CLASSES = {
    unread: {
        root: 'bg-surface-card',
        label: 'text-body-s-medium text-text-general-strong',
        timestamp: 'text-caption-m-medium text-text-general-strong',
        descriptor: 'text-caption-m-medium text-text-general-medium',
        dot: '',
    },
    read: {
        root: '',
        label: 'text-body-s text-text-general-medium',
        timestamp: 'text-caption-m text-text-general-medium',
        descriptor: 'text-caption-m text-text-general-medium',
        dot: 'invisible',
    },
};

/*
 * Button pair per `actionVariant`. `link-tertiary`: the token binding wins over Figma's layer name.
 * `order` is as drawn and the two treatments disagree, so DOM order changes with `actionVariant`.
 * Filled buttons split a narrow card and hug their labels from 576px of card width up.
 */
const ACTION_BUTTON = {
    link: {
        primary: { variant: 'link-primary', size: 'sm' },
        secondary: { variant: 'link-tertiary', size: 'sm' },
        row: 'gap-l',
        order: ['secondary', 'primary'],
    },
    filled: {
        primary: { variant: 'primary', size: 'sm' },
        secondary: { variant: 'secondary', size: 'sm' },
        row: 'gap-m *:flex-1 @min-[36rem]:*:flex-none',
        order: ['primary', 'secondary'],
    },
} as const satisfies Record<NotificationItemActionVariant, unknown>;

/* `relative` lifts the buttons above the label's `::after`. */
const ACTIONS_CLASSES = 'relative flex';

/** Persistent status message: a toast that is kept, listed and openable. Figma: `Notification` 9418:63545. */
function NotificationItemRow({
    status,
    label,
    descriptor,
    timestamp,
    read = false,
    onOpen,
    detail,
    delivered,
    icon,
    actionVariant = 'link',
    primaryAction,
    secondaryAction,
    className,
}: NotificationItemProps) {
    const state = READ_CLASSES[read ? 'read' : 'unread'];
    const openableClasses = onOpen ? OPENABLE_CLASSES : '';

    /* `null`/`''` are absent (an empty `<p>` would still draw `gap-xs`); `false`/`0` are legal nodes. */
    const hasDescriptor = descriptor !== undefined && descriptor !== null && descriptor !== '';
    const hasDetail = detail !== undefined && detail !== null && detail !== false && detail !== '';
    const treatment = ACTION_BUTTON[actionVariant];

    /* `sr-only` Unread: the dot is `aria-hidden`, and colour/weight alone fail WCAG 1.4.1. */
    const labelContent = (
        <>
            {!read && <span className="sr-only">Unread</span>}
            {label}
        </>
    );

    return (
        <div className={cn`${ROOT_CLASSES} ${state.root} ${openableClasses} ${className}`}>
            {/* `surface="general"`: this row sits on the dark ground, not the toast's light card. */}
            <StatusIcon className="shrink-0" icon={icon} status={status} surface="general" />
            <div className={COLUMN_CLASSES}>
                <div className={BODY_CLASSES}>
                    <div className={HEAD_CLASSES}>
                        <div className={HEAD_ROW_CLASSES}>
                            <h3 className={cn`${LABEL_CLASSES} ${state.label}`}>
                                {onOpen ? (
                                    <button className={LABEL_BUTTON_CLASSES} onClick={onOpen} type="button">
                                        {labelContent}
                                    </button>
                                ) : (
                                    <span>{labelContent}</span>
                                )}
                            </h3>
                            <div className={META_CLASSES}>
                                {/* `dateTime` keeps the real instant; `h:mm a` is ambiguous across midnight. */}
                                <time
                                    className={cn`${TRANSITION} ${state.timestamp}`}
                                    dateTime={timestamp.toISOString()}
                                >
                                    {DateTime.fromJSDate(timestamp).toFormat('h:mm a')}
                                </time>
                                <span aria-hidden="true" className={cn`${DOT_CLASSES} ${state.dot}`} />
                            </div>
                        </div>
                        {hasDescriptor && (
                            <p
                                className={cn`${DESCRIPTOR_CLASSES} ${state.descriptor}`}
                                title={typeof descriptor === 'string' ? descriptor : undefined}
                            >
                                {descriptor}
                            </p>
                        )}
                    </div>
                    {(hasDetail || delivered !== undefined) && (
                        <div className={INFO_CLASSES}>
                            {hasDetail && <div className={DETAIL_CLASSES}>{detail}</div>}
                            {delivered === true && (
                                <SmartphoneIcon
                                    aria-label="Delivered to phone"
                                    className={DELIVERY_CLASSES}
                                    role="img"
                                />
                            )}
                            {delivered === false && (
                                <MobileOffIcon
                                    aria-label="Not delivered to phone"
                                    className={DELIVERY_CLASSES}
                                    role="img"
                                />
                            )}
                        </div>
                    )}
                </div>
                {(primaryAction !== undefined || secondaryAction !== undefined) && (
                    <div className={cn`${ACTIONS_CLASSES} ${treatment.row}`}>
                        {treatment.order.map((slot) => {
                            const action = slot === 'primary' ? primaryAction : secondaryAction;
                            if (action === undefined) {
                                return null;
                            }
                            return (
                                <Button
                                    key={slot}
                                    {...treatment[slot]}
                                    endIcon={action.endIcon}
                                    onClick={action.onClick}
                                    startIcon={action.startIcon}
                                >
                                    {action.label}
                                </Button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

/** One `Label: Value` line for the `detail` slot. */
function NotificationItemDetailRow({ label, value }: NotificationItemDetailRowProps) {
    return (
        <div className={DETAIL_ROW_CLASSES}>
            <p className="text-body-s text-text-general-medium">{label}</p>
            <p className="text-body-s text-text-general-strong">{value}</p>
        </div>
    );
}

const NotificationItem = Object.assign(NotificationItemRow, { DetailRow: NotificationItemDetailRow });

export { NotificationItem, NotificationItemDetailRow };
