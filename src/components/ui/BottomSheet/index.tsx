import type { TitlePresence } from './context/titlePresence';
import type {
    BottomSheetActionProps,
    BottomSheetCancelProps,
    BottomSheetCloseProps,
    BottomSheetContentProps,
    BottomSheetDescriptorProps,
    BottomSheetFooterProps,
    BottomSheetPopupProps,
    BottomSheetRootProps,
    BottomSheetTitleProps,
} from './types';
import { use, useEffect, useRef } from 'react';
import CloseIcon from '@/assets/icons/close.svg?react';
import { Drawer } from '@base-ui/react/drawer';
import { cn } from '@/lib/cn';
import { OVERLAY_FADE, OVERLAY_TRANSITION_TRAVEL } from '@/lib/ui/overlayMotion';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { TitlePresenceContext } from './context/titlePresence';
import { useTitlePresence } from './hooks/useTitlePresence';

/**
 * Base UI's `data-base-ui-swipe-ignore`: a touch starting inside never begins a swipe. On iOS a light tap
 * rolls the finger a few pixels, and a body that is also a swipe surface reads it as a drag and drops the
 * click. Exported for a sheet whose body is not `BottomSheet.Content`.
 */
const SWIPE_IGNORE_PROPS = { 'data-base-ui-swipe-ignore': '' } as const;

/* `z-[1300]`: the kit's modal tier; popups (`Tooltip`, menus) sit one above. */
const BACKDROP_CLASSES = `fixed inset-[0px] z-[1300] overlay-backdrop ${OVERLAY_TRANSITION_TRAVEL} ${OVERLAY_FADE}`;

/* No `pointer-events-none`: it breaks outside-press dismissal. */
const VIEWPORT_CLASSES = 'fixed inset-[0px] z-[1300] flex items-end justify-center';

/*
 * `max-w-[27.5rem]` is invented (no desktop frame). `dvh`, never `vh`: mobile URL bars. No `gap-*`: each
 * region owns its top margin (4/24/32px). `[transform:…]`, not `translate-y-full`: Tailwind v4 emits the
 * standalone `translate` property, which the transition does not cover.
 */
const POPUP_CLASSES = `
    relative w-full max-w-[27.5rem] max-h-[85dvh] flex flex-col items-start overflow-hidden
    bg-surface-ground rounded-t-l pt-4xl font-sans
    [transform:translateY(var(--drawer-swipe-movement-y,0px))] data-swiping:select-none
    ${OVERLAY_TRANSITION_TRAVEL}
    data-[starting-style]:[transform:translateY(100%)] data-[ending-style]:[transform:translateY(100%)]
    motion-reduce:transition-none
`;

/* `w-full`: under `items-start` a shrink-wrapped child centres text within itself. */
const TITLE_CLASSES = 'w-full px-3xl text-heading-s text-text-general-strong text-center';
const DESCRIPTOR_CLASSES = 'mt-xs w-full px-3xl text-body-s text-text-general-medium text-center';

/* `grid`: popup height is indefinite, so `ScrollArea`'s `height: 100%` only resolves on a stretched grid item. */
const CONTENT_CLASSES = 'mt-3xl grid w-full flex-1 min-h-px';

/* Thumb 4px clear of the sheet's edge. */
const SCROLLBAR_INSET_CLASSES = 'mr-xs';

/* Cancels an adjacent home indicator's top margin. */
const FOOTER_CLASSES = 'mt-4xl w-full [&+[data-home-indicator]]:mt-none';

/* `*:flex-1`: a lone button fills the row. */
const FOOTER_ROW_CLASSES = 'flex w-full items-center gap-l px-l *:flex-1';

/* iOS home indicator, drawn in every frame; `min-h-` so `env(safe-area-inset-bottom)` adds rather than eats. */
const HOME_INDICATOR_CLASSES = `
    mt-4xl flex w-full min-h-home-indicator items-end justify-center
    pb-[calc(var(--spacing-m)+env(safe-area-inset-bottom))]
`;

/* `md:hidden` on the pill only: the block is the sheet's only bottom padding. */
const HOME_INDICATOR_PILL_CLASSES =
    'h-home-indicator-pill-height w-home-indicator-pill-width rounded-full bg-text-general-strong md:hidden';

/* Swipe affordance in `Popup`'s `pt-4xl`; sizes off-scale. */
const HANDLE_CLASSES = `
    pointer-events-none absolute top-m left-1/2 -translate-x-1/2
    h-[0.25rem] w-[2.25rem] rounded-full bg-border-control-hover
`;

/*
 * Figma draws a bare 20px glyph inset 12px; `IconButton size="sm"` gives a 40px target (WCAG 2.5.8), so the
 * inset is computed from the glyph. `focus-visible:ring-1` restores the ring `inset-ring-0` zeroes (WCAG 2.4.7).
 */
const CLOSE_CLASSES = `
    absolute inset-ring-0 bg-transparent focus-visible:ring-1
    top-[calc(var(--spacing-l)-(var(--spacing-5xl)-var(--spacing-2xl))/2)]
    right-[calc(var(--spacing-l)-(var(--spacing-5xl)-var(--spacing-2xl))/2)]
`;

/** Base UI's `modal`, `snapPoint*`, `defaultOpen` are not exposed. */
function BottomSheetRoot({ open, onOpenChange, onOpenChangeComplete, children }: BottomSheetRootProps) {
    return (
        <Drawer.Root open={open} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
            {children}
        </Drawer.Root>
    );
}

/* Dev-only: Base UI wires `aria-labelledby` only if `Title` renders. Renders last, so it sees the title. */
function TitleGuard() {
    const title = use(TitlePresenceContext);

    useEffect(
        function guardUnnamedSheet() {
            if (!import.meta.env.DEV || !title || title.present()) {
                return;
            }
            // eslint-disable-next-line no-console -- dev-only guard
            console.error(
                'BottomSheet.Popup: no <BottomSheet.Title> was rendered. The sheet has no accessible ' +
                    'name — a screen reader announces it as an unnamed dialog. Add a Title.'
            );
        },
        [title]
    );

    return null;
}

/** Also renders portal, backdrop and viewport. Must contain a `BottomSheet.Title`. */
function BottomSheetPopup({ children, className }: BottomSheetPopupProps) {
    const titleMountedRef = useRef(false);
    const title: TitlePresence = {
        setPresent(present) {
            titleMountedRef.current = present;
        },
        present() {
            return titleMountedRef.current;
        },
    };

    return (
        <Drawer.Portal>
            {/* `forceRender`: Base UI skips a nested surface's backdrop. */}
            <Drawer.Backdrop forceRender className={BACKDROP_CLASSES} />
            {/* `Viewport` is required: without it Base UI disables swipe and touch scroll locking. */}
            <Drawer.Viewport className={VIEWPORT_CLASSES}>
                <Drawer.Popup className={cn`${POPUP_CLASSES} ${className}`}>
                    <span aria-hidden className={HANDLE_CLASSES} />
                    <TitlePresenceContext value={title}>
                        {children}
                        <TitleGuard />
                    </TitlePresenceContext>
                    {/* Last child so it sits under a `Footer`. */}
                    <div className={HOME_INDICATOR_CLASSES} data-home-indicator aria-hidden="true">
                        <div className={HOME_INDICATOR_PILL_CLASSES} />
                    </div>
                </Drawer.Popup>
            </Drawer.Viewport>
        </Drawer.Portal>
    );
}

/** Heading and accessible name (`aria-labelledby`). */
function BottomSheetTitle({ children, className }: BottomSheetTitleProps) {
    useTitlePresence();
    return <Drawer.Title className={cn`${TITLE_CLASSES} ${className}`}>{children}</Drawer.Title>;
}

/** Accessible description (`aria-describedby`). Must not restate the title. */
function BottomSheetDescriptor({ children, className }: BottomSheetDescriptorProps) {
    return <Drawer.Description className={cn`${DESCRIPTOR_CLASSES} ${className}`}>{children}</Drawer.Description>;
}

/** Full-bleed and the only region that scrolls; title and footer stay pinned. */
function BottomSheetContent({ children, className, contentClassName }: BottomSheetContentProps) {
    return (
        <div className={cn`${CONTENT_CLASSES} ${className}`} {...SWIPE_IGNORE_PROPS}>
            {/* No `className` on `ScrollArea`: it is the stretched grid item. */}
            <ScrollArea contentClassName={contentClassName} scrollbarClassName={SCROLLBAR_INSET_CLASSES}>
                {children}
            </ScrollArea>
        </div>
    );
}

/** The button row. The home indicator is `Popup`'s, not this part's. */
function BottomSheetFooter({ children, className }: BottomSheetFooterProps) {
    return (
        <div className={cn`${FOOTER_CLASSES} ${className}`} {...SWIPE_IGNORE_PROPS}>
            <div className={FOOTER_ROW_CLASSES}>{children}</div>
        </div>
    );
}

/** Closes via `Drawer.Close`. No `onClick`: cleanup goes in `onOpenChange`, which sees every route. */
function BottomSheetCancel({ children, className }: BottomSheetCancelProps) {
    return (
        <Button variant="secondary" size="md" fullWidth className={className} render={<Drawer.Close />}>
            {children}
        </Button>
    );
}

/**
 * Never closes the sheet: close in the caller's handler on success. Dismissal still works while `loading`;
 * to lock, decline to act on `onOpenChange`.
 */
function BottomSheetAction({ variant = 'primary', ...props }: BottomSheetActionProps) {
    return <Button {...props} variant={variant} size="md" fullWidth />;
}

/** ✕ positioned against `Popup`, so source order is free. */
function BottomSheetClose({ 'aria-label': ariaLabel }: BottomSheetCloseProps) {
    return (
        <IconButton
            size="sm"
            icon={<CloseIcon />}
            aria-label={ariaLabel}
            className={CLOSE_CLASSES}
            render={<Drawer.Close />}
        />
    );
}

/**
 * Bottom sheet on Base UI `Drawer` (amber ADR-0004): swipe-to-dismiss kept, no `Handle` part, no snap points.
 * Swipe starts only above `Content`. Figma: 8370:24957.
 */
const BottomSheet = {
    Root: BottomSheetRoot,
    Popup: BottomSheetPopup,
    Title: BottomSheetTitle,
    Descriptor: BottomSheetDescriptor,
    Content: BottomSheetContent,
    Footer: BottomSheetFooter,
    Cancel: BottomSheetCancel,
    Action: BottomSheetAction,
    Close: BottomSheetClose,
};

export {
    BottomSheet,
    BottomSheetAction,
    BottomSheetCancel,
    BottomSheetClose,
    BottomSheetContent,
    BottomSheetDescriptor,
    BottomSheetFooter,
    BottomSheetPopup,
    BottomSheetRoot,
    BottomSheetTitle,
    SWIPE_IGNORE_PROPS,
};
