import type { Drawer } from '@base-ui/react/drawer';
import type { Menu as BaseMenu, MenuTriggerProps as BaseMenuTriggerProps } from '@base-ui/react/menu';
import type { ReactNode } from 'react';

export type ContextMenuItem = {
    /** Typeahead key. Clips with an ellipsis at the fixed 212px rather than wrapping. */
    label: string;
    /** 16px glyph (20px in the sheet); coloured via `currentColor`, so disabled grey and destructive red carry. */
    icon?: ReactNode;
    /** Greyed, still keyboard-reachable in the menu. @default false */
    disabled?: boolean;
    /** `Text/negative` look only; no confirmation step. @default false */
    destructive?: boolean;
    /** The menu closes first. */
    onSelect: () => void;
};

export type ContextMenuSide = 'top' | 'right' | 'bottom' | 'left';
export type ContextMenuAlign = 'start' | 'center' | 'end';

export type ContextMenuRootProps = {
    children: ReactNode;
    /** Pass only for an externally driven menu; the trigger opens it otherwise. */
    open?: boolean;
    /** `eventDetails.reason` distinguishes the open/close route. */
    onOpenChange?: (
        open: boolean,
        eventDetails: BaseMenu.Root.ChangeEventDetails | Drawer.Root.ChangeEventDetails
    ) => void;
    /** Prevents opening without disabling the trigger element. */
    disabled?: boolean;
};

export type ContextMenuTriggerProps = {
    children?: ReactNode;
    className?: string;
    /**
     * Any element; Base UI merges handlers, `aria-haspopup`/`aria-expanded` and ref. Default `<button>`. A
     * function `render` falls back to `<button>` below `md:` (no menu state exists there).
     */
    render?: BaseMenuTriggerProps['render'];
};

export type ContextMenuContentProps = {
    /** No composition slot: a self-drawn row would re-derive the ramp, greying and glyph slot. */
    items: ContextMenuItem[];
    /** Base UI flips on collision. @default 'bottom' */
    side?: ContextMenuSide;
    /** @default 'end' */
    align?: ContextMenuAlign;
    /** Gap to the trigger in px. @default OVERLAY_SIDE_OFFSET (4) */
    sideOffset?: number;
    /** Slide along the trigger's edge in px, negative towards start. @default 0 */
    alignOffset?: number;
    className?: string;
    /** Sheet heading below `md:` only (Figma `10600:285692`). @default 'Actions' */
    sheetTitle?: string;
};
