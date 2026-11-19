import type { KeyboardEvent } from 'react';
import type { DropdownContentProps, PopupSearchProps } from './types';
import { useRef } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { cn } from '@/lib/cn';
import { OVERLAY_PANEL } from '@/lib/ui/overlayPanel';
import { OptionList } from '@/components/ui/OptionList';
import { SearchClearButton, SearchField } from '@/components/ui/SearchInput';

/* `font-sans`: a portalled surface sits outside any kit control. `w-full` fills the positioner. */
const PANEL_CLASSES = `font-sans ${OVERLAY_PANEL} w-full`;

/* The overlay's containing block is the list area (spinner centres below the search); `grow` fills a taller panel. */
const LIST_FRAME_CLASSES = 'relative grow';

/* No fill: the list's own opacity dims. `pointer-events-none` keeps the search field live. */
const OVERLAY_CLASSES = 'pointer-events-none absolute inset-none z-10 flex items-center justify-center';

/* Explicit text colour: in a portal `border-current` would inherit the host body colour. */
const SPINNER_CLASSES =
    'size-3xl animate-spin rounded-full border-2 border-current border-t-transparent text-text-general-strong';

const LIST_CLASSES = 'transition-opacity duration-150 ease-out';
const LIST_LOADING_CLASSES = 'pointer-events-none opacity-50';

/* Keys that move/commit the highlight. `Escape`/`Tab` stay live: an undismissable popup is a trap (WCAG 2.1.2). */
const BLOCKED_WHILE_LOADING = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp', 'Enter']);

/* Padding on the message, not on `Combobox.Empty`, which stays mounted and would add a blank band. */
const EMPTY_MESSAGE_CLASSES = 'block p-l text-body-m text-text-general-medium';

/**
 * `SearchField`, not `SearchInput`: the latter overrides the incoming ref. The clear button clears the
 * filter, never the selection — which rules out `Combobox.Clear`.
 */
function PopupSearch({ placeholder = 'Search', clearLabel, className }: PopupSearchProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    /*
     * The filter lives in Base UI's store and only `onChange` reaches it: write through the native setter
     * (React's tracker ignores `input.value = ''`) and dispatch `input`. Refocus, since the button unmounts.
     */
    function clearFilter() {
        const input = inputRef.current;
        if (!input) {
            return;
        }
        // Prototype setter, detached on purpose.
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setValue?.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
    }

    return (
        <div className={cn`px-xs pt-xs pb-xl ${className}`}>
            <Combobox.Input
                ref={inputRef}
                placeholder={placeholder}
                render={<SearchField clearButton={<SearchClearButton label={clearLabel} onClick={clearFilter} />} />}
            />
        </div>
    );
}

/**
 * Dropdown popup shell: bordered panel, optional search, empty state, scrolling list. Owns no positioning;
 * designed as `Combobox.Popup`'s `render` target inside a `Combobox.Root` with `items`. Figma: 8915:27188.
 */
function DropdownContent<TValue extends string | number = string>({
    searchable = true,
    searchPlaceholder,
    emptyMessage = 'No results',
    renderItem,
    listRef,
    loading = false,
    loadingLabel = 'Loading results',
    className,
    optionListClassName,
    searchClassName,
    indicator,
    clearLabel = 'Clear search',
    ...rest
}: DropdownContentProps<TValue>) {
    const loadingClasses = loading ? LIST_LOADING_CLASSES : '';

    /* Blocked here, not via `readOnly` on the Root (would freeze the search). Capture: before Base UI's handlers. */
    function blockListKeys(event: KeyboardEvent<HTMLDivElement>) {
        if (!loading || !BLOCKED_WHILE_LOADING.has(event.key)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
    }

    return (
        <div
            {...rest}
            aria-busy={loading ? true : undefined}
            className={cn`${PANEL_CLASSES} ${className}`}
            onKeyDownCapture={blockListKeys}
        >
            {searchable ? (
                <PopupSearch placeholder={searchPlaceholder} clearLabel={clearLabel} className={searchClassName} />
            ) : null}
            {/* Mounted unconditionally: a polite live region must exist before its text changes. */}
            <Combobox.Empty>
                {/* Silent while loading — "No results" under a spinner would flash before the response. */}
                {loading ? null : <span className={EMPTY_MESSAGE_CLASSES}>{emptyMessage}</span>}
            </Combobox.Empty>
            <div className={LIST_FRAME_CLASSES}>
                <OptionList<TValue>
                    ref={listRef}
                    renderItem={renderItem}
                    className={cn`${LIST_CLASSES} ${loadingClasses} ${optionListClassName}`}
                    indicator={indicator}
                />
                {loading ? (
                    <div className={OVERLAY_CLASSES}>
                        <span role="status" aria-live="polite" className="flex items-center justify-center">
                            <span aria-hidden className={SPINNER_CLASSES} data-testid="dropdown-spinner" />
                            <span className="sr-only">{loadingLabel}</span>
                        </span>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export { DropdownContent };
