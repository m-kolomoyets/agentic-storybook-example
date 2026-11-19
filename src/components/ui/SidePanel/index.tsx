import type { TitlePresence } from './context/titlePresence';
import type {
    SidePanelContentProps,
    SidePanelDescriptorProps,
    SidePanelFooterProps,
    SidePanelPopupProps,
    SidePanelRootProps,
    SidePanelTitleProps,
} from './types';
import { use, useEffect, useRef } from 'react';
import CloseIcon from '@/assets/icons/close.svg?react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cn } from '@/lib/cn';
import { OVERLAY_FADE, OVERLAY_TRANSITION_TRAVEL } from '@/lib/ui/overlayMotion';
import { IconButton } from '@/components/ui/IconButton';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { TitlePresenceContext } from './context/titlePresence';
import { useTitlePresence } from './hooks/useTitlePresence';

/* `z-[1300]`: the kit's modal tier. Fades on the travel timing so wash and panel arrive together. */
const BACKDROP_CLASSES = `fixed inset-[0px] z-[1300] overlay-backdrop ${OVERLAY_TRANSITION_TRAVEL} ${OVERLAY_FADE}`;

/* `justify-end`: trailing edge (left in RTL). The drawn 16px gutter lives here so `h-full` resolves against it. */
const VIEWPORT_CLASSES = 'fixed inset-[0px] z-[1300] flex justify-end p-xl';

/*
 * `w-[28.1875rem]` is the drawn 451px; `max-w-full` is invented (below `md:` callers show a `BottomSheet`).
 * `rounded-l` is Figma's 16px. `[transform:…]`, not `translate-x-full`: Tailwind v4's standalone `translate`
 * is not covered by the transition. Browsers flip `translateX` percentages in RTL.
 */
const POPUP_CLASSES = `
    relative h-full w-[28.1875rem] max-w-full flex flex-col overflow-hidden font-sans
    bg-surface-ground rounded-l border border-border-primary p-3xl
    ${OVERLAY_TRANSITION_TRAVEL} ${OVERLAY_FADE}
    data-[starting-style]:[transform:translateX(100%)] data-[ending-style]:[transform:translateX(100%)]
    motion-reduce:transition-none
`;

/* Only flex child: `flex-1 min-h-px` so the panel shrinks instead of pushing the footer off-screen. */
const BODY_CLASSES = 'flex w-full min-h-px flex-1 flex-col';

/*
 * On the title row at the drawn 24px inset (logical `end-` for RTL). `IconButton size="sm"` wraps the bare
 * 20px glyph in a 40px box; `-me-m -mt-m` puts the glyph, not the box, on the inset. Ring restored (WCAG 2.4.7).
 */
const CLOSE_CLASSES = 'absolute top-3xl end-3xl -me-m -mt-m inset-ring-0 bg-transparent focus-visible:ring-1';

/* Left-aligned, unlike `Dialog`. `pe-4xl` keeps a long title clear of the ✕. */
const TITLE_CLASSES = 'w-full pe-4xl text-heading-m text-text-general-strong text-left';
const DESCRIPTOR_CLASSES = 'mt-xs w-full text-body-s text-text-general-medium';

/*
 * `-mx-3xl` full-bleeds the region so row hover runs edge to edge. `grid`: `ScrollArea`'s `height: 100%`
 * needs a definite height, which flex slack is not.
 */
const CONTENT_CLASSES = 'mt-xl -mx-3xl grid w-auto flex-1 min-h-px';

/* `gap-s` is the drawn 6px. `*:flex-1`: a lone button fills the row. */
const FOOTER_CLASSES = 'mt-3xl flex w-full items-center gap-s *:flex-1';

/**
 * Base UI's `defaultOpen`, `modal`, `handle`, `disablePointerDismissal` are not exposed; `modal={false}` would
 * un-trap focus and unlock scroll.
 */
function SidePanelRoot({ open, onOpenChange, children }: SidePanelRootProps) {
    return (
        <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
            {children}
        </BaseDialog.Root>
    );
}

/* Dev-only: Base UI wires `aria-labelledby` only if `Title` renders. Renders last, so it sees the title. */
function TitleGuard() {
    const title = use(TitlePresenceContext);

    useEffect(
        function guardUnnamedPanel() {
            if (!import.meta.env.DEV || !title || title.present()) {
                return;
            }
            // eslint-disable-next-line no-console -- dev-only guard
            console.error(
                'SidePanel.Popup: no <SidePanel.Title> was rendered. The panel has no accessible name — a ' +
                    'screen reader announces it as an unnamed dialog. Add a Title.'
            );
        },
        [title]
    );

    return null;
}

/** Also renders portal, backdrop, viewport and the ✕ (constant label). Needs a `SidePanel.Title`. */
function SidePanelPopup({ children, className }: SidePanelPopupProps) {
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
        <BaseDialog.Portal>
            {/* `forceRender`: Base UI skips a nested dialog's backdrop. */}
            <BaseDialog.Backdrop forceRender className={BACKDROP_CLASSES} />
            <BaseDialog.Viewport className={VIEWPORT_CLASSES}>
                <BaseDialog.Popup className={cn`${POPUP_CLASSES} ${className}`}>
                    <TitlePresenceContext value={title}>
                        <div className={BODY_CLASSES}>{children}</div>
                        <IconButton
                            className={CLOSE_CLASSES}
                            size="sm"
                            icon={<CloseIcon />}
                            aria-label="Close panel"
                            render={<BaseDialog.Close />}
                        />
                        <TitleGuard />
                    </TitlePresenceContext>
                </BaseDialog.Popup>
            </BaseDialog.Viewport>
        </BaseDialog.Portal>
    );
}

/** Heading and accessible name (`aria-labelledby`). Pinned outside the scrolling region. */
function SidePanelTitle({ children, className }: SidePanelTitleProps) {
    useTitlePresence();
    return <BaseDialog.Title className={cn`${TITLE_CLASSES} ${className}`}>{children}</BaseDialog.Title>;
}

/** Optional accessible description (`aria-describedby`) — the drawn panel has none, so it is not guarded. */
function SidePanelDescriptor({ children, className }: SidePanelDescriptorProps) {
    return (
        <BaseDialog.Description className={cn`${DESCRIPTOR_CLASSES} ${className}`}>{children}</BaseDialog.Description>
    );
}

/** Full-bleed and the only region that scrolls; title, descriptor and footer stay pinned. */
function SidePanelContent({ children, className }: SidePanelContentProps) {
    return (
        <div className={cn`${CONTENT_CLASSES} ${className}`}>
            {/* No `className` on `ScrollArea`: it is the stretched grid item. */}
            <ScrollArea>{children}</ScrollArea>
        </div>
    );
}

/** No `Cancel`/`Action` parts: variant placement and when to close are call-site knowledge. */
function SidePanelFooter({ children, className }: SidePanelFooterProps) {
    return <div className={cn`${FOOTER_CLASSES} ${className}`}>{children}</div>;
}

/**
 * Trailing-edge modal panel on Base UI `Dialog`. Separate tree from `BottomSheet`: callers pick one with
 * `useIsMobile`. Figma: 11555:412884 (`UI Layouts` › Customize Dashboard).
 */
const SidePanel = {
    Root: SidePanelRoot,
    Popup: SidePanelPopup,
    Title: SidePanelTitle,
    Descriptor: SidePanelDescriptor,
    Content: SidePanelContent,
    Footer: SidePanelFooter,
};

export {
    SidePanel,
    SidePanelContent,
    SidePanelDescriptor,
    SidePanelFooter,
    SidePanelPopup,
    SidePanelRoot,
    SidePanelTitle,
};
