import type { LoaderProps, LoaderSize, LoaderVariant } from './types';
import { cn } from '@/lib/cn';

/*
 * The ring is a flat `currentColor` fill shaped by two masks: a radial one punches the hole
 * (83.34% = Figma's 2px stroke on a 12px radius, so one class fits every size) and a conic one
 * draws the fading tail. No colour lives in the drawing, so `variant="inherit"` follows a parent
 * button's per-state ink for free. Mask longhands only — a shorthand would reset `mask-composite`.
 * `rounded-full` is load-bearing: without it the masked square keeps its corners.
 */
const BASE_CLASSES = `
    block shrink-0 rounded-full bg-current animate-spin motion-reduce:animate-none
    [mask-image:radial-gradient(circle_farthest-side,transparent_83.34%,black_83.34%),conic-gradient(from_90deg,transparent_0deg,black_360deg)]
    [mask-composite:intersect]
`;

/** `inherit` is deliberately empty: any `text-*` here would beat the parent's ink. */
const VARIANT_CLASSES: Record<LoaderVariant, string> = {
    primary: 'text-text-on-surface-strong',
    secondary: 'text-text-general-strong',
    inherit: '',
};

const SIZE_CLASSES: Record<LoaderSize, string> = {
    sm: 'size-l',
    md: 'size-3xl',
};

/** Indeterminate spinner. Figma: `Loader Primary Button` 8885:20213, `Loader Secondary Button` 8192:4620. */
function Loader({ variant = 'primary', size = 'md', label, className }: LoaderProps) {
    return (
        <span
            role={label === undefined ? undefined : 'status'}
            aria-label={label}
            aria-hidden={label === undefined ? true : undefined}
            className={cn`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
        />
    );
}

export { Loader };
