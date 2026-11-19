import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { LoadingIndicator } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = {
    title: 'UI/LoadingIndicator',
    component: LoadingIndicator,
    args: { size: 'md' },
    argTypes: { size: { control: 'inline-radio', options: ['md', 'sm'] } },
    parameters: { design: { type: 'figma', url: `${FIGMA}14895-450270` } },
} satisfies Meta<typeof LoadingIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Decorative 3×3 grid: eight animated perimeter squares, a static centre. */
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const root = canvasElement.querySelector('span[aria-hidden="true"]');
        await expect(root).toBeInTheDocument();
        await expect(root!.children).toHaveLength(9);
        await expect(root!.querySelectorAll('.animate-loading-snake')).toHaveLength(8);
        await expect(root!.children[4]).not.toHaveClass('animate-loading-snake');
    },
};

/** Chart containers' size. Figma: `Airspace/Visualization` 14833:287372. */
export const Small: Story = {
    args: { size: 'sm' },
    parameters: { design: { type: 'figma', url: `${FIGMA}14833-287372` } },
};

export const Matrix: Story = {
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-4xl">
                {(['md', 'sm'] as const).map((size) => {
                    return (
                        <div key={size} className="flex items-center gap-xl">
                            <LoadingIndicator size={size} />
                            <span className="text-caption-m text-text-general-medium">{size}</span>
                        </div>
                    );
                })}
            </div>
        );
    },
};
