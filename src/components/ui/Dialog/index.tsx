import type { Drawer } from '@base-ui/react/drawer';
import type { PartPresence } from './context/partPresence';
import type {
    DialogContentProps,
    DialogDescriptorProps,
    DialogFooterProps,
    DialogPopupProps,
    DialogRootProps,
    DialogTitleProps,
} from './types';
import { use, useEffect, useRef } from 'react';
import CloseIcon from '@/assets/icons/close.svg?react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cn } from '@/lib/cn';
import { OVERLAY_FADE, OVERLAY_MOTION, OVERLAY_TRANSITION } from '@/lib/ui/overlayMotion';
import { useIsMobile } from '@/hooks/useIsMobile';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { IconButton } from '@/components/ui/IconButton';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { PartPresenceContext } from './context/partPresence';
import { SheetSurfaceContext } from './context/sheetSurface';
import { usePartPresence } from './hooks/usePartPresence';

/* `z-[1300]`: the kit's modal tier. No `motion-reduce:`: opacity is not movement. */
const BACKDROP_CLASSES = `fixed inset-[0px] z-[1300] overlay-backdrop ${OVERLAY_TRANSITION} ${OVERLAY_FADE}`;

/* `p-xl` is the sub-480px gutter. No `pointer-events-none`: the backdrop receives the outside press. */
const VIEWPORT_CLASSES = 'fixed inset-[0px] z-[1300] flex items-center justify-center p-xl';

/*
 * `max-w-[30rem]` is the drawn 480px; `rounded-m` the drawn 12px. `dvh`, not `vh`: mobile URL bars.
 * `[transform:scale(…)]`, not `scale-96`: Tailwind v4's standalone `scale` is not covered by the transition.
 */
const POPUP_CLASSES = `
    relative w-full max-w-[30rem] max-h-[85dvh] flex flex-col overflow-hidden font-sans
    bg-surface-ground rounded-m pt-xl px-4xl pb-4xl
    ${OVERLAY_MOTION}
    data-[starting-style]:[transform:scale(0.96)] data-[ending-style]:[transform:scale(0.96)]
    motion-reduce:transition-none
`;

/* `pt-3xl` clears the ✕. `flex-1 min-h-px`: only flex child, must shrink before `Content` can. */
const BODY_CLASSES = 'flex w-full min-h-px flex-1 flex-col pt-3xl';

/* `IconButton size="sm"` (40px) in place of the drawn 36px box; ring restored (WCAG 2.4.7). */
const CLOSE_CLASSES = 'absolute top-m right-m inset-ring-0 bg-transparent focus-visible:ring-1';

const TITLE_CLASSES = 'w-full text-heading-s text-text-general-strong text-center';
const DESCRIPTOR_CLASSES = 'mt-xs w-full text-body-s text-text-general-medium text-center';

/*
 * `grid`: `ScrollArea`'s `height: 100%` needs a definite height, which flex slack is not. Full-bleed:
 * `-mx-4xl` cancels the popup gutter (`self-stretch`, so the negative margins widen it) and the scrolled box
 * pads the text back — the scrollbar rides the popup's edge, not the text's.
 */
const CONTENT_CLASSES = 'mt-3xl grid -mx-4xl self-stretch flex-1 min-h-px';
const SCROLLED_CONTENT_CLASSES = 'px-4xl';

/* Thumb on the ✕'s `right-m` vertical. */
const SCROLLBAR_INSET_CLASSES = 'mr-m';

/* Sheet branch inset: the sheet footer's `px-l`. */
const SHEET_CONTENT_CLASSES = 'px-l';

/* `*:flex-1`: a lone button fills the row. */
const FOOTER_CLASSES = 'mt-4xl flex w-full items-center gap-l *:flex-1';

/** Below `md:` the same composition renders as a `BottomSheet`. */
function DialogRoot({ open, onOpenChange, onOpenChangeComplete, children }: DialogRootProps) {
    // A hook, not a `md:` class: rendering both trees would mount two focus traps.
    const isDesktop = !useIsMobile();

    // Same shape; the sheet's `reason` union adds `swipe`. Cast at this one boundary.
    function handleSheetOpenChange(next: boolean, details: Drawer.Root.ChangeEventDetails) {
        onOpenChange(next, details as unknown as BaseDialog.Root.ChangeEventDetails);
    }

    if (!isDesktop) {
        return (
            <SheetSurfaceContext value>
                <BottomSheet.Root
                    open={open}
                    onOpenChange={handleSheetOpenChange}
                    onOpenChangeComplete={onOpenChangeComplete}
                >
                    {children}
                </BottomSheet.Root>
            </SheetSurfaceContext>
        );
    }

    return (
        <SheetSurfaceContext value={false}>
            <BaseDialog.Root open={open} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
                {children}
            </BaseDialog.Root>
        </SheetSurfaceContext>
    );
}

/* Dev-only: Base UI wires `aria-labelledby`/`aria-describedby` only when the parts render. Renders last. */
function PartsGuard() {
    const parts = use(PartPresenceContext);

    useEffect(
        function guardUnnamedDialog() {
            if (!import.meta.env.DEV || !parts) {
                return;
            }
            if (!parts.present('Title')) {
                // eslint-disable-next-line no-console -- dev-only guard
                console.error(
                    'Dialog.Popup: no <Dialog.Title> was rendered. The dialog has no accessible name — a ' +
                        'screen reader announces it as an unnamed dialog. Add a Title.'
                );
            }
            if (!parts.present('Descriptor')) {
                // eslint-disable-next-line no-console -- dev-only guard
                console.error(
                    'Dialog.Popup: no <Dialog.Descriptor> was rendered. The dialog has no accessible ' +
                        'description, and every drawn dialog has one. Add a Descriptor.'
                );
            }
        },
        [parts]
    );

    return null;
}

/** ✕ is unconditional: a forgotten cancel button traps no one. Needs `Title` and `Descriptor`. */
function DialogPopup({ children, className }: DialogPopupProps) {
    const mountedRef = useRef<Record<'Title' | 'Descriptor', boolean>>({ Title: false, Descriptor: false });
    const parts: PartPresence = {
        setPresent(part, present) {
            mountedRef.current[part] = present;
        },
        present(part) {
            return mountedRef.current[part];
        },
    };
    const isSheet = use(SheetSurfaceContext);

    if (isSheet) {
        return (
            <BottomSheet.Popup>
                <BottomSheet.Close aria-label="Close dialog" />
                <PartPresenceContext value={parts}>
                    {children}
                    <PartsGuard />
                </PartPresenceContext>
            </BottomSheet.Popup>
        );
    }

    return (
        <BaseDialog.Portal>
            {/* `forceRender`: Base UI skips a nested dialog's backdrop. */}
            <BaseDialog.Backdrop forceRender className={BACKDROP_CLASSES} />
            <BaseDialog.Viewport className={VIEWPORT_CLASSES}>
                <BaseDialog.Popup className={cn`${POPUP_CLASSES} ${className}`}>
                    <PartPresenceContext value={parts}>
                        <div className={BODY_CLASSES}>{children}</div>
                        <IconButton
                            className={CLOSE_CLASSES}
                            size="sm"
                            icon={<CloseIcon />}
                            aria-label="Close dialog"
                            render={<BaseDialog.Close />}
                        />
                        <PartsGuard />
                    </PartPresenceContext>
                </BaseDialog.Popup>
            </BaseDialog.Viewport>
        </BaseDialog.Portal>
    );
}

/** Heading and accessible name (`aria-labelledby`). Pinned outside the scrolling region. */
function DialogTitle({ children, className }: DialogTitleProps) {
    usePartPresence('Title');
    const isSheet = use(SheetSurfaceContext);

    if (isSheet) {
        // Also satisfies the sheet's own title guard.
        return <BottomSheet.Title className={className}>{children}</BottomSheet.Title>;
    }

    return <BaseDialog.Title className={cn`${TITLE_CLASSES} ${className}`}>{children}</BaseDialog.Title>;
}

/** Accessible description (`aria-describedby`). Must not restate the title. */
function DialogDescriptor({ children, className }: DialogDescriptorProps) {
    usePartPresence('Descriptor');
    const isSheet = use(SheetSurfaceContext);

    if (isSheet) {
        return <BottomSheet.Descriptor className={className}>{children}</BottomSheet.Descriptor>;
    }

    return (
        <BaseDialog.Description className={cn`${DESCRIPTOR_CLASSES} ${className}`}>{children}</BaseDialog.Description>
    );
}

/** Inset (unlike `BottomSheet.Content`) and the only region that scrolls. */
function DialogContent({ children, className, contentClassName }: DialogContentProps) {
    const isSheet = use(SheetSurfaceContext);

    if (isSheet) {
        return (
            <BottomSheet.Content
                className={className}
                contentClassName={cn`${SHEET_CONTENT_CLASSES} ${contentClassName}`}
            >
                {children}
            </BottomSheet.Content>
        );
    }

    return (
        <div className={cn`${CONTENT_CLASSES} ${className}`}>
            {/* No `className` on `ScrollArea`: it is the stretched grid item. */}
            <ScrollArea
                contentClassName={cn`${SCROLLED_CONTENT_CLASSES} ${contentClassName}`}
                scrollbarClassName={SCROLLBAR_INSET_CLASSES}
            >
                {children}
            </ScrollArea>
        </div>
    );
}

/** No `Cancel`/`Action` parts: variant placement and when to close are call-site knowledge. */
function DialogFooter({ children, className }: DialogFooterProps) {
    const isSheet = use(SheetSurfaceContext);

    if (isSheet) {
        return <BottomSheet.Footer className={className}>{children}</BottomSheet.Footer>;
    }

    return <div className={cn`${FOOTER_CLASSES} ${className}`}>{children}</div>;
}

/**
 * Centred modal on Base UI `Dialog`; below `md:` it renders as a `BottomSheet` from the same composition.
 * `Popup` owns the portal, backdrop, viewport and ✕; `Footer` takes bare `Button`s.
 * Figma: 11555:437944 (`UI Layouts` › Discard changes?).
 */
const Dialog = {
    Root: DialogRoot,
    Popup: DialogPopup,
    Title: DialogTitle,
    Descriptor: DialogDescriptor,
    Content: DialogContent,
    Footer: DialogFooter,
};

export { Dialog, DialogContent, DialogDescriptor, DialogFooter, DialogPopup, DialogRoot, DialogTitle };
