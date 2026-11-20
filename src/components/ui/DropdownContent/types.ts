import type { ComponentPropsWithRef, ReactNode, Ref } from 'react';
import type { OptionListHandle, SelectOption } from '@/components/ui/OptionList/types';

export type DropdownContentProps<TValue extends string | number = string> = Omit<
    ComponentPropsWithRef<'div'>,
    'children'
> & {
    /**
     * Renders `Combobox.Input` at the top. `false` renders no input at all (no hidden combobox); without it
     * Base UI has no typeahead, so only right for short lists.
     * @default true
     */
    searchable?: boolean;
    searchPlaceholder?: string;
    /** Shown when the filter matches nothing; the announcing element stays mounted either way. @default 'No results' */
    emptyMessage?: ReactNode;
    /** Passed to `OptionList`; fills the row's text, never the row. */
    renderItem?: (item: SelectOption<TValue>, index: number) => ReactNode;
    /** Merged onto `OptionList`'s `className` — overrides its row-height cap. */
    optionListClassName?: string;
    /** Merged onto the search field's wrapper (`px-xs pt-xs pb-xl`). */
    searchClassName?: string;
    /** Forwarded to `OptionList`. */
    indicator?: 'check' | 'radio';
    /** Accessible name for the search clear button. @default 'Clear search' */
    clearLabel?: string;
    /** The listbox's fallback name (`aria-label`); a surrounding `Field.Label` takes precedence. */
    listLabel?: string;
    /** Handed to `OptionList`'s `ref` (the host needs its `scrollToIndex`), not the panel's. */
    listRef?: Ref<OptionListHandle>;
    /**
     * Spinner over the list during an async search. Rows stay visible but inert (no resize per keystroke);
     * the search field stays live.
     * @default false
     */
    loading?: boolean;
    /** The spinner's accessible name. @default 'Loading results' */
    loadingLabel?: string;
    className?: string;
    /** No composition slot: `items` come from `Combobox.Root`. */
    children?: never;
};

export type PopupSearchProps = {
    placeholder?: string;
    clearLabel: string;
    className?: string;
};
