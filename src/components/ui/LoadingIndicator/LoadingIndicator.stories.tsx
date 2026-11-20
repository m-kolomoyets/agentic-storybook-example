import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { LoadingIndicator } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = preview.meta({
    title: 'UI/LoadingIndicator',
    component: LoadingIndicator,
    args: { size: 'md' },
    argTypes: { size: { control: 'inline-radio', options: ['md', 'sm'] } },
    parameters: { design: { type: 'figma', url: `${FIGMA}14895-450270` } },
});

/** Playground — decorative 3×3 grid: eight animated perimeter squares, a static centre. */
export const Default = meta.story();

Default.test('decorative 3×3 grid animates the eight perimeter squares only', async ({ canvasElement }) => {
    const root = canvasElement.querySelector('span[aria-hidden="true"]');
    await expect(root).toBeInTheDocument();
    await expect(root!.children).toHaveLength(9);
    await expect(root!.querySelectorAll('.animate-loading-snake')).toHaveLength(8);
    await expect(root!.children[4]).not.toHaveClass('animate-loading-snake');
});

/** Both sizes; `sm` is the chart containers' size (Figma `Airspace/Visualization`). */
export const Matrix = meta.story({
    parameters: {
        design: [
            { name: 'md', type: 'figma', url: `${FIGMA}14895-450270` },
            { name: 'sm (chart)', type: 'figma', url: `${FIGMA}14833-287372` },
        ],
    },
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
});
