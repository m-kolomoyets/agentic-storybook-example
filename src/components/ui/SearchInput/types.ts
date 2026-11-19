import type { ReactNode } from 'react';
import type { InputProps } from '@/components/ui/Input/types';

type SearchBaseProps = Omit<InputProps, 'type' | 'startAddon' | 'endAddon' | 'value' | 'defaultValue'>;

export type SearchInputProps = Omit<SearchBaseProps, 'onValueChange'> & {
    /** Controlled value. Use `defaultValue` for the uncontrolled form. */
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    /** Accessible name for the clear button. @default 'Clear search' */
    clearLabel?: string;
};

export type SearchFieldProps = SearchBaseProps & {
    /** Controlled value; no uncontrolled form. */
    value?: string;
    /** Rendered in the trailing slot only for a non-empty value on an enabled field. */
    clearButton?: ReactNode;
};

export type SearchClearButtonProps = {
    /** Accessible name for the icon-only control. */
    label: string;
    onClick: () => void;
};
