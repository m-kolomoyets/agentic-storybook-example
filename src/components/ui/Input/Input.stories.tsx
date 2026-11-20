import { useState } from 'react';
import EyeIcon from '@/assets/icons/remove-red-eye.svg?react';
import EyeOffIcon from '@/assets/icons/visibility-off.svg?react';
import preview from '#.storybook/preview';
import { expect, fn } from 'storybook/test';
import { Field } from '@/components/ui/Field';
import { Input, InputAddonButton } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = preview.meta({
    title: 'UI/Input',
    component: Input,
    args: {
        'aria-label': 'Moisture target',
        placeholder: 'Input Text',
        error: false,
        disabled: false,
        onValueChange: fn(),
    },
    argTypes: {
        type: { control: 'select', options: ['text', 'password', 'email', 'number', 'tel', 'url'] },
        error: { control: 'boolean' },
        disabled: { control: 'boolean' },
        startAddon: { control: false },
        endAddon: { control: false },
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
});

/**
 * Playground — switch error/disabled/type in Controls. Every visual cell lives in `Matrix`.
 * Bare `Input` has no accessible name, hence `aria-label`.
 */
export const Default = meta.story({
    parameters: { design: { type: 'figma', url: `${FIGMA}8067-6605` } },
});

/** Clicking the body padding focuses the control. */
Default.test('body click focuses the control; typing reports the value', async ({ canvas, args, userEvent }) => {
    const control = canvas.getByRole('textbox', { name: 'Moisture target' });
    await userEvent.click(control.parentElement!);
    await expect(control).toHaveFocus();
    await userEvent.keyboard('14');
    await expect(control).toHaveValue('14');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('14', expect.anything());
});

/** Non-interactive addons focus the control when clicked — also inside a focusable ancestor (dialog popup). */
Default.test(
    'addon click focuses the control inside a focusable ancestor',
    {
        args: {
            startAddon: <EyeIcon aria-hidden />,
            endAddon: <span data-testid="unit">%</span>,
        },
        decorators: [
            function FocusableAncestor(Story) {
                return (
                    <div role="dialog" aria-label="Edit bin" tabIndex={-1}>
                        <Story />
                    </div>
                );
            },
        ],
    },
    async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByTestId('unit'));
        await expect(canvas.getByRole('textbox', { name: 'Moisture target' })).toHaveFocus();
    }
);

/** Value vs placeholder colour is free from `<input>`; `Filled` is not a state. */
Default.test('defaultValue fills the control', { args: { defaultValue: 'Input Text' } }, async ({ canvas }) => {
    await expect(canvas.getByRole('textbox')).toHaveValue('Input Text');
});

/** Standalone: red border, no message — the message needs a `Field` (see `InField`). */
Default.test(
    'standalone error marks the control',
    { args: { error: true, defaultValue: 'Input Text' } },
    async ({ canvas }) => {
        await expect(canvas.getByRole('textbox')).toHaveAttribute('data-invalid');
    }
);

/** Body click does not focus a disabled control; the trailing button can't be clicked (`pointer-events-none`). */
Default.test(
    'disabled ignores body clicks and blocks the trailing button',
    {
        args: {
            disabled: true,
            startAddon: <EyeIcon aria-hidden />,
            endAddon: <InputAddonButton icon={<EyeIcon className="size-full" />} aria-label="Show password" />,
        },
    },
    async ({ canvas, userEvent }) => {
        const control = canvas.getByRole('textbox');
        await userEvent.click(control.parentElement!);
        await expect(control).not.toHaveFocus();
        await expect(control).toBeDisabled();
        const slot = canvas.getByRole('button', { name: 'Show password' }).parentElement!;
        await expect(getComputedStyle(slot).pointerEvents).toBe('none');
    }
);

/** Why slots are nodes, not icons: the designed trailing addon is a button. */
export const PasswordToggle = meta.story({
    args: { 'aria-label': 'Password', placeholder: undefined },
    parameters: { design: { type: 'figma', url: `${FIGMA}8067-6628` } },
    render: function PasswordToggle(args) {
        const [revealed, setRevealed] = useState(false);
        const Glyph = revealed ? EyeOffIcon : EyeIcon;

        return (
            <Input
                {...args}
                type={revealed ? 'text' : 'password'}
                defaultValue="grain-store-42"
                endAddon={
                    <InputAddonButton
                        icon={<Glyph className="size-full" />}
                        aria-label={revealed ? 'Hide password' : 'Show password'}
                        onClick={() => {
                            setRevealed(!revealed);
                        }}
                    />
                }
            />
        );
    },
});

PasswordToggle.test(
    'toggle reveals the value and keeps focus on itself',
    async ({ canvas, canvasElement, userEvent }) => {
        const control = canvasElement.querySelector('input')!;
        await expect(control).toHaveAttribute('type', 'password');
        const reveal = canvas.getByRole('button', { name: 'Show password' });
        await expect(reveal).toHaveAttribute('type', 'button');
        await userEvent.click(reveal);
        await expect(control).toHaveAttribute('type', 'text');
        // The addon keeps its own click: focus stays on the button, not the control.
        await expect(canvas.getByRole('button', { name: 'Hide password' })).toHaveFocus();
    }
);

/** `Field.Root invalid` with no `error` still reddens: Base UI writes `data-invalid` via context. */
export const InField = meta.story({
    args: { 'aria-label': undefined },
    render: function InField(args) {
        return (
            <div className="flex flex-col gap-xl">
                <Field.Root name="moisture">
                    <Field.Label>Moisture target</Field.Label>
                    <Input {...args} />
                    <Field.Description>Percent, wet basis.</Field.Description>
                </Field.Root>
                <Field.Root name="moisture-invalid" invalid>
                    <Field.Label>Moisture invalid</Field.Label>
                    <Input {...args} defaultValue="41" />
                    <Field.Description>Percent, wet basis.</Field.Description>
                    <Field.Error>Must be between 8 and 25.</Field.Error>
                </Field.Root>
            </div>
        );
    },
});

InField.test('Field wires name, description and invalid state', async ({ canvas }) => {
    const valid = canvas.getByRole('textbox', { name: 'Moisture target' });
    await expect(valid).not.toHaveAttribute('data-invalid');
    await expect(valid).toHaveAccessibleDescription('Percent, wet basis.');
    const invalid = canvas.getByRole('textbox', { name: 'Moisture invalid' });
    await expect(invalid).toHaveAttribute('data-invalid');
    await expect(invalid).toHaveAccessibleDescription('Must be between 8 and 25.');
});

const STATES = ['default', 'hover', 'focused', 'error', 'disabled'] as const;

/** `hover`/`focused` pinned with the same bare `border-*` utilities the gated rules apply. */
const FORCED: Record<(typeof STATES)[number], string> = {
    default: '',
    hover: 'border-border-control-hover',
    focused: 'border-border-focused',
    error: '',
    disabled: '',
};

/**
 * Every state × with/without addons. Shipped as drawn: resting border ≈1.44:1, hover ≈2.70:1 (WCAG 1.4.11
 * wants 3:1) — the fix belongs to `--color-border-primary`.
 */
export const Matrix = meta.story({
    parameters: {
        design: [
            { name: 'Default', type: 'figma', url: `${FIGMA}8067-6605` },
            { name: 'With addons', type: 'figma', url: `${FIGMA}8067-6621` },
            { name: 'Filled', type: 'figma', url: `${FIGMA}8070-1199` },
            { name: 'Error', type: 'figma', url: `${FIGMA}8070-1208` },
            { name: 'Disabled', type: 'figma', url: `${FIGMA}8070-1229` },
        ],
        // The one billed Chromatic snapshot for Input (preview disables the rest).
        chromatic: { disableSnapshot: false },
    },
    decorators: [
        function Wide(Story) {
            return (
                <div className="w-[1200px]">
                    <Story />
                </div>
            );
        },
    ],
    render: function Matrix() {
        return (
            <div className="grid grid-cols-[auto_repeat(5,1fr)] items-center gap-l">
                <span />
                {STATES.map((state) => {
                    return (
                        <span key={state} className="text-caption-m text-text-general-medium">
                            {state}
                        </span>
                    );
                })}
                {[false, true].map((addons) => {
                    return [
                        <span key={`${addons}-label`} className="text-caption-m text-text-general-medium">
                            {addons ? 'with addons' : 'no addons'}
                        </span>,
                        ...STATES.map((state) => {
                            return (
                                <Input
                                    key={`${addons}-${state}`}
                                    aria-label={`Moisture target, ${state}`}
                                    placeholder="Input Text"
                                    error={state === 'error'}
                                    disabled={state === 'disabled'}
                                    className={FORCED[state]}
                                    startAddon={addons ? <EyeIcon aria-hidden /> : undefined}
                                    endAddon={addons ? <EyeIcon aria-hidden /> : undefined}
                                />
                            );
                        }),
                    ];
                })}
            </div>
        );
    },
});
