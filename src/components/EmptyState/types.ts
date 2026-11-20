import type { ReactNode } from 'react';

export type EmptyStateProps = {
    /** Bare SVGR glyph; decorative. */
    icon: ReactNode;
    title: ReactNode;
    description: ReactNode;
    /** Actions row. */
    children?: ReactNode;
};
