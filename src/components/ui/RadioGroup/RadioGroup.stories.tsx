import type { ReactNode } from 'react';
import { useState } from 'react';
import preview from '#.storybook/preview';
import { expect, fn } from 'storybook/test';
import { Radio } from '@/components/ui/Radio';
import { RadioGroup } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/** The caller's bare `<label>`. */
function Row({ children }: { children: ReactNode }) {
    return <label className="inline-flex items-center gap-m text-body-m text-text-general-strong">{children}</label>;
}

function FanOptions() {
    return (
        <>
            <Row>
                <Radio value="auto" /> Automatic
            </Row>
            <Row>
                <Radio value="manual" /> Manual
            </Row>
            <Row>
                <Radio value="off" /> Off
            </Row>
        </>
    );
}

/** Figma draws no group; the link is the radio set the children come from. */
const meta = preview.meta({
    title: 'UI/RadioGroup',
    component: RadioGroup,
    args: {
        name: 'fan',
        defaultValue: 'auto',
        className: 'flex flex-col gap-m',
        disabled: false,
        onValueChange: fn(),
    },
    argTypes: { disabled: { control: 'boolean' } },
    parameters: { design: { type: 'figma', url: `${FIGMA}9181-5758` } },
    render: function Render(args) {
        return (
            <div className="flex flex-col gap-l">
                <RadioGroup {...args}>
                    <FanOptions />
                </RadioGroup>
                <button type="button" className="text-body-s text-text-general-strong">
                    After
                </button>
            </div>
        );
    },
});

/** Playground — toggle disabled in Controls; behaviour is covered by the tests below. */
export const Default = meta.story();

/** `role="radiogroup"`, one tab stop for the whole group. */
Default.test('is a radiogroup with one tab stop', async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole('radiogroup')).toBeInTheDocument();
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: 'Automatic' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'After' })).toHaveFocus();
});

/** Arrows move focus **and** select (ARIA radiogroup), in both orientations, with wrap; `Home`/`End` inert. */
Default.test('arrows move focus and select, with wrap; Home/End inert', async ({ canvas, args, userEvent }) => {
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    const manual = canvas.getByRole('radio', { name: 'Manual' });
    await expect(manual).toHaveFocus();
    await expect(manual).toBeChecked();
    await expect(args.onValueChange).toHaveBeenCalledTimes(1);
    await expect(args.onValueChange).toHaveBeenCalledWith('manual', expect.anything());

    await userEvent.keyboard('{End}');
    await expect(manual).toHaveFocus();
    await expect(canvas.getByRole('radio', { name: 'Off' })).not.toBeChecked();

    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    const off = canvas.getByRole('radio', { name: 'Off' });
    await expect(off).toHaveFocus();
    await expect(off).toBeChecked();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('radio', { name: 'Automatic' })).toHaveFocus();
});

/** Group-level `disabled` reaches every radio. */
Default.test(
    'group-level disabled reaches every radio',
    { args: { disabled: true } },
    async ({ canvas, args, userEvent }) => {
        for (const radio of canvas.getAllByRole('radio')) {
            await expect(radio).toHaveAttribute('aria-disabled', 'true');
        }
        await userEvent.click(canvas.getByRole('radio', { name: 'Off' }));
        await expect(args.onValueChange).not.toHaveBeenCalled();
    }
);

/** Plain `useState`. */
export const Controlled = meta.story({
    render: function Controlled(args) {
        const [value, setValue] = useState<unknown>('manual');

        return (
            <div className="flex flex-col gap-l">
                <RadioGroup
                    {...args}
                    value={value}
                    onValueChange={(next, details) => {
                        setValue(next);
                        args.onValueChange?.(next, details);
                    }}
                >
                    <FanOptions />
                </RadioGroup>
                <span className="text-caption-m text-text-general-medium">value: {String(value)}</span>
            </div>
        );
    },
});

Controlled.test('a pick updates caller state and reports the value', async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('radio', { name: 'Off' }));
    await expect(canvas.getByText('value: off')).toBeVisible();
    await expect(args.onValueChange).toHaveBeenCalledWith('off', expect.anything());
});
