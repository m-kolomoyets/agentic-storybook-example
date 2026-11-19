import type { ReactNode } from 'react';
import type { TabsListProps, TabsPanelProps, TabsRootProps, TabsSize, TabsTabProps, TabValue } from './types';
import { use, useEffect, useId, useState } from 'react';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { cn } from '@/lib/cn';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Tooltip } from '@/components/ui/Tooltip';
import { REASON_HOLD_MS, TAB_DISABLED_REASONS } from './constants';
import { refuse } from './utils/refuse';
import { tabVariants } from './utils/variants';
import { TabsSizeContext } from './context/TabsSizeContext';

/*
 * The track (Figma `Segmented Control` wrapper 8711:12111) is itself the horizontal `ScrollArea`;
 * `max-w-full` is what makes it overflow. The scrollbar paints over the track padding, so height is stable.
 */
const LIST_TRACK_CLASSES = 'inline-block max-w-full align-middle rounded-s bg-surface-control p-xs';

/* `w-max` is load-bearing: a shrink-to-fit row would compress tabs instead of overflowing. */
const LIST_ROW_CLASSES = 'flex w-max items-center gap-none';

/* `fill` (Figma `Chart Overlay`): equal columns. A grid, since a max-content flex row has no space to grow. */
const LIST_FILL_TRACK_CLASSES = 'w-full';
const LIST_FILL_ROW_CLASSES = 'grid w-full grid-flow-col auto-cols-fr items-center gap-none';

/**
 * The drawn tab cell's classes for a control that is not a tab (N-of-N `aria-pressed` series toggles —
 * a tablist with every tab selected fails WCAG 4.1.2). The consumer sets `data-active`/`data-disabled`.
 */
function tabCellClassName(size: TabsSize): string {
    return tabVariants({ size });
}

/** Groups a `List` with its `Panel`s and owns the selected value. Always horizontal. */
function TabsRoot({ value, defaultValue, onValueChange, children, className }: TabsRootProps) {
    return (
        <BaseTabs.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} className={className}>
            {children}
        </BaseTabs.Root>
    );
}

/** The track. Owns `size` for every `Tab` and scrolls its own overflow; don't wrap it in another scroller. */
function TabsList({ size = 'lg', fill = false, activateOnFocus = false, children, className }: TabsListProps) {
    return (
        <TabsSizeContext value={size}>
            {/* `horizontal`, not `both`: the row never wraps, and `both` would mount the corner. */}
            <ScrollArea
                orientation="horizontal"
                className={cn`${LIST_TRACK_CLASSES} ${fill ? LIST_FILL_TRACK_CLASSES : ''} ${className}`}
            >
                <BaseTabs.List
                    activateOnFocus={activateOnFocus}
                    className={fill ? LIST_FILL_ROW_CLASSES : LIST_ROW_CLASSES}
                >
                    {children}
                </BaseTabs.List>
            </ScrollArea>
        </TabsSizeContext>
    );
}

type DisabledTabProps = {
    value: TabValue;
    reason: ReactNode;
    className: string;
    children: ReactNode;
};

/**
 * A disabled tab that answers a press: Base UI still refuses selection; this shakes and opens the reason
 * (the kit `Tooltip` alone opens only on hover/focus, so a tap would show nothing). The reason is also the
 * tab's `aria-describedby`, since the tooltip is never announced.
 */
function DisabledTab({ value, reason, className, children }: DisabledTabProps) {
    const reasonId = useId();
    const [open, setOpen] = useState(false);
    const [presses, setPresses] = useState(0);

    /* Each press restarts the hold, so the reason stays open for the last one. */
    useEffect(
        function closeAfterHold() {
            if (presses === 0) {
                return undefined;
            }
            const timer = setTimeout(() => {
                setOpen(false);
            }, REASON_HOLD_MS);
            return () => {
                clearTimeout(timer);
            };
        },
        [presses]
    );

    function answerPress(element: HTMLElement) {
        refuse(element);
        setOpen(true);
        setPresses((count) => {
            return count + 1;
        });
    }

    /* Native listeners: Base UI's disabled tab filters `onClick`/`onKeyDown` props, but the DOM events still fire. */
    function listenForPresses(tab: HTMLElement | null) {
        if (tab === null) {
            return undefined;
        }
        function handleClick() {
            answerPress(tab!);
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Enter' || event.key === ' ') {
                answerPress(tab!);
            }
        }
        tab.addEventListener('click', handleClick);
        tab.addEventListener('keydown', handleKeyDown);
        return () => {
            tab.removeEventListener('click', handleClick);
            tab.removeEventListener('keydown', handleKeyDown);
        };
    }

    return (
        <>
            <Tooltip.Root open={open} onOpenChange={setOpen}>
                <Tooltip.Trigger
                    render={
                        <BaseTabs.Tab
                            value={value}
                            disabled
                            className={className}
                            ref={listenForPresses}
                            aria-describedby={reasonId}
                        />
                    }
                >
                    {children}
                </Tooltip.Trigger>
                <Tooltip.Content side="top">
                    <Tooltip.Descriptor>{reason}</Tooltip.Descriptor>
                </Tooltip.Content>
            </Tooltip.Root>
            {/* The description's text; `hidden` keeps it out of layout and the a11y tree. */}
            <span id={reasonId} hidden>
                {reason}
            </span>
        </>
    );
}

/** One tab. Geometry comes from the `size` its `List` published. */
function TabsTab({ value, disabled, disabledReason, children, className }: TabsTabProps) {
    const size = use(TabsSizeContext);
    const tabClassName = cn`${tabVariants({ size })} ${className}`;

    if (disabled) {
        return (
            <DisabledTab
                value={value}
                reason={disabledReason ?? TAB_DISABLED_REASONS.unavailable}
                className={tabClassName}
            >
                {children}
            </DisabledTab>
        );
    }

    return (
        <BaseTabs.Tab value={value} className={tabClassName}>
            {children}
        </BaseTabs.Tab>
    );
}

/** The region a tab reveals. Optional: chart consumers re-render in place (their `aria-controls` dangle; accepted). */
function TabsPanel({ value, children, className }: TabsPanelProps) {
    return (
        <BaseTabs.Panel value={value} className={className}>
            {children}
        </BaseTabs.Panel>
    );
}

/**
 * A row of tabs, with or without panels. Selection is drawn on the tab (no indicator). Figma: 8711:12035.
 */
const Tabs = { Root: TabsRoot, List: TabsList, Tab: TabsTab, Panel: TabsPanel };

export { TAB_DISABLED_REASONS, tabCellClassName, Tabs, TabsList, TabsPanel, TabsRoot, TabsTab };
