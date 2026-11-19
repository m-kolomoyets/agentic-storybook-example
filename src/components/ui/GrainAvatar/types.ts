import type { GRAIN_TYPES } from './constants';

/** GraphQL `GrainType` values. */
export type GrainType = (typeof GRAIN_TYPES)[number];

/** Figma's `Type` axis. */
export type GrainAvatarKind = 'corn' | 'soybean' | 'wheat' | 'other';

/** Figma's `Size` axis: `XL` 72, `Big` 40, `Medium` 32, `Small` 24, `XSmall` 18. */
export type GrainAvatarSize = 'xl' | 'lg' | 'md' | 'sm' | 'xs';

export type GrainAvatarProps = {
    /** `null`/`undefined` draws `Other`. */
    grainType: GrainType | null | undefined;
    /** @default 'lg' (40px) */
    size?: GrainAvatarSize;
    /** Empty (decorative) by default; pass only where the avatar stands alone. */
    alt?: string;
    className?: string;
};
