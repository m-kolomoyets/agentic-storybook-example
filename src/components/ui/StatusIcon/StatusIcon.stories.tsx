import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Status } from './types';
import HistoryIcon from '@/assets/icons/history.svg?react';
import { expect } from 'storybook/test';
import { StatusIcon } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const STATUSES: Status[] = ['default', 'positive', 'negative', 'warning'];

const meta = {
    title: 'UI/StatusIcon',
    component: StatusIcon,
    args: { status: 'default', surface: 'general' },
    argTypes: {
        status: { control: 'inline-radio', options: STATUSES },
        surface: { control: 'inline-radio', options: ['on-surface', 'general'] },
        icon: { control: false },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}10826-215582` } },
} satisfies Meta<typeof StatusIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Hidden from the accessibility tree. */
export const Default: Story = {
    play: async ({ canvasElement, canvas }) => {
        await expect(canvasElement.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
        await expect(canvas.queryByRole('img')).toBeNull();
    },
};

/** `on-surface` belongs on the light card (Toast). */
export const OnLightCard: Story = {
    args: { surface: 'on-surface' },
    decorators: [
        function LightCard(Story) {
            return (
                <div className="rounded-m bg-surface-tertiary p-l">
                    <Story />
                </div>
            );
        },
    ],
};

/** An override keeps the chip's fill, tint, box — and stays hidden. */
export const Override: Story = {
    args: { status: 'negative', icon: <HistoryIcon /> },
    play: async ({ canvasElement, canvas }) => {
        const chip = canvasElement.querySelector('[aria-hidden="true"]');
        await expect(chip).toBeInTheDocument();
        await expect(chip!.querySelector('svg')).toBeInTheDocument();
        await expect(canvas.queryByRole('img')).toBeNull();
    },
};

/** Every status on both grounds, plus an override. */
export const Matrix: Story = {
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-xl">
                <div className="flex items-center gap-l rounded-m bg-surface-tertiary p-l">
                    {STATUSES.map((status) => {
                        return <StatusIcon key={status} status={status} surface="on-surface" />;
                    })}
                </div>
                <div className="flex items-center gap-l p-l">
                    {STATUSES.map((status) => {
                        return <StatusIcon key={status} status={status} surface="general" />;
                    })}
                    <StatusIcon status="negative" surface="general" icon={<HistoryIcon />} />
                </div>
            </div>
        );
    },
};
