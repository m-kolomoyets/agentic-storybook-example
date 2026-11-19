import type { Combobox as ComboboxTypes } from '@base-ui/react/combobox';
import type { SelectOption } from '@/components/ui/OptionList/types';
import type { AccountCardBodyProps, AccountSwitcherMultiProps, AccountSwitcherProps } from './types';
import { useId, useState } from 'react';
import CheckCircleIcon from '@/assets/icons/check-circle.svg?react';
import UnfoldMoreIcon from '@/assets/icons/unfold-more.svg?react';
import WarehouseIcon from '@/assets/icons/warehouse.svg?react';
import { Combobox } from '@base-ui/react/combobox';
import { cn } from '@/lib/cn';
import { DROPDOWN_POSITIONER, OVERLAY_SIDE_OFFSET } from '@/lib/ui/overlayPanel';
import { useIsMobile } from '@/hooks/useIsMobile';
import { AccountSwitcherSheet } from '@/components/ui/AccountSwitcherSheet';
import { DropdownContent } from '@/components/ui/DropdownContent';
import { isSameItem, itemToLabel, itemToValue } from '@/components/ui/Select/utils/items';
import { StatusIcon } from '@/components/ui/StatusIcon';

/* `Spacings/12` padding, `Radius/l` (12px — `rounded-m`), `Surface/control` on `Border/primary`. */
const CARD_CLASSES = `
    flex w-full min-w-px items-center justify-between gap-m p-l
    rounded-m border border-border-primary bg-surface-control
    text-left text-text-general-strong
`;

/*
 * Ramp gated as in `Select`'s trigger (disabled → open/focus → hover). Focused draws `Button/secondary-hover`
 * on `Border/focused`; open keeps the control fill.
 */
const TRIGGER_CLASSES = `
    ${CARD_CLASSES}
    group/account-switcher cursor-pointer outline-none transition-colors
    not-data-disabled:not-data-popup-open:not-focus-visible:hover:border-border-control-hover
    not-data-disabled:data-popup-open:border-border-focused
    not-data-disabled:focus-visible:border-border-focused
    not-data-disabled:not-data-popup-open:focus-visible:bg-button-secondary-hover
    data-disabled:cursor-not-allowed
`;

/* 40px tile: `Spacings/10` round a 20px glyph, `Radius/m` (8px — `rounded-s`). */
const GLYPH_TILE_CLASSES =
    'flex shrink-0 items-center justify-center rounded-s bg-surface-tag-septenary p-account-switcher-glyph-p text-icons-quaternary';

const ICON_CLASSES = 'size-2xl shrink-0';

/* `min-w-px` so the stack can shrink and the name truncate. */
const TEXT_CLASSES = 'flex min-w-px flex-1 flex-col';

const NAME_CLASSES = 'truncate text-account-switcher-name group-data-disabled/account-switcher:text-text-disabled';

const CAPTION_CLASSES = `
    truncate text-caption-m text-text-general-medium
    group-data-disabled/account-switcher:text-text-disabled
`;

/* Drawn at 40% ink at rest and disabled, full ink once hovered, focused or open. */
const CHEVRON_CLASSES = `
    ${ICON_CLASSES} text-icons-general-medium
    group-not-data-disabled/account-switcher:group-hover/account-switcher:text-icons-general-strong
    group-not-data-disabled/account-switcher:group-focus-visible/account-switcher:text-icons-general-strong
    group-data-popup-open/account-switcher:text-icons-general-strong
`;

/* The drawn empty state centres in the popup; `py-4xl` stands in for the drawn panel height. */
const EMPTY_CLASSES = 'flex flex-col items-center gap-l py-4xl text-center';
const EMPTY_TEXT_CLASSES = 'flex flex-col items-center gap-xs';
const EMPTY_TITLE_CLASSES = 'text-body-s-medium text-text-general-strong';
const EMPTY_HINT_CLASSES = 'text-caption-m text-text-general-medium';

function AccountCardBody({ name, caption, nameId, captionId }: AccountCardBodyProps) {
    return (
        <span className="flex min-w-px flex-1 items-center gap-m">
            <span aria-hidden className={GLYPH_TILE_CLASSES}>
                <WarehouseIcon className={ICON_CLASSES} />
            </span>
            <span className={TEXT_CLASSES}>
                <span id={nameId} className={NAME_CLASSES}>
                    {name}
                </span>
                {caption === undefined ? null : (
                    <span id={captionId} className={CAPTION_CLASSES}>
                        {caption}
                    </span>
                )}
            </span>
        </span>
    );
}

/* Echoes the query; an empty list with no query (an empty page) says so without `""`. */
function NoResults({ query }: { query: string }) {
    return (
        <span className={EMPTY_CLASSES}>
            <StatusIcon status="default" surface="general" icon={<CheckCircleIcon />} />
            <span className={EMPTY_TEXT_CLASSES}>
                <span className={EMPTY_TITLE_CLASSES}>{query === '' ? 'No results' : `No results for "${query}"`}</span>
                <span className={EMPTY_HINT_CLASSES}>Try another search</span>
            </span>
        </span>
    );
}

function MultiAccountSwitcher({
    name,
    caption,
    options,
    value,
    onValueChange,
    searchValue,
    onSearchChange,
    loading,
    disabled = false,
    searchPlaceholder = 'Search',
    className,
}: AccountSwitcherMultiProps) {
    const isDesktop = !useIsMobile();
    /* BottomSheet has no trigger part of its own, so this holds its open state. */
    const [sheetOpen, setSheetOpen] = useState(false);
    /* Built from `value` + `name`, not looked up: a server-filtered page often lacks the current row. */
    const selectedItem = value === null ? null : { value, label: name };
    const triggerClassName = cn`${TRIGGER_CLASSES} ${className}`;
    /*
     * Deviation (WCAG 4.1.2): a `combobox` takes no name from content, so the card's name + caption label the
     * trigger explicitly, and the popup dialog gets the mobile sheet's title.
     */
    const nameId = useId();
    const captionId = useId();
    const labelledBy = caption === undefined ? nameId : `${nameId} ${captionId}`;

    /* Only typing (and clear) is a search; Base UI also writes the picked label and `''` on open/close. */
    function handleInputValueChange(next: string, details: ComboboxTypes.Root.ChangeEventDetails) {
        if (details.reason !== 'input-change' && details.reason !== 'input-clear') {
            return;
        }
        onSearchChange(next);
    }

    function handleValueChange(next: SelectOption | null) {
        if (next === null || next.value === value) {
            return;
        }
        onValueChange?.(next.value);
    }

    /* A query left behind would greet the next opening with a filtered list. */
    function handleOpenChange(open: boolean) {
        if (open || searchValue === '') {
            return;
        }
        onSearchChange('');
    }

    if (!isDesktop) {
        return (
            <>
                <button
                    type="button"
                    className={triggerClassName}
                    disabled={disabled}
                    data-disabled={disabled ? '' : undefined}
                    data-popup-open={sheetOpen ? '' : undefined}
                    aria-haspopup="dialog"
                    aria-expanded={sheetOpen}
                    onClick={() => {
                        setSheetOpen(true);
                    }}
                >
                    <AccountCardBody name={name} caption={caption} />
                    <UnfoldMoreIcon aria-hidden className={CHEVRON_CLASSES} />
                </button>
                <AccountSwitcherSheet
                    open={sheetOpen}
                    onOpenChange={setSheetOpen}
                    name={name}
                    value={value}
                    options={options}
                    onValueChange={onValueChange}
                    searchValue={searchValue}
                    onSearchChange={onSearchChange}
                    loading={loading}
                    searchPlaceholder={searchPlaceholder}
                />
            </>
        );
    }

    return (
        <Combobox.Root<SelectOption>
            virtualized
            items={options}
            filter={null}
            value={selectedItem}
            onValueChange={handleValueChange}
            inputValue={searchValue}
            onInputValueChange={handleInputValueChange}
            onOpenChange={handleOpenChange}
            itemToStringLabel={itemToLabel}
            itemToStringValue={itemToValue}
            isItemEqualToValue={isSameItem}
            disabled={disabled}
        >
            <Combobox.Trigger className={triggerClassName} aria-labelledby={labelledBy}>
                <AccountCardBody name={name} caption={caption} nameId={nameId} captionId={captionId} />
                <UnfoldMoreIcon aria-hidden className={CHEVRON_CLASSES} />
            </Combobox.Trigger>
            <Combobox.Portal>
                <Combobox.Positioner
                    side="bottom"
                    align="start"
                    sideOffset={OVERLAY_SIDE_OFFSET}
                    className={DROPDOWN_POSITIONER}
                >
                    <Combobox.Popup
                        aria-label="Switch organization"
                        render={
                            <DropdownContent
                                searchPlaceholder={searchPlaceholder}
                                emptyMessage={<NoResults query={searchValue} />}
                                loading={loading}
                                indicator="check"
                            />
                        }
                    />
                </Combobox.Positioner>
            </Combobox.Portal>
        </Combobox.Root>
    );
}

/**
 * The card at the top of the side menu naming the current account; for multi-account users, a popup (sheet
 * below `md`) to pick another. Caller owns the search and passes back filtered `options`.
 * Figma: `Workspace Switcher` 12446:6418.
 */
function AccountSwitcher(props: AccountSwitcherProps) {
    if (props.single === true) {
        return (
            <div className={cn`${CARD_CLASSES} ${props.className}`}>
                <AccountCardBody name={props.name} caption={props.caption} />
            </div>
        );
    }

    return <MultiAccountSwitcher {...props} />;
}

export { AccountSwitcher };
