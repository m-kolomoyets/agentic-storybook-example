import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { FAN_STATUS_ICON_SIZES, FAN_STATUS_ICON_STATUSES } from './constants';
import { FanStatusIcon } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = {
    title: 'UI/FanStatusIcon',
    component: FanStatusIcon,
    args: { status: 'running', size: 'md' },
    argTypes: {
        status: { control: 'inline-radio', options: FAN_STATUS_ICON_STATUSES },
        size: { control: 'inline-radio', options: FAN_STATUS_ICON_SIZES },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}13867-643998` } },
} satisfies Meta<typeof FanStatusIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Decorative by default: `aria-hidden`, glyph `alt=""`. */
export const Default: Story = {
    play: async ({ canvasElement, canvas }) => {
        const tile = canvasElement.querySelector('[data-status="running"]');
        await expect(tile).toHaveAttribute('aria-hidden', 'true');
        await expect(canvas.queryByRole('img')).toBeNull();
        await expect(tile!.querySelector('img')).toHaveAttribute('alt', '');
    },
};

/** `label` → announced image, for where the fan state is the only signal. */
export const Labelled: Story = {
    args: { status: 'error', label: 'Fan error' },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('img', { name: 'Fan error' })).toBeInTheDocument();
    },
};

export const Small: Story = {
    args: { size: 'sm' },
    parameters: { design: { type: 'figma', url: `${FIGMA}14026-847827` } },
};

/** Every status × size. */
export const Matrix: Story = {
    render: function Matrix() {
        return (
            <div className="grid grid-cols-[6rem_repeat(2,auto)] items-center justify-start gap-l">
                <span />
                {FAN_STATUS_ICON_SIZES.map((size) => {
                    return (
                        <span key={size} className="text-caption-m text-text-general-medium">
                            {size} — {size === 'md' ? 24 : 12}px
                        </span>
                    );
                })}
                {FAN_STATUS_ICON_STATUSES.map((status) => {
                    return (
                        <div key={status} className="contents">
                            <span className="text-caption-m text-text-general-medium">{status}</span>
                            {FAN_STATUS_ICON_SIZES.map((size) => {
                                return <FanStatusIcon key={size} status={status} size={size} />;
                            })}
                        </div>
                    );
                })}
            </div>
        );
    },
};
