import type { GrainAvatarKind, GrainAvatarSize } from './types';

/** Mirror of the GraphQL `GrainType` enum values (no generated types in this project). */
export const GRAIN_TYPES = [
    'BARLEY',
    'BEAN_BLACK',
    'BEAN_LENTIL',
    'BEAN_PINTO',
    'BEAN_RED',
    'BEAN_WHITE',
    'BUCKWHEAT',
    'CANOLA',
    'CANOLA_TOBIN_POLISH',
    'CANOLA_WESTAR_ARGENTINE',
    'CORN',
    'CORN_POPCORN',
    'CORN_POPCORN_WHITE',
    'CORN_WAXY',
    'CORN_WHITE',
    'CORN_YELLOW',
    'DDG',
    'DDG_SOLUBLES_10',
    'DDG_SOLUBLES_15',
    'DDG_SOLUBLES_20',
    'DDG_SOLUBLES_25',
    'OATS',
    'PEANUTS',
    'PISTACHIO_NUT_HULL',
    'RAPESEED',
    'RICE_LONG_GRAIN',
    'RICE_MEDIUM_GRAIN',
    'RICE_SHORT_GRAIN',
    'RYE',
    'SORGHUM',
    'SOYBEAN',
    'SUNFLOWER',
    'SUNFLOWER_CONFECTIONARY',
    'WHEAT_DURUM',
    'WHEAT_HARD_RED_SPRING',
    'WHEAT_HARD_RED_WINTER',
    'WHEAT_SOFT_RED_WINTER_WHEAT',
    'WHEAT_WHITE',
] as const;

export const GRAIN_AVATAR_SIZES: readonly GrainAvatarSize[] = ['xl', 'lg', 'md', 'sm', 'xs'];

export const GRAIN_AVATAR_KINDS: readonly GrainAvatarKind[] = ['corn', 'soybean', 'wheat', 'other'];

export const GRAIN_AVATAR_PX: Record<GrainAvatarSize, number> = { xl: 72, lg: 40, md: 32, sm: 24, xs: 18 };
