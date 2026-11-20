import type { CountryCode } from 'libphonenumber-js/min';
import type { OptionListHandle, SelectOption } from '@/components/ui/OptionList/types';
import type { CountryPickerProps } from '../../types';
import type { CountryEntry } from '../../utils/countryData';
import { useRef, useState } from 'react';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg?react';
import { Combobox } from '@base-ui/react/combobox';
import { cn } from '@/lib/cn';
import {
    CONTROL_BORDER,
    CONTROL_SURFACE_FILL,
    CONTROL_SURFACE_FRAME,
    CONTROL_SURFACE_HEIGHT,
} from '@/lib/ui/controlSurface';
import { DropdownContent } from '@/components/ui/DropdownContent';
import { Field } from '@/components/ui/Field';
import { filterCountries, getCountryEntries } from '../../utils/countryData';
import { flagUrl } from '../../utils/countryFlags';

/*
 * Fixed 68px box with its own 4px gap (not `CONTROL_SURFACE_LAYOUT`'s full-width 6px). It is a
 * `<button>` with no `<input>`, so `Input`'s `:has()` ramp can't apply: state comes from the nested
 * Field's `data-invalid`/`data-disabled` and Base UI's `data-popup-open`. Gated, not cascaded:
 * disabled > open > focus > invalid > hover — ungated, a focused invalid box loses its focus
 * indicator (WCAG 2.4.7). Named group so no ancestor `group` spins the chevron.
 * Focus is not drawn in Figma; shipped anyway (WCAG 2.4.7), borrowing Select's trigger cell.
 */
const BOX_CLASSES = `
    group/country-picker flex w-[68px] shrink-0 cursor-pointer items-center gap-xs p-l
    ${CONTROL_SURFACE_HEIGHT} ${CONTROL_SURFACE_FRAME} ${CONTROL_BORDER.default} ${CONTROL_SURFACE_FILL}
    text-text-general-strong outline-none
    not-data-disabled:not-data-popup-open:not-focus-visible:not-data-invalid:hover:border-border-control-hover
    not-data-disabled:not-data-popup-open:not-focus-visible:data-invalid:border-border-negative
    not-data-disabled:data-popup-open:border-border-control-pressed
    not-data-disabled:data-popup-open:bg-surface-control-pressed
    not-data-disabled:not-data-popup-open:focus-visible:border-border-focused
    data-disabled:cursor-not-allowed data-disabled:border-border-control-disabled data-disabled:text-text-disabled
`;

/* Context provider only: hugs the box instead of Field.Root's full-width column. */
const FIELD_CLASSES = 'w-auto shrink-0 items-stretch gap-none';

/* Rotation isn't drawn; kept for parity with Select's chevron. */
const CHEVRON_CLASSES = 'size-2xl shrink-0 transition-transform group-data-[popup-open]/country-picker:rotate-180';

/* 20×20; dims with the box as `Disabled` (10431:204167) draws it. */
const FLAG_CLASSES = 'size-2xl shrink-0 group-data-disabled/country-picker:opacity-50';

const POSITIONER_CLASSES = 'w-[var(--anchor-width)] max-w-[var(--available-width)]';

/* Drawn gap row→popup (Select ships 4; measured, not a typo). Base UI applies it as inline geometry. */
const SIDE_OFFSET = 6;

const ROW_CLASSES = 'flex min-w-px items-center gap-xs';

const CALLING_CODE_CLASSES = 'shrink-0 text-text-general-medium';

function itemToLabel(item: SelectOption) {
    return item.label;
}

function itemToValue(item: SelectOption) {
    return item.value;
}

/* Filtered rows are fresh arrays of equal objects; `Object.is` would lose the selection. */
function isSameItem(item: SelectOption, value: SelectOption) {
    return item.value === value.value;
}

/** Flag, or a blank box of the same size. Decorative (`alt=""`): the row's name already says the country. */
function Flag({ code }: { code: CountryCode }) {
    const url = flagUrl(code);
    if (url === undefined) {
        return <span aria-hidden className={FLAG_CLASSES} />;
    }
    return <img src={url} alt="" className={FLAG_CLASSES} />;
}

function toOption(entry: CountryEntry): SelectOption {
    return { value: entry.code, label: entry.name, startAddon: <Flag code={entry.code} /> };
}

/** `PhoneInput`'s country half: a 68px button and its searchable list. Figma: `PickerPressed` 10818:8297. */
function CountryPicker({
    country,
    onCountryChange,
    countries,
    locale,
    disabled,
    error = false,
    anchorRef,
    'aria-label': ariaLabel = 'Country calling code',
}: CountryPickerProps) {
    const listRef = useRef<OptionListHandle>(null);
    const [query, setQuery] = useState('');

    const all = getCountryEntries(locale);
    // Filtered, not mapped from `countries`, so the derived sort survives.
    const entries =
        countries === undefined
            ? all
            : all.filter((entry) => {
                  return countries.includes(entry.code);
              });
    const options = entries.map(toOption);

    const byCode = new Map<string, { entry: CountryEntry; option: SelectOption }>();
    entries.forEach((entry, position) => {
        const option = options[position];
        if (option !== undefined) {
            byCode.set(entry.code, { entry, option });
        }
    });

    /*
     * Our filter, required: Base UI's only sees labels and would drop `+44` hits. Not debounced —
     * ~250 in-memory rows.
     */
    let filteredOptions = options;
    if (query !== '') {
        const matched = new Set<string>(
            filterCountries(entries, query).map((entry) => {
                return entry.code;
            })
        );
        filteredOptions = options.filter((option) => {
            return matched.has(option.value);
        });
    }

    const selected = byCode.get(country);
    const selectedOption = selected?.option ?? null;

    /*
     * ADR-0002 deviation (WCAG 4.1.2): the drawn trigger names nothing. One composed `aria-label`,
     * because `combobox` is not name-from-content — an sr-only span computes no name.
     */
    const accessibleName =
        selected === undefined ? ariaLabel : `${ariaLabel}, ${selected.entry.name} (+${selected.entry.callingCode})`;

    function handleValueChange(next: SelectOption | null) {
        // No deselection: there is always a country.
        if (next === null) {
            return;
        }
        onCountryChange(next.value as CountryCode);
    }

    function handleOpenChange(open: boolean) {
        // Reset now, so the closing popup doesn't render one filtered frame.
        if (!open) {
            setQuery('');
        }
    }

    /*
     * Opening highlights the selected row, which may sit outside the virtualized window — its
     * `aria-activedescendant` would then point at nothing (WCAG 4.1.2). Bring it into view.
     */
    function handleOpenChangeComplete(open: boolean) {
        const index = selectedOption === null ? -1 : filteredOptions.indexOf(selectedOption);
        if (open && index >= 0) {
            listRef.current?.scrollToIndex(index);
        }
    }

    /* Virtualized rows aren't in the DOM, so keyboard highlight must scroll the window. Not on pointer (loops). */
    function handleItemHighlighted(_item: SelectOption | undefined, details: Combobox.Root.HighlightEventDetails) {
        if (details.reason !== 'keyboard') {
            return;
        }
        listRef.current?.scrollToIndex(details.index);
    }

    /*
     * ADR-0002 deviation: rows add the muted calling code (Figma draws flag + name). The trigger shows
     * no code and ~25 regions share `+1`, so picking Jamaica for `+1` would be invisible otherwise.
     */
    function renderRow(item: SelectOption) {
        const callingCode = byCode.get(item.value)?.entry.callingCode;
        return (
            <span className={ROW_CLASSES}>
                <span className="truncate">{item.label}</span>
                {callingCode === undefined ? null : <span className={CALLING_CODE_CLASSES}>+{callingCode}</span>}
            </span>
        );
    }

    /*
     * Load-bearing nested Field.Root: Combobox pushes filled/dirty and submits under the Field's
     * name. Unshadowed, a PhoneInput in a Field reports *filled* from the default country and posts
     * `"US"` under the phone's name. No `name` here, so the picker writes into a field nothing reads.
     */
    return (
        <Field.Root disabled={disabled} invalid={error} className={FIELD_CLASSES}>
            <Combobox.Root<SelectOption>
                virtualized
                items={options}
                filteredItems={filteredOptions}
                filter={null}
                value={selectedOption}
                onValueChange={handleValueChange}
                onInputValueChange={setQuery}
                onOpenChange={handleOpenChange}
                onOpenChangeComplete={handleOpenChangeComplete}
                onItemHighlighted={handleItemHighlighted}
                itemToStringLabel={itemToLabel}
                itemToStringValue={itemToValue}
                isItemEqualToValue={isSameItem}
                disabled={disabled}
            >
                <Combobox.Trigger aria-label={accessibleName} className={cn`${BOX_CLASSES}`}>
                    <Flag code={country} />
                    <Combobox.Icon className={CHEVRON_CLASSES}>
                        <ChevronDownIcon aria-hidden className="size-full" />
                    </Combobox.Icon>
                </Combobox.Trigger>
                <Combobox.Portal>
                    <Combobox.Positioner
                        anchor={anchorRef}
                        side="bottom"
                        align="start"
                        sideOffset={SIDE_OFFSET}
                        className={POSITIONER_CLASSES}
                    >
                        {/* `render`, not children: Popup's props/ref must land on the panel. */}
                        <Combobox.Popup
                            aria-label={ariaLabel}
                            render={<DropdownContent renderItem={renderRow} listRef={listRef} />}
                        />
                    </Combobox.Positioner>
                </Combobox.Portal>
            </Combobox.Root>
        </Field.Root>
    );
}

export { CountryPicker };
