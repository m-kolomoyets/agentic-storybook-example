/*
 * Imports `@base-ui/react/combobox` on purpose: Base UI's `Select` has no virtualization, no filterable input
 * and no `Combobox.Empty`. See amber ADR-0003 (select-on-base-ui-combobox).
 */
import type { Combobox as ComboboxTypes } from '@base-ui/react/combobox';
import type { OptionListHandle, SelectOption } from '@/components/ui/OptionList/types';
import type { SelectProps } from './types';
import { useRef, useState } from 'react';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg?react';
import { Combobox } from '@base-ui/react/combobox';
import { useLabelableContext } from '@base-ui/react/internals/labelable-provider';
import { useDebouncedCallback } from '@react-hookz/web';
import { cn } from '@/lib/cn';
import {
    CONTROL_BORDER,
    CONTROL_SURFACE_FILL,
    CONTROL_SURFACE_FRAME,
    CONTROL_SURFACE_LAYOUT,
    CONTROL_SURFACE_MIN_WIDTH,
} from '@/lib/ui/controlSurface';
import { DROPDOWN_POSITIONER, OVERLAY_SIDE_OFFSET } from '@/lib/ui/overlayPanel';
import { useIsMobile } from '@/hooks/useIsMobile';
import { DropdownContent } from '@/components/ui/DropdownContent';
import { useFieldState } from '@/components/ui/Field';
import { SelectValue } from '@/components/ui/Option';
import { SelectSheet } from '@/components/ui/SelectSheet';
import { isSameItem, itemToLabel, itemToValue } from './utils/items';

/* Chosen once per list, not per selection: a trigger that anchors a popup must not resize as the user picks. */
const ONE_LINE_PADDING = 'p-l';
const TWO_LINE_PADDING = 'px-l py-m';

/*
 * `Input`'s rectangle with a `data-*` state ramp. Each rule is `not-` gated by every state that outranks it
 * (disabled → focus/open → invalid → hover): an ungated invalid rule would beat the focus border (WCAG 2.4.7).
 * `focus-visible:`, never `focus:` — a button focuses on click. The border swap is the focus indicator.
 * The named group lets the chevron read `data-popup-open`.
 */
const TRIGGER_CLASSES = `
    group/select-trigger ${CONTROL_SURFACE_LAYOUT} ${CONTROL_SURFACE_MIN_WIDTH} cursor-pointer
    ${CONTROL_SURFACE_FRAME} ${CONTROL_BORDER.default} ${CONTROL_SURFACE_FILL}
    text-left text-body-m text-text-general-strong outline-none
    not-data-disabled:not-data-popup-open:not-focus-visible:not-data-invalid:hover:border-border-control-hover
    not-data-disabled:not-data-popup-open:not-focus-visible:data-invalid:border-border-negative
    not-data-disabled:data-popup-open:border-border-focused
    not-data-disabled:focus-visible:border-border-focused
    data-disabled:border-border-control-disabled data-disabled:cursor-not-allowed
    data-disabled:[&_span]:text-text-disabled
`;

/* `Combobox.Icon` carries no state; reads the trigger's through the group. */
const CHEVRON_CLASSES = 'size-2xl shrink-0 transition-transform group-data-[popup-open]/select-trigger:rotate-180';

/* ms; below ~200 saves nothing, above ~400 feels detached. */
const DEFAULT_SEARCH_DEBOUNCE = 250;

/**
 * The kit's dropdown: trigger showing the selected option + portalled popup with optional search and a
 * virtualized list. Below `md` the popup is a `SelectSheet`. Control only: inside a `Field.Root` the label
 * needs `nativeLabel={false}` (a `<button>` is labelled). Figma: trigger 8915:27414, popup 8915:27188.
 */
function Select<TValue extends string | number = string>({
    items,
    value,
    defaultValue,
    onValueChange,
    focusAfterSelect,
    placeholder,
    sheetTitle,
    sheetDescription,
    searchable = true,
    searchPlaceholder,
    emptyMessage,
    onSearchChange,
    searchDebounce = DEFAULT_SEARCH_DEBOUNCE,
    filteredItems,
    loading,
    loadingLabel,
    renderItem,
    error = false,
    disabled,
    name,
    id,
    className,
}: SelectProps<TValue>) {
    const isDesktop = !useIsMobile();
    /* BottomSheet has no trigger part of its own, so this holds its open state. */
    const [mobileOpen, setMobileOpen] = useState(false);
    /* Mirrored: the trigger renders the selected label itself. */
    const [uncontrolledValue, setUncontrolledValue] = useState<TValue | null>(defaultValue ?? null);
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : uncontrolledValue;

    const listRef = useRef<OptionListHandle>(null);
    const lastReportedQueryRef = useRef('');
    /* Whether the popup's close came from a pick, for `focusAfterSelect`. */
    const pickedRef = useRef(false);

    /* Filtering runs here, not via Base UI's `filter` prop, so it can be debounced. */
    const { contains } = Combobox.useFilter();
    const [query, setQuery] = useState('');

    const ownFilteredItems =
        query === ''
            ? items
            : items.filter((item) => {
                  return contains(item.label, query) || (item.group !== undefined && contains(item.group, query));
              });
    /* Caller's array wins; re-filtering would drop server hits. */
    const listItems = filteredItems ?? ownFilteredItems;

    const selectedItem =
        items.find((item) => {
            return item.value === currentValue;
        }) ?? null;
    const isTwoLine = items.some((item) => {
        return item.subtitle !== undefined;
    });
    const padding = isTwoLine ? TWO_LINE_PADDING : ONE_LINE_PADDING;
    const triggerClassName = cn`${TRIGGER_CLASSES} ${padding} ${className}`;

    /* Spread as an object: a present `undefined` key would clobber a surrounding `Field`'s `data-invalid`. */
    const invalidAttribute = error ? { 'data-invalid': '' } : undefined;
    /* The mobile trigger is a plain `<button>` Base UI's field context never marks, so read the kit Field's. */
    const { invalid: fieldInvalid } = useFieldState();
    /* `Field.Label` also names the popup dialog (axe `aria-dialog-name`); Base UI names only the trigger. */
    const { labelId } = useLabelableContext();
    const mobileInvalid = error || fieldInvalid;

    /* Reported only on change: Base UI writes `''` on open/close and the label on select. */
    function applyQuery(next: string) {
        setQuery(next);
        if (next === lastReportedQueryRef.current) {
            return;
        }
        lastReportedQueryRef.current = next;
        onSearchChange?.(next);
    }
    const applyQueryDebounced = useDebouncedCallback(applyQuery, [onSearchChange], searchDebounce);

    /* `0` bypasses the hook, which would still schedule a `setTimeout(0)`. */
    function handleSearchChange(next: string) {
        if (searchDebounce === 0) {
            applyQuery(next);
            return;
        }
        applyQueryDebounced(next);
    }

    function handleValueChange(next: SelectOption<TValue> | null) {
        const nextValue = next?.value ?? null;
        pickedRef.current = nextValue !== null;
        if (!isControlled) {
            setUncontrolledValue(nextValue);
        }
        onValueChange?.(nextValue);
    }

    /* Reset on close so Base UI's own `''` is a no-op, not a reported empty search. */
    function handleOpenChange(open: boolean) {
        if (open) {
            pickedRef.current = false;
            return;
        }
        setQuery('');
        lastReportedQueryRef.current = '';
    }

    /* `true` is Base UI's default: back to the trigger. */
    function resolveFinalFocus() {
        const picked = pickedRef.current;
        pickedRef.current = false;
        if (!picked || !focusAfterSelect) {
            return true;
        }
        return focusAfterSelect() ?? true;
    }

    function handleItemHighlighted(
        _item: SelectOption<TValue> | undefined,
        details: ComboboxTypes.Root.HighlightEventDetails
    ) {
        if (details.reason !== 'keyboard') {
            return;
        }
        listRef.current?.scrollToIndex(details.index);
    }

    function handleMobileOpenChange(next: boolean) {
        setMobileOpen(next);
        handleOpenChange(next);
    }

    function handleMobileSelect(item: SelectOption<TValue> | null) {
        handleValueChange(item);
        setMobileOpen(false);
    }

    if (!isDesktop) {
        return (
            <>
                {/* aria-invalid mirrors the desktop combobox trigger so AT hears "invalid" in both branches. */}
                {/* eslint-disable-next-line jsx-a11y-x/role-supports-aria-props */}
                <button
                    data-invalid={mobileInvalid ? '' : undefined}
                    aria-invalid={mobileInvalid || undefined}
                    type="button"
                    className={triggerClassName}
                    disabled={disabled}
                    name={name}
                    id={id}
                    aria-haspopup="dialog"
                    aria-expanded={mobileOpen}
                    data-popup-open={mobileOpen ? '' : undefined}
                    onClick={() => {
                        setMobileOpen(true);
                    }}
                >
                    <SelectValue
                        label={selectedItem?.label}
                        subtitle={selectedItem?.subtitle}
                        placeholder={placeholder}
                    />
                    <ChevronDownIcon aria-hidden className={CHEVRON_CLASSES} />
                </button>
                <SelectSheet<TValue>
                    open={mobileOpen}
                    onOpenChange={handleMobileOpenChange}
                    sheetTitle={sheetTitle ?? placeholder ?? 'Select an option'}
                    sheetDescription={sheetDescription}
                    items={items}
                    filteredItems={listItems}
                    value={selectedItem}
                    onValueChange={handleMobileSelect}
                    onInputValueChange={handleSearchChange}
                    onItemHighlighted={handleItemHighlighted}
                    disabled={disabled}
                    name={name}
                    id={id}
                    listRef={listRef}
                    searchable={searchable}
                    searchPlaceholder={searchPlaceholder}
                    emptyMessage={emptyMessage}
                    loading={loading}
                    loadingLabel={loadingLabel}
                    renderItem={renderItem}
                />
            </>
        );
    }

    return (
        <Combobox.Root<SelectOption<TValue>>
            // Always virtualized: a threshold means two rendering paths.
            virtualized
            items={items}
            // Filtering is owned here; `items` stays on `Root` for `Combobox.Empty` and the trigger label.
            filteredItems={listItems}
            filter={null}
            value={selectedItem}
            onValueChange={handleValueChange}
            onInputValueChange={handleSearchChange}
            onOpenChange={handleOpenChange}
            onItemHighlighted={handleItemHighlighted}
            itemToStringLabel={itemToLabel}
            itemToStringValue={itemToValue}
            isItemEqualToValue={isSameItem}
            disabled={disabled}
            name={name}
            id={id}
        >
            <Combobox.Trigger {...invalidAttribute} className={triggerClassName}>
                {/* Not `Combobox.Value`: `SelectValue` shares the stack with `Option`. */}
                <SelectValue
                    label={selectedItem?.triggerLabel ?? selectedItem?.label}
                    subtitle={selectedItem?.subtitle}
                    placeholder={placeholder}
                />
                <Combobox.Icon className={CHEVRON_CLASSES}>
                    <ChevronDownIcon aria-hidden className="size-full" />
                </Combobox.Icon>
            </Combobox.Trigger>
            <Combobox.Portal>
                <Combobox.Positioner
                    side="bottom"
                    align="start"
                    sideOffset={OVERLAY_SIDE_OFFSET}
                    className={DROPDOWN_POSITIONER}
                >
                    {/* `render`, not children: Popup merges id, data attributes and handlers onto it. */}
                    <Combobox.Popup
                        finalFocus={resolveFinalFocus}
                        aria-labelledby={labelId}
                        render={
                            <DropdownContent<TValue>
                                searchable={searchable}
                                searchPlaceholder={searchPlaceholder}
                                emptyMessage={emptyMessage}
                                loading={loading}
                                loadingLabel={loadingLabel}
                                renderItem={renderItem}
                                listRef={listRef}
                            />
                        }
                    />
                </Combobox.Positioner>
            </Combobox.Portal>
        </Combobox.Root>
    );
}

export { isSameItem, itemToLabel, itemToValue, Select };
