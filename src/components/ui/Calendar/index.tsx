import type { KeyboardEvent } from 'react';
import type { CalendarProps, DateRange } from './types';
import { useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import ChevronLeftIcon from '@/assets/icons/chevron-left.svg?react';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg?react';
import { DateTime } from 'luxon';
import { cn } from '@/lib/cn';
import { presence } from '@/lib/ui/dataPresence';
import { useFieldState } from '@/components/ui/Field';
import { buildMonthGrid, dayKey, orderRange, positionInRange } from './utils/calendarGrid';
import { daySizeVariants, rootVariants, tableVariants } from './utils/variants';

type CalendarValue = DateTime | DateRange | null;

/* Sunday-first, `en-US`, hardcoded (luxon `Info.weekdays()` reads the ambient locale). Long form via `<th abbr>`. */
const WEEKDAYS = [
    { short: 'Sun', long: 'Sunday' },
    { short: 'Mon', long: 'Monday' },
    { short: 'Tue', long: 'Tuesday' },
    { short: 'Wed', long: 'Wednesday' },
    { short: 'Thu', long: 'Thursday' },
    { short: 'Fri', long: 'Friday' },
    { short: 'Sat', long: 'Saturday' },
] as const;

/** Locale written at every formatting call, never inherited. */
const LOCALE = 'en-US';

const DAY_CELL = 'p-none';
const HEADER_CLASSES = 'flex h-3xl items-center justify-between gap-m';
const HEADING_CLASSES = 'flex-1 text-center text-body-m text-text-general-strong';
/** Figma `Weekday Header` 8256:13656. */
const WEEKDAY_CLASSES = 'p-none pb-xl text-center text-body-m font-normal text-text-general-medium';

/*
 * Whole cell is the button (≥ 48×48, WCAG 2.5.8); the drawn ground is a smaller layer inside. Text colour
 * precedence disabled → selected → today/in-range → default, each `not-` gated (Tailwind sorts by utility).
 */
const DAY_CELL_CLASSES = `
    group relative flex items-center justify-center
    outline-none text-body-m transition-colors motion-reduce:transition-none
    text-text-general-medium
    not-data-[disabled]:not-data-[selected]:data-[today]:text-text-general-strong
    not-data-[disabled]:not-data-[selected]:data-[in-range]:text-text-general-strong
    not-data-[disabled]:data-[selected]:text-text-on-surface-strong
    data-[disabled]:text-text-disabled-on-surface
    data-[disabled]:cursor-not-allowed
    not-data-[disabled]:hover:cursor-pointer
`;

/*
 * Ground + focus ring, a layer so the band can sit behind it. Ring not gated on disabled: a disabled day
 * still takes focus (WCAG 2.4.7). `outline-solid` required: the button's `outline-none` inherits into here.
 */
const GROUND_CLASSES = `
    pointer-events-none absolute inset-none rounded-icon-xs
    transition-colors motion-reduce:transition-none
    not-group-data-[disabled]:not-group-data-[selected]:group-hover:bg-surface-control
    not-group-data-[disabled]:not-group-data-[selected]:group-active:bg-surface-control-pressed
    not-group-data-[disabled]:group-data-[selected]:bg-surface-tertiary
    not-group-data-[disabled]:group-data-[selected]:rounded-s
    group-focus-visible:outline-solid group-focus-visible:outline-1
    group-focus-visible:outline-border-focused group-focus-visible:-outline-offset-1
`;

/*
 * Range band, behind the ground (shows through the endpoint's radius notch). Row caps 2px where a week cuts
 * the range; endpoint radius outranks the cap. No disabled gate: the band paints through a disabled day.
 */
const BAND_CLASSES = `
    pointer-events-none absolute inset-none rounded-none
    transition-colors motion-reduce:transition-none
    group-data-[in-range]:bg-surface-control-pressed
    group-data-[range-start]:bg-surface-control-pressed
    group-data-[range-end]:bg-surface-control-pressed
    not-group-data-[range-start]:group-data-[row-start]:rounded-l-xxs
    not-group-data-[range-end]:group-data-[row-end]:rounded-r-xxs
    group-data-[range-start]:rounded-l-s
    group-data-[range-end]:rounded-r-s
`;

/* Hand-rolled chevrons: `IconButton xs` draws the filled primary ramp, too loud here. Paging is also on keys. */
const NAV_CLASSES = `
    inline-flex size-2xl shrink-0 items-center justify-center rounded-icon-xs
    text-icons-general-strong outline-none
    transition-colors motion-reduce:transition-none
    [&>svg]:size-full
    enabled:hover:cursor-pointer enabled:hover:bg-surface-control
    enabled:active:bg-surface-control-pressed
    disabled:cursor-not-allowed disabled:text-icons-general-medium
    focus-visible:outline-solid focus-visible:outline-1 focus-visible:outline-border-focused
    focus-visible:outline-offset-2
`;

/** Sunday of `date`'s week; luxon weekday Monday 1 … Sunday 7. */
function startOfWeek(date: DateTime) {
    return date.minus({ days: date.weekday % 7 });
}

function isDateRange(value: CalendarValue): value is DateRange {
    return value !== null && !DateTime.isDateTime(value);
}

/** First/last dated columns of a week row, where the 2px caps land (a band can run into trailing blanks). */
function drawnRowEdges(week: readonly { date: DateTime | null }[]) {
    let first = -1;
    let last = -1;
    for (const [index, cell] of week.entries()) {
        if (cell.date === null) {
            continue;
        }
        if (first === -1) {
            first = index;
        }
        last = index;
    }
    return { first, last };
}

/** With a controlled anchor on an endpoint of the committed range, its far end is the preview. */
function farEndOf(pendingStart: DateTime | null, rangeValue: DateRange | null) {
    if (pendingStart === null || rangeValue === null) {
        return null;
    }
    if (dayKey(pendingStart) === dayKey(rangeValue.start)) {
        return rangeValue.end;
    }
    if (dayKey(pendingStart) === dayKey(rangeValue.end)) {
        return rangeValue.start;
    }
    return null;
}

function keyTarget(event: KeyboardEvent, date: DateTime): DateTime | null {
    /* luxon month/year arithmetic clamps the day (31 Mar − 1 month = 28/29 Feb). */
    switch (event.key) {
        case 'ArrowLeft':
            return date.minus({ days: 1 });
        case 'ArrowRight':
            return date.plus({ days: 1 });
        case 'ArrowUp':
            return date.minus({ weeks: 1 });
        case 'ArrowDown':
            return date.plus({ weeks: 1 });
        case 'Home':
            return startOfWeek(date);
        case 'End':
            return startOfWeek(date).plus({ days: 6 });
        case 'PageUp':
            return event.shiftKey ? date.minus({ years: 1 }) : date.minus({ months: 1 });
        case 'PageDown':
            return event.shiftKey ? date.plus({ years: 1 }) : date.plus({ months: 1 });
        default:
            return null;
    }
}

/**
 * Month grid, hand-rolled on luxon (Base UI ships no calendar; ADR-0008). Content only — compose a popover
 * around it. Figma: `Day Cell` 8254:13360, `Calendar/Default` 8256:13650.
 */
function Calendar({
    mode = 'single',
    value,
    defaultValue,
    onValueChange,
    rangeAnchor,
    onRangeAnchorChange,
    defaultMonth,
    month,
    onMonthChange,
    actionsRef,
    minDate,
    maxDate,
    isDateDisabled,
    today,
    disabled = false,
    fullWidth = false,
    className,
}: CalendarProps) {
    // Only ambient read: the app sets `Settings.defaultZone` to the bin's zone, so this is the bin's today.
    const todayDate = today?.startOf('day') ?? DateTime.local().startOf('day');

    // `undefined` = uncontrolled, `null` = nothing selected.
    const [uncontrolledValue, setUncontrolledValue] = useState<CalendarValue>(defaultValue ?? null);
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : uncontrolledValue;

    const selectedDate = DateTime.isDateTime(currentValue) ? currentValue.startOf('day') : null;
    const rangeValue = isDateRange(currentValue) ? currentValue : null;

    const valueMonthSeed = DateTime.isDateTime(currentValue) ? currentValue : (rangeValue?.start ?? null);
    const monthSeed = defaultMonth ?? valueMonthSeed ?? todayDate;
    const [uncontrolledMonth, setUncontrolledMonth] = useState(() => {
        return monthSeed.startOf('month');
    });
    const isMonthControlled = month !== undefined;
    const displayedMonth = (isMonthControlled ? month : uncontrolledMonth).startOf('month');

    // Roving tabindex (real focus fires `:focus-visible`). `null` until touched: never steals focus on mount.
    const [focusedDate, setFocusedDate] = useState<DateTime | null>(null);

    // Half-open range endpoint; never emitted. Preview follows the pointer, else the focused cell.
    const [uncontrolledPendingStart, setUncontrolledPendingStart] = useState<DateTime | null>(null);
    const isAnchorControlled = rangeAnchor !== undefined;
    const pendingStart = isAnchorControlled ? (rangeAnchor?.startOf('day') ?? null) : uncontrolledPendingStart;
    function setPendingStart(next: DateTime | null) {
        if (!isAnchorControlled) {
            setUncontrolledPendingStart(next);
        }
        onRangeAnchorChange?.(next);
    }
    const [hoveredDate, setHoveredDate] = useState<DateTime | null>(null);

    const cellsRef = useRef(new Map<number, HTMLButtonElement | null>());
    const wantsFocusRef = useRef(false);

    // Arrowing past a month edge re-renders the grid: focus after commit, from the fresh ref map.
    // `wantsFocusRef` stops it re-focusing after click/tab.
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

    // `mode` is fixed: a value cannot convert between shapes, so it is dropped and reported loudly.
    const [lastMode, setLastMode] = useState(mode);
    if (lastMode !== mode) {
        // Reset during render (React's documented pattern); an effect would paint stale first.
        setLastMode(mode);
        setUncontrolledValue(null);
        setUncontrolledPendingStart(null);
        setHoveredDate(null);
        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console -- misuse report, dev only
            console.error(
                'Calendar: `mode` changed on a mounted calendar. The value has been reset to null — a single date ' +
                    'and a range cannot be converted into one another. Remount the calendar (a `key` per mode) ' +
                    'instead of switching `mode` in place.'
            );
        }
    }

    const isRangeMode = mode === 'range';

    // `Field` context wins over the prop.
    const fieldState = useFieldState();
    const isDisabled = fieldState.disabled || disabled;

    // Bounds in the grid's zone: another zone could clamp navigation onto an instant no cell carries.
    const gridZone = displayedMonth.zone;
    const minDay = minDate === undefined ? null : minDate.setZone(gridZone).startOf('day');
    const maxDay = maxDate === undefined ? null : maxDate.setZone(gridZone).startOf('day');

    // Bounds and predicate are a union; the predicate cannot re-enable a day outside the bounds.
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

    function clampToBounds(date: DateTime) {
        if (minDay !== null && dayKey(date) < dayKey(minDay)) {
            return minDay;
        }
        if (maxDay !== null && dayKey(date) > dayKey(maxDay)) {
            return maxDay;
        }
        return date;
    }

    function goToMonth(next: DateTime) {
        const nextMonth = next.startOf('month');
        if (+nextMonth === +displayedMonth) {
            return;
        }
        if (!isMonthControlled) {
            setUncontrolledMonth(nextMonth);
        }
        onMonthChange?.(nextMonth);
    }

    useImperativeHandle(actionsRef, function createActions() {
        return {
            showToday: () => {
                goToMonth(clampToBounds(todayDate));
            },
        };
    });

    // The one cast the discriminated union costs: the two `onValueChange` signatures do not collapse.
    function commitValue(next: CalendarValue) {
        if (!isControlled) {
            setUncontrolledValue(next);
        }
        (onValueChange as ((emitted: CalendarValue) => void) | undefined)?.(next);
    }

    function selectDate(date: DateTime) {
        const next = date.startOf('day');
        // Clicking the selected day is a no-op; clearing is the caller's via `value={null}`.
        if (selectedDate !== null && dayKey(selectedDate) === dayKey(next)) {
            return;
        }
        commitValue(next);
    }

    // Three-click cycle: open (nothing emitted) → close (`orderRange` swaps a backwards pick; one-day range
    // legal) → restart (emit `null` first so a controlled caller drops the old range, then open on that day).
    function selectRangeEndpoint(date: DateTime) {
        const next = date.startOf('day');
        if (pendingStart !== null) {
            setPendingStart(null);
            setHoveredDate(null);
            commitValue(orderRange(pendingStart, next));
            return;
        }
        if (rangeValue !== null && !isAnchorControlled) {
            commitValue(null);
        }
        setPendingStart(next);
    }

    function selectAt(date: DateTime) {
        if (isRangeMode) {
            selectRangeEndpoint(date);
        } else {
            selectDate(date);
        }
    }

    function moveFocusTo(date: DateTime) {
        const next = clampToBounds(date.startOf('day'));
        goToMonth(next);
        // Keyboard takes the preview back from the pointer.
        setHoveredDate(null);
        wantsFocusRef.current = true;
        setFocusedDate(next);
    }

    function handleCellKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: DateTime) {
        if (event.key === 'Enter' || event.key === ' ') {
            // Space would scroll the surrounding popover.
            event.preventDefault();
            if (!isDayDisabled(date)) {
                selectAt(date);
            }
            return;
        }
        const target = keyTarget(event, date);
        if (target === null) {
            return;
        }
        event.preventDefault();
        moveFocusTo(target);
    }

    // Idempotent: a fresh `DateTime` for the same instant would re-render the grid for nothing.
    function handleCellFocus(date: DateTime) {
        setFocusedDate((previous) => {
            return previous !== null && dayKey(previous) === dayKey(date) ? previous : date;
        });
    }

    // `Escape` is the calendar's only while a range is half-open; otherwise it belongs to the wrapping popover.
    function handleRootKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key !== 'Escape' || pendingStart === null) {
            return;
        }
        event.stopPropagation();
        setPendingStart(null);
        setHoveredDate(null);
    }

    // Drawn range: committed, or the half-open endpoint plus the preview. Disabled calendar: no band.
    const previewEnd =
        pendingStart === null ? null : (hoveredDate ?? focusedDate ?? farEndOf(pendingStart, rangeValue));
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

    function isInDisplayedMonth(date: DateTime) {
        return date.hasSame(displayedMonth, 'month');
    }

    // Tab stop: focused → selected/anchor → today → the 1st, each only if rendered (else the grid has none).
    const focusCandidate = focusedDate !== null && isInDisplayedMonth(focusedDate) ? focusedDate : null;
    const selectionAnchor = selectedDate ?? pendingStart ?? rangeValue?.start.startOf('day') ?? null;
    const selectedCandidate = selectionAnchor !== null && isInDisplayedMonth(selectionAnchor) ? selectionAnchor : null;
    const todayCandidate = isInDisplayedMonth(todayDate) ? todayDate : null;
    const tabbableKey = dayKey(focusCandidate ?? selectedCandidate ?? todayCandidate ?? displayedMonth);

    const headingId = useId();
    const headingLabel = displayedMonth.setLocale(LOCALE).toFormat('MMMM yyyy');
    const weeks = buildMonthGrid(displayedMonth);

    const atMin = minDay !== null && +displayedMonth <= +minDay.startOf('month');
    const atMax = maxDay !== null && +displayedMonth >= +maxDay.startOf('month');

    const daySizeClassName = daySizeVariants({ fullWidth });
    const weekdayWidth = fullWidth ? '' : 'w-6xl';

    return (
        // A listener for bubbling Escape from the cells/chevrons, not a control.
        // eslint-disable-next-line jsx-a11y-x/no-static-element-interactions
        <div
            className={cn`${rootVariants({ fullWidth })} ${className}`}
            onKeyDown={handleRootKeyDown}
            {...presence('data-disabled', isDisabled)}
        >
            <div className={HEADER_CLASSES}>
                <button
                    type="button"
                    aria-label="Previous month"
                    className={NAV_CLASSES}
                    disabled={isDisabled || atMin}
                    onClick={() => {
                        goToMonth(displayedMonth.minus({ months: 1 }));
                    }}
                >
                    <ChevronLeftIcon aria-hidden />
                </button>
                {/* `aria-live`: paging otherwise announces nothing. Reflects the displayed month, never the value. */}
                <span id={headingId} aria-live="polite" className={HEADING_CLASSES}>
                    {headingLabel}
                </span>
                <button
                    type="button"
                    aria-label="Next month"
                    className={NAV_CLASSES}
                    disabled={isDisabled || atMax}
                    onClick={() => {
                        goToMonth(displayedMonth.plus({ months: 1 }));
                    }}
                >
                    <ChevronRightIcon aria-hidden />
                </button>
            </div>

            {/* Semantic table: `role="grid"` for the keyboard model, `<th scope="col">` for column relations. */}
            <table
                role="grid"
                aria-labelledby={headingId}
                className={tableVariants({ fullWidth })}
                onPointerLeave={() => {
                    setHoveredDate(null);
                }}
            >
                <thead>
                    <tr>
                        {WEEKDAYS.map((weekday) => {
                            return (
                                <th
                                    key={weekday.long}
                                    scope="col"
                                    abbr={weekday.long}
                                    className={cn`${WEEKDAY_CLASSES} ${weekdayWidth}`}
                                >
                                    {weekday.short}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {weeks.map((week, weekIndex) => {
                        const rowEdges = drawnRowEdges(week);
                        return (
                            // Always six rows; the index is a stable identity.
                            // eslint-disable-next-line @eslint-react/no-array-index-key
                            <tr key={weekIndex}>
                                {week.map((cell, dayIndex) => {
                                    if (cell.date === null) {
                                        return (
                                            <td
                                                // eslint-disable-next-line @eslint-react/no-array-index-key
                                                key={`blank-${weekIndex}-${dayIndex}`}
                                                aria-hidden
                                                className={DAY_CELL}
                                            >
                                                {/* A block, so an all-blank trailing week still holds its height. */}
                                                <span className={cn`block ${daySizeClassName}`} />
                                            </td>
                                        );
                                    }

                                    const date = cell.date;
                                    const key = dayKey(date);
                                    const dayDisabled = isDayDisabled(date);
                                    const isToday = dayKey(todayDate) === key;

                                    // `position` is drawn (incl. preview) → band; `committed` is the value →
                                    // ground + `aria-selected`. A hover is not a selection.
                                    const position = displayRange === null ? null : positionInRange(date, displayRange);
                                    const committed = rangeValue === null ? null : positionInRange(date, rangeValue);

                                    // `data-selected` = light ground: single pick, range endpoints, half-open endpoint.
                                    const isCommittedEndpoint =
                                        committed === 'start' || committed === 'end' || committed === 'single';
                                    const isPendingEndpoint = pendingStart !== null && dayKey(pendingStart) === key;
                                    const isSelected = isRangeMode
                                        ? !isDisabled && (isCommittedEndpoint || isPendingEndpoint)
                                        : selectedDate !== null && dayKey(selectedDate) === key;

                                    const isBanded = position !== null && position !== 'single';

                                    return (
                                        // `aria-selected` on the gridcell; every day of a range is selected (a span).
                                        <td
                                            key={key}
                                            aria-selected={isRangeMode ? committed !== null : isSelected}
                                            aria-current={isToday ? 'date' : undefined}
                                            className={DAY_CELL}
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
                                                // Not `disabled`: stays focusable, so arrowing announces it.
                                                aria-disabled={dayDisabled || undefined}
                                                aria-label={date.setLocale(LOCALE).toLocaleString(DateTime.DATE_FULL)}
                                                className={cn`${DAY_CELL_CLASSES} ${daySizeClassName}`}
                                                onClick={() => {
                                                    if (!dayDisabled) {
                                                        selectAt(date);
                                                    }
                                                }}
                                                onPointerEnter={() => {
                                                    // Disabled days included: a range is a span; click refuses.
                                                    if (isRangeMode) {
                                                        setHoveredDate(date);
                                                    }
                                                }}
                                                onFocus={() => {
                                                    handleCellFocus(date);
                                                }}
                                                onKeyDown={(event) => {
                                                    handleCellKeyDown(event, date);
                                                }}
                                                {...presence('data-today', isToday)}
                                                {...presence('data-selected', isSelected)}
                                                {...presence('data-range-start', position === 'start')}
                                                {...presence('data-range-end', position === 'end')}
                                                {...presence('data-in-range', position === 'middle')}
                                                {...presence('data-row-start', isBanded && dayIndex === rowEdges.first)}
                                                {...presence('data-row-end', isBanded && dayIndex === rowEdges.last)}
                                                {...presence('data-disabled', dayDisabled)}
                                            >
                                                <span aria-hidden className={BAND_CLASSES} />
                                                <span aria-hidden className={GROUND_CLASSES} />
                                                <span className="relative">{date.day}</span>
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export { Calendar };
