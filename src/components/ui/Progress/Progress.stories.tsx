import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Progress } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = {
    title: 'UI/Progress',
    component: Progress,
    args: { value: 68, label: 'Grain unloaded' },
    argTypes: {
        value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}9273-43259` } },
    decorators: [
        function Card(Story) {
            return (
                <div className="w-[20rem]">
                    <Story />
                </div>
            );
        },
    ],
} satisfies Meta<typeof Progress>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The drawn bar at the drawn value; named by `label`, announced against 0…100. */
export const Default: Story = {
    play: async ({ canvas }) => {
        const bar = canvas.getByRole('progressbar', { name: 'Grain unloaded' });
        await expect(bar).toHaveAttribute('aria-valuenow', '68');
        await expect(bar).toHaveAttribute('aria-valuemin', '0');
        await expect(bar).toHaveAttribute('aria-valuemax', '100');
        await expect(getComputedStyle(bar).borderTopLeftRadius).toBe('12px');
    },
};

/** `max` for counts: 3 of 7 is announced as a percentage (~43%). */
export const CustomMax: Story = {
    args: { value: 3, max: 7, label: 'Files uploaded' },
    play: async ({ canvas }) => {
        const bar = canvas.getByRole('progressbar', { name: 'Files uploaded' });
        await expect(bar).toHaveAttribute('aria-valuemax', '7');
        await expect(bar).toHaveAttribute('aria-valuenow', '3');
        await expect(bar.getAttribute('aria-valuetext')).toContain('43');
    },
};

/** One colour swap; still announced, never `aria-disabled`. Drawn fill is near the track colour (design issue). */
export const Disabled: Story = {
    args: { disabled: true },
    parameters: { design: { type: 'figma', url: `${FIGMA}10173-170543` } },
    play: async ({ canvas }) => {
        const bar = canvas.getByRole('progressbar', { name: 'Grain unloaded' });
        await expect(bar).toHaveAttribute('data-disabled');
        await expect(bar).not.toHaveAttribute('aria-disabled');
    },
};

/** 0 / 1 (no floor) / 50 / 68 / 100, enabled and disabled; ramp sized to the fill at two widths. */
export const Matrix: Story = {
    decorators: [
        function Wide(Story) {
            return (
                <div className="w-[40rem]">
                    <Story />
                </div>
            );
        },
    ],
    render: function Matrix() {
        return (
            <div className="grid grid-cols-[8rem_1fr_1fr] items-center gap-l">
                <span />
                <span className="text-caption-m text-text-general-medium">enabled</span>
                <span className="text-caption-m text-text-general-medium">disabled</span>
                {[0, 1, 5, 50, 68, 95, 100].map((value) => {
                    return [
                        <span key={`${value}-l`} className="text-caption-m text-text-general-medium">
                            {value}
                        </span>,
                        <Progress key={`${value}-e`} value={value} label={`Enabled ${value}`} />,
                        <Progress key={`${value}-d`} value={value} label={`Disabled ${value}`} disabled />,
                    ];
                })}
            </div>
        );
    },
};
