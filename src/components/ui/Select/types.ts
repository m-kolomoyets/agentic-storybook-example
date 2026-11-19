import type { ReactNode } from 'react';
import type { SelectOption } from '@/components/ui/OptionList/types';

export type SelectProps<TValue extends string | number = string> = {
    /** The full option list: what is filtered, what `Combobox.Empty` counts, where the trigger label is looked up. */
    items: SelectOption<TValue>[];
    /** Controlled value. `null` is "nothing selected"; `undefined` means uncontrolled. */
    value?: NoInfer<TValue> | null;
    /** The initially selected option's `value`, for the uncontrolled form. */
    defaultValue?: NoInfer<TValue> | null;
    onValueChange?: (value: NoInfer<TValue> | null) => void;
    /**
     * Where focus lands after a pick closes the desktop popup (e.g. the next field), instead of the trigger.
     * `null` keeps the default. Escape / outside click still return to the trigger; the mobile sheet always does.
     */
    focusAfterSelect?: () => HTMLElement | null;
    /** Shown on the trigger while nothing is selected, in `Input`'s placeholder colour. */
    placeholder?: string;
    /** Mobile sheet heading. Defaults to `placeholder`, then `'Select an option'`. */
    sheetTitle?: string;
    /** Optional subtitle under the mobile sheet title (`BottomSheet.Descriptor`). */
    sheetDescription?: string;
    /**
     * Renders the popup's search field. `false` renders no input at all, so the control is arrow-keys-only
     * with no typeahead (ADR-0003); only for genuinely short lists.
     * @default true
     */
    searchable?: boolean;
    searchPlaceholder?: string;
    /** Rendered when the filter matches nothing. @default 'No results' */
    emptyMessage?: ReactNode;
    /** Called when the query settles (after `searchDebounce`). An observer unless `filteredItems` is also passed. */
    onSearchChange?: (query: string) => void;
    /**
     * Milliseconds of no typing before the query reaches the list and `onSearchChange`. `0` filters on the keystroke.
     * @default 250
     */
    searchDebounce?: number;
    /** Rows already filtered by the caller. Switches Base UI's own filter off (`filter={null}`). */
    filteredItems?: SelectOption<NoInfer<TValue>>[];
    /**
     * Spinner over the popup while an async search is in flight. Rows stay visible but inert; the search
     * field and `Escape` stay live.
     * @default false
     */
    loading?: boolean;
    /** Announced while `loading`; the spinner's accessible name. @default 'Loading results' */
    loadingLabel?: string;
    /** Replaces a row's text, never the row; the `Option` chrome stays this component's. */
    renderItem?: (item: SelectOption<NoInfer<TValue>>, index: number) => ReactNode;
    /** Marks the trigger invalid (standalone). Inside a `Field.Root` use its `invalid`; the Field wins. */
    error?: boolean;
    disabled?: boolean;
    name?: string;
    id?: string;
    /** Merged onto the trigger, not the popup. */
    className?: string;
    /** Content is `items`; labels are `Field.Label`, never a child. */
    children?: never;
};
