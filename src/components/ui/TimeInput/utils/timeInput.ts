import type { Meridiem, TimeOfDayDisplay, ToTimeValue } from '../types';

/*
 * 12-hour display ↔ 24-hour stored value. The 12-hour clock is display only — converted here on
 * the way in and out, never stored.
 */

/** The prompt an empty field shows: an example of what parses, not a mask. */
export const TIME_INPUT_PLACEHOLDER = '2:15';

/** For a caller validating the stored value — named in the field's own vocabulary. */
export const TIME_INPUT_INVALID_ERROR = 'Enter a time like 2:15 PM';

/** Padded 24-hour `HH:mm` — what `<input type="time">` and luxon's `HH:mm` speak. */
export const TIME_VALUE_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** `H:MM` / `HH:MM` — the longest text the mask produces. */
export const TIME_INPUT_MAX_LENGTH = 5;

const HOURS_PER_HALF_DAY = 12;
const MINUTES_PER_HOUR = 60;
const LAST_HOUR = 23;
const LAST_MINUTE = 59;

/** A stored value: 24-hour, hour padded or not, minutes optional. */
const VALUE_PATTERN = /^(\d{1,2})(?::(\d{2}))?$/;
/** Typed text with a colon: `2:15`, `02:15`. */
const COLON_TEXT_PATTERN = /^(\d{1,2}):(\d{2})$/;
/** Typed text without one: `2`, `215`, `0215`. */
const DIGITS_TEXT_PATTERN = /^\d{1,4}$/;
/** A trailing half-of-day the user typed: `pm`, `p`, `a.m.`. */
const MERIDIEM_SUFFIX_PATTERN = /\s*([ap])\.?\s*(?:m\.?)?$/i;

type ClockPosition = { hour: number; minute: number };

/**
 * Keystroke mask for a 12-hour clock: digits only, `:` inserted, and any digit that could not lead
 * to a valid time refused. `1` waits for `0`–`2` (a `3`–`9` after it is the minutes' tens); `0`
 * waits for `1`–`9`; `2`–`9` is a whole hour. While `deleting`, a trailing `:` is dropped — else a
 * backspace over the auto-inserted colon would be re-added and leave the user stuck.
 */
export function maskTimeText(raw: string, deleting = false): string {
    let hour = '';
    let hourDone = false;
    let minutes = '';

    function takeMinute(ch: string) {
        if (minutes.length === 0 && Number(ch) > 5) {
            return;
        }
        if (minutes.length < 2) {
            minutes += ch;
        }
    }

    for (const ch of raw.replace(/\D/g, '')) {
        if (hourDone) {
            takeMinute(ch);
            continue;
        }
        const n = Number(ch);
        if (hour === '') {
            hour = ch;
            hourDone = n >= 2;
            continue;
        }
        if (hour === '0') {
            if (n === 0) {
                continue;
            }
            hour += ch;
            hourDone = true;
            continue;
        }
        // hour === '1'
        hourDone = true;
        if (n <= 2) {
            hour += ch;
        } else {
            takeMinute(ch);
        }
    }

    const text = hourDone ? `${hour}:${minutes}` : hour;
    return deleting && text.endsWith(':') ? text.slice(0, -1) : text;
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

/** Padded `HH:mm`. The default `ToTimeValue`. */
export function formatTimeValue(hour: number, minute: number): string {
    return `${pad(hour)}:${pad(minute)}`;
}

function parseValue(value: string): ClockPosition | null {
    const match = VALUE_PATTERN.exec(value.trim());
    if (match === null) {
        return null;
    }

    const hour = Number(match[1]);
    const minute = match[2] === undefined ? 0 : Number(match[2]);
    if (hour > LAST_HOUR || minute > LAST_MINUTE) {
        return null;
    }

    return { hour, minute };
}

/** Whether a stored value is a clock position, rather than the `''` of an unanswered field. */
export function isTimeValue(value: string): boolean {
    return parseValue(value) !== null;
}

/** Minutes since midnight, or `null` — for ordering (`'9:30' > '10:00'` as strings). */
export function toMinutesOfDay(value: string): number | null {
    const parsed = parseValue(value);
    return parsed === null ? null : parsed.hour * MINUTES_PER_HOUR + parsed.minute;
}

/** A stored value as drawn. Both noons are `12`. A value the pattern rejects is drawn as itself. */
export function toDisplayTime(value: string): TimeOfDayDisplay {
    const parsed = parseValue(value);
    if (parsed === null) {
        return { text: value, meridiem: 'AM' };
    }

    const meridiem: Meridiem = parsed.hour >= HOURS_PER_HALF_DAY ? 'PM' : 'AM';
    const hour = parsed.hour % HOURS_PER_HALF_DAY;
    const clockHour = hour === 0 ? HOURS_PER_HALF_DAY : hour;

    return { text: `${clockHour}:${pad(parsed.minute)}`, meridiem };
}

function to24Hour(clockHour: number, meridiem: Meridiem): number {
    const hour = clockHour % HOURS_PER_HALF_DAY;
    return meridiem === 'PM' ? hour + HOURS_PER_HALF_DAY : hour;
}

function parseClockText(text: string): ClockPosition | null {
    const colon = COLON_TEXT_PATTERN.exec(text);
    if (colon !== null) {
        return { hour: Number(colon[1]), minute: Number(colon[2]) };
    }

    if (!DIGITS_TEXT_PATTERN.test(text)) {
        return null;
    }
    // `2` / `14` are bare hours; `215` / `1430` end in their minutes.
    if (text.length <= 2) {
        return { hour: Number(text), minute: 0 };
    }
    return { hour: Number(text.slice(0, -2)), minute: Number(text.slice(-2)) };
}

/**
 * Typed text as a value, or `null` (caller keeps the last good value). Read in `meridiem`; a typed
 * suffix (`2:15 pm`) outranks it; `0:xx` and `13:00`–`23:59` are unambiguous 24-hour times.
 */
export function parseDisplayTime(
    text: string,
    meridiem: Meridiem,
    toValue: ToTimeValue = formatTimeValue
): string | null {
    // A finished hour the mask already put a `:` after (`2:`) is that hour on the dot.
    let body = text.trim().replace(/:$/, '');
    let effectiveMeridiem = meridiem;

    const suffix = MERIDIEM_SUFFIX_PATTERN.exec(body);
    if (suffix !== null) {
        effectiveMeridiem = suffix[1].toLowerCase() === 'p' ? 'PM' : 'AM';
        body = body.slice(0, suffix.index).trim();
    }

    const parsed = parseClockText(body);
    if (parsed === null) {
        return null;
    }

    const { hour, minute } = parsed;
    if (hour > LAST_HOUR || minute > LAST_MINUTE) {
        return null;
    }

    if (hour === 0 || hour > HOURS_PER_HALF_DAY) {
        if (suffix !== null && hour > HOURS_PER_HALF_DAY && effectiveMeridiem === 'AM') {
            return null;
        }
        return toValue(hour, minute);
    }

    return toValue(to24Hour(hour, effectiveMeridiem), minute);
}

/** The same clock position in the wanted half of the day. Non-times are returned untouched. */
export function withMeridiem(value: string, meridiem: Meridiem, toValue: ToTimeValue = formatTimeValue): string {
    const parsed = parseValue(value);
    if (parsed === null) {
        return value;
    }

    return toValue(to24Hour(parsed.hour % HOURS_PER_HALF_DAY, meridiem), parsed.minute);
}
