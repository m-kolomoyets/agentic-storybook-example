import type { ReactNode } from 'react';

export type DeferredOverlayProps = {
    /** The surface's open state; the first `true` mounts `children` for good. */
    open: boolean;
    /** Usually a `lazy` dialog, sheet or panel, rendered with the same `open`. */
    children: ReactNode;
};
