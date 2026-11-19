import type { RefObject } from 'react';
import type { DateTime } from 'luxon';

/** Closed range; `start <= end` is maintained by the calendar. */
export type DateRange = {
    start: DateTime;
    end: DateTime;
};

/** Commands a caller can send the calendar, through `actionsRef`. */
export type CalendarActions = {
    /** Pages to today's month (clamped to the bounds), controlled month or not. Selects nothing. */
    showToday: () => void;
};

type CalendarBaseProps = {
    /** Falls back to the value's month, else `today`'s. */
    defaultMonth?: DateTime;
    month?: DateTime;
    onMonthChange?: (month: DateTime) => void;
    /** Base UI's `actionsRef` shape: lets a control outside the grid page it without owning `month`. */
    actionsRef?: RefObject<CalendarActions | null>;
    minDate?: DateTime;
    maxDate?: DateTime;
    /** Judges a date; the cell is drawn disabled. */
    isDateDisabled?: (date: DateTime) => boolean;
    /** Ambient-zone today; overridable for deterministic stories/tests. */
    today?: DateTime;
    disabled?: boolean;
    /** Fill the parent's width instead of the 336px grid. Cells widen (never under 48px); height stays 48px. */
    fullWidth?: boolean;
    /** Merged onto the root. */
    className?: string;
    /** No label/helper/error text. */
    children?: never;
};

/* Discriminated on `mode`, not on `value`'s shape — inference breaks on `null`. */
type CalendarModeProps =
    | {
          mode?: 'single';
          value?: DateTime | null;
          defaultValue?: DateTime | null;
          onValueChange?: (value: DateTime | null) => void;
          rangeAnchor?: never;
          onRangeAnchorChange?: never;
      }
    | {
          mode: 'range';
          value?: DateRange | null;
          defaultValue?: DateRange | null;
          onValueChange?: (value: DateRange | null) => void;
          /**
           * The half-open endpoint, controlled: the next pick closes the range on it. `undefined` leaves it to
           * the calendar. A caller that owns it hears every open/close/Escape via `onRangeAnchorChange`, and
           * owns the old range on a restart — no `null` is emitted for it.
           */
          rangeAnchor?: DateTime | null;
          onRangeAnchorChange?: (anchor: DateTime | null) => void;
      };

export type CalendarProps = CalendarBaseProps & CalendarModeProps;
