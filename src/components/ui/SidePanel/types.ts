import type { Dialog as BaseDialog } from '@base-ui/react/dialog';
import type { ReactNode } from 'react';

export type SidePanelRootProps = {
    /** Controlled only: no `defaultOpen`, no `Trigger`. */
    open: boolean;
    /**
     * Called for every route (Escape, outside press, ✕); `eventDetails.reason` distinguishes them. None can be
     * disabled — that would be a different component with a different ARIA role.
     */
    onOpenChange: (open: boolean, eventDetails: BaseDialog.Root.ChangeEventDetails) => void;
    children: ReactNode;
};

export type SidePanelPopupProps = {
    children: ReactNode;
    className?: string;
};

export type SidePanelTitleProps = {
    children: ReactNode;
    className?: string;
};

export type SidePanelDescriptorProps = {
    children: ReactNode;
    className?: string;
};

export type SidePanelContentProps = {
    children: ReactNode;
    className?: string;
};

export type SidePanelFooterProps = {
    /** Each direct child gets an equal share of the row. */
    children: ReactNode;
    className?: string;
};
