import type { GrainAvatarKind, GrainType } from '../types';

const LABEL: Record<GrainAvatarKind, string> = { corn: 'Corn', soybean: 'Soybean', wheat: 'Wheat', other: 'Other' };

/* Types the set draws (popcorn/waxy are corn; buckwheat is not wheat). Anything else, incl. new values, is `other`. */
const KIND_BY_GRAIN_TYPE: Partial<Record<GrainType, GrainAvatarKind>> = {
    CORN: 'corn',
    CORN_POPCORN: 'corn',
    CORN_POPCORN_WHITE: 'corn',
    CORN_WAXY: 'corn',
    CORN_WHITE: 'corn',
    CORN_YELLOW: 'corn',
    SOYBEAN: 'soybean',
    WHEAT_DURUM: 'wheat',
    WHEAT_HARD_RED_SPRING: 'wheat',
    WHEAT_HARD_RED_WINTER: 'wheat',
    WHEAT_SOFT_RED_WINTER_WHEAT: 'wheat',
    WHEAT_WHITE: 'wheat',
};

/** The drawing a grain type takes. A missing type is `other`. */
export function grainAvatarKind(grainType: GrainType | null | undefined): GrainAvatarKind {
    return (grainType && KIND_BY_GRAIN_TYPE[grainType]) || 'other';
}

/** The tile's name in words, for a caller that describes the avatar rather than labelling it. */
export function grainAvatarLabel(grainType: GrainType | null | undefined): string {
    return LABEL[grainAvatarKind(grainType)];
}
