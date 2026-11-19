import type { ToggleProps } from './types';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { cn } from '@/lib/cn';

/*
 * Invented motion (Figma has none): one duration/easing for track colour and thumb travel so they land
 * together; reduced motion snaps between the drawn cells.
 */
const MOTION = 'duration-200 ease-out motion-reduce:transition-none';

/*
 * 40×22 track, 2px padding (`h-toggle-track` is the one off-scale token). Off and both disabled cells share
 * the track colour; only enabled-on overrides it. Focus ring is invented (no Figma cell; WCAG 2.4.7) and
 * outset — an inset ring would sit on the thumb. No hover/pressed: none drawn. `outline-solid` is
 * load-bearing: `outline-none` zeroes the style. Off track ≈1.4:1 is a token defect.
 */
const TRACK_CLASSES = `
    group inline-flex h-toggle-track w-5xl shrink-0 items-center justify-start rounded-full p-xxs outline-none
    transition-colors ${MOTION}
    bg-surface-toggle-unselected not-data-[disabled]:data-[checked]:bg-surface-tertiary
    data-[disabled]:cursor-not-allowed not-data-[disabled]:hover:cursor-pointer
    not-data-[disabled]:focus-visible:outline-1 not-data-[disabled]:focus-visible:outline-offset-2
    not-data-[disabled]:focus-visible:outline-border-focused not-data-[disabled]:focus-visible:outline-solid
`;

/*
 * Thumb is 18px derived from the track (`h-full aspect-square`). Travel is a translate, not a `justify-*`
 * swap: `justify-content` doesn't animate. Disabled + off is invented (Figma draws disabled only in the on
 * position) — the drawn disabled colours, thumb at the left.
 */
const THUMB_CLASSES = `
    aspect-square h-full rounded-full transition ${MOTION}
    group-data-[checked]:translate-x-[18px]
    group-not-data-[disabled]:group-data-[unchecked]:bg-surface-tertiary
    group-not-data-[disabled]:group-data-[checked]:bg-surface-ground
    group-data-[disabled]:bg-surface-toggle-thumb-disabled
`;

/**
 * On/off control for an immediate setting. Figma: `Toggle` 9506:75537. The name follows Figma; the ARIA
 * role stays `switch`. No label — wrap it in a `<label>`. No `size`: one geometry.
 */
function Toggle({ className, ...rest }: ToggleProps) {
    return (
        <BaseSwitch.Root {...rest} className={cn`${TRACK_CLASSES} ${className}`}>
            <BaseSwitch.Thumb className={THUMB_CLASSES} />
        </BaseSwitch.Root>
    );
}

export { Toggle };
