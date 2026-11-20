import type { Status } from './types';
import HistoryIcon from '@/assets/icons/history.svg?react';
import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { StatusIcon } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const STATUSES: Status[] = ['default', 'positive', 'negative', 'warning'];

const meta = preview.meta({
    title: 'UI/StatusIcon',
    component: StatusIcon,
    args: { status: 'default', surface: 'general' },
    argTypes: {
        status: { control: 'inline-radio', options: STATUSES },
        surface: { control: 'inline-radio', options: ['on-surface', 'general'] },
        icon: { control: false },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}10826-215582` } },
});

/** Playground — hidden from the accessibility tree. */
export const Default = meta.story();

Default.test('is hidden from the accessibility tree', async ({ canvasElement, canvas }) => {
    await expect(canvasElement.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    await expect(canvas.queryByRole('img')).toBeNull();
});

/** An override keeps the chip's fill, tint, box — and stays hidden. */
Default.test(
    'an icon override renders inside the chip and stays hidden',
    { args: { status: 'negative', icon: <HistoryIcon /> } },
    async ({ canvasElement, canvas }) => {
        const chip = canvasElement.querySelector('[aria-hidden="true"]');
        await expect(chip).toBeInTheDocument();
        await expect(chip!.querySelector('svg')).toBeInTheDocument();
        await expect(canvas.queryByRole('img')).toBeNull();
    }
);

/** Every status on both grounds (`on-surface` belongs on the light card, e.g. Toast), plus an override. */
export const Matrix = meta.story({
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
});
