export type ProgressProps = {
    /** Between `0` and `max`; Base UI clamps it. No `null`: indeterminate is undrawn in Figma. */
    value: number;
    /** Value meaning "done". No `min` — a progress bar's zero is zero. @default 100 */
    max?: number;
    /** Accessible name (`aria-label`); draws nothing. Required: an unnamed progressbar fails WCAG 4.1.2. */
    label: string;
    /** Swaps the gradient for a flat fill — nothing else (no dim, no cursor, no `aria-disabled`). */
    disabled?: boolean;
    className?: string;
};
