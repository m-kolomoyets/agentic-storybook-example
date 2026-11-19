/** Spreads a boolean `data-*` attribute only when on: `<div {...presence('data-selected', isSelected)} />`. */
export function presence(name: string, on: boolean) {
    return on ? { [name]: '' } : undefined;
}
