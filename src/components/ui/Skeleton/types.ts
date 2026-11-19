import type { ReactNode } from 'react';

/** `base` 4% (frames), `light` 6% (text bars on base), `nested` 10% (buttons on base), `elevated` opaque. */
export type SkeletonTone = 'base' | 'light' | 'nested' | 'elevated';

export type SkeletonProps = {
    /** @default 'base' */
    tone?: SkeletonTone;
    /** Size, radius and layout. The block brings no dimensions of its own. */
    className?: string;
    /** Nested blocks. A block with children is a frame and draws no shimmer of its own. */
    children?: ReactNode;
};
