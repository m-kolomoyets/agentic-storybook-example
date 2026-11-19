import type { ProgressProps } from './types';
import { Progress as BaseProgress } from '@base-ui/react/progress';
import { cn } from '@/lib/cn';

/*
 * The root is the track (no `Progress.Track`: Figma draws two boxes). `rounded-m` is 12px — Figma's
 * `Radius/l` value; the repo's `rounded-l` is 16px. The stroke is an inset ring, not a border, so the
 * fill paints over it at full outer height and the percentage resolves against the full width.
 */
const ROOT_CLASSES = `
    relative h-s w-full
    overflow-hidden rounded-m
    bg-surface-toggle-unselected
    inset-ring-1 inset-ring-border-datavis-progress
`;

/*
 * Width is Base UI's inline `%` (same clamp as `aria-valuenow`); no minimum. `to-l`: Figma's -90deg
 * ramp, sized to the fill as drawn. Disabled = one swap to a flat fill (`bg-none` drops the ramp).
 */
const INDICATOR_CLASSES = `
    h-full
    bg-linear-to-l from-surface-progress-fill-start to-surface-progress-fill-end
    in-data-[disabled]:bg-none in-data-[disabled]:bg-surface-progress-disabled
`;

/**
 * Read-only bar showing how far along a task is. Base UI owns the clamp, `role="progressbar"` and
 * `aria-value*` (default `aria-valuetext` is a percentage). Figma: `Progress Bar Container` 9273:43259.
 */
function Progress({ value, max = 100, label, disabled, className }: ProgressProps) {
    return (
        <BaseProgress.Root
            value={value}
            max={max}
            aria-label={label}
            data-disabled={disabled ? '' : undefined}
            className={cn`${ROOT_CLASSES} ${className}`}
        >
            <BaseProgress.Indicator className={INDICATOR_CLASSES} />
        </BaseProgress.Root>
    );
}

export { Progress };
