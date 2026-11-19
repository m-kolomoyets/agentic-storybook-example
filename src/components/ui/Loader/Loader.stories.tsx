import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Loader } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = {
    title: 'UI/Loader',
    component: Loader,
    args: { variant: 'secondary', size: 'md' },
    argTypes: {
        variant: { control: 'inline-radio', options: ['primary', 'secondary', 'inherit'] },
        size: { control: 'inline-radio', options: ['sm', 'md'] },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}8192-4620` } },
} satisfies Meta<typeof Loader>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Decorative by default: hidden from assistive tech, no role. */
export const Default: Story = {
    play: async ({ canvasElement, canvas }) => {
        const ring = canvasElement.querySelector('span[aria-hidden="true"]');
        await expect(ring).toBeInTheDocument();
        await expect(canvas.queryByRole('status')).toBeNull();
    },
};

/** Standalone wait: `label` makes it an announced `role="status"`. */
export const WithLabel: Story = {
    args: { label: 'Loading bins' },
    play: async ({ canvas }) => {
        const status = canvas.getByRole('status', { name: 'Loading bins' });
        await expect(status).not.toHaveAttribute('aria-hidden');
    },
};

/** `primary` is dark ink — drawn for the near-white primary button fill, so it sits on a light tile here. */
export const Primary: Story = {
    args: { variant: 'primary' },
    decorators: [
        function OnLightFill(Story) {
            return (
                <div className="rounded-s bg-button-primary-default p-l">
                    <Story />
                </div>
            );
        },
    ],
    parameters: { design: { type: 'figma', url: `${FIGMA}8885-20213` } },
};

/** `inherit` takes the parent's `color`; the stroke stays proportional when scaled via `className`. */
export const InheritAndScaled: Story = {
    args: { variant: 'inherit', className: 'size-6xl' },
    decorators: [
        function WarningInk(Story) {
            return (
                <div className="text-text-warning">
                    <Story />
                </div>
            );
        },
    ],
};

/** Every variant × size, for side-by-side review against Figma. */
export const Matrix: Story = {
    render: function Matrix() {
        return (
            <div className="grid grid-cols-[auto_auto_auto] items-center gap-xl">
                {(['sm', 'md'] as const).map((size) => {
                    return [
                        <span key={`${size}-label`} className="text-caption-m text-text-general-medium">
                            {size}
                        </span>,
                        <span key={`${size}-p`} className="rounded-s bg-button-primary-default p-s">
                            <Loader variant="primary" size={size} />
                        </span>,
                        <Loader key={`${size}-s`} variant="secondary" size={size} />,
                    ];
                })}
            </div>
        );
    },
};
