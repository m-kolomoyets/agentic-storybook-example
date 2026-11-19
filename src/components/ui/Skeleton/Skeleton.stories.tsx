import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Skeleton } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = {
    title: 'UI/Skeleton',
    component: Skeleton,
    args: { tone: 'base', className: 'h-6xl w-[20rem] rounded-s' },
    argTypes: { tone: { control: 'inline-radio', options: ['base', 'light', 'nested', 'elevated'] } },
    parameters: { design: { type: 'figma', url: `${FIGMA}14805-282768` } },
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A leaf: decorative and shimmering. */
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const block = canvasElement.querySelector('[data-skeleton]');
        await expect(block).toHaveAttribute('aria-hidden', 'true');
        await expect(getComputedStyle(block!, '::after').content).not.toBe('none');
    },
};

/** A note banner: a `base` frame (no shimmer) holding `light` bars and a `nested` button. */
export const Nested: Story = {
    args: { className: 'flex w-[29rem] items-center gap-l rounded-s p-xl' },
    render: function Nested(args) {
        return (
            <Skeleton {...args}>
                <div className="flex flex-1 flex-col gap-l">
                    <Skeleton tone="light" className="h-xl w-[16.25rem] rounded-icon-xs" />
                    <Skeleton tone="light" className="h-l w-[11.25rem] rounded-icon-xs" />
                </div>
                <Skeleton tone="nested" className="h-5xl w-[7.25rem] rounded-s" />
            </Skeleton>
        );
    },
    play: async ({ canvasElement }) => {
        const frame = canvasElement.querySelector('[data-skeleton]');
        await expect(getComputedStyle(frame!, '::after').content).toBe('none');
    },
};

/** The four tones on the page ground. */
export const Matrix: Story = {
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-3xl">
                {(['base', 'light', 'nested', 'elevated'] as const).map((tone) => {
                    return (
                        <div key={tone} className="flex flex-col gap-s">
                            <span className="text-caption-m text-text-general-medium">{tone}</span>
                            <Skeleton tone={tone} className="h-6xl w-[20rem] rounded-s" />
                        </div>
                    );
                })}
            </div>
        );
    },
};
