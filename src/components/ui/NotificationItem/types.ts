import type { ReactNode } from 'react';
import type { Status } from '@/components/ui/StatusIcon/types';

/**
 * One of the row's two action buttons. No `variant`: the treatment is per row (`actionVariant`).
 * No `closeOnClick`: the row is persistent.
 */
export type NotificationItemAction = {
    label: string;
    onClick: () => void;
    startIcon?: ReactNode;
    endIcon?: ReactNode;
};

export type NotificationItemActionVariant = 'link' | 'filled';

export type NotificationItemProps = {
    status: Status;
    label: ReactNode;
    descriptor?: ReactNode;
    /** The instant; the component owns the format. */
    timestamp: Date;
    /** Controlled: marking read is a network write, so the row never dims itself. @default false */
    read?: boolean;
    /** Makes the whole row openable (stretched-link label button). Absent → inert label, no hover. */
    onOpen?: () => void;
    /** Detailed-card slot, rendered verbatim. `undefined`, `null`, `false` and `''` all count as none. */
    detail?: ReactNode;
    /** Whether the alert reached the phone: draws the phone / struck-phone glyph. `undefined` draws none. */
    delivered?: boolean;
    /** `StatusIcon` glyph override. */
    icon?: ReactNode;
    /** Which button pair the actions row draws; independent of `detail`. @default 'link' */
    actionVariant?: NotificationItemActionVariant;
    primaryAction?: NotificationItemAction;
    /** Either action may be absent independently. */
    secondaryAction?: NotificationItemAction;
    className?: string;
};

/** One `Label: Value` line inside the `detail` slot. The label keeps its own colon. */
export type NotificationItemDetailRowProps = {
    label: ReactNode;
    value: ReactNode;
};
