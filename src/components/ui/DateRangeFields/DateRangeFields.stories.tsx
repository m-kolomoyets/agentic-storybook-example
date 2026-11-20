import type { CalendarActions, DateRange } from '@/components/ui/Calendar/types';
import type { DateRangeFieldsProps, DateRangeInputField, OpenDateRange } from './types';
import type { DateRangeLabels } from './utils/dateInput';
import { useRef, useState } from 'react';
import CloseIcon from '@/assets/icons/close.svg?react';
import preview from '#.storybook/preview';
import { DateTime } from 'luxon';
import { expect, fn, within } from 'storybook/test';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { InputAddonButton } from '@/components/ui/Input';
import {
    DATE_INPUT_INCOMPLETE_ERROR,
    getDateRangeMissingError,
    getDateRangeOrderError,
    getMaxDateError,
} from './utils/dateInput';
import { DateRangeFields, useDateRangeInput } from '.';

/*
 * Deterministic: the mask and the parser default their ceiling to `DateTime.local()`, so every hook story
 * passes `maxDate: TODAY`, and every calendar pins `today`. No story reads the clock.
 */
const TODAY = DateTime.local(2026, 5, 15, 12);

function day(month: number, dayOfMonth: number) {
    return DateTime.local(2026, month, dayOfMonth);
}

function noop() {
    // Fixed field bags: each is one state of the hook, not something to type into.
}

function field(value: string, error: string | null = null): DateRangeInputField {
    let status: DateRangeInputField['status'] = 'empty';
    if (error) {
        status = 'invalid';
    } else if (value) {
        status = 'valid';
    }
    return { value, error, status, onValueChange: noop };
}

const LABELS: DateRangeLabels = { start: 'Start Date', end: 'End Date' };

type StoryArgs = DateRangeFieldsProps & {
    /** Story-only: the hook harness reports every published range here. */
    onPublish?: (next: OpenDateRange | null) => void;
};

const meta = preview.type<{ args: StoryArgs }>().meta({
    title: 'UI/DateRangeFields',
    component: DateRangeFields,
    args: {
        from: field(''),
        to: field(''),
        fromLabel: 'From',
        toLabel: 'To',
        onFieldFocus: fn(),
        onShowToday: fn(),
        onPublish: fn(),
    },
    argTypes: {
        from: { control: false },
        to: { control: false },
        fromEndAddon: { control: false },
        toEndAddon: { control: false },
        onPublish: { table: { disable: true } },
    },
    decorators: [
        function SheetColumn(Story) {
            // Figma's 351px sheet column.
            return (
                <div className="flex w-[21.9375rem] flex-col gap-3xl">
                    <Story />
                </div>
            );
        },
    ],
});

/** Two labelled boxes; focus reports which; the calendar glyph is a `Show today` button when wired. */
export const Default = meta.story();

Default.test('labelled boxes report focus; the glyph is a show today button', async ({ canvas, userEvent, args }) => {
    const from = canvas.getByRole('textbox', { name: 'From' });
    const to = canvas.getByRole('textbox', { name: 'To' });
    await expect(from).toHaveAttribute('placeholder', 'MM/DD/YYYY');
    await expect(from).toHaveAttribute('inputmode', 'numeric');
    await expect(from).toHaveAttribute('maxlength', '10');

    await userEvent.click(from);
    await expect(args.onFieldFocus).toHaveBeenLastCalledWith('from');
    await userEvent.click(to);
    await expect(args.onFieldFocus).toHaveBeenLastCalledWith('to');

    const [fromToday, toToday] = canvas.getAllByRole('button', { name: 'Show today' });
    await userEvent.click(fromToday!);
    await expect(args.onShowToday).toHaveBeenLastCalledWith('from');
    await userEvent.click(toToday!);
    await expect(args.onShowToday).toHaveBeenLastCalledWith('to');
});

/** Without `onShowToday` the glyph is decoration, not a control. */
Default.test(
    'without onShowToday the glyph is decoration',
    {
        args: { onShowToday: undefined },
    },
    async ({ canvas }) => {
        await expect(canvas.queryByRole('button', { name: 'Show today' })).toBeNull();
    }
);

Default.test(
    'filled values show, nothing invalid',
    {
        args: { from: field('04/08/2026'), to: field('04/27/2026'), fromLabel: 'Start Date', toLabel: 'End Date' },
    },
    async ({ canvas }) => {
        await expect(canvas.getByRole('textbox', { name: 'Start Date' })).toHaveValue('04/08/2026');
        await expect(canvas.getByRole('textbox', { name: 'End Date' })).toHaveValue('04/27/2026');
        await expect(canvas.getByRole('textbox', { name: 'End Date' })).not.toHaveAttribute('aria-invalid');
    }
);

/** Half-typed beside a filled neighbour. */
Default.test(
    'half-typed beside a filled neighbour is incomplete',
    {
        args: { from: field('04/0', DATE_INPUT_INCOMPLETE_ERROR), to: field('04/27/2026') },
    },
    async ({ canvas }) => {
        await expect(canvas.getByRole('textbox', { name: 'From' })).toHaveAttribute('aria-invalid', 'true');
        await expect(canvas.getByText(DATE_INPUT_INCOMPLETE_ERROR)).toBeVisible();
        await expect(canvas.getByRole('textbox', { name: 'To' })).not.toHaveAttribute('aria-invalid');
    }
);

/** A whole date that is wrong on its own. */
Default.test(
    'a whole date wrong on its own shows its message',
    {
        args: {
            from: field('02/29/2026', 'February 2026 has 28 days'),
            to: field('12/31/2099', getMaxDateError(TODAY)),
        },
    },
    async ({ canvas }) => {
        await expect(canvas.getByText('February 2026 has 28 days')).toBeVisible();
        await expect(canvas.getByText('Date must be on or before May 15, 2026')).toBeVisible();
    }
);

/** One half alone, with the site's labels quoted. */
Default.test(
    'a lone start asks for the end with site labels',
    {
        args: {
            from: field('04/08/2026'),
            to: field('', getDateRangeMissingError(LABELS.end)),
            fromLabel: 'Start Date',
            toLabel: 'End Date',
        },
    },
    async ({ canvas }) => {
        await expect(canvas.getByText('Add an End Date to complete the range')).toBeVisible();
    }
);

Default.test(
    'a lone end asks for the start with site labels',
    {
        args: {
            from: field('', getDateRangeMissingError(LABELS.start)),
            to: field('04/27/2026'),
            fromLabel: 'Start Date',
            toLabel: 'End Date',
        },
    },
    async ({ canvas }) => {
        await expect(canvas.getByText('Add a Start Date to complete the range')).toBeVisible();
    }
);

Default.test(
    'a reversed pair is said on the end only',
    {
        args: {
            from: field('04/27/2026'),
            to: field('04/08/2026', getDateRangeOrderError(LABELS)),
            fromLabel: 'Start Date',
            toLabel: 'End Date',
        },
    },
    async ({ canvas }) => {
        await expect(canvas.getByText('End Date must be on or after Start Date')).toBeVisible();
        await expect(canvas.getByRole('textbox', { name: 'Start Date' })).not.toHaveAttribute('aria-invalid');
    }
);

/** `invalid` marks both boxes for a message about the pair as a whole; neither gets text of its own. */
Default.test(
    'invalid marks both boxes',
    {
        args: { from: field('04/08/2026'), to: field('04/27/2026'), invalid: true },
    },
    async ({ canvas }) => {
        await expect(canvas.getByRole('textbox', { name: 'From' })).toHaveAttribute('aria-invalid', 'true');
        await expect(canvas.getByRole('textbox', { name: 'To' })).toHaveAttribute('aria-invalid', 'true');
    }
);

type HarnessProps = {
    onPublish?: (next: OpenDateRange | null) => void;
    onShowToday?: DateRangeFieldsProps['onShowToday'];
    seed?: DateRange | null;
    labels?: DateRangeLabels;
    minDate?: DateTime;
    fromLabel?: string;
    toLabel?: string;
};

/** The real hook beside a calendar: typing moves the selection, picking rewrites both boxes. */
function HookHarness({ onPublish, onShowToday, seed = null, labels, minDate, fromLabel, toLabel }: HarnessProps) {
    const [draft, setDraft] = useState<DateRange | null>(seed);
    const calendarActionsRef = useRef<CalendarActions>(null);
    const range = useDateRangeInput({
        value: draft,
        onValueChange: (next) => {
            setDraft(next);
            onPublish?.(next);
        },
        maxDate: TODAY,
        minDate,
        labels,
    });
    return (
        <>
            <DateRangeFields
                from={range.from}
                to={range.to}
                fromLabel={fromLabel ?? 'From'}
                toLabel={toLabel ?? 'To'}
                onShowToday={(name) => {
                    calendarActionsRef.current?.showToday();
                    onShowToday?.(name);
                }}
            />
            <span className="text-caption-m text-text-general-medium">{`isValid: ${range.isValid}`}</span>
            <div className="flex gap-s">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                        range.reset(seed);
                    }}
                >
                    Reset
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                        range.setRange(null);
                    }}
                >
                    Clear
                </Button>
            </div>
            <Calendar
                mode="range"
                value={draft}
                onValueChange={range.setRange}
                actionsRef={calendarActionsRef}
                today={TODAY}
                defaultMonth={day(4, 1)}
                maxDate={TODAY}
            />
        </>
    );
}

function lastPublished(spy: unknown) {
    const calls = (spy as ReturnType<typeof fn>).mock.calls;
    return calls.at(-1)?.[0] as OpenDateRange | null | undefined;
}

/** Types a whole string as one change, the way the hook test hands it text: paste over the box. */
async function typeInto(
    box: HTMLElement,
    text: string,
    userEvent: { clear: (el: Element) => Promise<void>; paste: (t: string) => Promise<void> }
) {
    await userEvent.clear(box);
    if (text) {
        await userEvent.paste(text);
    }
}

/** Empty is valid; masks on the way in; publishes only a complete ordered pair; un-publishes when broken. */
export const WithCalendar = meta.story({
    render: function WithCalendar(args) {
        return <HookHarness onPublish={args.onPublish} onShowToday={args.onShowToday} />;
    },
});

WithCalendar.test(
    'empty is valid; masks; publishes only a complete ordered pair',
    async ({ canvas, userEvent, args }) => {
        const from = canvas.getByRole('textbox', { name: 'From' });
        const to = canvas.getByRole('textbox', { name: 'To' });
        await expect(from).toHaveValue('');
        await expect(canvas.getByText('isValid: true')).toBeInTheDocument();

        await typeInto(from, '04082026', userEvent);
        await expect(from).toHaveValue('04/08/2026');
        await expect(args.onPublish).toHaveBeenLastCalledWith(null);

        await typeInto(to, '04272026', userEvent);
        const published = lastPublished(args.onPublish);
        await expect(published?.start.toISODate()).toBe('2026-04-08');
        await expect(published?.end?.toISODate()).toBe('2026-04-27');
        // The calendar follows the typed range.
        await expect(canvas.getByRole('button', { name: 'April 8, 2026' })).toHaveAttribute('data-range-start');

        await typeInto(to, '0427', userEvent);
        await expect(args.onPublish).toHaveBeenLastCalledWith(null);

        // One-day range is legal.
        await typeInto(to, '04082026', userEvent);
        await expect(canvas.getByText('isValid: true')).toBeInTheDocument();
        await expect(lastPublished(args.onPublish)?.end?.toISODate()).toBe('2026-04-08');

        // Picking on the calendar rewrites both boxes.
        await userEvent.click(canvas.getByRole('button', { name: 'April 2, 2026' }));
        await userEvent.click(canvas.getByRole('button', { name: 'April 5, 2026' }));
        await expect(from).toHaveValue('04/02/2026');
        await expect(to).toHaveValue('04/05/2026');

        // `setRange(null)` empties both boxes.
        await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
        await expect(from).toHaveValue('');
        await expect(to).toHaveValue('');

        // Show today pages the calendar beside the boxes.
        await userEvent.click(canvas.getAllByRole('button', { name: 'Show today' })[0]!);
        await expect(args.onShowToday).toHaveBeenCalledWith('from');
        await expect(canvas.getByText('May 2026')).toBeInTheDocument();
    }
);

/** The messages no single box can produce, plus a box's own message and the keystroke refusal. */
WithCalendar.test(
    'pair rules, a box message and the keystroke refusal',
    {
        render: function PairRules(args) {
            return <HookHarness onPublish={args.onPublish} minDate={day(4, 1)} />;
        },
    },
    async ({ canvas, canvasElement, userEvent }) => {
        const from = canvas.getByRole('textbox', { name: 'From' });
        const to = canvas.getByRole('textbox', { name: 'To' });
        const root = within(canvasElement);

        // Half-typed beside a blank box: silent, but not publishable.
        await typeInto(from, '040', userEvent);
        await expect(from).not.toHaveAttribute('aria-invalid');
        await expect(root.getByText('isValid: false')).toBeInTheDocument();

        // …beside a filled one: asks for the rest.
        await typeInto(to, '04272026', userEvent);
        await expect(root.getByText(DATE_INPUT_INCOMPLETE_ERROR)).toBeVisible();

        // Only To is a day.
        await typeInto(from, '', userEvent);
        await expect(root.getByText('Add a From date to complete the range')).toBeVisible();

        // Only From is a day.
        await typeInto(to, '', userEvent);
        await typeInto(from, '04082026', userEvent);
        await expect(root.getByText('Add a To date to complete the range')).toBeVisible();
        await expect(root.getByText('isValid: false')).toBeInTheDocument();

        // Reversed: said on To only.
        await typeInto(from, '04272026', userEvent);
        await typeInto(to, '04082026', userEvent);
        await expect(root.getByText('To must be on or after From')).toBeVisible();
        await expect(from).not.toHaveAttribute('aria-invalid');

        // A box's own message wins over a pair message.
        await typeInto(from, '02292026', userEvent);
        await expect(root.getByText('February 2026 has 28 days')).toBeVisible();

        // Impossible segment refused at the keystroke: only `1` survives, and a prefix says nothing.
        await typeInto(from, '13012026', userEvent);
        await expect(from).toHaveValue('1');

        // Bounds reach both boxes.
        await typeInto(from, '03312026', userEvent);
        await typeInto(to, '05162026', userEvent);
        await expect(root.getByText('Date must be on or after Apr 1, 2026')).toBeVisible();
        await expect(root.getByText('Date must be on or before May 15, 2026')).toBeVisible();
    }
);

/** The site's labels reach the pair messages, without a doubled "date". */
WithCalendar.test(
    'site labels reach the pair messages',
    {
        render: function SiteLabels(args) {
            return (
                <HookHarness
                    onPublish={args.onPublish}
                    labels={LABELS}
                    fromLabel="Start Date"
                    toLabel="End Date (optional)"
                />
            );
        },
    },
    async ({ canvas, userEvent }) => {
        const from = canvas.getByRole('textbox', { name: 'Start Date' });
        const to = canvas.getByRole('textbox', { name: 'End Date (optional)' });

        await typeInto(from, '04272026', userEvent);
        await typeInto(to, '04082026', userEvent);
        await expect(canvas.getByText('End Date must be on or after Start Date')).toBeVisible();

        await typeInto(to, '', userEvent);
        await typeInto(from, '04082026', userEvent);
        await expect(canvas.getByText('Add an End Date to complete the range')).toBeVisible();

        await typeInto(from, '', userEvent);
        await typeInto(to, '04272026', userEvent);
        await expect(canvas.getByText('Add a Start Date to complete the range')).toBeVisible();
    }
);

/** Seeded from a value in the masked shape; `reset` reseeds without reporting a change. */
WithCalendar.test(
    'seeded in the masked shape; reset reseeds silently',
    {
        render: function Seeded(args) {
            return <HookHarness onPublish={args.onPublish} seed={{ start: day(4, 8), end: day(4, 27) }} />;
        },
    },
    async ({ canvas, userEvent, args }) => {
        const from = canvas.getByRole('textbox', { name: 'From' });
        await expect(from).toHaveValue('04/08/2026');
        await expect(canvas.getByRole('textbox', { name: 'To' })).toHaveValue('04/27/2026');

        await typeInto(from, '04022026', userEvent);
        (args.onPublish as ReturnType<typeof fn>).mockClear();
        await userEvent.click(canvas.getByRole('button', { name: 'Reset' }));
        await expect(from).toHaveValue('04/08/2026');
        await expect(args.onPublish).not.toHaveBeenCalled();
    }
);

type OpenHarnessProps = { onPublish?: (next: OpenDateRange | null) => void };

/** `endOptional`: a filled end swaps its glyph for a clear button through `toEndAddon`. */
function OpenHarness({ onPublish }: OpenHarnessProps) {
    const [draft, setDraft] = useState<OpenDateRange | null>(() => {
        return { start: day(4, 8), end: null };
    });
    const range = useDateRangeInput({
        value: draft,
        onValueChange: (next) => {
            setDraft(next);
            onPublish?.(next);
        },
        maxDate: TODAY,
        labels: LABELS,
        endOptional: true,
    });
    const clearEnd =
        range.to.value === '' ? undefined : (
            <InputAddonButton
                aria-label="Clear end date"
                icon={<CloseIcon />}
                onClick={() => {
                    range.to.onValueChange('');
                }}
            />
        );
    // Story scaffolding: the calendar holds only closed ranges, so an open end is drawn as its start day.
    const calendarValue = draft ? { start: draft.start, end: draft.end ?? draft.start } : null;
    return (
        <>
            <DateRangeFields
                from={range.from}
                to={range.to}
                fromLabel="Start Date"
                toLabel="End Date (optional)"
                toEndAddon={clearEnd}
            />
            <span className="text-caption-m text-text-general-medium">{`isValid: ${range.isValid}`}</span>
            <Calendar
                mode="range"
                value={calendarValue}
                onValueChange={range.setRange}
                today={TODAY}
                defaultMonth={day(4, 1)}
                maxDate={TODAY}
            />
        </>
    );
}

/** A lone start is valid and publishes `end: null`; a half-typed end is not "ongoing"; end-only still asks. */
export const OptionalEnd = meta.story({
    render: function OptionalEnd(args) {
        return <OpenHarness onPublish={args.onPublish} />;
    },
});

OptionalEnd.test(
    'a lone start publishes end null; half-typed end is not ongoing',
    async ({ canvas, userEvent, args }) => {
        const from = canvas.getByRole('textbox', { name: 'Start Date' });
        const to = canvas.getByRole('textbox', { name: 'End Date (optional)' });
        await expect(from).toHaveValue('04/08/2026');
        await expect(to).toHaveValue('');
        await expect(canvas.getByText('isValid: true')).toBeInTheDocument();

        await typeInto(from, '04092026', userEvent);
        const lone = lastPublished(args.onPublish);
        await expect(lone?.start.toISODate()).toBe('2026-04-09');
        await expect(lone?.end).toBeNull();

        await typeInto(to, '0427', userEvent);
        await expect(canvas.getByText(DATE_INPUT_INCOMPLETE_ERROR)).toBeVisible();
        await expect(args.onPublish).toHaveBeenLastCalledWith(null);

        await typeInto(to, '04272026', userEvent);
        await userEvent.click(canvas.getByRole('button', { name: 'Clear end date' }));
        await expect(to).toHaveValue('');
        await expect(lastPublished(args.onPublish)?.end).toBeNull();

        await typeInto(from, '', userEvent);
        await typeInto(to, '04272026', userEvent);
        await expect(canvas.getByText('Add a Start Date to complete the range')).toBeVisible();
        await expect(args.onPublish).toHaveBeenLastCalledWith(null);

        // `setRange` from the calendar writes back an open-capable range.
        await userEvent.click(canvas.getByRole('button', { name: 'April 2, 2026' }));
        await userEvent.click(canvas.getByRole('button', { name: 'April 5, 2026' }));
        await expect(to).toHaveValue('04/05/2026');
    }
);
