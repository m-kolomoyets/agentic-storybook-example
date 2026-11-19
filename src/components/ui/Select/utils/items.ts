import type { SelectOption } from '@/components/ui/OptionList/types';

/* Module scope for stable references; shared by `SelectSheet` and `AccountSwitcher`. */
export function itemToLabel<TValue extends string | number>(item: SelectOption<TValue>) {
    return item.label;
}

/* `String(...)`: Base UI's `itemToStringValue` wants a string for the hidden form input. */
export function itemToValue<TValue extends string | number>(item: SelectOption<TValue>) {
    return String(item.value);
}

/* `filteredItems` may be a different array of equal objects; `Object.is` would select nothing. */
export function isSameItem<TValue extends string | number>(item: SelectOption<TValue>, value: SelectOption<TValue>) {
    return item.value === value.value;
}
