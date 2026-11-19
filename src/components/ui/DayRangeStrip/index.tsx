import type { KeyboardEvent } from 'react';
import type { DateRange } from '@/components/ui/Calendar/types';
import type { DayRangeStripProps } from './types';
import { useEffect, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { cn } from '@/lib/cn';
import { presence } from '@/lib/ui/dataPresence';
import { dayKey, orderRange, positionInRange } from '@/components/ui/Calendar/utils/calendarGrid';
import { useFieldState } from '@/components/ui/Field';
import { ScrollArea } from '@/components/ui/ScrollArea';

const LOCALE = 'en-US';
const DEFAULT_COUNT = 7;

/* Grid name; not a prop, so it cannot drift from the caller's visible label. */
const GRID_LABEL = 'Select start and end date';

/* Cell 69×66, `shrink-0` so the row overflows and scrolls. `font-sans`: form controls don't inherit type. */
const CELL_CLASSES = `
    group relative flex h-[4.125rem] w-[4.3125rem] shrink-0 flex-col items-center justify-center
    gap-xxs px-l text-center font-sans
    outline-none transition-colors motion-reduce:transition-none
    data-[disabled]:cursor-not-allowed
    not-data-[disabled]:hover:cursor-pointer
`;

/*
 * Ground + focus ring. No continuous band: cells are 6px apart. Ring not gated on disabled (WCAG 2.4.7);
 * `outline-solid` required: the button's `outline-none` inherits into here.
 */
const GROUND_CLASSES = `
    pointer-events-none absolute inset-none rounded-s bg-surface-control
    transition-colors motion-reduce:transition-none
    not-group-data-[disabled]:not-group-data-[selected]:group-hover:bg-surface-control-pressed
    not-group-data-[disabled]:not-group-data-[selected]:group-active:bg-surface-elevated
    not-group-data-[disabled]:group-data-[in-range]:bg-surface-control-pressed
    not-group-data-[disabled]:group-data-[selected]:bg-surface-tertiary
    group-focus-visible:outline-solid group-focus-visible:outline-1
    group-focus-visible:outline-border-focused group-focus-visible:-outline-offset-1
`;

/* Unselected days only (a picked day's fill already reads); the focus ring outranks it on specificity. */
const GROUND_INVALID_CLASSES = 'outline-solid outline-1 -outline-offset-1 outline-border-negative';

const WEEKDAY_CLASSES = `
    relative text-body-m text-text-general-strong
    group-data-[selected]:text-text-on-surface-strong
    group-data-[disabled]:text-text-disabled-on-surface
`;

const DATE_CLASSES = `
    relative text-body-s-medium text-text-general-medium
    group-data-[in-range]:text-text-general-strong
    group-data-[selected]:text-text-on-surface-secondary
    group-data-[disabled]:text-text-disabled-on-surface
`;

function keyTarget(key: string, index: number, last: number): number | null {
    switch (key) {
        case 'ArrowLeft':
            return index - 1;
        case 'ArrowRight':
            return index + 1;
        case 'Home':
            return 0;
        case 'End':
            return last;
        default:
            return null;
    }
}

/**
 * Horizontally scrolling row of day cards; a range is picked in two taps. Content only — label and error
 * are the caller's. Range maths and cell states shared with `Calendar`. Figma: `Calendar` 9447:71484.
 */
function DayRangeStrip({
    start,
    count = DEFAULT_COUNT,
    value,
    defaultValue,
    onValueChange,
    minDate,
    maxDate,
    isDateDisabled,
    today,
    disabled = false,
    invalid = false,
    className,
}: DayRangeStripProps) {
    // Ambient zone is the bin's (`Settings.defaultZone`), so this is the bin's today.
    const todayDate = today?.startOf('day') ?? DateTime.local().startOf('day');

    // `undefined` = uncontrolled; `null` = nothing selected.
    const [uncontrolledValue, setUncontrolledValue] = useState<DateRange | null>(defaultValue ?? null);
    const isControlled = value !== undefined;
    const rangeValue = isControlled ? value : uncontrolledValue;

    // Half-open endpoint from the first tap; never emitted.
    const [pendingStart, setPendingStart] = useState<DateTime | null>(null);
    const [hoveredDate, setHoveredDate] = useState<DateTime | null>(null);
    // Roving tabindex. `null` until the user touches the row.
    const [focusedDate, setFocusedDate] = useState<DateTime | null>(null);

    const cellsRef = useRef(new Map<number, HTMLButtonElement | null>());
    const wantsFocusRef = useRef(false);
    // Set by `commitValue`, read by the scroll effect: the strip's own emit never scrolls.
    const selfCommittedRef = useRef(false);

    const startDay = start.startOf('day');
    const days = Array.from({ length: Math.max(count, 0) }, (_unused, index) => {
        return startDay.plus({ days: index });
    });

    // `Field` context wins over the local prop.
    const fieldState = useFieldState();
    const isDisabled = fieldState.disabled || disabled;
    const isInvalid = (fieldState.invalid || invalid) && !isDisabled;

    // Bounds in the strip's zone, else a bound from another zone clamps onto no cell.
    const stripZone = startDay.zone;
    const minDay = minDate === undefined ? null : minDate.setZone(stripZone).startOf('day');
    const maxDay = maxDate === undefined ? null : maxDate.setZone(stripZone).startOf('day');

    function isDayDisabled(date: DateTime) {
        if (isDisabled) {
            return true;
        }
        if (minDay !== null && dayKey(date) < dayKey(minDay)) {
            return true;
        }
        if (maxDay !== null && dayKey(date) > dayKey(maxDay)) {
            return true;
        }
        return isDateDisabled?.(date) ?? false;
    }

    function commitValue(next: DateRange | null) {
        selfCommittedRef.current = true;
        if (!isControlled) {
            setUncontrolledValue(next);
        }
        onValueChange?.(next);
    }

    // Tap cycle: open (nothing emitted) → close (`orderRange` swaps a backwards pair; one-day legal) →
    // restart (emit `null`, then open on that day).
    function selectAt(date: DateTime) {
        const next = date.startOf('day');
        if (pendingStart !== null) {
            setPendingStart(null);
            setHoveredDate(null);
            commitValue(orderRange(pendingStart, next));
            return;
        }
        if (rangeValue !== null) {
            commitValue(null);
        }
        setPendingStart(next);
    }

    function handleCellKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
        if (event.key === 'Enter' || event.key === ' ') {
            // Space would otherwise scroll the surrounding sheet.
            event.preventDefault();
            const date = days[index];
            if (date && !isDayDisabled(date)) {
                selectAt(date);
            }
            return;
        }
        const target = keyTarget(event.key, index, days.length - 1);
        if (target === null) {
            return;
        }
        event.preventDefault();
        // Clamped, not wrapped.
        const clamped = days[Math.min(Math.max(target, 0), days.length - 1)];
        if (clamped) {
            setHoveredDate(null);
            wantsFocusRef.current = true;
            setFocusedDate(clamped);
        }
    }

    function handleCellFocus(date: DateTime) {
        setFocusedDate((previous) => {
            return previous !== null && dayKey(previous) === dayKey(date) ? previous : date;
        });
    }

    // `Escape` is swallowed only while a range is half-open; otherwise the sheet owns it.
    function handleRootKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key !== 'Escape' || pendingStart === null) {
            return;
        }
        event.stopPropagation();
        setPendingStart(null);
        setHoveredDate(null);
    }

    const focusedKey = focusedDate === null ? null : dayKey(focusedDate);

    useEffect(
        function focusMovedCell() {
            if (focusedKey === null || !wantsFocusRef.current) {
                return;
            }
            wantsFocusRef.current = false;
            cellsRef.current.get(focusedKey)?.focus();
        },
        [focusedKey]
    );

    // A value set from outside scrolls into view; end first so the start wins when both don't fit.
    const committedStartKey = rangeValue === null ? null : dayKey(rangeValue.start);
    const committedEndKey = rangeValue === null ? null : dayKey(rangeValue.end);

    useEffect(
        function revealExternalValue() {
            // Cleared before the null guard: the restart tap commits `null` and must spend the flag.
            const wasOurs = selfCommittedRef.current;
            selfCommittedRef.current = false;
            if (wasOurs || committedStartKey === null || committedEndKey === null) {
                return;
            }
            const options = { block: 'nearest', inline: 'nearest' } as const;
            cellsRef.current.get(committedEndKey)?.scrollIntoView(options);
            cellsRef.current.get(committedStartKey)?.scrollIntoView(options);
        },
        [committedStartKey, committedEndKey]
    );

    // Drawn range: committed, or the half-open endpoint plus the hover/focus preview.
    const previewEnd = pendingStart === null ? null : (hoveredDate ?? focusedDate);
    let displayRange: { start: DateTime; end: DateTime | null } | null = null;
    if (!isDisabled) {
        if (pendingStart === null) {
            displayRange = rangeValue;
        } else if (previewEnd === null) {
            displayRange = { start: pendingStart, end: null };
        } else {
            displayRange = orderRange(pendingStart, previewEnd);
        }
    }

    const firstDay = days[0];
    const lastDay = days.at(-1);
    function isInStrip(date: DateTime) {
        return (
            firstDay !== undefined &&
            lastDay !== undefined &&
            dayKey(date) >= dayKey(firstDay) &&
            dayKey(date) <= dayKey(lastDay)
        );
    }

    // Tab stop: focused day, else range anchor, else today, else the first day; must be in the strip.
    const selectionAnchor = pendingStart ?? rangeValue?.start ?? null;
    const tabbableCandidate =
        [focusedDate, selectionAnchor, todayDate].find((date) => {
            return date !== null && isInStrip(date);
        }) ??
        firstDay ??
        null;
    const tabbableKey = tabbableCandidate === null ? null : dayKey(tabbableCandidate);

    return (
        // A listener for keys bubbling out of the cells, not a control.
        // eslint-disable-next-line jsx-a11y-x/no-static-element-interactions
        <div className={cn`w-full ${className}`} onKeyDown={handleRootKeyDown}>
            <ScrollArea orientation="horizontal">
                {/* One-row `grid` with roving focus; not a `radiogroup`, since a range is a span. */}
                {/* eslint-disable-next-line jsx-a11y-x/role-supports-aria-props */}
                <div
                    role="grid"
                    aria-label={GRID_LABEL}
                    // Kept from amber: `useRevealFirstInvalid` finds the strip by `aria-invalid`.
                    aria-invalid={isInvalid || undefined}
                    // `w-max`: a flex row in a scroll viewport would otherwise shrink to fit and never scroll.
                    className="w-max"
                    onPointerLeave={() => {
                        setHoveredDate(null);
                    }}
                    {...presence('data-disabled', isDisabled)}
                >
                    <div role="row" className="flex gap-s">
                        {days.map((date, index) => {
                            const key = dayKey(date);
                            const dayDisabled = isDayDisabled(date);
                            const isToday = dayKey(todayDate) === key;

                            // `position` (incl. preview) drives the fill; `committed` drives `aria-selected`.
                            const position = displayRange === null ? null : positionInRange(date, displayRange);
                            const committed = rangeValue === null ? null : positionInRange(date, rangeValue);

                            // Committed endpoints and the half-open endpoint; not the preview's far end.
                            const isCommittedEndpoint =
                                committed === 'start' || committed === 'end' || committed === 'single';
                            const isPendingEndpoint = pendingStart !== null && dayKey(pendingStart) === key;
                            const isSelected = !isDisabled && (isCommittedEndpoint || isPendingEndpoint);
                            const invalidClasses = isInvalid && !isSelected ? GROUND_INVALID_CLASSES : '';
                            const weekdayLabel = isToday ? 'Today' : date.setLocale(LOCALE).toFormat('ccc');
                            const dateLabel = date.setLocale(LOCALE).toFormat('LLL d');

                            return (
                                // `aria-selected` on the gridcell, on every day of the range.
                                <div
                                    key={key}
                                    role="gridcell"
                                    aria-selected={committed !== null}
                                    aria-current={isToday ? 'date' : undefined}
                                    className="flex"
                                >
                                    <button
                                        type="button"
                                        ref={(element) => {
                                            cellsRef.current.set(key, element);
                                            return () => {
                                                cellsRef.current.delete(key);
                                            };
                                        }}
                                        tabIndex={key === tabbableKey ? 0 : -1}
                                        // Not `disabled`: a disabled day stays focusable.
                                        aria-disabled={dayDisabled || undefined}
                                        className={CELL_CLASSES}
                                        onClick={() => {
                                            if (!dayDisabled) {
                                                selectAt(date);
                                            }
                                        }}
                                        onPointerEnter={() => {
                                            // Disabled days preview too; they only cannot commit.
                                            setHoveredDate(date);
                                        }}
                                        onFocus={() => {
                                            handleCellFocus(date);
                                        }}
                                        onKeyDown={(event) => {
                                            handleCellKeyDown(event, index);
                                        }}
                                        {...presence('data-selected', isSelected)}
                                        {...presence('data-in-range', position === 'middle')}
                                        {...presence('data-disabled', dayDisabled)}
                                    >
                                        <span aria-hidden className={cn`${GROUND_CLASSES} ${invalidClasses}`} />
                                        {/* Named by its drawn text plus the year (WCAG 2.5.3 label-in-name); amber's
                                            `aria-label` full date failed it ("Thu"/"Jan" not in "January 1, 2026"). */}
                                        <span className={WEEKDAY_CLASSES}>{weekdayLabel}</span>{' '}
                                        <span className={DATE_CLASSES}>{dateLabel}</span>
                                        <span className="sr-only"> {date.year}</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}

export { DayRangeStrip };
