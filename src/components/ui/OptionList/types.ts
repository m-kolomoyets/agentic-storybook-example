import type { ReactNode, Ref } from 'react';
import type { OptionIndicator } from '@/components/ui/Option/types';

/** Row data. `TValue` serves as React key and Base UI item value directly. */
export type SelectOption<TValue extends string | number = string> = {
    value: TValue;
    label: string;
    /** What the closed trigger shows when `label` is too wide for it. Search still matches `label`. */
    triggerLabel?: string;
    /**
     * Section header drawn above this row when it differs from the previous item's `group`. Omitted on
     * flat lists. The same `value` may appear under several groups.
     */
    group?: string;
    /** Drives the two-line layout, for this row and the whole list's sizing. */
    subtitle?: string;
    startAddon?: ReactNode;
    endAddon?: ReactNode;
    disabled?: boolean;
    /** Merged onto this row's `Option`. */
    className?: string;
};

/** Exposed via `ref` for `Select`'s `onItemHighlighted` (the filtered items only resolve inside `Root`). */
export type OptionListHandle = {
    /** Scrolls a filtered-array index into view (`align: 'auto'`). */
    scrollToIndex: (index: number) => void;
};

export type OptionListProps<TValue extends string | number = string> = {
    /**
     * Replaces the row's text only; the row stays `Option` so highlight, disabled and checkmark survive.
     * Must fit one line (two with subtitles).
     * @default the item's label (+ subtitle)
     */
    renderItem?: (item: SelectOption<TValue>, index: number) => ReactNode;
    /** Merged onto the `ScrollArea`, which carries the max-height. */
    className?: string;
    /** Forwarded to every row's `Option`. */
    indicator?: OptionIndicator;
    ref?: Ref<OptionListHandle>;
    /** Names the `listbox`; fallback when no label is referenced. */
    'aria-label'?: string;
    /** Names the `listbox`. @default the surrounding `Field.Label`'s id, if any */
    'aria-labelledby'?: string;
    /** Rows come from `Combobox.useFilteredItems()`; children would be unvirtualizable. */
    children?: never;
};
