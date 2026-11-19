import type { Tooltip as BaseTooltip, TooltipTriggerProps as BaseTriggerProps } from '@base-ui/react/tooltip';
import type { ReactNode } from 'react';

export type TooltipRootProps = {
    children: ReactNode;
    /** Optional: hover/focus open it. Only for tooltips driven externally (coach mark, crosshair). */
    open?: boolean;
    /** Every route Base UI opens/closes on; `eventDetails.reason` distinguishes them. */
    onOpenChange?: (open: boolean, eventDetails: BaseTooltip.Root.ChangeEventDetails) => void;
    /** Stops it opening without disabling the trigger element. */
    disabled?: boolean;
};

export type TooltipTriggerProps = {
    children?: ReactNode;
    className?: string;
    /**
     * Any element; Base UI merges handlers and ref onto it. Default: a bare `<button>`. Must be focusable
     * and named — dev-only errors otherwise.
     */
    render?: BaseTriggerProps['render'];
};

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
export type TooltipAlign = 'start' | 'center' | 'end';

export type TooltipContentProps = {
    children: ReactNode;
    /** Nothing draws a placement; Base UI flips on collision. @default 'top' */
    side?: TooltipSide;
    /** @default 'center' */
    align?: TooltipAlign;
    /** Merged onto the card (e.g. widen past 280px for illustrations). */
    className?: string;
};

export type TooltipTitleProps = {
    children: ReactNode;
    className?: string;
};

export type TooltipDescriptorProps = {
    children: ReactNode;
    className?: string;
};
