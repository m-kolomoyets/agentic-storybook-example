import type { SelectOption } from '@/components/ui/OptionList/types';

type AccountSwitcherBaseProps = {
    /** The current account's name. Truncates to one line. */
    name: string;
    /** The line under the name, e.g. `12 Bins · 4 Barges`. */
    caption?: string;
    className?: string;
};

export type AccountSwitcherSingleProps = AccountSwitcherBaseProps & {
    /** The drawn `Single` cell: a static card, no chevron, no popup. */
    single: true;
};

export type AccountSwitcherMultiProps = AccountSwitcherBaseProps & {
    single?: false;
    /** The rows to show, already filtered by the caller against `searchValue`. */
    options: SelectOption[];
    /** The current account's `value`: its row carries the check. Pairs with `name`. */
    value: string | null;
    /** Called with a picked account's `value`. Re-picking the current account is not reported. */
    onValueChange?: (value: string) => void;
    /** The search field's text. Controlled: the caller filters `options` from it. */
    searchValue: string;
    /** Called as the operator types or clears, and with `''` when the popup closes over a query. */
    onSearchChange: (query: string) => void;
    /** Spinner over the list while a search is in flight. */
    loading?: boolean;
    /** @default false */
    disabled?: boolean;
    /** @default 'Search' */
    searchPlaceholder?: string;
};

export type AccountSwitcherProps = AccountSwitcherSingleProps | AccountSwitcherMultiProps;

export type AccountCardBodyProps = {
    name: string;
    caption?: string;
    nameId?: string;
    captionId?: string;
};
