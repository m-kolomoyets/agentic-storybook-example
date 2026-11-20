import type { ReactNode } from 'react';
import type { RadioProps, RadioSize } from './types';
import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { Radio } from '.';

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

/** Pins for states a static canvas can't trigger. */
const FORCED: Record<(typeof STATES)[number], string> = {
    default: '',
    hover: 'text-border-control-hover',
    // No Figma cell binds this token; without it there is no pointer-down feedback.
    pressed: 'text-border-control-pressed',
    // Figma `State=Active` (9183:4401), shipped as `focus-visible`.
    focused: 'text-border-focused',
    disabled: '',
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
                                                        className={FORCED[state]}
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
