import type { SelectOption } from '../types';

export type VirtualRow<TValue extends string | number> =
    { kind: 'header'; label: string } | { kind: 'option'; item: SelectOption<TValue>; itemIndex: number };

/* Row pitch = row + 2px gap (virtual rows are absolute, so no `gap`). Mirrors `--size-option-row(-two-line)`. */
const ROW_GAP = 2;
const ONE_LINE_ROW_SIZE = 48 + ROW_GAP;
const TWO_LINE_ROW_SIZE = 50 + ROW_GAP;
/* `radio` (mobile sheet) one-line rows are 36px and abut, per Figma. */
const RADIO_ONE_LINE_ROW_SIZE = 36;
/* Header: 8px top inset + 24px line + gap; the first has no previous row to clear. */
const GROUP_HEADER_LINE = 24;
export const GROUP_HEADER_SIZE = 8 + GROUP_HEADER_LINE + ROW_GAP;
export const FIRST_GROUP_HEADER_SIZE = GROUP_HEADER_LINE + ROW_GAP;

export function getOptionRowSize(isTwoLine: boolean, isRadio: boolean) {
    if (isTwoLine) {
        return TWO_LINE_ROW_SIZE;
    }
    return isRadio ? RADIO_ONE_LINE_ROW_SIZE : ONE_LINE_ROW_SIZE;
}

/** Interleaves a header row wherever `group` changes. Flat lists get option rows only. */
export function buildVirtualRows<TValue extends string | number>(items: SelectOption<TValue>[]): VirtualRow<TValue>[] {
    const hasGroups = items.some((item) => {
        return item.group !== undefined;
    });
    if (!hasGroups) {
        return items.map((item, itemIndex) => {
            return { kind: 'option', item, itemIndex };
        });
    }

    const rows: VirtualRow<TValue>[] = [];
    let previousGroup: string | undefined;
    items.forEach((item, itemIndex) => {
        const group = item.group ?? '';
        if (group !== previousGroup) {
            if (group !== '') {
                rows.push({ kind: 'header', label: group });
            }
            previousGroup = group;
        }
        rows.push({ kind: 'option', item, itemIndex });
    });
    return rows;
}
