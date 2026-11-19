import type { Drawer } from '@base-ui/react/drawer';
import type { ContextMenuSurface } from './context/surface';
import type { ContextMenuContentProps, ContextMenuItem, ContextMenuRootProps, ContextMenuTriggerProps } from './types';
import { use, useState } from 'react';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/cn';
import { OVERLAY_PANEL, OVERLAY_SIDE_OFFSET } from '@/lib/ui/overlayPanel';
import { useIsMobile } from '@/hooks/useIsMobile';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ContextMenuSurfaceContext } from './context/surface';

/* Drawn 212px (rem, scales with root font); long labels clip. Popup tier, above modals (1300). */
const POSITIONER_CLASSES = 'w-[13.25rem] outline-hidden z-[1400]';

/* `outline-hidden`: Base UI focuses the popup before any row is highlighted. Drawn `Shadows for Buttons`. */
const POPUP_CLASSES = `${OVERLAY_PANEL} w-full outline-hidden font-sans shadow-button inset-shadow-button`;

/*
 * 36px rows (`py-m` + 20px line). Fill on `data-highlighted` (pointer and keyboard alike), gated on
 * `not-data-disabled:` because Base UI highlights focusable disabled items. Only the ring is `focus-visible`:
 * Base UI moves real focus onto pointer-highlighted rows.
 */
const ROW_CLASSES = `
    flex w-full min-w-px cursor-pointer select-none items-center gap-m rounded-s px-l py-m
    text-body-s-medium text-text-general-strong transition-colors
    not-data-disabled:data-highlighted:bg-button-secondary-hover
    not-data-disabled:active:bg-button-secondary-pressed
    focus-visible:inset-ring-1 focus-visible:inset-ring-border-focused
    data-disabled:cursor-not-allowed data-disabled:text-text-disabled
`;

/* `not-data-disabled:` so destructive + disabled reads as disabled, not by stylesheet order. */
const DESTRUCTIVE_CLASSES = 'not-data-disabled:text-text-negative';

const ICON_CLASSES = 'size-xl shrink-0';
const LABEL_CLASSES = 'truncate';

/*
 * Below `md:` a titled `Actions` sheet replaces the panel: 56px rows, 20px glyphs, `Body/Medium`. Rows are
 * plain buttons — the sheet is a dialog with its own focus trap, not a menu.
 */
const SHEET_ROW_CLASSES = `
    flex w-full min-w-px cursor-pointer items-center gap-l px-3xl py-xl
    text-body-m text-text-general-strong text-left
    transition-colors hover:bg-button-secondary-hover active:bg-button-secondary-pressed
    focus-visible:inset-ring-1 focus-visible:inset-ring-border-focused focus-visible:outline-none
    disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-transparent
`;
const SHEET_DESTRUCTIVE_CLASSES = 'not-disabled:text-text-negative';
const SHEET_ICON_CLASSES = 'size-2xl shrink-0';
const SHEET_LABEL_CLASSES = 'min-w-px truncate';

/* No `BottomSheet.Footer` (Figma `Show Buttons = false`); the list carries the bottom padding. */
const SHEET_TITLE_CLASSES = 'text-center';
const SHEET_LIST_CLASSES = 'flex flex-col pb-3xl';

/* The sheet has no trigger part, so its opens and closes are announced by hand in Base UI's shape. */
const TRIGGER_PRESS_DETAILS = { reason: 'trigger-press' } as unknown as Drawer.Root.ChangeEventDetails;
const ROW_PRESS_DETAILS = { reason: 'item-press' } as unknown as Drawer.Root.ChangeEventDetails;

/**
 * `modal` stays at Base UI's default `true` so the page cannot scroll out from under the panel.
 * `highlightItemOnHover` is not exposed — the state ramp depends on it.
 */
function ContextMenuRoot({ children, open, onOpenChange, disabled }: ContextMenuRootProps) {
    const isDesktop = !useIsMobile();

    // Mobile branch only (`BottomSheet` is always controlled); a hook cannot be conditional.
    const [sheetOpen, setSheetOpen] = useState(false);
    const isControlled = open !== undefined;

    const surface: ContextMenuSurface = {
        open: isControlled ? open : sheetOpen,
        disabled: disabled === true,
        setOpen(next, eventDetails) {
            if (!isControlled) {
                setSheetOpen(next);
            }
            onOpenChange?.(next, eventDetails);
        },
    };

    if (isDesktop) {
        return (
            <BaseMenu.Root open={open} onOpenChange={onOpenChange} disabled={disabled}>
                {children}
            </BaseMenu.Root>
        );
    }

    return <ContextMenuSurfaceContext value={surface}>{children}</ContextMenuSurfaceContext>;
}

/** `openOnHover`/`delay` are not exposed: actions must not open on a passing pointer. */
function ContextMenuTrigger({ children, className, render }: ContextMenuTriggerProps) {
    const surface = use(ContextMenuSurfaceContext);

    function handleClick() {
        surface?.setOpen(true, TRIGGER_PRESS_DETAILS);
    }

    // A function `render` expects menu-trigger state that does not exist on the sheet branch.
    const sheetRender = typeof render === 'function' ? undefined : (render as useRender.RenderProp);
    const isOpen = surface?.open === true;

    // `aria-haspopup="dialog"`, not `"menu"`: on this branch the surface is a dialog.
    const sheetTrigger = useRender({
        render: sheetRender,
        defaultTagName: 'button',
        props: {
            type: 'button',
            className,
            children,
            onClick: handleClick,
            disabled: surface?.disabled === true ? true : undefined,
            'aria-haspopup': 'dialog',
            'aria-expanded': isOpen,
            // Mirrors `Menu.Trigger` so kit buttons hold their hover cell while open; presence, not a boolean.
            'data-popup-open': isOpen ? '' : undefined,
        },
    });

    if (surface !== null) {
        return sheetTrigger;
    }

    return (
        <BaseMenu.Trigger className={className} render={render}>
            {children}
        </BaseMenu.Trigger>
    );
}

/** Closes first, then `onSelect`: a dialog opening under a still-open sheet would be two focus traps. */
function ContextMenuSheetRow({ item, surface }: { item: ContextMenuItem; surface: ContextMenuSurface }) {
    const rowClasses = item.destructive ? cn`${SHEET_ROW_CLASSES} ${SHEET_DESTRUCTIVE_CLASSES}` : SHEET_ROW_CLASSES;

    function handleClick() {
        surface.setOpen(false, ROW_PRESS_DETAILS);
        item.onSelect();
    }

    return (
        <button type="button" className={rowClasses} disabled={item.disabled} onClick={handleClick}>
            {item.icon ? (
                <span aria-hidden className={SHEET_ICON_CLASSES}>
                    {item.icon}
                </span>
            ) : null}
            <span className={SHEET_LABEL_CLASSES}>{item.label}</span>
        </button>
    );
}

function ContextMenuRow({ item }: { item: ContextMenuItem }) {
    const rowClasses = item.destructive ? cn`${ROW_CLASSES} ${DESTRUCTIVE_CLASSES}` : ROW_CLASSES;

    return (
        // `label`: explicit typeahead key, so typeahead survives a non-string label.
        <BaseMenu.Item className={rowClasses} disabled={item.disabled} label={item.label} onClick={item.onSelect}>
            {item.icon ? (
                <span aria-hidden className={ICON_CLASSES}>
                    {item.icon}
                </span>
            ) : null}
            <span className={LABEL_CLASSES}>{item.label}</span>
        </BaseMenu.Item>
    );
}

/** Portal + positioner + panel in one part: overflow controls often sit in `overflow: hidden` cells. */
function ContextMenuContent({
    items,
    side = 'bottom',
    align = 'end',
    sideOffset = OVERLAY_SIDE_OFFSET,
    alignOffset = 0,
    className,
    sheetTitle = 'Actions',
}: ContextMenuContentProps) {
    const surface = use(ContextMenuSurfaceContext);

    if (surface !== null) {
        return (
            <BottomSheet.Root open={surface.open} onOpenChange={surface.setOpen}>
                <BottomSheet.Popup className={className}>
                    <BottomSheet.Title className={SHEET_TITLE_CLASSES}>{sheetTitle}</BottomSheet.Title>
                    <BottomSheet.Close aria-label={`Close ${sheetTitle.toLowerCase()}`} />
                    <BottomSheet.Content>
                        <div className={SHEET_LIST_CLASSES}>
                            {items.map((item) => {
                                return <ContextMenuSheetRow key={item.label} item={item} surface={surface} />;
                            })}
                        </div>
                    </BottomSheet.Content>
                </BottomSheet.Popup>
            </BottomSheet.Root>
        );
    }

    return (
        <BaseMenu.Portal>
            <BaseMenu.Positioner
                side={side}
                align={align}
                sideOffset={sideOffset}
                alignOffset={alignOffset}
                className={POSITIONER_CLASSES}
            >
                <BaseMenu.Popup className={cn`${POPUP_CLASSES} ${className}`}>
                    {items.map((item) => {
                        return <ContextMenuRow key={item.label} item={item} />;
                    })}
                </BaseMenu.Popup>
            </BaseMenu.Positioner>
        </BaseMenu.Portal>
    );
}

/**
 * Press-to-open actions menu (Base UI `menu`, not right-click `context-menu`); rows are data. Below `md:` it
 * renders the drawn `Actions` bottom sheet instead. Figma: 11309:7784 (panel), 10600:285692 (sheet).
 */
const ContextMenu = {
    Root: ContextMenuRoot,
    Trigger: ContextMenuTrigger,
    Content: ContextMenuContent,
};

export { ContextMenu, ContextMenuContent, ContextMenuRoot, ContextMenuTrigger };
