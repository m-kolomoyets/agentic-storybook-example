import ErrorIcon from '@/assets/icons/error.svg?react';
import { Input as BaseInput } from '@base-ui/react/input';
import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { cn } from '@/lib/cn';
import { Field } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/** Base UI's own `Input` as the stub, not the kit's, so an `Input` regression cannot mask a `Field` one. */
const CONTROL = `
    w-full rounded-s border border-border-primary bg-surface-input p-l text-body-m text-text-general-strong
    outline-none placeholder:text-text-general-medium focus:border-border-focused
    disabled:border-border-control-disabled disabled:text-text-disabled
`;

const meta = preview.meta({
    title: 'UI/Field',
    component: Field.Root,
    args: { name: 'moisture', invalid: false, disabled: false },
    argTypes: {
        invalid: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}8067-6633` } },
    decorators: [
        function Width(Story) {
            return (
                <div className="w-[320px]">
                    <Story />
                </div>
            );
        },
    ],
    render: function Render(args) {
        return (
            <Field.Root {...args}>
                <Field.Label>Moisture target</Field.Label>
                <BaseInput disabled={args.disabled} className={CONTROL} placeholder="Input Text" />
                <Field.Description>Percent, wet basis.</Field.Description>
                <Field.Error>Must be between 8 and 25.</Field.Error>
            </Field.Root>
        );
    },
});

/** Playground — toggle invalid/disabled in Controls. Label, control, helper, 6px gaps. */
export const Default = meta.story({
    parameters: { design: { type: 'figma', url: `${FIGMA}8067-6605` } },
});

/** Description is wired into `aria-describedby`. */
Default.test('description is wired into aria-describedby; error hidden while valid', async ({ canvas }) => {
    const control = canvas.getByLabelText('Moisture target');
    const description = canvas.getByText('Percent, wet basis.');
    await expect(control).toHaveAttribute('aria-describedby', expect.stringContaining(description.id));
    await expect(canvas.queryByText('Must be between 8 and 25.')).toBeNull();
});

/** `Error` takes `Description`'s slot (same `Caption/Medium`); label stays full-strength. */
Default.test('invalid swaps the description for the error', { args: { invalid: true } }, async ({ canvas }) => {
    await expect(canvas.getByText('Must be between 8 and 25.')).toBeVisible();
    await expect(canvas.queryByText('Percent, wet basis.')).toBeNull();
    await expect(canvas.getByLabelText('Moisture target')).toHaveAttribute('data-invalid');
});

/** Label/helper stay `Text/primary` as drawn; only the body greys. */
Default.test('disabled greys the control, helper stays visible', { args: { disabled: true } }, async ({ canvas }) => {
    await expect(canvas.getByLabelText('Moisture target')).toBeDisabled();
    await expect(canvas.getByText('Percent, wet basis.')).toBeVisible();
});

/** `showLabel=false`: the caller owes the control an `aria-label`. */
Default.test(
    'without a label the control is named by aria-label',
    {
        render: function Render(args) {
            return (
                <Field.Root {...args}>
                    <BaseInput aria-label="Moisture target" className={CONTROL} placeholder="Input Text" />
                    <Field.Description>Percent, wet basis.</Field.Description>
                </Field.Root>
            );
        },
    },
    async ({ canvas }) => {
        await expect(canvas.getByRole('textbox', { name: 'Moisture target' })).toBeInTheDocument();
    }
);

/** 16px glyph after the label, 4px gap. Meaning undefined in Figma, so no `icon` prop — pass a second child. */
export const LabelIcon = meta.story({
    parameters: { design: { type: 'figma', url: `${FIGMA}9675-189801` } },
    render: function Render(args) {
        return (
            <Field.Root {...args}>
                <Field.Label>
                    Moisture target
                    <ErrorIcon aria-hidden className="size-xl text-icons-general-medium" />
                </Field.Label>
                <BaseInput className={CONTROL} placeholder="Input Text" />
                <Field.Description>Percent, wet basis.</Field.Description>
            </Field.Root>
        );
    },
});

LabelIcon.test('the glyph leaves the accessible name intact', async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Moisture target' })).toBeInTheDocument();
});

/**
 * valid / invalid / disabled × with / without helper.
 * Shipped as drawn: resting border ≈1.44:1 (WCAG 1.4.11 wants 3:1) — the fix belongs to the token.
 */
export const Matrix = meta.story({
    parameters: {
        design: [
            { name: 'Invalid', type: 'figma', url: `${FIGMA}8070-1208` },
            { name: 'Disabled', type: 'figma', url: `${FIGMA}8070-1229` },
        ],
    },
    decorators: [
        function Wide(Story) {
            return (
                <div className="w-[960px]">
                    <Story />
                </div>
            );
        },
    ],
    render: function Matrix() {
        const states = [
            { key: 'valid', invalid: false, disabled: false },
            { key: 'invalid', invalid: true, disabled: false },
            { key: 'disabled', invalid: false, disabled: true },
        ];

        return (
            <div className="grid grid-cols-3 items-start gap-l">
                {[true, false].map((helper) => {
                    return states.map(({ key, invalid, disabled }) => {
                        return (
                            <Field.Root key={`${key}-${helper}`} invalid={invalid} disabled={disabled}>
                                <Field.Label>{`Moisture ${key}${helper ? '' : ', no helper'}`}</Field.Label>
                                <input
                                    disabled={disabled}
                                    className={cn`${CONTROL} ${invalid ? 'border-border-negative' : ''}`}
                                    placeholder="Input Text"
                                />
                                {helper ? <Field.Description>Percent, wet basis.</Field.Description> : null}
                                <Field.Error>Must be between 8 and 25.</Field.Error>
                            </Field.Root>
                        );
                    });
                })}
            </div>
        );
    },
});
