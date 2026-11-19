import type { ReactNode } from 'react';

export type DataListItem = {
    label: string;
    /** Drawn as given; the caller formats absence (`—`, `N/A`). */
    value: ReactNode;
    /** Slot after the label at the drawn 4px gap — e.g. the frame's 16px info glyph or a tooltip trigger. */
    labelAddon?: ReactNode;
};

export type DataListProps = {
    items: DataListItem[];
    /** Column names on a first, `aria-hidden` row, in `Text/primary` (Figma 12067:339626). */
    columns?: { label: ReactNode; value: ReactNode };
    className?: string;
};
