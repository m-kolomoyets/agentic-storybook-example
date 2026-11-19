import { DateTime } from 'luxon';

/*
 * Typed-date vocabulary: a `MM/DD/YYYY` mask that refuses impossible digits, and bounds a finished day must
 * fall inside. An impossible segment (`13`, `04/31`, `2027`) is refused at the keystroke by `maskDateInput`;
 * what needs a later segment (`02/29/2026`, a day past the ceiling) is reported by `parseDateInput`.
 */

/** Doubles as the field's placeholder. */
export const DATE_INPUT_PLACEHOLDER = 'MM/DD/YYYY';

/** Luxon spelling; `MM`/`dd` zero-padded, which the mask guarantees. */
const DATE_INPUT_FORMAT = 'MM/dd/yyyy';

/** Ten characters; the mask never produces an eleventh. */
export const DATE_INPUT_MAX_LENGTH = 10;

/** Digit counts where the segments split. */
const MONTH_DIGITS = 2;
const DAY_DIGITS = 4;
const DATE_DIGITS = 8;

/** Floor: Unix epoch, local — the bottom of every timestamp the app can hold. */
export const EPOCH_START = DateTime.local(1970, 1, 1);

/** Ceiling for a box that takes future dates (the last day a 4-digit year can write). The default is today. */
export const DATE_INPUT_LAST_DAY = DateTime.local(9999, 12, 31);

/** Written down, not inherited: a bound quoted in an error must read in the mask's order. */
const LOCALE = 'en-US';

/** As an error message quotes it: `Jan 1, 1970`. */
function formatBound(date: DateTime): string {
    return date.setLocale(LOCALE).toFormat('MMM d, yyyy');
}

/* ── the messages ─────────────────────────────────────────────────────────── */

/** Never returned by `parseDateInput` (a legal prefix is quiet); raised by a caller, e.g. beside a filled neighbour. */
export const DATE_INPUT_INCOMPLETE_ERROR = `Enter the full date as ${DATE_INPUT_PLACEHOLDER}`;

/** The one segment rule the mask cannot enforce: the day is typed before its year (`02/29`). */
export function getDayInMonthError(month: DateTime): string {
    return `${month.setLocale(LOCALE).toFormat('MMMM yyyy')} has ${month.daysInMonth} days`;
}

/*
 * Calendar day only (`20260901`): the app mutates `Settings.defaultZone` to the bin's zone, so a typed day and
 * a `DateTime.local()` bound may sit in different zones. A bound is a calendar statement — no zone conversion.
 */
function toCalendarDay(date: DateTime): number {
    return date.year * 10000 + date.month * 100 + date.day;
}

/** Below the floor. */
export function getMinDateError(minDate: DateTime): string {
    return `Date must be on or after ${formatBound(minDate)}`;
}

/** Above the ceiling. Inclusive: the bound itself passes. */
export function getMaxDateError(maxDate: DateTime): string {
    return `Date must be on or before ${formatBound(maxDate)}`;
}

/** Fallback for text the mask never touched (`13/01/2026`). */
export const DATE_INPUT_INVALID_ERROR = 'Enter a real date';

/** The two endpoints' names as the pair messages quote them — the site's labels, minus `(optional)`. */
export type DateRangeLabels = {
    start: string;
    end: string;
};

export const DEFAULT_DATE_RANGE_LABELS: DateRangeLabels = { start: 'From', end: 'To' };

/** End before start, said on the end box. */
export function getDateRangeOrderError({ start, end }: DateRangeLabels): string {
    return `${end} must be on or after ${start}`;
}

/** `Add a From date` / `Add an End Date`: no second "date", and the article follows the noun. */
export function getDateRangeMissingError(label: string): string {
    const noun = /\bdate$/i.test(label) ? label : `${label} date`;
    const article = /^[aeiou]/i.test(noun) ? 'an' : 'a';
    return `Add ${article} ${noun} to complete the range`;
}

/* ── the mask ─────────────────────────────────────────────────────────────── */

/** February is 29: at that keystroke a leap year is still possible; `parseDateInput` settles it. */
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_MAX = 12;
const YEAR_DIGITS = 4;

/** Whether a partial year can still reach the bounds: `19` can, `196` cannot. */
function canYearReach(prefix: string, minYear: number, maxYear: number): boolean {
    const span = 10 ** (YEAR_DIGITS - prefix.length);
    const low = Number(prefix) * span;
    return low + span - 1 >= minYear && low <= maxYear;
}

export type DateInputBounds = {
    /** Inclusive floor. Defaults to `EPOCH_START`. */
    minDate?: DateTime;
    /** Inclusive ceiling. Defaults to today. */
    maxDate?: DateTime;
};

/**
 * Digits regrouped `MM/DD/YYYY`; a keystroke is accepted only if some complete date still starts with it. A
 * lone unambiguous digit is padded (`4` → `04`); `31` cannot be typed into April; the year stops once it
 * cannot reach the bounds. A typed separator pads and closes the open segment (`9/1/2026` → `09/01/2026`).
 * Refusal truncates: the first impossible digit ends the string, so a wrong-shaped paste keeps its prefix.
 */
export function maskDateInput(raw: string, bounds: DateInputBounds = {}): string {
    const { minDate = EPOCH_START, maxDate = DateTime.local() } = bounds;

    /* Month and day, left to right; `open` is the segment being typed. */
    const segments: string[] = [];
    let open = '';
    let year = '';

    function segmentMax() {
        return segments.length === 0 ? MONTH_MAX : (DAYS_IN_MONTH[Number(segments[0]) - 1] ?? 31);
    }

    /** Pad a lone digit and file the segment. */
    function close(): boolean {
        if (open === '') {
            return true;
        }
        const value = Number(open);
        if (value < 1 || value > segmentMax()) {
            return false;
        }
        segments.push(open.padStart(MONTH_DIGITS, '0'));
        open = '';
        return true;
    }

    for (const character of raw) {
        const isDigit = /\d/.test(character);

        // Year: a separator before it has nothing left to close; one inside it ends the input.
        if (segments.length === 2) {
            if (!isDigit) {
                if (year === '') {
                    continue;
                }
                break;
            }
            if (year.length >= YEAR_DIGITS || !canYearReach(`${year}${character}`, minDate.year, maxDate.year)) {
                break;
            }
            year += character;
            continue;
        }

        if (!isDigit) {
            if (!close()) {
                break;
            }
            continue;
        }

        const max = segmentMax();

        if (open === '') {
            // A first digit too large to start any value means the padded one.
            if (Number(character) > Math.floor(max / 10)) {
                segments.push(`0${character}`);
                continue;
            }
            open = character;
            continue;
        }

        const value = Number(`${open}${character}`);
        if (value < 1 || value > max) {
            break;
        }
        segments.push(`${open}${character}`);
        open = '';
    }

    return [...segments, segments.length === 2 ? year : open].filter(Boolean).join('/');
}

/** `04/08/2026`, or empty. */
export function formatDateInput(date: DateTime | null | undefined): string {
    return date ? date.toFormat(DATE_INPUT_FORMAT) : '';
}

/* ── the verdict ──────────────────────────────────────────────────────────── */

/** `empty` legal; `incomplete` legal prefix, quiet; `invalid` with `error`; `valid` with `date`. */
export type DateInputStatus = 'empty' | 'incomplete' | 'invalid' | 'valid';

export type DateInputResult = {
    status: DateInputStatus;
    /** `startOf('day')`, as `Calendar` emits. */
    date: DateTime | null;
    /** Message under the box, or `null`. */
    error: string | null;
};

const EMPTY_RESULT: DateInputResult = { status: 'empty', date: null, error: null };

function incomplete(): DateInputResult {
    return { status: 'incomplete', date: null, error: null };
}

function invalid(error: string): DateInputResult {
    return { status: 'invalid', date: null, error };
}

/** Segments first, then the assembled date, so each message names one box to fix. Bounds inclusive, by day. */
export function parseDateInput(text: string, bounds: DateInputBounds = {}): DateInputResult {
    const { minDate = EPOCH_START, maxDate = DateTime.local() } = bounds;
    const digits = text.replace(/\D/g, '');

    if (digits.length === 0) {
        return EMPTY_RESULT;
    }
    // Quiet while still typing — see `DATE_INPUT_INCOMPLETE_ERROR`.
    if (digits.length < DATE_DIGITS) {
        return incomplete();
    }

    const month = DateTime.local(Number(digits.slice(DAY_DIGITS)), Number(digits.slice(0, MONTH_DIGITS)));
    const day = Number(digits.slice(MONTH_DIGITS, DAY_DIGITS));
    let dayError: string | null = DATE_INPUT_INVALID_ERROR;
    if (month.isValid) {
        dayError = day > (month.daysInMonth ?? 31) ? getDayInMonthError(month) : null;
    }
    if (dayError !== null) {
        return invalid(dayError);
    }

    const parsed = DateTime.fromFormat(text, DATE_INPUT_FORMAT);
    // Only reachable for text the mask never saw.
    if (!parsed.isValid) {
        return invalid(DATE_INPUT_INVALID_ERROR);
    }

    const date = parsed.startOf('day');
    if (toCalendarDay(date) < toCalendarDay(minDate)) {
        return invalid(getMinDateError(minDate));
    }
    if (toCalendarDay(date) > toCalendarDay(maxDate)) {
        return invalid(getMaxDateError(maxDate));
    }
    return { status: 'valid', date, error: null };
}
