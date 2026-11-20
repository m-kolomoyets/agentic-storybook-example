import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { Divider } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = preview.meta({
    title: 'UI/Divider',
    component: Divider,
    args: { orientation: 'horizontal' },
    argTypes: { orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] } },
    parameters: { design: { type: 'figma', url: `${FIGMA}8947-19826` } },
    decorators: [
        function Measure(Story) {
            return (
                <div className="flex h-[10rem] w-[23.4375rem] items-center justify-center">
                    <Story />
                </div>
            );
        },
    ],
});

/** The drawn rule at Figma's 375px measure: strongest at the midpoint, fading at both ends. */
export const Default = meta.story();

Default.test('horizontal rule is a 1px separator', async ({ canvas }) => {
    const rule = canvas.getByRole('separator');
    await expect(rule).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(rule.getBoundingClientRect().height).toBe(1);
});

/** Undrawn in Figma: the same ramp, turned. */
Default.test('vertical rule is a 1px-wide separator', { args: { orientation: 'vertical' } }, async ({ canvas }) => {
    const rule = canvas.getByRole('separator');
    await expect(rule).toHaveAttribute('aria-orientation', 'vertical');
    await expect(rule.getBoundingClientRect().width).toBe(1);
});

/** The ramp is sized to the rule, so a narrow divider is a short fade; plus side-menu usage. */
export const Matrix = meta.story({
    decorators: [
        function Wide(Story) {
            return (
                <div className="w-[42rem]">
                    <Story />
                </div>
            );
        },
    ],
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-xl">
                {['6rem', '15rem', '23.4375rem', '40rem'].map((width) => {
                    return (
                        <div key={width} className="flex flex-col gap-s" style={{ width }}>
                            <span className="text-caption-m text-text-general-medium">{width}</span>
                            <Divider />
                        </div>
                    );
                })}
                <div className="flex w-[20rem] flex-col gap-4xl bg-surface-control py-4xl">
                    <div className="px-l">Bins</div>
                    <Divider />
                    <div className="px-l">Barges</div>
                    <Divider />
                    <div className="px-l">Account</div>
                </div>
            </div>
        );
    },
});
