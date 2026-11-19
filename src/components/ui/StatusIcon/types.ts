import type { ReactNode } from 'react';

/** Severity of a status message. `negative`, not `error`: token names win over Figma's state name. No `info` drawn. */
export type Status = 'default' | 'positive' | 'negative' | 'warning';

/**
 * Ground the chip sits on (Figma's `Type` axis). `on-surface` = light card, dark ink (Toast);
 * `general` = app's dark ground, white ink (NotificationItem). Only `default` changes with it.
 */
export type StatusIconSurface = 'on-surface' | 'general';

export type StatusIconProps = {
    status: Status;
    /** @default 'on-surface' */
    surface?: StatusIconSurface;
    /** Replaces the 20px glyph only; fill and tint stay bound to `status` (the tint is the meaning). */
    icon?: ReactNode;
    className?: string;
};
