const REFUSE_SHAKE: Keyframe[] = [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-3px)' },
    { transform: 'translateX(3px)' },
    { transform: 'translateX(-2px)' },
    { transform: 'translateX(2px)' },
    { transform: 'translateX(0)' },
];
const REFUSE_FLASH: Keyframe[] = [
    { backgroundColor: 'transparent' },
    { backgroundColor: 'var(--color-surface-control-pressed)' },
    { backgroundColor: 'transparent' },
];

/**
 * A disabled tab's answer to a press: a short shake, or a pressed-fill flash under reduced motion.
 * Web Animations so a second press restarts it.
 */
export function refuse(element: HTMLElement) {
    if (typeof element.animate !== 'function') {
        return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.animate(reduced ? REFUSE_FLASH : REFUSE_SHAKE, { duration: reduced ? 400 : 320, easing: 'ease-out' });
}
