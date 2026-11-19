import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DateRange } from '@/components/ui/Calendar/types';
import type { DayRangeStripProps } from './types';
import { DateTime } from 'luxon';
import { expect, fn, waitFor } from 'storybook/test';
import { Field } from '@/components/ui/Field';
import { DayRangeStrip } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/* Deterministic: every story pins `start` and `today` in a fixed zone (the only clock read is `today`'s fallback). */
const ZONE = 'America/Chicago';

/** Local noon, far from either DST edge. */
function at(day: number) {
    return DateTime.fromObject({ year: 2026, month: 1, day, hour: 12 }, { zone: ZONE });
}

const TODAY = at(1);

/** The cell's accessible name: its drawn text plus the year ("Thu Jan 1 2026"; today reads "Today …"). */
function nameFor(date: DateTime) {
    const weekday = date.hasSame(TODAY, 'day') ? 'Today' : date.setLocale('en-US').toFormat('ccc');
    return `${weekday} ${date.setLocale('en-US').toFormat('LLL d')} ${date.year}`;
}

/** The horizontal scroll viewport is itself a tab stop when the row overflows; tab past it into the grid. */
async function tabIntoStrip(canvasElement: HTMLElement, userEvent: { tab: () => Promise<void> }) {
    for (let step = 0; step < 3 && !activeName(canvasElement); step += 1) {
        await userEvent.tab();
    }
}

/** The focused day cell's drawn text + year, or `null` when focus is not on a day. */
function activeName(canvasElement: HTMLElement) {
    const active = canvasElement.ownerDocument.activeElement;
    if (!active?.closest('[role="gridcell"]')) {
        return null;
    }
    return active.textContent.replace(/\s+/g, ' ').trim();
}

function emitted(spy: unknown, call = 0) {
    return (spy as ReturnType<typeof fn>).mock.calls[call]?.[0] as DateRange | null;
}

const meta = {
    title: 'UI/DayRangeStrip',
    component: DayRangeStrip,
    args: { start: TODAY, today: TODAY, onValueChange: fn() },
    argTypes: {
        count: { control: { type: 'number', min: 1, max: 31 } },
        disabled: { control: 'boolean' },
        invalid: { control: 'boolean' },
        start: { control: false },
        today: { control: false },
        value: { control: false },
        defaultValue: { control: false },
        minDate: { control: false },
        maxDate: { control: false },
    },
    decorators: [
        function SheetWidth(Story) {
            // Figma's sheet column: narrower than seven cards, so the strip scrolls.
            return (
                <div className="w-[375px]">
                    <Story />
                </div>
            );
        },
    ],
    parameters: { design: { type: 'figma', url: `${FIGMA}9447-71484` } },
} satisfies Meta<typeof DayRangeStrip>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Today is `aria-current` (its only announcement besides the drawn "Today") and the single tab stop. */
export const Default: Story = {
    parameters: { design: { type: 'figma', url: `${FIGMA}10079-148633` } },
    play: async ({ canvas, canvasElement, userEvent }) => {
        const todayCell = canvas.getByRole('button', { name: nameFor(at(1)) });
        await expect(todayCell.closest('[role="gridcell"]')).toHaveAttribute('aria-current', 'date');
        await expect(todayCell).toHaveTextContent('Today');
        await expect(
            canvas.getByRole('button', { name: nameFor(at(2)) }).closest('[role="gridcell"]')
        ).not.toHaveAttribute('aria-current');
        await expect(canvas.getByRole('grid', { name: 'Select start and end date' })).toBeInTheDocument();

        await tabIntoStrip(canvasElement, userEvent);
        await expect(activeName(canvasElement)).toBe(nameFor(at(1)));
        await userEvent.tab();
        await expect(activeName(canvasElement)).not.toBe(nameFor(at(2)));
    },
};

/** Arrows move and stop at the ends; Home/End jump; Enter and Space pick the two ends. */
export const Keyboard: Story = {
    play: async ({ canvasElement, userEvent, args }) => {
        await tabIntoStrip(canvasElement, userEvent);
        await userEvent.keyboard('{ArrowRight}{ArrowRight}');
        await waitFor(() => {
            return expect(activeName(canvasElement)).toBe(nameFor(at(3)));
        });
        await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');
        await waitFor(() => {
            return expect(activeName(canvasElement)).toBe(nameFor(at(1)));
        });
        await userEvent.keyboard('{End}');
        await waitFor(() => {
            return expect(activeName(canvasElement)).toBe(nameFor(at(7)));
        });
        await userEvent.keyboard('{Home}');
        await waitFor(() => {
            return expect(activeName(canvasElement)).toBe(nameFor(at(1)));
        });

        await userEvent.keyboard('{Enter}{ArrowRight}{ArrowRight}[Space]');
        const range = emitted(args.onValueChange);
        await expect(range?.start.toISODate()).toBe('2026-01-01');
        await expect(range?.end.toISODate()).toBe('2026-01-03');
    },
};

/** Click-click picks a range (backwards ordered); the whole span is `aria-selected`; a third tap restarts. */
export const PickRange: Story = {
    play: async ({ canvas, userEvent, args }) => {
        function day(n: number) {
            return canvas.getByRole('button', { name: nameFor(at(n)) });
        }
        await userEvent.click(day(4));
        await expect(day(4)).toHaveAttribute('data-selected');
        await expect(args.onValueChange).not.toHaveBeenCalled();

        await userEvent.click(day(2));
        const range = emitted(args.onValueChange);
        await expect([range?.start.toISODate(), range?.end.toISODate()]).toEqual(['2026-01-02', '2026-01-04']);
        await expect(day(3).closest('[role="gridcell"]')).toHaveAttribute('aria-selected', 'true');
        await expect(day(3)).toHaveAttribute('data-in-range');
        await expect(day(6).closest('[role="gridcell"]')).toHaveAttribute('aria-selected', 'false');

        await userEvent.click(day(6));
        await expect(args.onValueChange).toHaveBeenLastCalledWith(null);
        await expect(day(6)).toHaveAttribute('data-selected');
    },
};

/** Escape abandons a half-open range; Tab returns to the day being picked. */
export const HalfOpen: Story = {
    play: async ({ canvas, canvasElement, userEvent }) => {
        const fourth = canvas.getByRole('button', { name: nameFor(at(4)) });
        await userEvent.click(fourth);
        await userEvent.tab();
        await userEvent.tab({ shift: true });
        await expect(activeName(canvasElement)).toBe(nameFor(at(4)));

        await userEvent.keyboard('{Escape}');
        await expect(fourth).not.toHaveAttribute('data-selected');
    },
};

/** Controlled value: every day of the span is selected, ends drawn selected. */
export const Controlled: Story = {
    args: { value: { start: at(2), end: at(4) } },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: nameFor(at(3)) }).closest('[role="gridcell"]')).toHaveAttribute(
            'aria-selected',
            'true'
        );
        await expect(canvas.getByRole('button', { name: nameFor(at(2)) })).toHaveAttribute('data-selected');
    },
};

/** A disabled day stays focusable (keyboard users are not teleported past it) but refuses activation. */
export const DisabledDays: Story = {
    args: {
        isDateDisabled: (date: DateTime) => {
            return date.day === 3;
        },
        maxDate: at(6),
    },
    play: async ({ canvas, userEvent, args }) => {
        const third = canvas.getByRole('button', { name: nameFor(at(3)) });
        await expect(third).toHaveAttribute('aria-disabled', 'true');
        await expect(third).not.toBeDisabled();
        await expect(canvas.getByRole('button', { name: nameFor(at(7)) })).toHaveAttribute('aria-disabled', 'true');
        await userEvent.click(third);
        await userEvent.click(canvas.getByRole('button', { name: nameFor(at(5)) }));
        await expect(args.onValueChange).not.toHaveBeenCalled();
    },
};

/** `invalid` strokes the unselected days and marks the grid `aria-invalid`. */
export const Invalid: Story = {
    args: { invalid: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('grid')).toHaveAttribute('aria-invalid', 'true');
    },
};

/** `Field`'s disabled wins over the prop; invalid is suppressed while disabled. */
export const DisabledByField: Story = {
    args: { invalid: true },
    render: function InDisabledField(args) {
        return (
            <Field.Root disabled>
                <DayRangeStrip {...(args as DayRangeStripProps)} />
            </Field.Root>
        );
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('grid')).not.toHaveAttribute('aria-invalid');
        await expect(canvas.getByRole('button', { name: nameFor(at(2)) })).toHaveAttribute('aria-disabled', 'true');
    },
};

/** Default, today, in-range, endpoints, disabled, invalid and disabled strip, side by side. */
export const Matrix: Story = {
    render: function Matrix() {
        const rows: { label: string; props: Partial<DayRangeStripProps> }[] = [
            { label: 'default — 10079:148633', props: {} },
            { label: 'range Jan 2–4', props: { value: { start: at(2), end: at(4) } } },
            { label: 'one-day range Jan 3', props: { value: { start: at(3), end: at(3) } } },
            {
                label: 'disabled Jan 3',
                props: {
                    isDateDisabled: (date: DateTime) => {
                        return date.day === 3;
                    },
                },
            },
            { label: 'invalid', props: { invalid: true } },
            { label: 'disabled', props: { disabled: true } },
            { label: '14 days', props: { count: 14 } },
        ];
        return (
            <div className="flex flex-col gap-xl">
                {rows.map((row) => {
                    return (
                        <div key={row.label} className="flex flex-col gap-xs">
                            <span className="text-caption-m text-text-general-medium">{row.label}</span>
                            <DayRangeStrip start={TODAY} today={TODAY} {...row.props} />
                        </div>
                    );
                })}
            </div>
        );
    },
};
