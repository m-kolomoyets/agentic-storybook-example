import type { SelectOption } from '@/components/ui/OptionList/types';
import type { AccountSwitcherSheetProps } from './types';
import CheckIcon from '@/assets/icons/check.svg?react';
import CloseIcon from '@/assets/icons/close.svg?react';
import { Combobox } from '@base-ui/react/combobox';
import { Drawer } from '@base-ui/react/drawer';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { IconButton } from '@/components/ui/IconButton';
import { SearchInput } from '@/components/ui/SearchInput';

const TITLE = 'Switch Organization';

/* The drawn sheet is 662px tall; pinned rather than hugging so a search never resizes it. */
const POPUP_CLASSES = 'h-[min(41.375rem,85dvh)]';

/* Drawn as a bare 20px glyph at top 16 / right 12; the 40px target is centred on it. */
const CLOSE_CLASSES = `
    absolute inset-ring-0 bg-transparent focus-visible:ring-1
    top-[calc(var(--spacing-xl)-(var(--spacing-5xl)-var(--spacing-2xl))/2)]
    right-[calc(var(--spacing-l)-(var(--spacing-5xl)-var(--spacing-2xl))/2)]
`;

/* `Spacings/24` under the title, `Spacings/12` gutters. */
const SEARCH_CLASSES = 'mt-3xl w-full px-l';

/* `Spacings/16` from the search field to the first row. */
const CONTENT_CLASSES = 'mt-xl';

const LIST_CLASSES = 'flex flex-col';

/* 56px rows: `Spacings/12` across, 15px down (off-scale) round a 26px line. */
const ROW_CLASSES = `
    flex w-full cursor-pointer items-center justify-between gap-m px-l py-[0.9375rem]
    text-left text-sheet-group-header text-text-general-strong
    outline-none transition-colors focus-visible:bg-surface-control active:bg-surface-control
    aria-[current=true]:bg-surface-control
`;

const NAME_CLASSES = 'min-w-px flex-1 truncate';

const CHECK_CLASSES = 'size-2xl shrink-0 text-icons-general-strong';

const EMPTY_CLASSES = 'block p-l text-center text-body-m text-text-general-medium';

function byLabel(a: SelectOption, b: SelectOption) {
    return a.label.localeCompare(b.label);
}

/**
 * `AccountSwitcher`'s mobile branch: titled `BottomSheet` with search and a plain list of names. Not
 * `SelectSheet` (drawn rows are 18/26 with a filled current row and trailing check). A tap switches and
 * closes; the current row only closes. Current account leads, the rest sort alphabetically; `options` are
 * also narrowed here per keystroke while the caller's server search is debounced.
 * Figma: `Switch Organization` 13942:423473.
 */
function AccountSwitcherSheet({
    open,
    onOpenChange,
    name,
    value,
    options,
    onValueChange,
    searchValue,
    onSearchChange,
    loading = false,
    searchPlaceholder = 'Search',
}: AccountSwitcherSheetProps) {
    const { contains } = Combobox.useFilter();
    const query = searchValue.trim();

    function matches(option: SelectOption) {
        return query === '' || contains(option.label, query);
    }

    const current: SelectOption | null = value === null ? null : { value, label: name };
    const others = options.filter((option) => {
        return option.value !== value && matches(option);
    });
    others.sort(byLabel);
    const rows = current !== null && matches(current) ? [current, ...others] : others;

    function pick(picked: string) {
        if (picked !== value) {
            onValueChange?.(picked);
        }
        onOpenChange(false);
    }

    /* A query left behind would greet the next opening with a filtered list. */
    function handleOpenChange(next: boolean) {
        onOpenChange(next);
        if (!next && searchValue !== '') {
            onSearchChange('');
        }
    }

    const emptyState = loading ? null : (
        <span role="status" className={EMPTY_CLASSES}>
            No organizations found
        </span>
    );

    return (
        <BottomSheet.Root open={open} onOpenChange={handleOpenChange}>
            <BottomSheet.Popup className={POPUP_CLASSES}>
                <BottomSheet.Title>{TITLE}</BottomSheet.Title>
                <IconButton
                    size="sm"
                    icon={<CloseIcon />}
                    aria-label="Close organization switcher"
                    className={CLOSE_CLASSES}
                    render={<Drawer.Close />}
                />
                <div className={SEARCH_CLASSES}>
                    <SearchInput
                        value={searchValue}
                        onValueChange={onSearchChange}
                        placeholder={searchPlaceholder}
                        aria-label="Search organizations"
                    />
                </div>
                <BottomSheet.Content className={CONTENT_CLASSES}>
                    {rows.length === 0 ? (
                        emptyState
                    ) : (
                        <ul className={LIST_CLASSES} aria-label="Organizations">
                            {rows.map((row) => {
                                const isCurrent = row.value === value;
                                return (
                                    <li key={row.value}>
                                        <button
                                            type="button"
                                            className={ROW_CLASSES}
                                            aria-current={isCurrent ? true : undefined}
                                            onClick={() => {
                                                pick(row.value);
                                            }}
                                        >
                                            <span className={NAME_CLASSES}>{row.label}</span>
                                            {isCurrent ? <CheckIcon aria-hidden className={CHECK_CLASSES} /> : null}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </BottomSheet.Content>
            </BottomSheet.Popup>
        </BottomSheet.Root>
    );
}

export { AccountSwitcherSheet };
