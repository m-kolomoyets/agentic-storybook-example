import type { useRender } from '@base-ui/react/use-render';
import type { ReactNode } from 'react';

/* Two exclusive destination spellings: a plain `href`, or a router element. */
type FooterTileDestination = { to: string; render?: never } | { to?: never; render: useRender.RenderProp };

export type FooterTileProps = FooterTileDestination & {
    /** The word under the glyph, and the tile's accessible name. */
    label: string;
    /** The 16px glyph. Takes the tile's ink through `currentColor`. */
    icon?: ReactNode;
    /** The current page: pressed fill and `aria-current="page"`. @default false */
    selected?: boolean;
    /** Greys the tile and drops its destination: renders as a `<span>`. @default false */
    disabled?: boolean;
    /** Unread count. `0`/omitted draws no badge; above 99 reads `99+`. The real count joins the name. */
    indicator?: number;
    className?: string;
};
