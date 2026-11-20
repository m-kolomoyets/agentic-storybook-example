import type { GrainAvatarKind, GrainType } from './types';
import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { GRAIN_AVATAR_KINDS, GRAIN_AVATAR_PX, GRAIN_AVATAR_SIZES, GRAIN_TYPES } from './constants';
import { formatGrainType } from './utils/formatGrainType';
import { grainAvatarKind, grainAvatarLabel } from './utils/grainAvatarKind';
import { GrainAvatar } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/* One representative type per drawing, so the matrix renders through the real mapping. */
const SAMPLE: Record<GrainAvatarKind, GrainType | null> = {
    corn: 'CORN',
    soybean: 'SOYBEAN',
    wheat: 'WHEAT_HARD_RED_WINTER',
    other: null,
};

const meta = preview.meta({
    title: 'UI/GrainAvatar',
    component: GrainAvatar,
    args: { grainType: 'CORN', size: 'lg' },
    argTypes: {
        grainType: { control: 'select', options: [null, ...GRAIN_TYPES] },
        size: { control: 'inline-radio', options: GRAIN_AVATAR_SIZES },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}12847-71290` } },
});

/** Playground — decorative (`alt=""`), 40px by default. */
export const Default = meta.story();

Default.test('decorative with an empty alt, 40px by default', async ({ canvasElement, canvas }) => {
    const img = canvasElement.querySelector('img');
    await expect(img).toHaveAttribute('alt', '');
    await expect(img).toHaveAttribute('width', '40');
    await expect(img).toHaveAttribute('data-grain-kind', 'corn');
    await expect(canvas.queryByRole('img')).toBeNull();
});

/** `alt` where the avatar stands alone. */
Default.test(
    'alt names it where it stands alone',
    { args: { grainType: 'WHEAT_DURUM', size: 'xl', alt: grainAvatarLabel('WHEAT_DURUM') } },
    async ({ canvas }) => {
        const img = canvas.getByRole('img', { name: 'Wheat' });
        await expect(img).toHaveAttribute('data-grain-kind', 'wheat');
        await expect(img).toHaveAttribute('width', '72');
    }
);

/** Undrawn types and a missing type fall back to `Other`. */
Default.test(
    'undrawn and missing types fall back to other',
    { args: { grainType: 'BUCKWHEAT' } },
    async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('img')).toHaveAttribute('data-grain-kind', 'other');
        await expect(grainAvatarKind(null)).toBe('other');
        await expect(grainAvatarKind('CORN_POPCORN')).toBe('corn');
    }
);

/** Kind × size. */
export const Matrix = meta.story({
    render: function Matrix() {
        return (
            <div className="grid grid-cols-[6rem_repeat(5,auto)] items-center justify-start gap-l">
                <span />
                {GRAIN_AVATAR_SIZES.map((size) => {
                    return (
                        <span key={size} className="text-caption-m text-text-general-medium">
                            {size} — {GRAIN_AVATAR_PX[size]}px
                        </span>
                    );
                })}
                {GRAIN_AVATAR_KINDS.map((kind) => {
                    return (
                        <div key={kind} className="contents">
                            <span className="text-caption-m text-text-general-medium">{kind}</span>
                            {GRAIN_AVATAR_SIZES.map((size) => {
                                return <GrainAvatar key={size} grainType={SAMPLE[kind]} size={size} />;
                            })}
                        </div>
                    );
                })}
            </div>
        );
    },
});

/** Every grain type through the real mapping. */
export const GrainTypeMapping = meta.story({
    render: function GrainTypeMapping() {
        return (
            <div className="grid grid-cols-[auto_1fr_auto] items-center justify-start gap-x-l gap-y-m">
                {GRAIN_TYPES.map((grainType) => {
                    return (
                        <div key={grainType} className="contents">
                            <GrainAvatar grainType={grainType} size="md" />
                            <span>{formatGrainType(grainType)}</span>
                            <span className="text-caption-m text-text-general-medium">
                                {grainAvatarKind(grainType)}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    },
});
