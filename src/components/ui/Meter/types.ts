import type { ScheduleMode } from '@/lib/ui/scheduleMode';

/** `progress` gradient fill (fan bar), `level` flat lavender (inventory), `score` full-width ramp, no fill (risk). */
export type MeterVariant = 'progress' | 'level' | 'score';

export type MeterProps = {
    /** Reading, clamped to `0…max`; `aria-valuenow` and the pointer use the same clamped number. */
    value: number;
    /** @default 100 */
    max?: number;
    /** Accessible name (`aria-label`); draws nothing. Required — `caption` is optional. */
    label: string;
    variant: MeterVariant;
    /** Ramps the `progress` fill in the mode's colours. Ignored by `level` and `score`. */
    mode?: ScheduleMode;
    /** `aria-valuetext`, e.g. `"62% full"`. Defaults to the rounded percentage of `max`. */
    valueText?: string;
    /** Line under the bar — `% Full`, `Risk Score`. */
    caption?: string;
    /** Merged onto the block (bar and caption). */
    className?: string;
};
