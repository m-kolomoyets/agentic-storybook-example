import type { DeferredOverlayProps } from './types';
import { Suspense, useState } from 'react';

/**
 * Holds back a lazily imported overlay until its first open, then keeps it mounted.
 * - Not before: rendering a `lazy` element fetches its chunk.
 * - Never unmounted after: the exit animation (`data-[ending-style]`) needs the tree to outlive `open`.
 * - Own fallback-less `Suspense`: the surface is a portal, so the first open must not suspend the route.
 */
function DeferredOverlay({ open, children }: DeferredOverlayProps) {
    const [opened, setOpened] = useState(open);

    // Latched during render (state derived from a prop): no extra commit.
    if (open && !opened) {
        setOpened(true);
    }

    if (!opened) {
        return null;
    }

    return <Suspense fallback={null}>{children}</Suspense>;
}

export { DeferredOverlay };
