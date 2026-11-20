import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CountryCode, PhoneInputProps } from './types';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Field } from '@/components/ui/Field';
import { formatMaskedPhone, isValidPhoneNumber, PhoneInput, phoneNumberSchema, toE164 } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/* The visible half; `type=tel` tells it apart from the popup's search combobox. */
function telOf(root: HTMLElement) {
    const input = root.querySelector<HTMLInputElement>('input[type=tel]');
    if (!input) {
        throw new Error('PhoneInput rendered no text input');
    }
    return input;
}

/* The picker is a `<button role=combobox>`; the popup's search is also a combobox, so query by tag. */
function pickerOf(root: HTMLElement) {
    const box = root.querySelector<HTMLButtonElement>('button[role=combobox]');
    if (!box) {
        throw new Error('PhoneInput rendered no picker');
    }
    return box;
}

/* The popup's search field (portalled into body). */
function searchOf(body: HTMLElement) {
    return waitFor(() => {
        const input = body.querySelector<HTMLInputElement>('input[role=combobox]:not([type=tel])');
        if (!input) {
            throw new Error('popup search not mounted');
        }
        return input;
    });
}

function optionNames(body: HTMLElement) {
    return within(body)
        .queryAllByRole('option')
        .map((row) => {
            return row.textContent;
        });
}

const meta = {
    title: 'UI/PhoneInput',
    component: PhoneInput,
    args: { onValueChange: fn(), onCountryChange: fn() },
    argTypes: {
        defaultCountry: { control: 'text' },
        country: { control: 'text' },
        error: { control: 'boolean' },
        disabled: { control: 'boolean' },
        onValueChange: { control: false },
        onCountryChange: { control: false },
    },
    decorators: [
        function Column(Story) {
            // Figma's 351px `Input Container`.
            return (
                <div className="flex w-[351px] flex-col gap-xs">
                    <Story />
                </div>
            );
        },
    ],
    parameters: { design: { type: 'figma', url: `${FIGMA}10417-262835` } },
} satisfies Meta<typeof PhoneInput>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Resting: the `+1 000 000 000` mask; the picker is named by purpose + current value. */
export const Default: Story = {
    parameters: { design: { type: 'figma', url: `${FIGMA}10417-262829` } },
    play: async ({ canvasElement }) => {
        const input = telOf(canvasElement);
        await expect(input).toHaveAttribute('placeholder', '+1 000 000 000');
        await expect(input).toHaveAttribute('inputmode', 'tel');
        await expect(input).toHaveValue('');
        await expect(pickerOf(canvasElement)).toHaveAccessibleName('Country calling code, United States (+1)');
    },
};

/** National digits are formatted as typed and emitted as E.164 — incomplete numbers too. */
export const Typing: Story = {
    parameters: { design: { type: 'figma', url: `${FIGMA}10431-195503` } },
    play: async ({ args, canvasElement }) => {
        const input = telOf(canvasElement);
        await userEvent.type(input, '555');
        // Not withheld until valid: `required`/`dirty` must see a half-typed number.
        await expect(args.onValueChange).toHaveBeenLastCalledWith('+1555');
        await userEvent.type(input, '8675309');
        await expect(input).toHaveValue('+1 555 867 5309');
        await expect(args.onValueChange).toHaveBeenLastCalledWith('+15558675309');
        await expect(args.onCountryChange).not.toHaveBeenCalled();
    },
};

/** A value, formatted by `AsYouType` (Figma draws a hyphen; the library's spacing is kept). */
export const Filled: Story = {
    args: { defaultValue: '+15558675309' },
    parameters: { design: { type: 'figma', url: `${FIGMA}10417-262836` } },
    play: async ({ canvasElement }) => {
        await expect(telOf(canvasElement)).toHaveValue('+1 555 867 5309');
    },
};

/** A hand-typed `+44` keeps its own code and moves the picker; `+44…` must not land as `+144…`. */
export const InternationalPrefix: Story = {
    play: async ({ args, canvasElement }) => {
        const input = telOf(canvasElement);
        await userEvent.type(input, '+');
        // A lone `+` is typing state: shown, but the stored value is still empty.
        await expect(input).toHaveValue('+');
        await expect(args.onValueChange).toHaveBeenLastCalledWith('');
        await userEvent.type(input, '442071234567');
        await expect(args.onValueChange).toHaveBeenLastCalledWith('+442071234567');
        await expect(args.onCountryChange).toHaveBeenLastCalledWith('GB');
        await expect(pickerOf(canvasElement)).toHaveAccessibleName('Country calling code, United Kingdom (+44)');
        await expect(input).toHaveValue('+44 20 7123 4567');
    },
};

/** `+1` is shared by ~25 regions: an ambiguous prefix never moves the picker. */
export const AmbiguousPrefix: Story = {
    args: { defaultCountry: 'CA' },
    play: async ({ args, canvasElement }) => {
        await userEvent.type(telOf(canvasElement), '+15558675309');
        await expect(args.onValueChange).toHaveBeenLastCalledWith('+15558675309');
        await expect(args.onCountryChange).not.toHaveBeenCalled();
        await expect(pickerOf(canvasElement)).toHaveAccessibleName(/Canada/);
    },
};

/** A lone `+` is dropped on blur — nobody is still typing it. */
export const LonePlusOnBlur: Story = {
    play: async ({ canvasElement }) => {
        const input = telOf(canvasElement);
        await userEvent.type(input, '+');
        await expect(input).toHaveValue('+');
        await userEvent.tab();
        await expect(input).toHaveValue('');
    },
};

/** Picking a country keeps the national digits and swaps the calling code; both callbacks fire. */
export const PickCountry: Story = {
    args: { defaultValue: '+15558675309' },
    parameters: { design: { type: 'figma', url: `${FIGMA}10818-8297` } },
    play: async ({ args, canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const picker = pickerOf(canvasElement);
        await userEvent.click(picker);
        await waitFor(() => {
            return expect(picker).toHaveAttribute('data-popup-open');
        });
        // Calling code is searchable, with or without `+`.
        await userEvent.type(await searchOf(canvasElement.ownerDocument.body), '+52');
        const mexico = await body.findByRole('option', { name: /Mexico/ });
        await expect(mexico).toHaveTextContent('+52');
        await userEvent.click(mexico);
        await expect(args.onCountryChange).toHaveBeenLastCalledWith('MX');
        await expect(args.onValueChange).toHaveBeenLastCalledWith('+525558675309');
        await expect(telOf(canvasElement)).toHaveValue('+52 55 5867 5309');
        await expect(picker).toHaveAccessibleName('Country calling code, Mexico (+52)');
    },
};

/** Popup anchors to the row (spans both boxes), not the 68px button. */
export const Open: Story = {
    args: { defaultValue: '+15558675309' },
    parameters: { design: { type: 'figma', url: `${FIGMA}10818-8297` } },
    play: async ({ canvasElement }) => {
        await userEvent.click(pickerOf(canvasElement));
        const body = canvasElement.ownerDocument.body;
        const listbox = await within(body).findByRole('listbox');
        // Row = 351px; the 68px trigger alone would give a 68px popup.
        await waitFor(() => {
            return expect(listbox.getBoundingClientRect().width).toBeGreaterThan(300);
        });
        // The selected row is scrolled into the virtualized window on open.
        const row = await within(body).findByRole('option', { name: /United States/ });
        await expect(row).toBeVisible();
        // Flag is a lazily fetched, decorative asset `<img>` (the glob matched; it is not inlined).
        const flag = row.querySelector('img');
        await expect(flag).toHaveAttribute('alt', '');
        // Dev serves `…/US.svg?no-inline`; a production build hashes it to `…/US-<hash>.svg`.
        await expect(flag?.getAttribute('src')).toMatch(/\/US(-[\w-]+)?\.svg/);
        await waitFor(() => {
            return expect(flag?.naturalWidth).toBeGreaterThan(0);
        });
    },
};

/** No alias table: `uk` does not find United Kingdom (it does find Ukraine). */
export const NoAliases: Story = {
    play: async ({ canvasElement }) => {
        const body = canvasElement.ownerDocument.body;
        await userEvent.click(pickerOf(canvasElement));
        await userEvent.type(await searchOf(body), 'uk');
        await waitFor(() => {
            return expect(optionNames(body).join('|')).toContain('Ukraine');
        });
        await expect(optionNames(body).join('|')).not.toContain('United Kingdom');
    },
};

/** `countries` narrows the list, keeping the derived alphabetical order. */
export const Narrowed: Story = {
    args: { countries: ['US', 'CA', 'MX'], defaultCountry: 'CA' },
    play: async ({ canvasElement }) => {
        const body = canvasElement.ownerDocument.body;
        await expect(telOf(canvasElement)).toHaveAttribute('placeholder', '+1 000 000 000');
        await userEvent.click(pickerOf(canvasElement));
        await waitFor(() => {
            return expect(optionNames(body)).toEqual(['Canada+1', 'Mexico+52', 'United States+1']);
        });
        await userEvent.keyboard('{Escape}');
        await waitFor(() => {
            return expect(within(body).queryByRole('listbox')).toBeNull();
        });
    },
};

/** Both boxes go negative from one `error` prop. */
export const Invalid: Story = {
    args: { defaultValue: '+1555', error: true },
    parameters: { design: { type: 'figma', url: `${FIGMA}10431-204148` } },
    play: async ({ canvasElement }) => {
        await expect(telOf(canvasElement)).toHaveAttribute('data-invalid');
        await expect(pickerOf(canvasElement)).toHaveAttribute('data-invalid');
    },
};

/** Inside `<Field.Root invalid>`: the picker can't read the outer Field (nested Root), so it is handed down. */
export const ErrorInField: Story = {
    render: function ErrorInField(args) {
        return (
            <Field.Root invalid>
                <Field.Label>Phone</Field.Label>
                <PhoneInput {...args} defaultValue="+1555" />
                <Field.Error>Enter a complete phone number.</Field.Error>
            </Field.Root>
        );
    },
    play: async ({ canvas, canvasElement }) => {
        await expect(telOf(canvasElement)).toHaveAttribute('data-invalid');
        await expect(pickerOf(canvasElement)).toHaveAttribute('data-invalid');
        await expect(canvas.getByText('Enter a complete phone number.')).toBeVisible();
    },
};

/** Both boxes dimmed; the picker can't open. */
export const Disabled: Story = {
    args: { defaultValue: '+15558675309', disabled: true },
    parameters: { design: { type: 'figma', url: `${FIGMA}10431-204167` } },
    play: async ({ canvasElement }) => {
        await expect(telOf(canvasElement)).toBeDisabled();
        const picker = pickerOf(canvasElement);
        await expect(picker).toHaveAttribute('data-disabled');
        await userEvent.click(picker, { pointerEventsCheck: 0 });
        await expect(picker).not.toHaveAttribute('data-popup-open');
    },
};

/**
 * In a named Field: the label targets the text input; only the hidden input submits, carrying E.164
 * (never the formatted string, never the picker's `"US"`).
 */
export const InField: Story = {
    render: function InField(args) {
        return (
            <form aria-label="Contact">
                <Field.Root name="phone">
                    <Field.Label>Phone</Field.Label>
                    <PhoneInput {...args} name="phone" defaultValue="+15558675309" />
                    <Field.Description>Mobile preferred.</Field.Description>
                </Field.Root>
            </form>
        );
    },
    play: async ({ canvas, canvasElement }) => {
        const input = telOf(canvasElement);
        const label = canvas.getByText('Phone');
        await expect(label).toHaveAttribute('for', input.id);
        await userEvent.click(label);
        await expect(input).toHaveFocus();
        await expect(input).not.toHaveAttribute('name');
        const form = canvasElement.querySelector('form');
        await expect(form && new FormData(form).getAll('phone')).toEqual(['+15558675309']);
    },
};

/** Both halves controlled; the stored value is validated with the kit's validator. */
export const Controlled: Story = {
    render: function Controlled(args) {
        const [value, setValue] = useState('+15558675309');
        const [country, setCountry] = useState<CountryCode>('US');

        function handleValueChange(next: string) {
            setValue(next);
            args.onValueChange?.(next);
        }

        function handleCountryChange(next: CountryCode) {
            setCountry(next);
            args.onCountryChange?.(next);
        }

        return (
            <>
                <PhoneInput
                    {...args}
                    value={value}
                    onValueChange={handleValueChange}
                    country={country}
                    onCountryChange={handleCountryChange}
                />
                <output className="text-caption-m text-text-general-medium">
                    {`value: ${value || '(empty)'} · country: ${country} · valid: ${String(isValidPhoneNumber(value))} · masked: ${formatMaskedPhone(value)}`}
                </output>
            </>
        );
    },
    play: async ({ args, canvas, canvasElement }) => {
        const output = canvas.getByRole('status');
        await expect(output).toHaveTextContent('valid: false');
        await userEvent.clear(telOf(canvasElement));
        await expect(args.onValueChange).toHaveBeenLastCalledWith('');
        await userEvent.type(telOf(canvasElement), '2015550123');
        await expect(output).toHaveTextContent('value: +12015550123 · country: US · valid: true');
        await expect(output).toHaveTextContent('masked: +1 ··· ··· 0123');
        await expect(phoneNumberSchema.safeParse('+12015550123').success).toBe(true);
        await expect(phoneNumberSchema.safeParse('+1555').success).toBe(false);
        await expect(toE164('(201) 555-0123', 'US')).toBe('+12015550123');
        await expect(toE164('not a number')).toBeNull();
    },
};

/** 240px: the picker keeps its 68px, the input gives up the rest. */
export const NarrowContainer: Story = {
    args: { defaultValue: '+15558675309' },
    decorators: [
        function Narrow(Story) {
            return (
                <div className="w-[240px]">
                    <Story />
                </div>
            );
        },
    ],
    play: async ({ canvasElement }) => {
        await expect(pickerOf(canvasElement).getBoundingClientRect().width).toBe(68);
    },
};

type StateName = 'default' | 'hover' | 'focus' | 'typing' | 'filled' | 'error' | 'disabled' | 'pickerHover';

/* Pseudo-states forced via class for the static grid; `PickerPressed` is the `Open` story. */
const STATES: { state: StateName; node: string; className?: string; props?: Partial<PhoneInputProps> }[] = [
    { state: 'default', node: '10417:262829' },
    { state: 'hover', node: '10428:195461', className: '[&>div:nth-child(2)]:border-border-control-hover' },
    { state: 'focus', node: '10880:124979', className: '[&>div:nth-child(2)]:border-border-focused' },
    {
        state: 'typing',
        node: '10431:195503',
        className: '[&>div:nth-child(2)]:border-border-focused',
        props: { defaultValue: '+1555' },
    },
    { state: 'filled', node: '10417:262836', props: { defaultValue: '+15558675309' } },
    { state: 'error', node: '10431:204148', props: { error: true } },
    { state: 'disabled', node: '10431:204167', props: { disabled: true, defaultValue: '+15558675309' } },
    { state: 'pickerHover', node: '10818:8278', className: '[&_button]:border-border-control-hover' },
];

/** Every drawn cell (except `PickerPressed` → `Open`), for review against Figma. */
export const Matrix: Story = {
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-xl">
                {STATES.map(({ state, node, className, props }) => {
                    return (
                        <div key={state} className="flex flex-col gap-xs">
                            <span className="text-caption-m text-text-general-medium">{`${state} — ${node}`}</span>
                            <PhoneInput {...props} id={`phone-${state}`} className={className} />
                        </div>
                    );
                })}
            </div>
        );
    },
};
