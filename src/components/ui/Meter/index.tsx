import type { MeterProps, MeterVariant } from './types';
import { cn } from '@/lib/cn';
import { SCHEDULE_MODE_METER_FILL } from '@/lib/ui/scheduleMode';

const ROOT_CLASSES = 'flex w-full flex-col gap-meter-gap';

/* No `overflow-hidden`: the pointer overhangs the bar's bottom edge by design. */
const TRACK_CLASSES = 'relative h-meter-track w-full rounded-meter';

const TRACK_PAINT: Record<MeterVariant, string> = {
    progress: 'bg-surface-datavis-surface-micro-display',
    level: 'bg-surface-datavis-surface-micro-display',
    score: 'meter-track-score',
};

const FILL_CLASSES = 'absolute inset-y-none left-none rounded-meter';

/* `score` has no fill: the ramp colour under the pointer is the answer. */
const FILL_PAINT: Record<MeterVariant, string | null> = {
    progress: 'meter-fill-progress',
    level: 'bg-color-chart-line-hardware-1',
    score: null,
};

const POINTER_CLASSES = 'pointer-events-none absolute top-meter-pointer-drop size-meter-pointer -translate-x-1/2';

/**
 * Where a reading sits in its range: a 10px bar with a pointer, optional caption. `role="meter"`
 * (a gauge reading), not `progressbar`. Figma: `Micro-Display Container` I9256:44159.
 */
function Meter({ value, max = 100, label, variant, mode, valueText, caption, className }: MeterProps) {
    const clamped = Math.min(Math.max(value, 0), max);
    const fraction = max > 0 ? clamped / max : 0;
    const percent = fraction * 100;

    // The mode overrides are custom properties the fill's `var()`s resolve against; only `progress` reads them.
    const modePaint = mode === undefined || variant !== 'progress' ? '' : SCHEDULE_MODE_METER_FILL[mode];
    const fillPaint = FILL_PAINT[variant];

    return (
        <div className={cn`${ROOT_CLASSES} ${modePaint} ${className}`}>
            <div
                role="meter"
                aria-label={label}
                aria-valuenow={clamped}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuetext={valueText ?? `${Math.round(percent)}%`}
                data-variant={variant}
                className={cn`${TRACK_CLASSES} ${TRACK_PAINT[variant]}`}
            >
                {fillPaint === null ? null : (
                    <div
                        data-part="fill"
                        className={cn`${FILL_CLASSES} ${fillPaint}`}
                        style={{ width: `${percent}%` }}
                    />
                )}
                <div
                    data-part="pointer"
                    // Clamped by the pointer's half-width so it stays a whole triangle at 0 and 100.
                    style={{ left: `clamp(var(--spacing-s), ${percent}%, calc(100% - var(--spacing-s)))` }}
                    className={POINTER_CLASSES}
                >
                    {/* `block`: an inline svg sits on the baseline and drops the triangle below the bar. */}
                    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false" className="block size-full">
                        <path
                            d="M9.89746 1.75C10.667 1.75021 11.1483 2.58346 10.7637 3.25L6.86621 10C6.48131 10.6667 5.51869 10.6667 5.13379 10L1.2373 3.25C0.852469 2.58344 1.33297 1.75029 2.10254 1.75H9.89746Z"
                            transform="matrix(1 0 0 -1 0 12)"
                            strokeWidth="1.5"
                            className="fill-text-general-strong stroke-surface-ground"
                        />
                    </svg>
                </div>
            </div>
            {caption === undefined ? null : (
                <p className="text-center text-caption-m-medium leading-[12px] text-text-general-medium">{caption}</p>
            )}
        </div>
    );
}

export { Meter };
