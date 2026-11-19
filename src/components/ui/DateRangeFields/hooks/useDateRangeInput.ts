import type { DateRangeInput, OpenDateRange, UseDateRangeInputOptions, UseOpenDateRangeInputOptions } from '../types';
import type { DateInputBounds } from '../utils/dateInput';
import { useState } from 'react';
import {
    DATE_INPUT_INCOMPLETE_ERROR,
    DEFAULT_DATE_RANGE_LABELS,
    formatDateInput,
    getDateRangeMissingError,
    getDateRangeOrderError,
    maskDateInput,
    parseDateInput,
} from '../utils/dateInput';

/**
 * Two typed endpoints and the range they make: order, completeness as a pair, and write-back to the
 * `DateRange` a range `Calendar` shares the panel with. Text is state; the range is derived from it. Typing
 * writes text and recomputes the range; `setRange` writes the range and rewrites both boxes.
 */
export function useDateRangeInput(options: UseDateRangeInputOptions): DateRangeInput;
export function useDateRangeInput(options: UseOpenDateRangeInputOptions): DateRangeInput<OpenDateRange>;
export function useDateRangeInput({
    value,
    onValueChange,
    minDate,
    maxDate,
    labels = DEFAULT_DATE_RANGE_LABELS,
    endOptional = false,
}: UseDateRangeInputOptions | UseOpenDateRangeInputOptions): DateRangeInput<OpenDateRange> {
    // One body for both modes: a closed pair never publishes a null end, so widening the callback is sound.
    const publishRange = onValueChange as (next: OpenDateRange | null) => void;

    const [fromText, setFromText] = useState(() => {
        return formatDateInput(value?.start);
    });
    const [toText, setToText] = useState(() => {
        return formatDateInput(value?.end);
    });

    const bounds: DateInputBounds = { minDate, maxDate };

    // Validated every render, not on blur: the range is recomputed per keystroke.
    const fromResult = parseDateInput(fromText, bounds);
    const toResult = parseDateInput(toText, bounds);

    // Half-typed is an error only beside a filled neighbour; empty only beside a finished one (unless the end
    // may be open). Order is reported on the end box, typed second.
    const isFromPending = fromResult.status === 'incomplete';
    const isToPending = toResult.status === 'incomplete';
    const isFromBlank = fromResult.status === 'empty';
    const isToBlank = toResult.status === 'empty';
    const isOutOfOrder = Boolean(fromResult.date && toResult.date && toResult.date < fromResult.date);
    const isToMissing = isToBlank && fromResult.status === 'valid' && !endOptional;

    const fromError =
        fromResult.error ??
        (isFromPending && !isToBlank ? DATE_INPUT_INCOMPLETE_ERROR : null) ??
        (isFromBlank && toResult.status === 'valid' ? getDateRangeMissingError(labels.start) : null);

    const toError =
        toResult.error ??
        (isToPending && !isFromBlank ? DATE_INPUT_INCOMPLETE_ERROR : null) ??
        (isToMissing ? getDateRangeMissingError(labels.end) : null) ??
        (isOutOfOrder ? getDateRangeOrderError(labels) : null);

    // Not "no message showing": a lone half-typed box carries none by design and would pass as a silent clear.
    const isPairShaped = isFromBlank === isToBlank || (endOptional && isToBlank);
    const isValid = fromError === null && toError === null && !isFromPending && !isToPending && isPairShaped;

    /** Text → range: only when both hold a day in order, or a start beside an allowed empty end. */
    function publish(nextFrom: string, nextTo: string) {
        const start = parseDateInput(nextFrom, bounds).date;
        const endResult = parseDateInput(nextTo, bounds);
        const end = endResult.date;
        if (start && end && start <= end) {
            publishRange({ start, end });
            return;
        }
        if (start && endOptional && endResult.status === 'empty') {
            publishRange({ start, end: null });
            return;
        }
        publishRange(null);
    }

    /** The one path every keystroke/paste/deletion takes; bounds drive the year rule. */
    function handleFromChange(next: string) {
        const masked = maskDateInput(next, bounds);
        setFromText(masked);
        publish(masked, toText);
    }

    function handleToChange(next: string) {
        const masked = maskDateInput(next, bounds);
        setToText(masked);
        publish(fromText, masked);
    }

    function reset(next: OpenDateRange | null) {
        setFromText(formatDateInput(next?.start));
        setToText(formatDateInput(next?.end));
    }

    function setRange(next: OpenDateRange | null) {
        reset(next);
        publishRange(next);
    }

    return {
        from: { value: fromText, error: fromError, status: fromResult.status, onValueChange: handleFromChange },
        to: { value: toText, error: toError, status: toResult.status, onValueChange: handleToChange },
        isValid,
        setRange,
        reset,
    };
}
