import type { ScrollAreaOrientation, ScrollAreaProps } from './types';
import { ScrollArea as BaseScrollArea } from '@base-ui/react/scroll-area';
import { cn } from '@/lib/cn';

/* Figma draws no scrollbar; every class here is designed against the token set. */
const ROOT_CLASSES = 'group/scroll-area relative overflow-hidden';

/*
 * `max-h-[inherit]` is required: `size-full` is a percentage of an `auto` parent, so a `max-h-…`
 * caller otherwise gets a clipped, non-scrolling viewport.
 */
const VIEWPORT_CLASSES = 'size-full max-h-[inherit] overscroll-contain';

/*
 * Fine pointer: always shown when the axis overflows. Touch: hidden at rest, shown while scrolling,
 * then fades (the delay applies to the fade-out only).
 */
const SCROLLBAR_CLASSES = `
    touch-none select-none
    opacity-0 transition-opacity duration-300 delay-700
    data-[hovering]:opacity-100 data-[hovering]:delay-0
    data-[scrolling]:opacity-100 data-[scrolling]:delay-0
    pointer-fine:opacity-100
`;

/* A border token used as a fill (the only 30% white). Base UI sizes only the scrolling axis; the cross axis is ours. */
const THUMB_CLASSES =
    'rounded-full bg-border-control-hover data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full';

/* Driven by Base UI's `data-overflow-y-end`; painted before the scrollbars so they stay on top. */
const BOTTOM_FADE_CLASSES = `
    pointer-events-none absolute inset-x-[0px] bottom-[0px] h-3xl
    bg-linear-to-b from-transparent opacity-0 transition-opacity duration-150
    group-data-[overflow-y-end]/scroll-area:opacity-100
`;

/* `Content` hard-codes inline `min-width: fit-content`; one unbreakable row would push a vertical area wide. */
const VERTICAL_CONTENT_STYLE = { minWidth: 0 };

const OUTSET_ROOT_CLASSES: Record<ScrollAreaOrientation, string> = {
    vertical: '-mr-xs',
    horizontal: '-mb-xs',
    both: '-mr-xs -mb-xs',
};
const OUTSET_CONTENT_CLASSES: Record<ScrollAreaOrientation, string> = {
    vertical: 'pr-xs',
    horizontal: 'pb-xs',
    both: 'pr-xs pb-xs',
};

/*
 * Chrome latches a vertical wheel to an `overscroll-behavior: contain` container even when that axis
 * cannot scroll, so a horizontal area would swallow page scroll without this.
 */
const HORIZONTAL_VIEWPORT_STYLE = { overflowY: 'hidden', overscrollBehaviorY: 'auto' } as const;

/** A scrolling box with a custom scrollbar. The caller owns the height. Figma: none (no scrollbar is drawn). */
function ScrollArea({
    children,
    className,
    viewportRef,
    orientation = 'vertical',
    viewportStyle,
    scrollbarOutset = false,
    contentClassName,
    scrollbarClassName,
    bottomFadeClassName,
}: ScrollAreaProps) {
    const outsetRoot = scrollbarOutset ? OUTSET_ROOT_CLASSES[orientation] : undefined;
    const outsetContent = scrollbarOutset ? OUTSET_CONTENT_CLASSES[orientation] : undefined;
    const showVertical = orientation !== 'horizontal';
    const showHorizontal = orientation !== 'vertical';
    const contentStyle = showHorizontal ? undefined : VERTICAL_CONTENT_STYLE;
    const axisViewportStyle = orientation === 'horizontal' ? HORIZONTAL_VIEWPORT_STYLE : undefined;
    const mergedViewportStyle = viewportStyle ? { ...axisViewportStyle, ...viewportStyle } : axisViewportStyle;

    /*
     * Element form of `render`: Base UI folds the ref into its cached merged ref, so the viewport attaches
     * once (a hand-rolled merge would null `getScrollElement()` each scroll frame). `data-scroll-viewport`
     * lets content find its scroll box via `closest`.
     */
    const renderViewport = <div ref={viewportRef} data-scroll-viewport="" />;

    return (
        <BaseScrollArea.Root className={cn`${ROOT_CLASSES} ${outsetRoot} ${className}`}>
            <BaseScrollArea.Viewport className={VIEWPORT_CLASSES} style={mergedViewportStyle} render={renderViewport}>
                {/* `Content` carries the ResizeObserver; without it a list keeps its scrollbar after rows go. */}
                <BaseScrollArea.Content className={cn`${outsetContent} ${contentClassName}`} style={contentStyle}>
                    {children}
                </BaseScrollArea.Content>
            </BaseScrollArea.Viewport>
            {bottomFadeClassName ? (
                <div aria-hidden className={cn`${BOTTOM_FADE_CLASSES} ${bottomFadeClassName}`} />
            ) : null}
            {showVertical ? (
                <BaseScrollArea.Scrollbar
                    orientation="vertical"
                    className={cn`${SCROLLBAR_CLASSES} w-xs ${scrollbarClassName}`}
                >
                    <BaseScrollArea.Thumb className={THUMB_CLASSES} />
                </BaseScrollArea.Scrollbar>
            ) : null}
            {showHorizontal ? (
                <BaseScrollArea.Scrollbar
                    orientation="horizontal"
                    className={cn`${SCROLLBAR_CLASSES} h-xs ${scrollbarClassName}`}
                >
                    <BaseScrollArea.Thumb className={THUMB_CLASSES} />
                </BaseScrollArea.Scrollbar>
            ) : null}
            {orientation === 'both' ? <BaseScrollArea.Corner /> : null}
        </BaseScrollArea.Root>
    );
}

export { ScrollArea };
