import type { MotionValue } from 'motion/react';
import { useEffect } from 'react';
import { animate, useMotionValue } from 'motion/react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/** 2.5s/rev, linear: the legacy dial's spin, kept so both dials turn at one pace. */
const SPIN_SECONDS = 2.5;
const SPIN_SPEED = 360 / SPIN_SECONDS;
/* Quadratic ease-out starts at twice its average speed, so a coast twice as long as the distance at
   spin speed leaves at exactly the spin's speed — no lurch as the drive cuts out. */
const COAST_EASE = [0.5, 1, 0.89, 1] as const;

/**
 * The rotating group's angle. Spins while `spinning`; when it stops with the group still drawn
 * (`interrupted`, `offline`) it coasts one more turn to the resting angle the frozen cells are
 * drawn at. `frozen` (paused capture) and reduced motion stop it where it is, no coast.
 */
export function useLivenessSpin(spinning: boolean, frozen: boolean): MotionValue<number> {
    const rotate = useMotionValue(0);
    const reducedMotion = usePrefersReducedMotion();
    const still = frozen || reducedMotion;

    useEffect(
        function driveSpin() {
            const from = rotate.get();
            if (spinning && !still) {
                const controls = animate(rotate, [from, from + 360], {
                    duration: SPIN_SECONDS,
                    ease: 'linear',
                    repeat: Infinity,
                });
                return () => {
                    controls.stop();
                };
            }
            if (still || from % 360 === 0) {
                return undefined;
            }
            const to = Math.ceil(from / 360) * 360 + 360;
            const controls = animate(rotate, to, {
                duration: (2 * (to - from)) / SPIN_SPEED,
                ease: COAST_EASE,
            });
            return () => {
                controls.stop();
            };
        },
        [spinning, still, rotate]
    );

    return rotate;
}
