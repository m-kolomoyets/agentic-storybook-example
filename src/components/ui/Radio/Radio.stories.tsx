import type { ReactNode } from 'react';
import type { FigmaVariant } from '../../../../visual/figma/types';
import type { RadioProps, RadioSize } from './types';
import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { Radio } from '.';
import { FigmaMatrix as FigmaMatrixGrid } from '../../../../visual/figma/FigmaMatrix';
import { FIGMA_SETS } from '../../../../visual/figma/sets';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/** The caller's bare `<label>`. */
function Row({ children }: { children: ReactNode }) {
    return <label className="inline-flex items-center gap-m text-body-m text-text-general-strong">{children}</label>;
}

/** Every radio lives in a group: a bare `Radio` can never change state. */
function Pair(args: RadioProps) {
    return (
        <RadioGroup name="fan" defaultValue="auto" className="flex flex-col gap-m">
            <Row>
                <Radio {...args} value="auto" />
                Automatic
            </Row>
            <Row>
                <Radio {...args} />
                Manual
            </Row>
        </RadioGroup>
    );
}

const meta = preview.meta({
    title: 'UI/Radio',
    component: Radio,
    args: { value: 'manual', size: 'md', disabled: false },
    argTypes: {
        size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
        disabled: { control: 'boolean' },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}9181-5758` } },
    render: Pair,
});

/** Playground — switch size/disabled in Controls. Every visual cell lives in `Matrix`. */
export const Default = meta.story({
    parameters: { design: { type: 'figma', url: `${FIGMA}9183-5470` } },
});

/** Named by the wrapping label; clicking selects. */
Default.test('is named by its label; clicking the label selects', async ({ canvas, userEvent }) => {
    const manual = canvas.getByRole('radio', { name: 'Manual' });
    await expect(manual).not.toBeChecked();
    await userEvent.click(canvas.getByText('Manual'));
    await expect(manual).toBeChecked();
    await expect(canvas.getByRole('radio', { name: 'Automatic' })).not.toBeChecked();
});

/** Ring-plus-dot glyph, white. */
Default.test(
    'the selected radio carries data-checked',
    {
        args: { value: 'auto', size: 'lg' },
        render: function Selected(args) {
            return (
                <RadioGroup defaultValue="auto">
                    <Row>
                        <Radio {...args} />
                        Automatic
                    </Row>
                </RadioGroup>
            );
        },
    },
    async ({ canvas }) => {
        await expect(canvas.getByRole('radio', { name: 'Automatic' })).toHaveAttribute('data-checked');
    }
);

/** 6% glyph; clicking does nothing. */
Default.test('disabled ignores clicks', { args: { disabled: true } }, async ({ canvas, userEvent }) => {
    const manual = canvas.getByRole('radio', { name: 'Manual' });
    await expect(manual).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(manual);
    await expect(manual).not.toBeChecked();
});

/** Under a `data-invalid` wrapper (group message outside a Field) unselected rings go red. */
Default.test(
    'unselected rings change colour under a data-invalid wrapper',
    {
        render: function InvalidWrapper(args) {
            return (
                <div data-invalid="">
                    <Pair {...args} />
                </div>
            );
        },
    },
    async ({ canvas }) => {
        const manual = canvas.getByRole('radio', { name: 'Manual' });
        await expect(getComputedStyle(manual).color).not.toBe(
            getComputedStyle(canvas.getByRole('radio', { name: 'Automatic' })).color
        );
    }
);

const STATES = ['default', 'hover', 'pressed', 'focused', 'disabled'] as const;
const SIZES: RadioSize[] = ['lg', 'md', 'sm'];

/**
 * States a static canvas can't trigger: `data-force` turns on the component's own state classes, gates included
 * (.storybook/preview.css). Figma `State=Active` ships as `focus-visible`; `pressed` has no Figma cell.
 */
const FORCE: Partial<Record<(typeof STATES)[number], string>> = {
    hover: 'hover',
    pressed: 'active',
    focused: 'focus-visible',
};

/** Every size × status × state. Rest ≈1.4:1 over the ground — token defect, shipped as drawn. */
export const Matrix = meta.story({
    parameters: {
        design: [
            { name: 'Unselected', type: 'figma', url: `${FIGMA}9183-5470` },
            { name: 'Selected', type: 'figma', url: `${FIGMA}9183-5430` },
            { name: 'Disabled', type: 'figma', url: `${FIGMA}9183-4405` },
        ],
    },
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-xl">
                {SIZES.map((size) => {
                    return (
                        <div key={size} className="grid grid-cols-6 items-center gap-l">
                            <span className="text-body-s-semibold text-text-general-strong">{size}</span>
                            {STATES.map((state) => {
                                return (
                                    <span key={state} className="text-caption-m text-text-general-medium">
                                        {state}
                                    </span>
                                );
                            })}
                            {(['unselected', 'selected'] as const).map((status) => {
                                return [
                                    <span key={status} className="text-caption-m text-text-general-medium">
                                        {status}
                                    </span>,
                                    ...STATES.map((state) => {
                                        return (
                                            <RadioGroup
                                                key={`${status}-${state}`}
                                                value={status === 'selected' ? 'on' : 'off'}
                                            >
                                                <label className="inline-flex">
                                                    <Radio
                                                        value="on"
                                                        size={size}
                                                        disabled={state === 'disabled'}
                                                        data-force={FORCE[state]}
                                                    />
                                                    <span className="sr-only">{`${size} ${status} ${state}`}</span>
                                                </label>
                                            </RadioGroup>
                                        );
                                    }),
                                ];
                            })}
                        </div>
                    );
                })}
            </div>
        );
    },
});

/** Figma `State` → the `FORCE` attribute of `Matrix` (Figma `Active` ships as focus-visible). */
const FIGMA_STATE: Record<string, (typeof STATES)[number]> = {
    Default: 'default',
    Hover: 'hover',
    Active: 'focused',
    Disabled: 'disabled',
};
const FIGMA_SIZE: Record<string, RadioSize> = { Big: 'lg', Medium: 'md', Small: 'sm' };
const FIGMA_BLOCK = { set: FIGMA_SETS.radio, layout: { sections: 'Size', columns: 'State' } };

/** One Figma `Radio button` variant → the code radio, in its own group so `Selected` is real selection. */
function figmaRadio(variant: FigmaVariant) {
    const state = FIGMA_STATE[variant.props.State ?? ''] ?? 'default';

    return (
        // `flex`: a block group would wrap the inline label in a taller line box.
        <RadioGroup className="flex" value={variant.props.Status === 'Selected' ? 'on' : 'off'}>
            <label className="inline-flex">
                <Radio
                    value="on"
                    size={FIGMA_SIZE[variant.props.Size ?? '']}
                    disabled={state === 'disabled'}
                    data-force={FORCE[state]}
                />
                <span className="sr-only">{variant.name}</span>
            </label>
        </RadioGroup>
    );
}

/**
 * Every variant of Figma `Radio button` (9181:5758), grouped by its own Size × Status × State properties and held
 * to Figma per cell by `pnpm vrt figma` (visual/FIGMA-TESTING.md).
 */
export const FigmaMatrix = meta.story({
    tags: ['figma', '!autodocs'],
    parameters: {
        // Full width: the card grid sizes its columns from the canvas.
        layout: 'fullscreen',
        design: { type: 'figma', url: FIGMA_SETS.radio },
        figmaMatrix: { blocks: [FIGMA_BLOCK] },
    },
    render: function FigmaMatrixStory(_args, context) {
        return <FigmaMatrixGrid context={context} blocks={[{ ...FIGMA_BLOCK, renderCell: figmaRadio }]} />;
    },
});
