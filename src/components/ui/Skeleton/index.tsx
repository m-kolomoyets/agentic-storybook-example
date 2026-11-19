import type { SkeletonProps, SkeletonTone } from './types';
import { cn } from '@/lib/cn';

const TONE_CLASSES: Record<SkeletonTone, string> = {
    base: 'bg-skeleton-base',
    light: 'bg-skeleton-shimmer',
    nested: 'bg-skeleton-nested',
    elevated: 'bg-skeleton-elevated',
};

const BASE_CLASSES = 'relative shrink-0 overflow-hidden';

/* Sweeping band on a pseudo-element; off under reduced motion — it travels. */
const SHIMMER_CLASSES = `
    after:pointer-events-none after:absolute after:inset-none after:content-['']
    after:bg-linear-to-r after:from-white-alpha-0 after:via-skeleton-shimmer after:to-white-alpha-0
    after:animate-skeleton-shimmer motion-reduce:after:hidden
`;

/**
 * Loading placeholder block. Decorative (`aria-hidden`): the composing screen owns the single
 * `role="status"`. A frame (with children) skips the shimmer so leaves don't double-flash.
 * Figma: `Main Screen/Skeleton` 14805:282768.
 */
function Skeleton({ tone = 'base', className, children }: SkeletonProps) {
    const shimmerClasses = children === undefined ? SHIMMER_CLASSES : '';

    return (
        <div
            aria-hidden
            data-skeleton=""
            className={cn`${BASE_CLASSES} ${TONE_CLASSES[tone]} ${shimmerClasses} ${className}`}
        >
            {children}
        </div>
    );
}

export { Skeleton };
