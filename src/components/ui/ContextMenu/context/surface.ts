import type { Drawer } from '@base-ui/react/drawer';
import { createContext } from 'react';

export type ContextMenuSurface = {
    open: boolean;
    disabled: boolean;
    setOpen: (open: boolean, eventDetails: Drawer.Root.ChangeEventDetails) => void;
};

/**
 * Mobile-branch state (the sheet is controlled). `null` outside a mobile `Root` is how `Trigger`/`Content`
 * tell the branches apart without a second media-query read.
 */
export const ContextMenuSurfaceContext = createContext<ContextMenuSurface | null>(null);
ContextMenuSurfaceContext.displayName = 'ContextMenuSurfaceContext';
