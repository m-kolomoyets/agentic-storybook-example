import { useState } from 'react';
import preview from '#.storybook/preview';
import { expect, fn } from 'storybook/test';
import { Field } from '@/components/ui/Field';
import { SearchInput } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = preview.meta({
    title: 'UI/SearchInput',
    component: SearchInput,
    args: {
        'aria-label': 'Search containers',
        placeholder: 'Search',
        error: false,
        disabled: false,
        onValueChange: fn(),
    },
    argTypes: {
        error: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}8915-26251` } },
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

/** Playground — toggle error/disabled in Controls. Every visual cell lives in `Matrix`. */
export const Default = meta.story();

/** Empty: leading glyph, no clear button. Typing reveals it. */
Default.test('typing reveals the clear button', async ({ canvas, args, userEvent }) => {
    await expect(canvas.queryByRole('button', { name: 'Clear search' })).toBeNull();
    await userEvent.type(canvas.getByRole('textbox', { name: 'Search containers' }), 'n');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('n');
    await expect(canvas.getByRole('button', { name: 'Clear search' })).toBeVisible();
});

/** Clearing empties the value and refocuses the control (the button unmounts, focus would drop to `<body>`). */
Default.test(
    'clear empties the value and refocuses the control',
    { args: { defaultValue: 'north bin' } },
    async ({ canvas, args, userEvent }) => {
        const clear = canvas.getByRole('button', { name: 'Clear search' });
        await expect(clear).toHaveAttribute('type', 'button');
        await userEvent.click(clear);
        const control = canvas.getByRole('textbox', { name: 'Search containers' });
        await expect(control).toHaveValue('');
        await expect(control).toHaveFocus();
        await expect(args.onValueChange).toHaveBeenCalledWith('');
        await expect(canvas.queryByRole('button', { name: 'Clear search' })).toBeNull();
    }
);

/** No clear button when disabled: the value cannot change. */
Default.test(
    'disabled hides the clear button',
    { args: { disabled: true, defaultValue: 'north bin' } },
    async ({ canvas }) => {
        await expect(canvas.getByRole('textbox')).toBeDisabled();
        await expect(canvas.queryByRole('button', { name: 'Clear search' })).toBeNull();
    }
);

/** Plain `useState`; `clearLabel` names the button. */
export const Controlled = meta.story({
    args: { clearLabel: 'Clear container search' },
    render: function Controlled(args) {
        const [query, setQuery] = useState('north bin');

        return (
            <div className="flex flex-col gap-l">
                <SearchInput
                    {...args}
                    value={query}
                    onValueChange={(next) => {
                        setQuery(next);
                        args.onValueChange?.(next);
                    }}
                />
                <span className="text-caption-m text-text-general-medium">
                    value: {query === '' ? '(empty)' : query}
                </span>
            </div>
        );
    },
});

Controlled.test('clearLabel names the button; clearing empties the state', async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Clear container search' }));
    await expect(canvas.getByText('value: (empty)')).toBeVisible();
    await expect(args.onValueChange).toHaveBeenCalledWith('');
});

/** Composes into `Field.Root` like `Input`; the label supplies the accessible name. */
export const InField = meta.story({
    args: { 'aria-label': undefined },
    render: function InField(args) {
        return (
            <Field.Root name="search">
                <Field.Label>Search containers</Field.Label>
                <SearchInput {...args} />
                <Field.Description>Matches on name and location.</Field.Description>
            </Field.Root>
        );
    },
});

InField.test('the label names the control and the description describes it', async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Search containers' })).toHaveAccessibleDescription(
        'Matches on name and location.'
    );
});

/** Error keeps the clear button (Figma's error cell omits it). The error line needs a `Field`. */
InField.test(
    'Field invalid keeps the clear button and describes the error',
    {
        args: { 'aria-label': 'Search containers', defaultValue: '???' },
        render: function Error(args) {
            return (
                <Field.Root name="search" invalid>
                    <SearchInput {...args} />
                    <Field.Error>No containers match that name.</Field.Error>
                </Field.Root>
            );
        },
    },
    async ({ canvas }) => {
        const control = canvas.getByRole('textbox', { name: 'Search containers' });
        await expect(control).toHaveAttribute('data-invalid');
        await expect(control).toHaveAccessibleDescription('No containers match that name.');
        await expect(canvas.getByRole('button', { name: 'Clear search' })).toBeVisible();
    }
);

/** Empty / filled × default / error / disabled. Hover/focus belong to `Input`. */
export const Matrix = meta.story({
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
        const states = ['default', 'error', 'disabled'] as const;

        return (
            <div className="grid grid-cols-[auto_repeat(3,1fr)] items-center gap-l">
                <span />
                {states.map((state) => {
                    return (
                        <span key={state} className="text-caption-m text-text-general-medium">
                            {state}
                        </span>
                    );
                })}
                {[false, true].map((filled) => {
                    return [
                        <span key={`${filled}-label`} className="text-caption-m text-text-general-medium">
                            {filled ? 'filled' : 'empty'}
                        </span>,
                        ...states.map((state) => {
                            return (
                                <SearchInput
                                    key={`${filled}-${state}`}
                                    aria-label={`Search containers, ${state}`}
                                    placeholder="Search"
                                    defaultValue={filled ? 'north bin' : undefined}
                                    error={state === 'error'}
                                    disabled={state === 'disabled'}
                                />
                            );
                        }),
                    ];
                })}
            </div>
        );
    },
});
