import type { DateTime } from 'luxon';
import type { DateRange } from '@/components/ui/Calendar/types';

export type DayRangeStripProps = {
    /** First day drawn; normalised to `startOf('day')`, and its zone is the strip's throughout. */
    start: DateTime;
    /** Consecutive days drawn, the first included. @default 7 */
    count?: number;
    value?: DateRange | null;
    defaultValue?: DateRange | null;
    onValueChange?: (value: DateRange | null) => void;
    minDate?: DateTime;
    maxDate?: DateTime;
    /** Judges a date; the cell draws disabled. */
    isDateDisabled?: (date: DateTime) => boolean;
    /** Ambient-zone today; overridable for deterministic stories and tests. */
    today?: DateTime;
    disabled?: boolean;
    /**
     * Strokes unselected days `Border/negative` and sets `aria-invalid` on the grid. A surrounding
     * `Field.Root invalid` does the same. The message is the caller's.
     */
    invalid?: boolean;
    className?: string;
    children?: never;
};
