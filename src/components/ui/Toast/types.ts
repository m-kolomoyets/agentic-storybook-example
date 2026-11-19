import type { ReactNode } from 'react';
import type { Status } from '@/components/ui/StatusIcon/types';

export type ToastStatus = Status;

/** Data, not a node: the queue holds it outside React. Not Base UI `actionProps` (cannot hold variant/icon). */
export type ToastAction = {
    label: string;
    onClick: () => void;
    /** @default 'link' */
    variant?: 'link' | 'primary';
    startIcon?: ReactNode;
    endIcon?: ReactNode;
    /** `false` for async actions that stay visible and swap state via `toast.update`. @default true */
    closeOnClick?: boolean;
};

/** `inline`: right of the text, one row. `stacked`: below the descriptor, ✕ first row. Never derived from content. */
export type ToastLayout = 'inline' | 'stacked';

export type ToastData = {
    status: ToastStatus;
    descriptor?: ReactNode;
    icon?: ReactNode;
    action?: ToastAction;
    /** @default 'inline' */
    layout?: ToastLayout;
};

export type ToastOptions = {
    title: ReactNode;
    descriptor?: ReactNode;
    /** Replaces the status glyph only. Pass a bare SVGR element. */
    icon?: ReactNode;
    action?: ToastAction;
    /** @default 'inline' */
    layout?: ToastLayout;
    /** `0` makes any toast sticky; a number makes `negative` expire. */
    duration?: number;
    id?: string;
    /** Called once the toast closes, by ✕, swipe, timeout or `toast.dismiss`. */
    onClose?: () => void;
};

/** `status` required: Base UI's update shallow-spreads, so a partial `data` would erase it. */
export type ToastUpdate = Omit<ToastOptions, 'id' | 'onClose'> & {
    status: ToastStatus;
};

export type ToastProviderProps = {
    children?: ReactNode;
};
