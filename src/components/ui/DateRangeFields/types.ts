import type { ReactNode } from 'react';
import type { DateTime } from 'luxon';
import type { DateRange } from '@/components/ui/Calendar/types';
import type { DateInputBounds, DateInputStatus, DateRangeLabels } from './utils/dateInput';

/** One endpoint's bag from `useDateRangeInput`; spreads onto the drawn box. */
export type DateRangeInputField = {
    value: string;
    /** Message under the box, or `null`; presence marks the field invalid. */
    error: string | null;
    status: DateInputStatus;
    onValueChange: (next: string) => void;
};

/** A range whose end may be left open (`endOptional`). `end: null` is a deliberate open end, not a missing half. */
export type OpenDateRange = {
    start: DateTime;
    end: DateTime | null;
};

type DateRangeInputBaseOptions = DateInputBounds & {
    /** Names the pair messages quote; defaults to `From` / `To`. Set it whenever the boxes are labelled otherwise. */
    labels?: DateRangeLabels;
};

export type UseDateRangeInputOptions = DateRangeInputBaseOptions & {
    /** Owned by the caller; never written directly. */
    value: DateRange | null;
    /** Called when the pair becomes, or stops being, a complete ordered range. */
    onValueChange: (next: DateRange | null) => void;
    endOptional?: false;
};

/** A start alone is a finished value: an empty end box is valid and publishes `end: null`. */
export type UseOpenDateRangeInputOptions = DateRangeInputBaseOptions & {
    value: OpenDateRange | null;
    onValueChange: (next: OpenDateRange | null) => void;
    endOptional: true;
};

export type DateRangeInput<TRange extends OpenDateRange = DateRange> = {
    from: DateRangeInputField;
    to: DateRangeInputField;
    /** `true` for an empty pair (clearing is legal); `false` when a box is mid-way, broken or out of order. */
    isValid: boolean;
    /** Range → boxes → caller; wire a calendar's `onValueChange` here. */
    setRange: (next: TRange | null) => void;
    /** Reseed both boxes without calling `onValueChange` (a panel reopening on its applied value). */
    reset: (next: TRange | null) => void;
};

export type DateRangeFieldName = 'from' | 'to';

export type DateRangeFieldsProps = {
    /** The hook's field bags. */
    from: DateRangeInputField;
    to: DateRangeInputField;
    /** What each box shows over it. Display only: the messages quote the hook's `labels`. */
    fromLabel: string;
    toLabel: string;
    /** Told which box took focus — a surface that reveals its calendar on focus, say. */
    onFieldFocus?: (field: DateRangeFieldName) => void;
    /** Turns each calendar glyph into a `Show today` button (wire to `CalendarActions.showToday`). */
    onShowToday?: (field: DateRangeFieldName) => void;
    /** Replaces a box's calendar glyph — a clear button on a filled optional end, say. */
    fromEndAddon?: ReactNode;
    toEndAddon?: ReactNode;
    /** Merged onto the row. */
    className?: string;
    /** Merged onto each `Field.Root`. */
    fieldClassName?: string;
    /** Marks both boxes invalid — a message about the pair as a whole (an overlap, say). */
    invalid?: boolean;
};

export type DateRangeFieldProps = {
    /** Also the accessible name, through `Field.Label`. */
    label: string;
    field: DateRangeInputField;
    onFocus?: () => void;
    endAddon: ReactNode;
    className: string;
    /** Marks the box without a message of its own — the pair's message sits under the row. */
    invalid: boolean;
};
