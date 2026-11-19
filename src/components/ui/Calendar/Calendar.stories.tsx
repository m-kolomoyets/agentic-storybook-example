import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CalendarActions, CalendarProps, DateRange } from './types';
import { useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { expect, fn, waitFor } from 'storybook/test';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Calendar } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/*
 * Deterministic: every story pins `today` and `defaultMonth` (the component's only clock read is the
 * `today` fallback), in a fixed zone so the grid never depends on the runner's timezone.
 */
const ZONE = 'America/Chicago';

/** Local noon, far from either DST edge. */
function at(year: number, month: number, day = 1) {
    return DateTime.fromObject({ year, month, day, hour: 12 }, { zone: ZONE });
}

/** January 2026: starts Thursday, ends Saturday — both month-edge crossings are one arrow away. */
const JANUARY = at(2026, 1);
const TODAY = at(2026, 1, 15);

function jan(day: number) {
    return at(2026, 1, day);
}

/** Accessible name: the full date. */
function nameFor(date: DateTime) {
    return date.setLocale('en-US').toLocaleString(DateTime.DATE_FULL);
}

function activeName(canvasElement: HTMLElement) {
    return canvasElement.ownerDocument.activeElement?.getAttribute('aria-label') ?? null;
}

/** January 2026 Sunday-first: 4 blanks + 1–3, then 4–10, 11–17, 18–24, 25–31, blank week 6. */
const SAME_ROW: DateRange = { start: jan(12), end: jan(16) };
const WRAPPED: DateRange = { start: jan(8), end: jan(20) };
const ONE_DAY: DateRange = { start: jan(14), end: jan(14) };
const CROSS_MONTH: DateRange = { start: jan(28), end: at(2026, 2, 3) };

const meta = {
    title: 'UI/Calendar',
    component: Calendar,
    args: { today: TODAY, defaultMonth: JANUARY, onValueChange: fn(), onMonthChange: fn() },
    argTypes: {
        mode: { control: 'inline-radio', options: ['single', 'range'] },
        disabled: { control: 'boolean' },
        fullWidth: { control: 'boolean' },
        today: { control: false },
        defaultMonth: { control: false },
        month: { control: false },
        value: { control: false },
        defaultValue: { control: false },
        minDate: { control: false },
        maxDate: { control: false },
        rangeAnchor: { control: false },
        actionsRef: { control: false },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}8256-13650` } },
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Grid semantics: blank cells hidden, full-date names, heading-labelled grid in a live region, `th abbr`. */
export const Default: Story = {
    play: async ({ canvas, canvasElement }) => {
        const cells = [...canvasElement.querySelectorAll('td')];
        const blanks = cells.filter((cell) => {
            return cell.querySelector('button') === null;
        });
        // Four leading blanks, seven trailing.
        await expect(blanks).toHaveLength(11);
        for (const blank of blanks) {
            await expect(blank).toHaveAttribute('aria-hidden', 'true');
        }
        await expect(canvasElement.querySelectorAll('tbody button')).toHaveLength(31);

        const second = canvas.getByRole('button', { name: 'January 2, 2026' });
        await expect(second).toHaveTextContent('2');
        await expect(canvas.getByRole('button', { name: 'January 31, 2026' })).toBeInTheDocument();

        const heading = canvas.getByText('January 2026');
        await expect(heading).toHaveAttribute('aria-live', 'polite');
        await expect(canvas.getByRole('grid')).toHaveAttribute('aria-labelledby', heading.id);

        const sunday = canvas.getByText('Sun');
        await expect(sunday.tagName).toBe('TH');
        await expect(sunday).toHaveAttribute('scope', 'col');
        await expect(sunday).toHaveAttribute('abbr', 'Sunday');

        // Today is the one tab stop and `aria-current="date"`.
        const todayButton = canvas.getByRole('button', { name: nameFor(TODAY) });
        await expect(todayButton).toHaveAttribute('tabindex', '0');
        await expect(todayButton.closest('td')).toHaveAttribute('aria-current', 'date');
    },
};

/** Click selects; clicking the selected day again is a no-op. Enter/Space select the focused day. */
export const SingleSelect: Story = {
    parameters: { design: { type: 'figma', url: `${FIGMA}8255-13381` } },
    play: async ({ canvas, userEvent, args }) => {
        const ninth = canvas.getByRole('button', { name: 'January 9, 2026' });
        await userEvent.click(ninth);
        await expect(args.onValueChange).toHaveBeenCalledTimes(1);
        const picked = (args.onValueChange as ReturnType<typeof fn>).mock.calls[0]?.[0] as DateTime;
        await expect(picked.toISODate()).toBe('2026-01-09');
        await expect(ninth).toHaveAttribute('data-selected');
        await expect(ninth.closest('td')).toHaveAttribute('aria-selected', 'true');

        await userEvent.click(ninth);
        await expect(args.onValueChange).toHaveBeenCalledTimes(1);

        await userEvent.keyboard('{ArrowRight}{Enter}');
        await userEvent.keyboard('{ArrowRight} ');
        const calls = (args.onValueChange as ReturnType<typeof fn>).mock.calls.map((call) => {
            return (call[0] as DateTime).toISODate();
        });
        await expect(calls).toEqual(['2026-01-09', '2026-01-10', '2026-01-11']);
    },
};

/** The selected day is the tab stop; with no selection or today in view, the 1st is. */
export const TabStop: Story = {
    args: { defaultValue: jan(9) },
    play: async ({ canvasElement, canvas, userEvent }) => {
        const tabbable = [...canvasElement.querySelectorAll('tbody button')].filter((button) => {
            return button.getAttribute('tabindex') === '0';
        });
        await expect(tabbable).toHaveLength(1);
        await expect(tabbable[0]).toHaveAttribute('aria-label', 'January 9, 2026');

        // Chevrons sit ahead of the grid in the tab order.
        await userEvent.tab();
        await expect(canvas.getByRole('button', { name: 'Previous month' })).toHaveFocus();
        await userEvent.tab();
        await expect(canvas.getByRole('button', { name: 'Next month' })).toHaveFocus();
        await userEvent.tab();
        await expect(canvas.getByRole('button', { name: 'January 9, 2026' })).toHaveFocus();

        await userEvent.click(canvas.getByRole('button', { name: 'Next month' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Next month' }));
        await expect(canvas.getByText('March 2026')).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: 'March 1, 2026' })).toHaveAttribute('tabindex', '0');
    },
};

/** Arrow/Home/End/Page keys move focus; crossing a month edge pages the grid and keeps focus. */
export const Keyboard: Story = {
    render: function Remountable(args) {
        // "Reset" remounts the grid, so each key case starts from today in January.
        const [generation, setGeneration] = useState(0);
        return (
            <div className="flex flex-col items-start gap-l">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                        setGeneration((previous) => {
                            return previous + 1;
                        });
                    }}
                >
                    Reset
                </Button>
                <Calendar key={generation} {...(args as CalendarProps)} />
            </div>
        );
    },
    play: async ({ canvas, canvasElement, userEvent, args }) => {
        const cases: [string, string][] = [
            ['{ArrowLeft}', 'January 14, 2026'],
            ['{ArrowRight}', 'January 16, 2026'],
            ['{ArrowUp}', 'January 8, 2026'],
            ['{ArrowDown}', 'January 22, 2026'],
            // 15 Jan 2026 is a Thursday; week is Sun 11 – Sat 17.
            ['{Home}', 'January 11, 2026'],
            ['{End}', 'January 17, 2026'],
            ['{PageUp}', 'December 15, 2025'],
            ['{PageDown}', 'February 15, 2026'],
            ['{Shift>}{PageUp}{/Shift}', 'January 15, 2025'],
            ['{Shift>}{PageDown}{/Shift}', 'January 15, 2027'],
        ];
        for (const [keys, expected] of cases) {
            await userEvent.click(canvas.getByRole('button', { name: 'Reset' }));
            canvas.getByRole('button', { name: nameFor(TODAY) }).focus();
            await userEvent.keyboard(keys);
            await waitFor(() => {
                return expect(activeName(canvasElement)).toBe(expected);
            });
        }
        await expect(args.onMonthChange).toHaveBeenCalled();

        // Edge crossings re-render the grid; focus lands on the new day, which is the tab stop.
        await userEvent.click(canvas.getByRole('button', { name: 'Reset' }));
        canvas.getByRole('button', { name: 'January 1, 2026' }).focus();
        await userEvent.keyboard('{ArrowLeft}');
        await expect(canvas.getByText('December 2025')).toBeInTheDocument();
        await waitFor(() => {
            return expect(activeName(canvasElement)).toBe('December 31, 2025');
        });
        await expect(canvasElement.ownerDocument.activeElement).toHaveAttribute('tabindex', '0');

        await userEvent.click(canvas.getByRole('button', { name: 'Reset' }));
        canvas.getByRole('button', { name: 'January 31, 2026' }).focus();
        await userEvent.keyboard('{ArrowRight}');
        await expect(canvas.getByText('February 2026')).toBeInTheDocument();
        await waitFor(() => {
            return expect(activeName(canvasElement)).toBe('February 1, 2026');
        });

        // Two month jumps keep focus on the landed day.
        await userEvent.keyboard('{PageDown}{PageDown}');
        await expect(canvas.getByText('April 2026')).toBeInTheDocument();
        await waitFor(() => {
            return expect(activeName(canvasElement)).toBe('April 1, 2026');
        });
    },
};

/** Bounds disable days and chevrons, and clamp keyboard navigation. */
export const Bounds: Story = {
    args: { minDate: jan(14), maxDate: jan(16) },
    play: async ({ canvas, canvasElement, userEvent }) => {
        await expect(canvas.getByRole('button', { name: 'Previous month' })).toBeDisabled();
        await expect(canvas.getByRole('button', { name: 'Next month' })).toBeDisabled();
        await expect(canvas.getByRole('button', { name: 'January 13, 2026' })).toHaveAttribute('aria-disabled', 'true');
        await expect(canvas.getByRole('button', { name: 'January 14, 2026' })).not.toHaveAttribute('aria-disabled');
        await expect(canvas.getByRole('button', { name: 'January 17, 2026' })).toHaveAttribute('aria-disabled', 'true');

        canvas.getByRole('button', { name: nameFor(TODAY) }).focus();
        await userEvent.keyboard('{PageUp}');
        await waitFor(() => {
            return expect(activeName(canvasElement)).toBe('January 14, 2026');
        });
        await userEvent.keyboard('{PageDown}');
        await waitFor(() => {
            return expect(activeName(canvasElement)).toBe('January 16, 2026');
        });
    },
};

/** A bound in another zone is moved into the grid's zone: Kiritimati (UTC+14) 14th = Chicago 13th. */
export const BoundInOtherZone: Story = {
    args: { minDate: DateTime.fromObject({ year: 2026, month: 1, day: 14, hour: 12 }, { zone: 'Pacific/Kiritimati' }) },
    play: async ({ canvas, userEvent }) => {
        canvas.getByRole('button', { name: nameFor(TODAY) }).focus();
        await userEvent.keyboard('{PageUp}');
        await waitFor(() => {
            return expect(canvas.getByRole('button', { name: 'January 13, 2026' })).toHaveFocus();
        });
    },
};

/** `isDateDisabled` never touches the chevrons; a disabled day takes focus but refuses activation. */
export const DisabledDays: Story = {
    args: {
        isDateDisabled: (date: DateTime) => {
            return date.hasSame(JANUARY, 'month') && [7, 8, 9, 10].includes(date.day);
        },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}9554-129272` } },
    play: async ({ canvas, userEvent, args }) => {
        await expect(canvas.getByRole('button', { name: 'Previous month' })).toBeEnabled();
        await expect(canvas.getByRole('button', { name: 'Next month' })).toBeEnabled();

        const disabledDay = canvas.getByRole('button', { name: 'January 10, 2026' });
        await expect(disabledDay).toHaveAttribute('aria-disabled', 'true');
        await expect(disabledDay).not.toBeDisabled();
        disabledDay.focus();
        await expect(disabledDay).toHaveFocus();
        await userEvent.keyboard('{Enter}');
        await userEvent.click(disabledDay);
        await expect(args.onValueChange).not.toHaveBeenCalled();
        await expect(disabledDay).not.toHaveAttribute('data-selected');
    },
};

/** `Field`'s disabled wins over the local prop. */
export const DisabledByField: Story = {
    args: { disabled: false },
    render: function InDisabledField(args) {
        return (
            <Field.Root disabled>
                <Calendar {...args} />
            </Field.Root>
        );
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: 'Previous month' })).toBeDisabled();
        await expect(canvas.getByRole('button', { name: 'Next month' })).toBeDisabled();
        await expect(canvas.getByRole('button', { name: 'January 5, 2026' })).toHaveAttribute('aria-disabled', 'true');
    },
};

/** Story-only spy for the wrapper's keydown (cleared per run). */
const wrapperKeyDown = fn();

/**
 * Range: open (nothing emitted) → close → the whole span is `aria-selected`. Escape cancels a half-open
 * range and stops propagation; with no half-open range it passes through.
 */
export const Range: Story = {
    args: { mode: 'range' },
    render: function RangeWithWrapper(args) {
        return (
            // Stands in for a popover listening for Escape.
            // eslint-disable-next-line jsx-a11y-x/no-static-element-interactions
            <div onKeyDown={wrapperKeyDown}>
                <Calendar {...(args as CalendarProps)} />
            </div>
        );
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}9459-85736` } },
    play: async ({ canvas, userEvent, args }) => {
        const wrapperHeard = wrapperKeyDown;
        wrapperHeard.mockClear();
        function day(n: number) {
            return canvas.getByRole('button', { name: nameFor(jan(n)) });
        }

        await userEvent.click(day(5));
        await expect(args.onValueChange).not.toHaveBeenCalled();
        await expect(day(5)).toHaveAttribute('data-selected');

        // Escape cancels the half-open range and never reaches the wrapper.
        await userEvent.keyboard('{Escape}');
        await expect(wrapperHeard).not.toHaveBeenCalled();
        await expect(day(5)).not.toHaveAttribute('data-selected');

        await userEvent.click(day(8));
        await expect(args.onValueChange).not.toHaveBeenCalled();
        await userEvent.click(day(5));
        // Backwards pick is ordered.
        const range = (args.onValueChange as ReturnType<typeof fn>).mock.calls[0]?.[0] as DateRange;
        await expect([range.start.toISODate(), range.end.toISODate()]).toEqual(['2026-01-05', '2026-01-08']);

        for (const n of [5, 6, 7, 8]) {
            await expect(day(n).closest('td')).toHaveAttribute('aria-selected', 'true');
        }
        await expect(day(9).closest('td')).toHaveAttribute('aria-selected', 'false');
        await expect(day(5)).toHaveAttribute('data-range-start');
        await expect(day(6)).toHaveAttribute('data-in-range');
        await expect(day(8)).toHaveAttribute('data-range-end');

        // Complete range: Escape passes through.
        await userEvent.keyboard('{Escape}');
        await expect(wrapperHeard).toHaveBeenCalledTimes(1);

        // Third click restarts: `null` is emitted first.
        await userEvent.click(day(20));
        await expect(args.onValueChange).toHaveBeenLastCalledWith(null);
    },
};

/** A controlled anchor on one end of the committed range keeps the band drawn. */
export const ControlledAnchor: Story = {
    args: { mode: 'range', value: SAME_ROW, rangeAnchor: SAME_ROW.end, onRangeAnchorChange: fn() },
    play: async ({ canvas, userEvent, args }) => {
        await expect(canvas.getByRole('button', { name: 'January 12, 2026' })).toHaveAttribute('data-range-start');
        await expect(canvas.getByRole('button', { name: 'January 14, 2026' })).toHaveAttribute('data-in-range');
        await expect(canvas.getByRole('button', { name: 'January 16, 2026' })).toHaveAttribute('data-range-end');

        // Escape tells the owner to drop the anchor.
        canvas.getByRole('button', { name: 'January 16, 2026' }).focus();
        await userEvent.keyboard('{Escape}');
        await expect(args.onRangeAnchorChange).toHaveBeenCalledWith(null);
    },
};

/** `actionsRef.showToday()` pages to today's month (clamped) without selecting. */
export const ShowToday: Story = {
    args: { defaultMonth: at(2024, 6) },
    render: function WithShowToday(args) {
        const calendarActionsRef = useRef<CalendarActions>(null);
        return (
            <div className="flex flex-col items-start gap-l">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                        calendarActionsRef.current?.showToday();
                    }}
                >
                    Today
                </Button>
                <Calendar {...(args as CalendarProps)} actionsRef={calendarActionsRef} />
            </div>
        );
    },
    play: async ({ canvas, userEvent, args }) => {
        await expect(canvas.getByText('June 2024')).toBeInTheDocument();
        await userEvent.click(canvas.getByRole('button', { name: 'Today' }));
        await expect(canvas.getByText('January 2026')).toBeInTheDocument();
        await expect(args.onValueChange).not.toHaveBeenCalled();
        await expect(args.onMonthChange).toHaveBeenCalledTimes(1);
    },
};

/** Fills the parent; cells widen, never under 48px. */
export const FullWidth: Story = {
    args: { fullWidth: true },
    decorators: [
        function Wide(Story) {
            return (
                <div className="w-[480px]">
                    <Story />
                </div>
            );
        },
    ],
};

/** Every state drawn, plus the six-row month Figma never drew. Hover/focus are pinned on Jan 14 (invented). */
export const Matrix: Story = {
    render: function Matrix() {
        const specs: { label: string; props: Partial<CalendarProps>; className?: string }[] = [
            { label: 'default / today (Jan 15) — 8254:13359, 10822:5570', props: {} },
            {
                label: 'disabled Jan 7–9 — 9554:129272',
                props: {
                    isDateDisabled: (date: DateTime) => {
                        return [7, 8, 9].includes(date.day) && date.month === 1;
                    },
                },
            },
            { label: 'chosen one Jan 14 — 8255:13381', props: { value: jan(14) } },
            { label: 'range, same row — 9459:85736 / 8255:13361', props: { mode: 'range', value: SAME_ROW } },
            { label: 'range, wrapped — 8255:13395 / 8255:13391', props: { mode: 'range', value: WRAPPED } },
            { label: 'one-day range', props: { mode: 'range', value: ONE_DAY } },
            { label: 'cross-month range', props: { mode: 'range', value: CROSS_MONTH } },
            { label: 'six rows (May 2026)', props: { defaultMonth: at(2026, 5) } },
            { label: 'disabled calendar', props: { disabled: true } },
            {
                label: 'hover (pinned, invented)',
                props: {},
                // Verbatim selectors: Tailwind only emits classes it finds as source text.
                className: '[&_tbody_tr:nth-child(3)_td:nth-child(4)_button>span:nth-child(2)]:bg-surface-control',
            },
            {
                label: 'focus (pinned, invented)',
                props: {},
                className: `
                    [&_tbody_tr:nth-child(3)_td:nth-child(4)_button>span:nth-child(2)]:outline-solid
                    [&_tbody_tr:nth-child(3)_td:nth-child(4)_button>span:nth-child(2)]:outline-1
                    [&_tbody_tr:nth-child(3)_td:nth-child(4)_button>span:nth-child(2)]:outline-border-focused
                    [&_tbody_tr:nth-child(3)_td:nth-child(4)_button>span:nth-child(2)]:-outline-offset-1
                `,
            },
        ];
        return (
            <div className="flex flex-wrap items-start gap-xl">
                {specs.map((spec) => {
                    return (
                        <div key={spec.label} className="flex w-[351px] flex-col gap-xs">
                            <span className="text-caption-m text-text-general-medium">{spec.label}</span>
                            <Calendar
                                today={TODAY}
                                defaultMonth={JANUARY}
                                {...(spec.props as CalendarProps)}
                                className={spec.className}
                            />
                        </div>
                    );
                })}
            </div>
        );
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}8254-13360` } },
};
