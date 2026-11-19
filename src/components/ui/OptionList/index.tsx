import type { OptionListProps, SelectOption } from './types';
import { useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/cn';
import { Option } from '@/components/ui/Option';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { buildVirtualRows, FIRST_GROUP_HEADER_SIZE, getOptionRowSize, GROUP_HEADER_SIZE } from './utils/virtualRows';

/* Rows rendered either side of the window. */
const OVERSCAN = 5;

/* `items-end` keeps the label tight to the rows below; the top inset separates it from the previous option. */
const GROUP_HEADER_CLASSES = `
    absolute top-none left-none flex w-full items-end px-l pt-m
    text-body-m text-text-general-medium
`;

/*
 * Max-height, never height: n drawn rows (standard 5, Big 6) + gaps, clamped to `--available-height`.
 * The `100vh` fallback is required: outside a positioner the var is undefined and invalidates `min()`.
 */
const ONE_LINE_MAX_HEIGHT =
    'max-h-[min(calc(5*var(--size-option-row)+4*var(--spacing-xxs)),var(--available-height,100vh))]';
const TWO_LINE_MAX_HEIGHT =
    'max-h-[min(calc(6*var(--size-option-row-two-line)+5*var(--spacing-xxs)),var(--available-height,100vh))]';

/* Reaches the row via `Combobox.Item`'s `render`, which merges className/style and writes the `data-*` state. */
const ITEM_CLASSES = 'absolute top-none left-none w-full';
/* Radio rows inset 12px (Figma 11165:148548); `w-auto` beats Option's `w-full`, which would overflow sideways. */
const RADIO_ITEM_CLASSES = 'absolute top-none inset-x-l w-auto';

/**
 * Virtualized dropdown rows. Must sit inside a `Combobox.Root` with `virtualized` and `items`; scroll the
 * highlight into view via `ref.scrollToIndex` on `'keyboard'` highlights only. Figma: 8915:27188, 8750:15849.
 */
function OptionList<TValue extends string | number = string>({
    renderItem,
    className,
    indicator,
    ref,
}: OptionListProps<TValue>) {
    /* `useVirtualizer` returns functions off a mutable instance the compiler cannot memoize safely. */
    'use no memo';

    /* Not a prop: the only array that agrees with Base UI's highlight after filtering. */
    const items = Combobox.useFilteredItems<SelectOption<TValue>>();
    const scrollRef = useRef<HTMLDivElement>(null);

    /* Manual memoization: this component is opted out of the compiler (see above). */
    const rows = useMemo(() => {
        return buildVirtualRows(items);
    }, [items]);
    /* Layout is chosen once per list; nothing mixes one- and two-line rows. */
    const isTwoLine = items.some((item) => {
        return item.subtitle !== undefined;
    });
    const optionRowSize = getOptionRowSize(isTwoLine, indicator === 'radio');
    const itemClassName = indicator === 'radio' ? RADIO_ITEM_CLASSES : ITEM_CLASSES;

    const getScrollElement = useCallback(() => {
        return scrollRef.current;
    }, []);
    const estimateSize = useCallback(
        (index: number) => {
            if (rows[index]?.kind !== 'header') {
                return optionRowSize;
            }
            return index === 0 ? FIRST_GROUP_HEADER_SIZE : GROUP_HEADER_SIZE;
        },
        [rows, optionRowSize]
    );

    // eslint-disable-next-line react-hooks/incompatible-library -- component opted out via 'use no memo'
    const virtualizer = useVirtualizer({ count: rows.length, getScrollElement, estimateSize, overscan: OVERSCAN });

    useImperativeHandle(
        ref,
        function exposeHandle() {
            return {
                scrollToIndex(itemIndex: number) {
                    const rowIndex = rows.findIndex((row) => {
                        return row.kind === 'option' && row.itemIndex === itemIndex;
                    });
                    if (rowIndex >= 0) {
                        virtualizer.scrollToIndex(rowIndex);
                    }
                },
            };
        },
        [virtualizer, rows]
    );

    return (
        <ScrollArea
            className={cn`${isTwoLine ? TWO_LINE_MAX_HEIGHT : ONE_LINE_MAX_HEIGHT} ${className}`}
            viewportRef={scrollRef}
        >
            {/* `List` must parent the items: it is the `listbox` and owns the highlight handlers. */}
            <Combobox.List className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map((virtualItem) => {
                    const row = rows[virtualItem.index];
                    if (!row) {
                        return null;
                    }
                    const rowStyle = { transform: `translateY(${virtualItem.start}px)` };

                    if (row.kind === 'header') {
                        return (
                            <div
                                key={`group:${row.label}:${virtualItem.index}`}
                                role="presentation"
                                className={cn`${GROUP_HEADER_CLASSES} ${virtualItem.index === 0 ? 'pt-none' : ''}`}
                                style={rowStyle}
                            >
                                {row.label}
                            </div>
                        );
                    }

                    const { item, itemIndex } = row;
                    return (
                        <Combobox.Item
                            // Grouped lists may repeat a value; the index keeps keys unique.
                            key={`${item.group ?? ''}:${String(item.value)}:${itemIndex}`}
                            // External virtualization: position must be given, not read from the DOM.
                            index={itemIndex}
                            value={item}
                            disabled={item.disabled}
                            // Without these a 400-item list announces "1 of 12" (the window).
                            aria-setsize={items.length}
                            aria-posinset={itemIndex + 1}
                            className={itemClassName}
                            style={rowStyle}
                            render={
                                <Option
                                    label={item.label}
                                    subtitle={item.subtitle}
                                    startAddon={item.startAddon}
                                    endAddon={item.endAddon}
                                    labelContent={renderItem?.(item, itemIndex)}
                                    indicator={indicator}
                                    className={item.className}
                                />
                            }
                        />
                    );
                })}
            </Combobox.List>
        </ScrollArea>
    );
}

export { OptionList };
