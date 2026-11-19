import type { GuardedPart, PartPresence } from './context/partPresence';
import type {
    TooltipContentProps,
    TooltipDescriptorProps,
    TooltipRootProps,
    TooltipTitleProps,
    TooltipTriggerProps,
} from './types';
import { use, useEffect, useRef } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { cn } from '@/lib/cn';
import { OVERLAY_MOTION } from '@/lib/ui/overlayMotion';
import { OVERLAY_SIDE_OFFSET } from '@/lib/ui/overlayPanel';
import { PartPresenceContext } from './context/partPresence';
import { usePartPresence } from './hooks/usePartPresence';

/* One rung above the modal tier (1300) so a tooltip on a control inside a dialog/sheet paints on top. */
const POSITIONER_CLASSES = 'z-[1400]';

/*
 * The drawn 280px is a cap, not a width (a short tooltip stays short). `rounded-s` = Figma `Radius/m`
 * 8px. `bg-surface-tooltip` is Figma's unbound `#38383a`, opaque because the card floats over charts.
 */
const POPUP_CLASSES = `
    flex w-full max-w-[17.5rem] flex-col gap-xs rounded-s border border-border-control-disabled p-l
    bg-surface-tooltip font-sans
    ${OVERLAY_MOTION}
`;

/* `<span class="block">`, not `<p>`/heading: the card is never announced, so heading semantics buy nothing. */
const TITLE_CLASSES = 'block text-body-s-medium text-text-general-strong';
const DESCRIPTOR_CLASSES = 'block text-caption-m text-text-general-medium';

/* A hover-only trigger is a dead end for keyboard users (WCAG 1.4.13), so non-focusable triggers error in dev. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/* Base UI wires no `role="tooltip"`/`aria-describedby`: the trigger's own name is all a screen reader gets. */
function hasAccessibleName(element: Element) {
    return Boolean(
        element.textContent?.trim() ||
        element.getAttribute('aria-label')?.trim() ||
        element.getAttribute('aria-labelledby')
    );
}

/**
 * Owns the open state; renders nothing. `disableHoverablePopup` is deliberately not exposed (WCAG 1.4.13
 * requires the pointer can travel into the card).
 */
function TooltipRoot({ children, open, onOpenChange, disabled }: TooltipRootProps) {
    return (
        <BaseTooltip.Root open={open} onOpenChange={onOpenChange} disabled={disabled}>
            {children}
        </BaseTooltip.Root>
    );
}

/** The element the card anchors to. Base UI's 600ms hover delay stands (no drawn timing). */
function TooltipTrigger({ children, className, render }: TooltipTriggerProps) {
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(function guardTrigger() {
        const element = triggerRef.current;
        if (!import.meta.env.DEV || !element) {
            return;
        }
        if (!element.matches(FOCUSABLE)) {
            // eslint-disable-next-line no-console -- dev-only guard
            console.error(
                `Tooltip.Trigger: the rendered <${element.tagName.toLowerCase()}> cannot take focus, so the ` +
                    'tooltip can only be opened with a pointer. Render a focusable element, or add tabIndex={0} ' +
                    '(WCAG 1.4.13).'
            );
        }
        if (!hasAccessibleName(element)) {
            // eslint-disable-next-line no-console -- dev-only guard
            console.error(
                'Tooltip.Trigger: the trigger has no accessible name. A tooltip is visual only — never announced, ' +
                    'never opened on touch — so give the trigger an aria-label that says what the card says.'
            );
        }
    }, []);

    return (
        <BaseTooltip.Trigger ref={triggerRef} className={className} render={render}>
            {children}
        </BaseTooltip.Trigger>
    );
}

/* Rendered last inside the card: sibling effects flush in order, so it sees the parts that just mounted. */
function PartsGuard() {
    const parts = use(PartPresenceContext);

    useEffect(
        function guardEmptyCard() {
            if (!import.meta.env.DEV || !parts || parts.present('Title') || parts.present('Descriptor')) {
                return;
            }
            // eslint-disable-next-line no-console -- dev-only guard
            console.error(
                'Tooltip.Content: neither <Tooltip.Title> nor <Tooltip.Descriptor> was rendered — the card is an ' +
                    'empty bordered box. Render at least one of them, or drop the tooltip.'
            );
        },
        [parts]
    );

    return null;
}

/** Portal + positioner + card in one part, so a trigger inside an `overflow: hidden` box is never clipped. */
function TooltipContent({ children, side = 'top', align = 'center', className }: TooltipContentProps) {
    const mountedRef = useRef<Record<GuardedPart, boolean>>({ Title: false, Descriptor: false });
    const parts: PartPresence = {
        setPresent(part, present) {
            mountedRef.current[part] = present;
        },
        present(part) {
            return mountedRef.current[part];
        },
    };

    return (
        <BaseTooltip.Portal>
            <BaseTooltip.Positioner
                side={side}
                align={align}
                sideOffset={OVERLAY_SIDE_OFFSET}
                className={POSITIONER_CLASSES}
            >
                <BaseTooltip.Popup className={cn`${POPUP_CLASSES} ${className}`}>
                    <PartPresenceContext value={parts}>
                        {children}
                        <PartsGuard />
                    </PartPresenceContext>
                </BaseTooltip.Popup>
            </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
    );
}

/** The card's first line — `Body/Small (Medium)`, white. */
function TooltipTitle({ children, className }: TooltipTitleProps) {
    usePartPresence('Title');
    return <span className={cn`${TITLE_CLASSES} ${className}`}>{children}</span>;
}

/** The card's second line — `Caption/Medium`, white 60%. */
function TooltipDescriptor({ children, className }: TooltipDescriptorProps) {
    usePartPresence('Descriptor');
    return <span className={cn`${DESCRIPTOR_CLASSES} ${className}`}>{children}</span>;
}

/**
 * Non-modal hover/focus card; visual only, never the sole home of information. A `Content` needs a
 * `Title` and/or `Descriptor`. Figma: 11246:6661.
 */
const Tooltip = {
    Root: TooltipRoot,
    Trigger: TooltipTrigger,
    Content: TooltipContent,
    Title: TooltipTitle,
    Descriptor: TooltipDescriptor,
};

export { Tooltip, TooltipContent, TooltipDescriptor, TooltipRoot, TooltipTitle, TooltipTrigger };
