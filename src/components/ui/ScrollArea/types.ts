import type { CSSProperties, ReactNode, Ref } from 'react';

export type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both';

export type ScrollAreaProps = {
    children: ReactNode;
    /** Merged onto the root, not the viewport. Sizing is the caller's. */
    className?: string;
    /** Receives the scrolling element (Base UI's `Viewport`), for `useVirtualizer({ getScrollElement })`. */
    viewportRef?: Ref<HTMLDivElement>;
    /** @default 'vertical' */
    orientation?: ScrollAreaOrientation;
    /**
     * Inline styles on the scrolling element. Base UI sets `overflow: scroll` inline, so this is the only
     * way to override it. Merges over the `horizontal` axis release.
     */
    viewportStyle?: CSSProperties;
    /**
     * Pushes each scrollbar 4px clear of the content into the parent's padding (which needs ≥ 4px on that
     * side), so the thumb does not sit on the rows.
     */
    scrollbarOutset?: boolean;
    /** Merged onto the scrolled content box — e.g. padding a full-bleed area back to its gutter. */
    contentClassName?: string;
    /**
     * Merged onto every scrollbar. Base UI pins it inline at the edge, so move it with margin
     * (`mr-m`), not `right-*`.
     */
    scrollbarClassName?: string;
    /**
     * Fades the bottom 24px while more content is below. The value is the ground the rows fade into
     * (`to-*`). Omitted → no fade.
     */
    bottomFadeClassName?: string;
};
