import type { ReactNode } from 'react';

/** No `positive`: Figma draws none. `neutral` is the grey `Updating` card (a command in flight). */
export type BannerStatus = 'default' | 'negative' | 'warning' | 'neutral';

export type BannerOrientation = 'horizontal' | 'vertical';

/** No `variant` (orientation fixes it), no `closeOnClick` (nothing closes). */
export type BannerAction = {
    label: string;
    onClick: () => void;
    startIcon?: ReactNode;
    endIcon?: ReactNode;
    /** Greyed and inert; the button stays so the card still names the fix. */
    disabled?: boolean;
    /** Busy: spinner in the leading slot, activation refused. */
    loading?: boolean;
};

export type BannerProps = {
    /** @default 'default' */
    status?: BannerStatus;
    /** Also changes inline padding. @default 'horizontal' */
    orientation?: BannerOrientation;
    label: ReactNode;
    /** Leading glyph (Figma's `showAiIcon`) in its own column. Decorative: pass it `aria-hidden`. */
    icon?: ReactNode;
    descriptor?: ReactNode;
    primaryAction?: BannerAction;
    secondaryAction?: BannerAction;
    /**
     * Absent by default: a standing warning on load should not be announced. Pass `status`/`alert`
     * when mounting on an event. Never `banner` (page-header landmark).
     */
    role?: 'status' | 'alert';
    /** `Banner.Item` elements. Present makes the card collapsible. */
    children?: ReactNode;
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    className?: string;
};

export type BannerItemProps = {
    label: ReactNode;
    descriptor?: ReactNode;
    action?: BannerAction;
};
