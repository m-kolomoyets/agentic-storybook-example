import type { DateTime } from 'luxon';

/*
 * Pure luxon date math. Never reads ambient state (`DateTime.now()`, `Settings.defaultZone`): the app
 * mutates the default zone per grain bin, so every `DateTime` derives from the one passed in.
 */

/** Sunday-first, `en-US`, hardcoded. */
const DAYS_PER_WEEK = 7;

/** Always six week rows, so paging never resizes the popover. */
const WEEKS_PER_GRID = 6;

/** A grid square. `date: null` is a blank cell, not a greyed adjacent-month day. */
export type CalendarCell = {
    date: DateTime | null;
};

/** Six rows of seven, Sunday-first. `month` is any instant in the wanted month; its zone is the grid's. */
export function buildMonthGrid(month: DateTime): CalendarCell[][] {
    const firstDay = month.startOf('month').startOf('day');

    /* luxon weekdays: 1 = Monday, 7 = Sunday. `% 7` folds Sunday to 0 = leading-blank count. */
    const leadingBlanks = firstDay.weekday % DAYS_PER_WEEK;
    const daysInMonth = firstDay.daysInMonth ?? 0;

    const cells: CalendarCell[] = Array.from({ length: WEEKS_PER_GRID * DAYS_PER_WEEK }, (_unused, index) => {
        const dayOffset = index - leadingBlanks;
        const isInMonth = dayOffset >= 0 && dayOffset < daysInMonth;
        return { date: isInMonth ? firstDay.plus({ days: dayOffset }).startOf('day') : null };
    });

    return Array.from({ length: WEEKS_PER_GRID }, (_unused, row) => {
        return cells.slice(row * DAYS_PER_WEEK, (row + 1) * DAYS_PER_WEEK);
    });
}

/** A day's identity as one number: the instant of its midnight. Two `DateTime`s for a day are never `===`. */
export function dayKey(date: DateTime) {
    return +date.startOf('day');
}

/** Where a date sits relative to a range; `null` when nowhere. */
export type RangePosition = 'start' | 'end' | 'middle' | 'single' | null;

/**
 * `'single'` when both endpoints are the same day or `end` is `null` (half-open). Every day between endpoints
 * is `'middle'`, disabled or not. Assumes `start <= end` and a shared zone.
 */
export function positionInRange(date: DateTime, range: { start: DateTime; end: DateTime | null }): RangePosition {
    const day = date.startOf('day');
    const start = range.start.startOf('day');
    const end = range.end?.startOf('day') ?? null;

    if (end === null || +start === +end) {
        return +day === +start ? 'single' : null;
    }
    if (+day === +start) {
        return 'start';
    }
    if (+day === +end) {
        return 'end';
    }
    return +day > +start && +day < +end ? 'middle' : null;
}

/** Orders a pair so `start <= end`; both ends normalised to `startOf('day')`. */
export function orderRange(endpoint: DateTime, otherEndpoint: DateTime): { start: DateTime; end: DateTime } {
    const first = endpoint.startOf('day');
    const second = otherEndpoint.startOf('day');
    return +first <= +second ? { start: first, end: second } : { start: second, end: first };
}
