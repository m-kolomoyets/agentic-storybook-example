import type { ReactNode } from 'react';
import { useState } from 'react';
import { Fieldset } from '@base-ui/react/fieldset';
import preview from '#.storybook/preview';
import { expect, fn } from 'storybook/test';
import { Checkbox } from '@/components/ui/Checkbox';
import { CheckboxGroup } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const HUBS = ['headspace', 'plenum'];

/** The caller's bare `<label>` wrapper. */
function Row({ children }: { children: ReactNode }) {
    return <label className="inline-flex items-center gap-m text-body-m text-text-general-strong">{children}</label>;
}

/** Figma draws no group; the link is the checkbox set the children come from. */
const meta = preview.meta({
    title: 'UI/CheckboxGroup',
    component: CheckboxGroup,
    args: { className: 'flex flex-col gap-m', disabled: false, onValueChange: fn() },
    argTypes: { disabled: { control: 'boolean' } },
    parameters: { design: { type: 'figma', url: `${FIGMA}9183-5528` } },
});

/** Independent boxes sharing one array value; one tab stop per checkbox (no roving focus). */
export const Default = meta.story({
    render: function Default(args) {
        const [value, setValue] = useState<string[]>(['plenum']);

        return (
            <div className="flex flex-col gap-xl">
                <CheckboxGroup
                    {...args}
                    value={value}
                    onValueChange={(next, details) => {
                        setValue(next);
                        args.onValueChange?.(next, details);
                    }}
                >
                    <Row>
                        <Checkbox value="headspace" /> Headspace
                    </Row>
                    <Row>
                        <Checkbox value="plenum" /> Plenum
                    </Row>
                    <Row>
                        <Checkbox value="fan_controller_plenum" /> Fan controller plenum
                    </Row>
                </CheckboxGroup>
                <span className="text-caption-m text-text-general-medium">value: [{value.join(', ')}]</span>
            </div>
        );
    },
});

Default.test('shares one array value with one tab stop per box', async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('group')).toBeInTheDocument();
    await userEvent.tab();
    await expect(canvas.getByRole('checkbox', { name: 'Headspace' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('checkbox', { name: 'Plenum' })).toHaveFocus();
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Headspace' }));
    await expect(args.onValueChange).toHaveBeenLastCalledWith(['plenum', 'headspace'], expect.anything());
    await expect(canvas.getByText('value: [plenum, headspace]')).toBeVisible();
});

/** `parent` + `allValues`: the group owns the tri-state and clears it itself. */
export const SelectAll = meta.story({
    args: { allValues: HUBS },
    render: function SelectAll(args) {
        const [value, setValue] = useState<string[]>(['plenum']);

        return (
            <CheckboxGroup {...args} value={value} onValueChange={setValue}>
                <Row>
                    <Checkbox parent /> All hubs
                </Row>
                <Row>
                    <Checkbox value="headspace" /> Headspace
                </Row>
                <Row>
                    <Checkbox value="plenum" /> Plenum
                </Row>
            </CheckboxGroup>
        );
    },
});

SelectAll.test('parent checkbox owns the tri-state and clears it', async ({ canvas, userEvent }) => {
    const parent = canvas.getByRole('checkbox', { name: 'All hubs' });
    await expect(parent).toHaveAttribute('aria-checked', 'mixed');
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Headspace' }));
    await expect(parent).toBeChecked();
    await userEvent.click(parent);
    await expect(canvas.getByRole('checkbox', { name: 'Headspace' })).not.toBeChecked();
    await expect(canvas.getByRole('checkbox', { name: 'Plenum' })).not.toBeChecked();
    await expect(parent).not.toBeChecked();
});

/** Base UI's `Fieldset` imported directly — the kit doesn't wrap it (Figma draws no legend). */
export const WithFieldset = meta.story({
    args: { defaultValue: ['headspace'] },
    render: function WithFieldset(args) {
        return (
            <Fieldset.Root className="flex flex-col gap-m">
                <Fieldset.Legend className="text-body-m-semibold text-text-general-strong">
                    Hubs to include
                </Fieldset.Legend>
                <CheckboxGroup {...args}>
                    <Row>
                        <Checkbox value="headspace" /> Headspace
                    </Row>
                    <Row>
                        <Checkbox value="plenum" /> Plenum
                    </Row>
                </CheckboxGroup>
            </Fieldset.Root>
        );
    },
});

WithFieldset.test('the fieldset legend names the group', async ({ canvas }) => {
    await expect(canvas.getByRole('group', { name: 'Hubs to include' })).toBeInTheDocument();
    await expect(canvas.getByRole('checkbox', { name: 'Headspace' })).toBeChecked();
});

/** Group-level `disabled` reaches every child. */
Default.test(
    'group-level disabled reaches every child',
    {
        args: { disabled: true, defaultValue: ['plenum'] },
        render: function Disabled(args) {
            return (
                <CheckboxGroup {...args}>
                    <Row>
                        <Checkbox value="headspace" /> Headspace
                    </Row>
                    <Row>
                        <Checkbox value="plenum" /> Plenum
                    </Row>
                </CheckboxGroup>
            );
        },
    },
    async ({ canvas, args, userEvent }) => {
        for (const box of canvas.getAllByRole('checkbox')) {
            await expect(box).toHaveAttribute('aria-disabled', 'true');
        }
        await userEvent.click(canvas.getByRole('checkbox', { name: 'Headspace' }));
        await expect(args.onValueChange).not.toHaveBeenCalled();
    }
);
