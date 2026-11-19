/** Aeration schedule modes and their colour ramps, shared by `Meter`, `ScheduleCard` and `ScheduleWindow`. */
export type ScheduleMode = 'cooling' | 'drying' | 'reconditioning' | 'custom' | 'manual';

export const DEFAULT_SCHEDULE_MODE: ScheduleMode = 'cooling';

/** Gradient stops (`bg-linear-*` / `stroke`) for a mode's outline. */
export const SCHEDULE_MODE_STROKE: Record<ScheduleMode, string> = {
    cooling: 'from-schedule-cooling-stroke-start to-schedule-cooling-stroke-end',
    drying: 'from-schedule-drying-stroke-start to-schedule-drying-stroke-end',
    reconditioning: 'from-schedule-reconditioning-stroke-start to-schedule-reconditioning-stroke-end',
    custom: 'from-schedule-custom-stroke-start to-schedule-custom-stroke-end',
    manual: 'from-schedule-manual-stroke-start to-schedule-manual-stroke-end',
};

/** Re-points `Progress`'s fill tokens at a mode's ramp. */
export const SCHEDULE_MODE_PROGRESS: Record<ScheduleMode, string> = {
    cooling:
        '[--color-surface-progress-fill-start:var(--color-schedule-cooling-progress-start)] [--color-surface-progress-fill-end:var(--color-schedule-cooling-progress-end)]',
    drying: '[--color-surface-progress-fill-start:var(--color-schedule-drying-progress-start)] [--color-surface-progress-fill-end:var(--color-schedule-drying-progress-end)]',
    reconditioning:
        '[--color-surface-progress-fill-start:var(--color-schedule-reconditioning-progress-start)] [--color-surface-progress-fill-end:var(--color-schedule-reconditioning-progress-end)]',
    custom: '[--color-surface-progress-fill-start:var(--color-schedule-custom-progress-start)] [--color-surface-progress-fill-end:var(--color-schedule-custom-progress-end)]',
    manual: '[--color-surface-progress-fill-start:var(--color-schedule-manual-progress-start)] [--color-surface-progress-fill-end:var(--color-schedule-manual-progress-end)]',
};

/** Re-points `Meter`'s fill tokens at a mode's ramp. */
export const SCHEDULE_MODE_METER_FILL: Record<ScheduleMode, string> = {
    cooling:
        '[--color-surface-meter-fill-start:var(--color-schedule-cooling-progress-start)] [--color-surface-meter-fill-end:var(--color-schedule-cooling-progress-end)]',
    drying: '[--color-surface-meter-fill-start:var(--color-schedule-drying-progress-start)] [--color-surface-meter-fill-end:var(--color-schedule-drying-progress-end)]',
    reconditioning:
        '[--color-surface-meter-fill-start:var(--color-schedule-reconditioning-progress-start)] [--color-surface-meter-fill-end:var(--color-schedule-reconditioning-progress-end)]',
    custom: '[--color-surface-meter-fill-start:var(--color-schedule-custom-progress-start)] [--color-surface-meter-fill-end:var(--color-schedule-custom-progress-end)]',
    manual: '[--color-surface-meter-fill-start:var(--color-schedule-manual-progress-start)] [--color-surface-meter-fill-end:var(--color-schedule-manual-progress-end)]',
};

export const SCHEDULE_MODE_TEXT: Record<ScheduleMode, string> = {
    cooling: 'text-text-tag-quinary',
    drying: 'text-text-tag-septenary',
    reconditioning: 'text-text-tag-senary',
    custom: 'text-text-general-strong',
    manual: 'text-text-tag-positive',
};
