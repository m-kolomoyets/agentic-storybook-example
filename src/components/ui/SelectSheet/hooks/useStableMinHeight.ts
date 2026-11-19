import { useState } from 'react';

/* Floor, so a short list doesn't read as a tiny box. */
const MIN_HEIGHT_VIEWPORT_RATIO = 0.5;

/**
 * Keeps the sheet from shrinking as a search narrows the list: measures the panel once on open (full list
 * showing) and pins the taller of that or the floor as `minHeight`.
 */
export function useStableMinHeight(open: boolean) {
    const [minHeight, setMinHeight] = useState<number | undefined>(undefined);

    function panelRef(node: HTMLDivElement | null) {
        if (!open || !node) {
            setMinHeight(undefined);
            return;
        }
        const floor = window.innerHeight * MIN_HEIGHT_VIEWPORT_RATIO;
        setMinHeight(Math.max(node.getBoundingClientRect().height, floor));
    }

    return { panelRef, minHeight };
}
