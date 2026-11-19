/** `md` Preloader (8px squares, 2px gap); `sm` chart containers (6px squares, 1px gap). */
export type LoadingIndicatorSize = 'md' | 'sm';

export type LoadingIndicatorProps = {
    /** @default 'md' */
    size?: LoadingIndicatorSize;
    className?: string;
};
