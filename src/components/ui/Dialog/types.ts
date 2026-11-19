import type { Dialog as BaseDialog } from '@base-ui/react/dialog';
import type { ReactNode } from 'react';

export type DialogRootProps = {
    /** Controlled only. */
    open: boolean;
    /**
     * Called for every route (Escape, outside press, ✕, and swipe below `md:`); none can be disabled — that
     * would be an `alertdialog`, a different component.
     */
    onOpenChange: (open: boolean, eventDetails: BaseDialog.Root.ChangeEventDetails) => void;
    /** After the open/close motion settles: scroll lock released, focus returned. */
    onOpenChangeComplete?: (open: boolean) => void;
    children: ReactNode;
};

export type DialogPopupProps = {
    children: ReactNode;
    /** Desktop panel only: geometry written for the centred panel would misshape the sheet. */
    className?: string;
};

export type DialogTitleProps = {
    children: ReactNode;
    className?: string;
};

export type DialogDescriptorProps = {
    children: ReactNode;
    className?: string;
};

export type DialogContentProps = {
    children: ReactNode;
    /** On the scrolling region (full-bleed on desktop). */
    className?: string;
    /**
     * On the scrolled box, merged over the gutter (`px-4xl` desktop, `px-l` sheet). Change the inset here,
     * not with padding on `className` — padding there pulls the scrollbar in with it.
     */
    contentClassName?: string;
};

export type DialogFooterProps = {
    /** Each direct child gets an equal share of the row. */
    children: ReactNode;
    className?: string;
};
