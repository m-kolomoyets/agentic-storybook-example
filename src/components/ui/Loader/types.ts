/**
 * Ring ink. `primary` is **dark** — it is the loader for the near-white primary button fill.
 * On the app's dark grounds use `secondary`; inside a control that colours its own content, `inherit`.
 */
export type LoaderVariant = 'primary' | 'secondary' | 'inherit';

/** `md` 24px, `sm` 12px — the two rings Figma draws. Other sizes: `size-*` on `className` (stroke scales). */
export type LoaderSize = 'sm' | 'md';

export type LoaderProps = {
    /** @default 'primary' */
    variant?: LoaderVariant;
    /** @default 'md' */
    size?: LoaderSize;
    /**
     * Screen-reader text. Set → live `role="status"`; unset → `aria-hidden` decoration (the case
     * inside a button, which announces its own `aria-busy`). Also carries the state when
     * reduced motion freezes the spin.
     */
    label?: string;
    className?: string;
};
