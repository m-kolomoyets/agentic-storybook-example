import type { SelectOption } from '@/components/ui/OptionList/types';

export type AccountSwitcherSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The current account's name: its row leads the list even if `options` lack it. */
    name: string;
    /** The current account's `value`. */
    value: string | null;
    options: SelectOption[];
    /** Called with a picked account's `value`; never for the current one. */
    onValueChange?: (value: string) => void;
    searchValue: string;
    onSearchChange: (query: string) => void;
    /** The empty state waits while a search is in flight. */
    loading?: boolean;
    /** @default 'Search' */
    searchPlaceholder?: string;
};
