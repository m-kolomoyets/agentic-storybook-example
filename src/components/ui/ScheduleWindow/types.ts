import type { ReactNode } from 'react';
import type { SelectOption } from '@/components/ui/OptionList/types';
import type { ScheduleMode } from '@/lib/ui/scheduleMode';

export type ScheduleWindowValue = {
    /** A `dayOptions` value; opaque here (callers build `MM/dd/yyyy`). */
    day: string;
    /** 24-hour, unpadded, on the half hour — `13:30`. */
    time: string;
};

/** Rail state. Only `running` draws differently; `stopped` draws as `scheduled`. */
export type ScheduleWindowStatus = 'scheduled' | 'running' | 'stopped';

export type ScheduleWindowEnd = 'start' | 'end';

export type ScheduleWindowProps = {
    start: ScheduleWindowValue;
    end: ScheduleWindowValue;
    /** Day options; only `end` carries `Forever`. */
    startDayOptions: SelectOption[];
    endDayOptions: SelectOption[];
    /** Time options for both cells unless `endTimeOptions` overrides the end. */
    timeOptions: SelectOption[];
    /** End cell's list when the end floors differently from the start. */
    endTimeOptions?: SelectOption[];
    onStartChange?: (value: ScheduleWindowValue) => void;
    onEndChange?: (value: ScheduleWindowValue) => void;
    /** Draws the day cells as chevron-less buttons that fire this instead of opening a list. `readOnly` wins. */
    onDayPress?: (end: ScheduleWindowEnd) => void;
    /** Drawn as text, out of the tab order, no chevron. */
    readOnly?: boolean;
    /** Placeholder ink for an empty day cell. */
    dayPlaceholder?: string;
    /** Same, for a time cell. */
    timePlaceholder?: string;
    /** `6h 0m`, formatted by the caller. */
    runtime: string;
    /** `38°F · 51% RH`; a dash is drawn when undefined. */
    avgWeather?: string;
    /** The trash. Absent when undefined, not disabled. */
    onDelete?: () => void;
    /** Weather chart slot, beside the lines; this component imports no plotting library. */
    chart?: ReactNode;
    /** Only `running` strokes the box; `scheduled` and `stopped` draw alike. */
    status?: ScheduleWindowStatus;
    /** Picks the running-border and rail gradient. Default `cooling`. */
    mode?: ScheduleMode;
    /** Per-row message drawn inside the row, under its two lines. */
    message?: ReactNode;
    disabled?: boolean;
    /**
     * Row's place in a list mounting together: the four cells flip in on mount, staggered, and row
     * `n` starts once row `n - 1` has finished. Undefined for a row added later — it draws at once.
     */
    entranceIndex?: number;
    className?: string;
};
