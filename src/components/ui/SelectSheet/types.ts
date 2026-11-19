import type { Combobox } from '@base-ui/react/combobox';
import type { ReactNode, Ref } from 'react';
import type { OptionListHandle, SelectOption } from '@/components/ui/OptionList/types';

export type SelectSheetProps<TValue extends string | number = string> = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sheetTitle: string;
    sheetDescription?: string;
    items: SelectOption<TValue>[];
    /** Already filtered: `Select` computes this once and hands it to both branches. */
    filteredItems: SelectOption<TValue>[];
    value: SelectOption<TValue> | null;
    onValueChange: (value: SelectOption<TValue> | null) => void;
    onInputValueChange: (value: string) => void;
    onItemHighlighted: (item: SelectOption<TValue> | undefined, details: Combobox.Root.HighlightEventDetails) => void;
    disabled?: boolean;
    name?: string;
    id?: string;
    listRef?: Ref<OptionListHandle>;
    /** @default true */
    searchable?: boolean;
    searchPlaceholder?: string;
    /** @default 'No results' */
    emptyMessage?: ReactNode;
    /** @default false */
    loading?: boolean;
    /** @default 'Loading results' */
    loadingLabel?: string;
    renderItem?: (item: SelectOption<TValue>, index: number) => ReactNode;
};
