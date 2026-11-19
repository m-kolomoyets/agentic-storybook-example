import type { LoadingIndicatorProps, LoadingIndicatorSize } from './types';
import { cn } from '@/lib/cn';

/* Row-major 3×3 grid → position on the clockwise ring (0 = top-left); `null` = the centre, never lit. */
const RING_INDEX: (number | null)[] = [0, 1, 2, 7, null, 3, 6, 5, 4];

/* Square k trails the front by k steps: `-(8 - k) × 125ms`. Negative so the trail is whole on frame one. */
const DELAY_CLASSES = [
    '[animation-delay:0ms]',
    '[animation-delay:-875ms]',
    '[animation-delay:-750ms]',
    '[animation-delay:-625ms]',
    '[animation-delay:-500ms]',
    '[animation-delay:-375ms]',
    '[animation-delay:-250ms]',
    '[animation-delay:-125ms]',
];

/* No spacing token for 6px or 1px, so those are literal. */
const SIZE_CLASSES: Record<LoadingIndicatorSize, { grid: string; cell: string }> = {
    md: { grid: 'gap-xxs', cell: 'size-m rounded-[1px]' },
    sm: { grid: 'gap-[1px]', cell: 'size-[6px] rounded-[0.5px]' },
};

/**
 * Snake of squares from the Preloader frame. Decorative: whatever draws it owns the announcement.
 * Figma: `Loading Indicator` 14895:450270.
 */
function LoadingIndicator({ size = 'md', className }: LoadingIndicatorProps) {
    const { grid, cell } = SIZE_CLASSES[size];

    return (
        <span aria-hidden className={cn`grid shrink-0 grid-cols-3 ${grid} ${className}`}>
            {RING_INDEX.map((ring) => {
                if (ring === null) {
                    return <span key="centre" className={cn`${cell} bg-white-alpha-8`} />;
                }
                return (
                    <span
                        key={ring}
                        className={cn`${cell} animate-loading-snake bg-white-alpha-100 ${DELAY_CLASSES[ring]}`}
                    />
                );
            })}
        </span>
    );
}

export { LoadingIndicator };
