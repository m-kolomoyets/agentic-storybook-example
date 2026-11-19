import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Meter } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = {
    title: 'UI/Meter',
    component: Meter,
    args: { value: 62, variant: 'level', label: 'Bin fullness', caption: '% Full' },
    argTypes: {
        value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
        variant: { control: 'inline-radio', options: ['progress', 'level', 'score'] },
        mode: {
            control: 'select',
            options: [undefined, 'cooling', 'drying', 'reconditioning', 'custom', 'manual'],
        },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}I9256-44159` } },
    decorators: [
        function Card(Story) {
            return (
                <div className="w-[22rem]">
                    <Story />
                </div>
            );
        },
    ],
} satisfies Meta<typeof Meter>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Named by `label` (never the caption), announced against 0…100; a meter, not a progressbar. */
export const Default: Story = {
    play: async ({ canvas }) => {
        const meter = canvas.getByRole('meter', { name: 'Bin fullness' });
        await expect(meter).toHaveAttribute('aria-valuenow', '62');
        await expect(meter).toHaveAttribute('aria-valuemin', '0');
        await expect(meter).toHaveAttribute('aria-valuemax', '100');
        await expect(meter).toHaveAttribute('aria-valuetext', '62%');
        await expect(canvas.queryByRole('progressbar')).toBeNull();
        await expect(canvas.getByText('% Full')).toBeInTheDocument();
    },
};

export const CustomMax: Story = {
    args: { value: 3, max: 7, caption: undefined, valueText: '3 of 7 bins' },
    play: async ({ canvas }) => {
        const meter = canvas.getByRole('meter', { name: 'Bin fullness' });
        await expect(meter).toHaveAttribute('aria-valuenow', '3');
        await expect(meter).toHaveAttribute('aria-valuemax', '7');
        await expect(meter).toHaveAttribute('aria-valuetext', '3 of 7 bins');
    },
};

/** Out-of-range readings are clamped, so the announced value stays in range. */
export const ClampedHigh: Story = {
    args: { value: 140 },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
    },
};

export const ClampedLow: Story = {
    args: { value: -20 },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('meter')).toHaveAttribute('aria-valuenow', '0');
    },
};

/** Fan bar: gradient fill, ramped in the run's aeration mode. */
export const ProgressVariant: Story = {
    args: { value: 83, variant: 'progress', label: 'Run window completion', caption: '% Completion', mode: 'drying' },
    parameters: { design: { type: 'figma', url: `${FIGMA}I11555-436602%3B9256-44159%3B11086-14544` } },
};

/** Risk bar: full-width ramp, no fill. */
export const Score: Story = {
    args: { value: 78, variant: 'score', label: 'Grain risk', caption: 'Risk Score' },
    parameters: { design: { type: 'figma', url: `${FIGMA}I11555-436604%3B9256-44159%3B11086-14574` } },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('[data-part="fill"]')).toBeNull();
    },
};

/** Variants × values (pointer clamped on at 0/100) × modes. */
export const Matrix: Story = {
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-xl">
                {(['progress', 'level', 'score'] as const).map((variant) => {
                    return (
                        <div key={variant} className="grid grid-cols-4 gap-l">
                            {[0, 1, 50, 100].map((value) => {
                                return (
                                    <Meter
                                        key={value}
                                        value={value}
                                        variant={variant}
                                        label={`${variant} ${value}`}
                                        caption={`${variant} ${value}`}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
                <div className="grid grid-cols-5 gap-l">
                    {(['cooling', 'drying', 'reconditioning', 'custom', 'manual'] as const).map((mode) => {
                        return (
                            <Meter key={mode} value={70} variant="progress" mode={mode} label={mode} caption={mode} />
                        );
                    })}
                </div>
            </div>
        );
    },
};
