import type { SelectOption } from '@/components/ui/OptionList/types';
import type { SelectSheetProps } from './types';
import { Combobox } from '@base-ui/react/combobox';
import { BottomSheet, SWIPE_IGNORE_PROPS } from '@/components/ui/BottomSheet';
import { DropdownContent } from '@/components/ui/DropdownContent';
import { isSameItem, itemToLabel, itemToValue } from '@/components/ui/Select/utils/items';
import { useStableMinHeight } from './hooks/useStableMinHeight';

/* Overrides `OptionList`'s 5/6-row popover cap: a full-screen sheet has room for more before its own 85dvh cap. */
const MOBILE_LIST_CLASSES = 'max-h-[65dvh]';

const MOBILE_SEARCH_CLASSES = 'px-l';

/*
 * No border/radius/fill: reads as part of the sheet. `pt-2xl` + the search's `pt-xs` = 24px title→search gap;
 * `px-none` + the search's and rows' own `px-l` put field, headers and radios 12px from the edge (Figma
 * 11165:148548) and leave the scrollbar full-bleed.
 */
const PANEL_CLASSES = 'rounded-none border-0 bg-transparent px-none pt-2xl';

/**
 * `Select`'s mobile branch: a titled `BottomSheet` around the unmodified `DropdownContent` (same search,
 * virtualized list, keyboard nav), inside its own `Combobox.Root` in `inline` mode. The trigger stays a plain
 * `<button>` in `Select`: `Combobox.Trigger`'s click-to-open needs a positioner `inline` never creates.
 * Figma: 11165:148548.
 */
function SelectSheet<TValue extends string | number = string>({
    open,
    onOpenChange,
    sheetTitle,
    sheetDescription,
    items,
    filteredItems,
    value,
    onValueChange,
    onInputValueChange,
    onItemHighlighted,
    disabled,
    name,
    id,
    listRef,
    searchable = true,
    searchPlaceholder,
    emptyMessage = 'No results',
    loading = false,
    loadingLabel = 'Loading results',
    renderItem,
}: SelectSheetProps<TValue>) {
    const { panelRef, minHeight } = useStableMinHeight(open);
    const panelStyle = minHeight === undefined ? undefined : { minHeight };

    return (
        <Combobox.Root<SelectOption<TValue>>
            inline
            open={open}
            onOpenChange={onOpenChange}
            virtualized
            items={items}
            filteredItems={filteredItems}
            filter={null}
            value={value}
            onValueChange={onValueChange}
            onInputValueChange={onInputValueChange}
            onItemHighlighted={onItemHighlighted}
            itemToStringLabel={itemToLabel}
            itemToStringValue={itemToValue}
            isItemEqualToValue={isSameItem}
            disabled={disabled}
            name={name}
            id={id}
        >
            <BottomSheet.Root open={open} onOpenChange={onOpenChange}>
                <BottomSheet.Popup>
                    <BottomSheet.Title>{sheetTitle}</BottomSheet.Title>
                    {sheetDescription ? <BottomSheet.Descriptor>{sheetDescription}</BottomSheet.Descriptor> : null}
                    <BottomSheet.Close aria-label={`Close ${sheetTitle.toLowerCase()}`} />
                    <DropdownContent<TValue>
                        {...SWIPE_IGNORE_PROPS}
                        ref={panelRef}
                        style={panelStyle}
                        className={PANEL_CLASSES}
                        searchClassName={MOBILE_SEARCH_CLASSES}
                        optionListClassName={MOBILE_LIST_CLASSES}
                        indicator="radio"
                        searchable={searchable}
                        searchPlaceholder={searchPlaceholder}
                        emptyMessage={emptyMessage}
                        loading={loading}
                        loadingLabel={loadingLabel}
                        renderItem={renderItem}
                        listRef={listRef}
                        listLabel={sheetTitle}
                    />
                </BottomSheet.Popup>
            </BottomSheet.Root>
        </Combobox.Root>
    );
}

export { SelectSheet };
