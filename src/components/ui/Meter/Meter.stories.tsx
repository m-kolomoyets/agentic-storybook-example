import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { Meter } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = preview.meta({
    title: 'UI/Meter',
    component: Meter,
    args: { value: 62, variant: 'level', label: 'Bin fullness', caption: '% Full' },
    argTypes: {
        value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
        variant: { control: 'inline-radio', options: ['progress', 'level', 'score'] },
        mode: {
            control: 'select',
            options: [undefined, 'cooling', 'drying', 'reconditioning', 'custom', 'manual'],
        },
    },
    // `Micro-Display Container` instance inside `Micro-Display` Size=Small (9256:44165); per-story instances are
    // nested `I…;…` ids that Figma URLs cannot address, so stories inherit this link.
    parameters: { design: { type: 'figma', url: `${FIGMA}9256-44159` } },
    decorators: [
        function Card(Story) {
            return (
                <div className="w-[22rem]">
                    <Story />
                </div>
            );
        },
    ],
});

/** Playground — switch value/variant/mode in Controls. Every visual cell lives in `Matrix`. */
export const Default = meta.story();

/** Named by `label` (never the caption), announced against 0…100; a meter, not a progressbar. */
Default.test('is a meter named by label, announced against 0…100', async ({ canvas }) => {
    const meter = canvas.getByRole('meter', { name: 'Bin fullness' });
    await expect(meter).toHaveAttribute('aria-valuenow', '62');
    await expect(meter).toHaveAttribute('aria-valuemin', '0');
    await expect(meter).toHaveAttribute('aria-valuemax', '100');
    await expect(meter).toHaveAttribute('aria-valuetext', '62%');
    await expect(canvas.queryByRole('progressbar')).toBeNull();
    await expect(canvas.getByText('% Full')).toBeInTheDocument();
});

Default.test(
    'custom max and valueText are announced',
    { args: { value: 3, max: 7, caption: undefined, valueText: '3 of 7 bins' } },
    async ({ canvas }) => {
        const meter = canvas.getByRole('meter', { name: 'Bin fullness' });
        await expect(meter).toHaveAttribute('aria-valuenow', '3');
        await expect(meter).toHaveAttribute('aria-valuemax', '7');
        await expect(meter).toHaveAttribute('aria-valuetext', '3 of 7 bins');
    }
);

/** Out-of-range readings are clamped, so the announced value stays in range. */
Default.test('values above max clamp to 100', { args: { value: 140 } }, async ({ canvas }) => {
    await expect(canvas.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
});

Default.test('values below min clamp to 0', { args: { value: -20 } }, async ({ canvas }) => {
    await expect(canvas.getByRole('meter')).toHaveAttribute('aria-valuenow', '0');
});

/** Risk bar: full-width ramp, no fill. */
Default.test(
    'score variant draws no fill',
    { args: { value: 78, variant: 'score', label: 'Grain risk', caption: 'Risk Score' } },
    async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('[data-part="fill"]')).toBeNull();
    }
);

/** Variants × values (pointer clamped on at 0/100) × modes. */
export const Matrix = meta.story({
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-xl">
                {(['progress', 'level', 'score'] as const).map((variant) => {
                    return (
                        <div key={variant} className="grid grid-cols-4 gap-l">
                            {[0, 1, 50, 100].map((value) => {
                                return (
                                    <Meter
                                        key={value}
                                        value={value}
                                        variant={variant}
                                        label={`${variant} ${value}`}
                                        caption={`${variant} ${value}`}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
                <div className="grid grid-cols-5 gap-l">
                    {(['cooling', 'drying', 'reconditioning', 'custom', 'manual'] as const).map((mode) => {
                        return (
                            <Meter key={mode} value={70} variant="progress" mode={mode} label={mode} caption={mode} />
                        );
                    })}
                </div>
            </div>
        );
    },
});
