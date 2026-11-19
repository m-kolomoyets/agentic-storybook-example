import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import type { RadioSize } from './types';
import { expect } from 'storybook/test';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { Radio } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/** The caller's bare `<label>`. */
function Row({ children }: { children: ReactNode }) {
    return <label className="inline-flex items-center gap-m text-body-m text-text-general-strong">{children}</label>;
}

const meta = {
    title: 'UI/Radio',
    component: Radio,
    args: { value: 'manual', size: 'md', disabled: false },
    argTypes: {
        size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
        disabled: { control: 'boolean' },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}9181-5758` } },
    // Every radio lives in a group: a bare `Radio` can never change state.
    render: function Render(args) {
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
    },
} satisfies Meta<typeof Radio>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Named by the wrapping label; clicking selects. */
export const Default: Story = {
    parameters: { design: { type: 'figma', url: `${FIGMA}9183-5470` } },
    play: async ({ canvas, userEvent }) => {
        const manual = canvas.getByRole('radio', { name: 'Manual' });
        await expect(manual).not.toBeChecked();
        await userEvent.click(canvas.getByText('Manual'));
        await expect(manual).toBeChecked();
        await expect(canvas.getByRole('radio', { name: 'Automatic' })).not.toBeChecked();
    },
};

/** Ring-plus-dot glyph, white. */
export const Selected: Story = {
    args: { value: 'auto', size: 'lg' },
    parameters: { design: { type: 'figma', url: `${FIGMA}9183-5430` } },
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
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('radio', { name: 'Automatic' })).toHaveAttribute('data-checked');
    },
};

/** 6% glyph; clicking does nothing. */
export const Disabled: Story = {
    args: { disabled: true },
    parameters: { design: { type: 'figma', url: `${FIGMA}9183-4405` } },
    play: async ({ canvas, userEvent }) => {
        const manual = canvas.getByRole('radio', { name: 'Manual' });
        await expect(manual).toHaveAttribute('aria-disabled', 'true');
        await userEvent.click(manual);
        await expect(manual).not.toBeChecked();
    },
};

/** Under a `data-invalid` wrapper (group message outside a Field) unselected rings go red. */
export const Invalid: Story = {
    decorators: [
        function InvalidWrapper(Story) {
            return (
                <div data-invalid="">
                    <Story />
                </div>
            );
        },
    ],
    play: async ({ canvas }) => {
        const manual = canvas.getByRole('radio', { name: 'Manual' });
        await expect(getComputedStyle(manual).color).not.toBe(
            getComputedStyle(canvas.getByRole('radio', { name: 'Automatic' })).color
        );
    },
};

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
export const Matrix: Story = {
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
};
