import type { StoryContext } from '@storybook/react-vite';
import type { TimeInputProps } from './types';
import { useState } from 'react';
import preview from '#.storybook/preview';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Field } from '@/components/ui/Field';
import { TimeInput } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';
const MOBILE = { viewport: { value: 'mobile2', isRotated: false } };
const LABEL = 'Ticket time';

/** Controlled host: `value` is only the initial value; every commit is mirrored to `onValueChange`. */
function ControlledTimeInput({ value: initial, onValueChange, ...rest }: TimeInputProps) {
    const [value, setValue] = useState(initial);
    return (
        <div className="flex w-[351px] flex-col gap-s">
            <TimeInput
                {...rest}
                value={value}
                onValueChange={(next) => {
                    setValue(next);
                    onValueChange(next);
                }}
            />
            <output className="text-caption-m text-text-general-medium">Value: {value === '' ? '—' : value}</output>
        </div>
    );
}

const meta = preview.meta({
    title: 'UI/TimeInput',
    component: TimeInput,
    args: { value: '', onValueChange: fn(), 'aria-label': LABEL, disabled: false },
    argTypes: {
        value: { control: 'text', description: 'Initial 24-hour value (the story host is controlled).' },
        disabled: { control: 'boolean' },
    },
    render: function Render(args) {
        return <ControlledTimeInput {...args} />;
    },
    // Desktop by default (1200×900): dropdown branch. `*OnMobile` stories pin a phone viewport for the sheet.
    parameters: { design: { type: 'figma', url: `${FIGMA}9449-9198` } },
});

type PlayContext = StoryContext<TimeInputProps>;

function field({ canvas }: PlayContext) {
    return canvas.getByRole<HTMLInputElement>('textbox', { name: LABEL });
}

async function retype(context: PlayContext, text: string) {
    await context.userEvent.clear(field(context));
    if (text !== '') {
        await context.userEvent.type(field(context), text);
    }
}

/** Playground — set the initial value / disabled in Controls. Every visual cell lives in `Matrix`. */
export const Default = meta.story();

/** Empty: placeholder `2:15`, addon starts at `AM`. Typing commits only on blur, in the addon's half of the day. */
Default.test('empty field types, then commits on blur in the addon half', async (context) => {
    const { canvas, userEvent, args } = context;
    const input = field(context);
    await expect(input).toHaveAttribute('placeholder', '2:15');
    await expect(input).toHaveAttribute('inputmode', 'numeric');
    await expect(canvas.getByRole('button', { name: `${LABEL}, AM` })).toBeInTheDocument();

    await userEvent.type(input, '215');
    await expect(input).toHaveValue('2:15');
    await expect(args.onValueChange).not.toHaveBeenCalled();

    await userEvent.tab();
    await expect(args.onValueChange).toHaveBeenLastCalledWith('02:15');
});

/** 24-hour values draw on a 12-hour clock; both noons are `12`. */
Default.test(
    '24-hour values draw on a 12-hour clock; both noons are 12',
    { args: { value: '14:15' } },
    async (context) => {
        const { canvas, userEvent, args } = context;
        await expect(field(context)).toHaveValue('2:15');
        await expect(canvas.getByRole('button', { name: `${LABEL}, PM` })).toBeInTheDocument();

        // A bare hour is that hour on the dot, read in the current (PM) half; Enter commits.
        await retype(context, '7');
        await expect(field(context)).toHaveValue('7:');
        await userEvent.keyboard('{Enter}');
        await expect(args.onValueChange).toHaveBeenLastCalledWith('19:00');
        await expect(field(context)).toHaveValue('7:00');

        // 12 in the PM half is midday, not midnight.
        await retype(context, '1230');
        await userEvent.keyboard('{Enter}');
        await expect(args.onValueChange).toHaveBeenLastCalledWith('12:30');
        await expect(field(context)).toHaveValue('12:30');
    }
);

/** The mask: digits only, `:` inserted, impossible digits refused, overflow dropped. */
Default.test('the mask keeps digits, inserts the colon, refuses impossible digits', async (context) => {
    const cases: [string, string][] = [
        ['2', '2:'],
        ['1', '1'],
        ['12', '12:'],
        ['13', '1:3'],
        ['135', '1:35'],
        ['00', '0'],
        ['0930', '09:30'],
        ['26', '2:'],
        ['2599', '2:59'],
        ['ab2c1d5', '2:15'],
        ['12345', '12:34'],
    ];
    for (const [typed, shown] of cases) {
        await retype(context, typed);
        await expect(field(context)).toHaveValue(shown);
    }
});

/** Backspace over the auto-inserted `:` removes it instead of the mask re-adding it. */
Default.test('backspace over the auto colon removes it', async (context) => {
    await retype(context, '12');
    await expect(field(context)).toHaveValue('12:');
    await context.userEvent.keyboard('{Backspace}');
    await expect(field(context)).toHaveValue('12');
});

/** An unfinished minute is not a time: nothing is emitted and the field redraws the value it still has. */
Default.test(
    'an unfinished minute emits nothing and redraws the value',
    { args: { value: '09:30' } },
    async (context) => {
        await retype(context, '21');
        await expect(field(context)).toHaveValue('2:1');
        await context.userEvent.tab();
        await expect(context.args.onValueChange).not.toHaveBeenCalled();
        await expect(field(context)).toHaveValue('9:30');
    }
);

/** Clearing is an answer too: blur emits `''`. Enter with no pending edit does nothing. */
Default.test(
    'clearing emits empty on blur; Enter without an edit does nothing',
    { args: { value: '09:30' } },
    async (context) => {
        const { userEvent, args } = context;
        await userEvent.click(field(context));
        await userEvent.keyboard('{Enter}');
        await expect(args.onValueChange).not.toHaveBeenCalled();

        await retype(context, '');
        await userEvent.tab();
        await expect(args.onValueChange).toHaveBeenLastCalledWith('');
        await expect(field(context)).toHaveValue('');
    }
);

/** Desktop: the addon is a dropdown anchored to the field. Picking moves the value across noon. */
Default.test('desktop dropdown pick moves the value across noon', { args: { value: '02:30' } }, async (context) => {
    const { canvas, canvasElement, userEvent, args } = context;
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('button', { name: `${LABEL}, AM` }));
    const menu = await body.findByRole('menu');
    await expect(within(menu).getByRole('menuitemradio', { name: 'AM' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(within(menu).getByRole('menuitemradio', { name: 'PM' }));
    await expect(args.onValueChange).toHaveBeenLastCalledWith('14:30');
    await waitFor(() => {
        return expect(body.queryByRole('menu')).not.toBeInTheDocument();
    });
    await expect(canvas.getByRole('button', { name: `${LABEL}, PM` })).toBeInTheDocument();
    await expect(field(context)).toHaveValue('2:30');
});

/** An empty field holds its own half of the day: the pick emits nothing, but the next commit reads in it. */
Default.test('an empty field holds the picked half for the next commit', async (context) => {
    const { canvas, canvasElement, userEvent, args } = context;
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('button', { name: `${LABEL}, AM` }));
    await userEvent.click(await body.findByRole('menuitemradio', { name: 'PM' }));
    await expect(args.onValueChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole('button', { name: `${LABEL}, PM` })).toBeInTheDocument();

    await userEvent.type(field(context), '7');
    await userEvent.tab();
    await expect(args.onValueChange).toHaveBeenLastCalledWith('19:00');
});

/** A typed time then a pick lands in the picked half (the click's blur commits first; the pick then moves it). */
Default.test('a typed time then a pick lands in the picked half', async (context) => {
    const { canvas, canvasElement, userEvent, args } = context;
    await userEvent.type(field(context), '215');
    await userEvent.click(canvas.getByRole('button', { name: `${LABEL}, AM` }));
    await userEvent.click(await within(canvasElement.ownerDocument.body).findByRole('menuitemradio', { name: 'PM' }));
    await expect(args.onValueChange).toHaveBeenLastCalledWith('14:15');
    await expect(field(context)).toHaveValue('2:15');
});

/** Disabled: field and addon both inert. */
Default.test('disabled makes field and addon inert', { args: { value: '09:30', disabled: true } }, async (context) => {
    await expect(field(context)).toBeDisabled();
    await expect(context.canvas.getByRole('button', { name: `${LABEL}, AM` })).toBeDisabled();
});

/** Inside `Field.Root` the `Field.Label` names the field; the addon falls back to `Time`. */
export const InField = meta.story({
    args: { 'aria-label': undefined, value: '07:48' },
    render: function InField(args) {
        return (
            <Field.Root>
                <Field.Label>Start time</Field.Label>
                <ControlledTimeInput {...args} />
            </Field.Root>
        );
    },
});

InField.test('Field.Label names the field; the addon falls back to Time', async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Start time' })).toHaveValue('7:48');
    await expect(canvas.getByRole('button', { name: 'Time, AM' })).toBeInTheDocument();
});

/** Mobile: the addon opens the `Select AM or PM` sheet; `Back` discards, `Apply` commits. */
export const MeridiemSheetOnMobile = meta.story({
    args: { value: '02:30' },
    globals: MOBILE,
    parameters: { design: { type: 'figma', url: `${FIGMA}12766-226874` } },
});

MeridiemSheetOnMobile.test('addon sheet: Back discards, Apply commits', async (context) => {
    const { canvas, canvasElement, userEvent, args } = context;
    const body = within(canvasElement.ownerDocument.body);
    const trigger = await canvas.findByRole('button', { name: `${LABEL}, AM` });
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');

    await userEvent.click(trigger);
    let sheet = await body.findByRole('dialog', { name: 'Select AM or PM' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(within(sheet).getByRole('radio', { name: 'PM' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Back' }));
    await waitFor(() => {
        return expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await expect(args.onValueChange).not.toHaveBeenCalled();

    await userEvent.click(trigger);
    sheet = await body.findByRole('dialog', { name: 'Select AM or PM' });
    // The draft resets to the value on reopen.
    await expect(within(sheet).getByRole('radio', { name: 'AM' })).toBeChecked();
    await userEvent.click(within(sheet).getByRole('radio', { name: 'PM' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Apply' }));
    await expect(args.onValueChange).toHaveBeenLastCalledWith('14:30');
    await waitFor(() => {
        return expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await expect(canvas.getByRole('button', { name: `${LABEL}, PM` })).toBeInTheDocument();
});

/** Review grid vs Figma: empty, filled (both noons), disabled. */
export const Matrix = meta.story({
    render: function Matrix() {
        const rows: [string, string, boolean][] = [
            ['Empty', '', false],
            ['Afternoon', '14:15', false],
            ['Midnight', '00:10', false],
            ['Midday', '12:00', false],
            ['Disabled', '09:30', true],
        ];
        return (
            <div className="flex w-[351px] flex-col gap-xl">
                {rows.map(([name, value, disabled]) => {
                    return (
                        <Field.Root key={name}>
                            <Field.Label>{name}</Field.Label>
                            <TimeInput value={value} onValueChange={fn()} disabled={disabled} meridiemLabel={name} />
                        </Field.Root>
                    );
                })}
            </div>
        );
    },
});

Matrix.test('midnight and midday draw as 12 in the right half', async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Midnight' })).toHaveValue('12:10');
    await expect(canvas.getByRole('button', { name: 'Midnight, AM' })).toBeInTheDocument();
    await expect(canvas.getByRole('textbox', { name: 'Midday' })).toHaveValue('12:00');
    await expect(canvas.getByRole('button', { name: 'Midday, PM' })).toBeInTheDocument();
});
