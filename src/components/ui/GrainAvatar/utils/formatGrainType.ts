import type { GrainType } from '../types';

/** Inlined from amber `util/format-grain-type.ts`. */
const GRAIN_TYPE_LABELS: Partial<Record<GrainType, string>> = {
    BARLEY: 'Barley',
    BUCKWHEAT: 'Buckwheat',
    CORN: 'Corn - Generic',
    CORN_YELLOW: 'Yellow Dent Corn',
    CORN_WHITE: 'White Corn',
    CORN_WAXY: 'Waxy Corn',
    CORN_POPCORN: 'Popcorn (Yellow)',
    CORN_POPCORN_WHITE: 'Popcorn (White)',
    RICE_LONG_GRAIN: 'Long Grain Rice',
    RICE_MEDIUM_GRAIN: 'Medium Grain Rice',
    RICE_SHORT_GRAIN: 'Short Grain Rice',
    SOYBEAN: 'Soybeans',
    SUNFLOWER: 'Sunflower (Oil)',
    SUNFLOWER_CONFECTIONARY: 'Sunflower (Confectionary)',
    WHEAT_DURUM: 'Durum Wheat ',
    WHEAT_HARD_RED_SPRING: 'Hard Red Spring Wheat',
    WHEAT_HARD_RED_WINTER: 'Hard Red Winter Wheat',
    DDG: 'DDG - 15% Solubles',
    OATS: 'Oats',
    RYE: 'Rye',
    SORGHUM: 'Sorghum',
    PISTACHIO_NUT_HULL: 'Pistachio Nut Hull',
    PEANUTS: 'Peanuts',
    CANOLA: 'Canola - Generic',
    CANOLA_TOBIN_POLISH: 'Canola - (Tobin / Polish)',
    CANOLA_WESTAR_ARGENTINE: 'Canola - (Westar / Argentine)',
    RAPESEED: 'Rapeseed',
    BEAN_RED: 'Red Beans',
    BEAN_PINTO: 'Pinto Beans',
    BEAN_BLACK: 'Black Beans',
    BEAN_WHITE: 'White Beans',
    BEAN_LENTIL: 'Lentil Beans',
    DDG_SOLUBLES_10: 'DDG - 10% Solubles',
    DDG_SOLUBLES_20: 'DDG - 20% Solubles',
    DDG_SOLUBLES_25: 'DDG - 25% Solubles',
    WHEAT_WHITE: 'White Wheat',
    WHEAT_SOFT_RED_WINTER_WHEAT: 'Soft Red Winter Wheat',
};

/** Display name of a grain type; unlabelled values fall back to sentence-cased enum text. */
export function formatGrainType(grainType: GrainType): string {
    if (grainType) {
        const label = GRAIN_TYPE_LABELS[grainType];
        return label || `${grainType[0].toUpperCase()}${grainType.slice(1).toLowerCase()}`;
    }
    return 'Unknown Grain Type';
}
