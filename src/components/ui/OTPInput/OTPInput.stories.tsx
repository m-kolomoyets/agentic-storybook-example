import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { Field } from '@/components/ui/Field';
import { OTP_LENGTH, OTPInput } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/** `:not([aria-hidden])`: Base UI renders a hidden seventh input carrying the whole value. */
function cellsOf(root: HTMLElement) {
    return Array.from(root.querySelectorAll<HTMLInputElement>('input:not([aria-hidden])'));
}

const meta = {
    title: 'UI/OTPInput',
    component: OTPInput,
    args: {
        'aria-label': 'Verification code',
        error: false,
        disabled: false,
        autoSubmit: true,
        onValueChange: fn(),
        onValueComplete: fn(),
    },
    argTypes: {
        error: { control: 'boolean' },
        disabled: { control: 'boolean' },
        autoSubmit: { control: 'boolean' },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}10497-199701` } },
    // Drawn composition is 343px; `OTPInput` is `w-full`, so stories supply the container.
    decorators: [
        function Width(Story) {
            return (
                <div className="w-[343px]">
                    <Story />
                </div>
            );
        },
    ],
} satisfies Meta<typeof OTPInput>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Bare use: `aria-label` names the group. Digits walk focus forward; the sixth fires `onValueComplete`. */
export const Default: Story = {
    parameters: { design: { type: 'figma', url: `${FIGMA}10497-199678` } },
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        await expect(canvas.getByRole('group', { name: 'Verification code' })).toBeInTheDocument();
        const cells = cellsOf(canvasElement);
        await expect(cells).toHaveLength(OTP_LENGTH);
        await userEvent.click(cells[0]!);
        await userEvent.keyboard('12');
        await expect(cells[0]).toHaveValue('1');
        await expect(cells[1]).toHaveValue('2');
        await expect(cells[2]).toHaveFocus();
        await expect(args.onValueChange).toHaveBeenLastCalledWith('12', expect.anything());
        await userEvent.keyboard('3456');
        await expect(args.onValueComplete).toHaveBeenCalledWith('123456', expect.anything());
    },
};

/** `Filled` is not a state: value vs placeholder colour, free from `<input>`. */
export const Filled: Story = {
    args: { defaultValue: '222222', autoSubmit: false },
    parameters: { design: { type: 'figma', url: `${FIGMA}10727-7809` } },
    play: async ({ canvasElement }) => {
        for (const cell of cellsOf(canvasElement)) {
            await expect(cell).toHaveValue('2');
        }
    },
};

/** Every cell reddens (group state); no message without a `Field`. */
export const Error: Story = {
    args: { error: true, defaultValue: '222222', autoSubmit: false },
    parameters: { design: { type: 'figma', url: `${FIGMA}10497-199702` } },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('group')).toHaveAttribute('data-invalid');
    },
};

/** Cells are unfocusable (Base UI puts `disabled` on every slot). */
export const Disabled: Story = {
    args: { disabled: true, defaultValue: '222222' },
    parameters: { design: { type: 'figma', url: `${FIGMA}10727-7869` } },
    play: async ({ canvasElement }) => {
        for (const cell of cellsOf(canvasElement)) {
            await expect(cell).toBeDisabled();
        }
    },
};

/** `Field.Root invalid` with no `error` still reddens: Base UI writes `data-invalid` via context. */
export const InField: Story = {
    args: { 'aria-label': undefined, defaultValue: '222222', autoSubmit: false },
    render: function InField(args) {
        return (
            <Field.Root name="code" invalid>
                <Field.Label>Verification code</Field.Label>
                <OTPInput {...args} />
                <Field.Description>Six digits, sent by SMS.</Field.Description>
                <Field.Error>That code is not right.</Field.Error>
            </Field.Root>
        );
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('group')).toHaveAttribute('data-invalid');
        await expect(canvas.getByText('That code is not right.')).toBeVisible();
    },
};

/** Controlled; pasting `123 456` filters the separator. */
export const Controlled: Story = {
    render: function Controlled(args) {
        const [value, setValue] = useState('');

        return (
            <div className="flex flex-col gap-s">
                <OTPInput
                    {...args}
                    value={value}
                    onValueChange={(next, details) => {
                        setValue(next);
                        args.onValueChange?.(next, details);
                    }}
                />
                <span className="text-caption-m text-text-general-medium">{`${value.length}/${OTP_LENGTH}`}</span>
            </div>
        );
    },
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        await userEvent.click(cellsOf(canvasElement)[0]!);
        await userEvent.paste('123 456');
        await expect(canvas.getByText(`6/${OTP_LENGTH}`)).toBeVisible();
        await expect(args.onValueChange).toHaveBeenLastCalledWith('123456', expect.anything());
        await expect(args.onValueComplete).toHaveBeenCalledWith('123456', expect.anything());
    },
};

/** default / focused (pinned on cell 1) / filled / error / disabled. */
export const Matrix: Story = {
    render: function Matrix() {
        const rows = [
            { key: 'default', props: {} },
            { key: 'focused', props: { className: '[&>input:first-child]:border-border-focused' } },
            { key: 'filled', props: { defaultValue: '222222', autoSubmit: false } },
            { key: 'error', props: { error: true, defaultValue: '222222', autoSubmit: false } },
            { key: 'disabled', props: { disabled: true, defaultValue: '22' } },
        ];

        return (
            <div className="flex flex-col gap-l">
                {rows.map(({ key, props }) => {
                    return (
                        <div key={key} className="flex flex-col gap-s">
                            <span className="text-caption-m text-text-general-medium">{key}</span>
                            <OTPInput aria-label={`Verification code, ${key}`} {...props} />
                        </div>
                    );
                })}
            </div>
        );
    },
};
