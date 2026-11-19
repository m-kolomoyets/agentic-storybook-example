import type { ReactNode } from 'react';
import type { ScheduleMode } from '@/lib/ui/scheduleMode';

/** Progress bar state. `running` and `default` draw the same bar; `stopped` uses the flat fill. */
export type ScheduleCardProgressState = 'running' | 'stopped' | 'default';

export type ScheduleCardProgress = {
    /** `0`–`100`. Clamped and announced by `Progress`. */
    value: number;
    state: ScheduleCardProgressState;
};

export type ScheduleCardEmpty = {
    title: ReactNode;
    description?: ReactNode;
};

/** Overlay chip tint: `negative` = fan failed to start, `warning` = run interrupted. */
export type ScheduleCardOverlayStatus = 'negative' | 'warning';

/** Washed layer over the run windows; one line, no description. */
export type ScheduleCardOverlay = {
    status: ScheduleCardOverlayStatus;
    title: ReactNode;
};

export type ScheduleCardProps = {
    /** `null` draws no title (the no-data state). @default 'Schedule' */
    title?: ReactNode;
    /** Meta line: date and time behind calendar/clock glyphs. */
    date?: ReactNode;
    time?: ReactNode;
    /** Automation form of the meta line. Replaces `date`/`time` and hides `onAdd`. */
    automationNote?: ReactNode;
    /** Count pill; with `onOpenChange` the pill is the toggle and carries the chevron. */
    count?: number;
    /** The `+`. Absent when undefined. */
    onAdd?: () => void;
    /**
     * `false` draws only the first child; the rest stay mounted, collapsed and `inert` so the height
     * animates. A row that must not render at all should not be passed.
     */
    open?: boolean;
    /** Chevron click. The chevron is drawn only when this is passed; `open` alone still truncates. */
    onOpenChange?: (open: boolean) => void;
    /** `ScheduleWindow` elements. Optional: some states have no list. */
    children?: ReactNode;
    /** Bar under the list. `undefined` draws none. */
    progress?: ScheduleCardProgress;
    /** Picks the progress gradient; pass the same value to the rows. @default 'cooling' */
    mode?: ScheduleMode;
    /** Wash over the run windows. With no children, drawn at one window's height. */
    overlay?: ScheduleCardOverlay;
    /** Neutral slab above the list (e.g. `On Site Manual Run`). Independent of `overlay`. */
    notice?: ReactNode;
    /** Replaces the body with the empty state. */
    empty?: ScheduleCardEmpty;
    /** Red line under the card, not inside it. */
    validationMessage?: ReactNode;
    className?: string;
};
