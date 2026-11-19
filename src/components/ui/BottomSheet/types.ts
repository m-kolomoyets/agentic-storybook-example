import type { Drawer } from '@base-ui/react/drawer';
import type { ReactNode } from 'react';
import type { ButtonProps, ButtonVariant } from '@/components/ui/Button/types';

export type BottomSheetRootProps = {
    /** Controlled only; `Action` never closes the sheet, so the caller owns the state. */
    open: boolean;
    /** Called for every dismissal route; `eventDetails.reason` distinguishes them. */
    onOpenChange: (open: boolean, eventDetails: Drawer.Root.ChangeEventDetails) => void;
    /** After the open/close motion settles: scroll lock released, focus returned. */
    onOpenChangeComplete?: (open: boolean) => void;
    children: ReactNode;
};

export type BottomSheetPopupProps = {
    children: ReactNode;
    className?: string;
};

export type BottomSheetTitleProps = {
    children: ReactNode;
    className?: string;
};

export type BottomSheetDescriptorProps = {
    children: ReactNode;
    className?: string;
};

export type BottomSheetContentProps = {
    children: ReactNode;
    /** `className="px-l"` matches the footer inset and the app's mobile page gutter (12px). */
    className?: string;
    /**
     * Classes on the scrolled box instead of the region. Put the gutter here (`contentClassName="px-l"`)
     * to keep the region full-bleed, so the scrollbar rides the sheet's edge rather than the text's.
     */
    contentClassName?: string;
};

export type BottomSheetFooterProps = {
    /** Each direct child gets an equal share of the row. */
    children: ReactNode;
    className?: string;
};

export type BottomSheetCancelProps = {
    children: ReactNode;
    className?: string;
};

/**
 * Only variants with `Button`'s full size ramp: `remote` has no size axis, `primary-on-surface` is 40px at
 * `md`, `link-*` are text.
 */
export type BottomSheetActionProps = Omit<ButtonProps, 'variant' | 'size' | 'render' | 'fullWidth'> & {
    /** @default 'primary' */
    variant?: Extract<ButtonVariant, 'primary' | 'secondary' | 'destructive'>;
};

export type BottomSheetCloseProps = {
    /** Required: ✕ has no text. No `className`: a merged `top-*` would replace the computed inset. */
    'aria-label': string;
};
