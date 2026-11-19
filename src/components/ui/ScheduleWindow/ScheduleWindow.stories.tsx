import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import type { ScheduleWindowProps } from './types';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { ScheduleWindow } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/* `Now` on the start list only, `Forever` on the end list only. */
const START_DAYS = [
    { value: 'now', label: 'Now' },
    { value: '2026-01-01', label: 'Today' },
    { value: '2026-01-02', label: 'Tue' },
    { value: '2026-01-03', label: 'Wed' },
    { value: '2026-01-04', label: 'Thu' },
];

const END_DAYS = [...START_DAYS.slice(1), { value: 'forever', label: 'Forever' }];

/* 24-hour, unpadded values (what the schedule API parses); labels are what Figma draws. */
const TIMES = [
    { value: '1:00', label: '1:00 AM' },
    { value: '4:00', label: '4:00 AM' },
    { value: '9:00', label: '9:00 AM' },
    { value: '13:00', label: '1:00 PM' },
    { value: '19:00', label: '7:00 PM' },
    { value: '21:00', label: '9:00 PM' },
];

const BASE = {
    start: { day: '2026-01-01', time: '13:00' },
    end: { day: '2026-01-01', time: '19:00' },
    startDayOptions: START_DAYS,
    endDayOptions: END_DAYS,
    timeOptions: TIMES,
    runtime: '6h 0m',
    avgWeather: '38°F · 51% RH',
} satisfies ScheduleWindowProps;

/* Widths a cell answers for: 331 = row in the 351 mobile card, 432 = desktop review, 620 = row in the 640 card. */
const MOBILE_WIDTH = 'w-[331px]';
const DESKTOP_WIDTH = 'w-[432px]';
const WIDE_WIDTH = 'w-[620px]';

/* Stand-in for the weather chart: `chart` is a slot, so no plotting library here. */
function ChartStub() {
    return (
        <div className="flex h-[108px] w-full items-center justify-center rounded-xs bg-surface-control text-caption-s text-text-general-medium">
            Weather Forecast/Visualization
        </div>
    );
}

function part(root: HTMLElement, name: string) {
    return root.querySelector(`[data-part="${name}"]`);
}

const meta = {
    title: 'UI/ScheduleWindow',
    component: ScheduleWindow,
    args: { ...BASE, status: 'scheduled', mode: 'cooling' },
    argTypes: {
        status: { control: 'inline-radio', options: ['scheduled', 'running', 'stopped'] },
        mode: { control: 'inline-radio', options: ['cooling', 'drying', 'reconditioning', 'custom', 'manual'] },
        readOnly: { control: 'boolean' },
        disabled: { control: 'boolean' },
        entranceIndex: { control: 'number' },
        chart: { control: false },
        message: { control: 'text' },
    },
    decorators: [
        /* Row width per story (`parameters.rowWidth`); the mobile card's 331 by default. */
        function RowWidth(Story, { parameters }) {
            const width = typeof parameters.rowWidth === 'string' ? parameters.rowWidth : MOBILE_WIDTH;
            return (
                <div className={`${width} max-w-full`}>
                    <Story />
                </div>
            );
        },
    ],
    parameters: { design: { type: 'figma', url: `${FIGMA}9298-49202` } },
} satisfies Meta<typeof ScheduleWindow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** `11329:7509` — desktop, editable, deletable, with chart: the reference cell. */
export const Default: Story = {
    args: {
        runtime: '8h 0m',
        end: { day: '2026-01-01', time: '21:00' },
        chart: <ChartStub />,
        onDelete: fn(),
        onStartChange: fn(),
        onEndChange: fn(),
    },
    parameters: { rowWidth: DESKTOP_WIDTH, design: { type: 'figma', url: `${FIGMA}11329-7509` } },
    play: async ({ canvas, canvasElement, args }) => {
        for (const name of ['Start day', 'Start time', 'End day', 'End time']) {
            await expect(canvas.getByRole('combobox', { name })).toBeInTheDocument();
        }
        await expect(canvas.getByText('Runtime')).toBeInTheDocument();
        await expect(canvas.getByText('8h 0m')).toBeInTheDocument();
        await expect(canvas.getByText('38°F · 51% RH')).toBeInTheDocument();
        await expect(part(canvasElement, 'chart')).not.toBeNull();

        await userEvent.click(canvas.getByRole('button', { name: 'Delete run window' }));
        await expect(args.onDelete).toHaveBeenCalledOnce();
        await expect(args.onStartChange).not.toHaveBeenCalled();
        await expect(args.onEndChange).not.toHaveBeenCalled();
    },
};

/** The rail repeats what the two lines say in words, so it is hidden from assistive tech. */
export const Rail: Story = {
    parameters: { design: { type: 'figma', url: `${FIGMA}9298-49201` } },
    play: async ({ canvasElement }) => {
        const root = canvasElement.querySelector('[data-status]');
        await expect(root).toHaveAttribute('data-status', 'scheduled');
        await expect(root).toHaveAttribute('data-mode', 'cooling');
        const rail = part(canvasElement, 'rail') as HTMLElement;
        await expect(rail).toHaveAttribute('aria-hidden', 'true');
        await expect(part(rail, 'rail-start')).not.toBeNull();
        await expect(part(rail, 'rail-end')).not.toBeNull();
        await expect(part(rail, 'rail-line')).not.toBeNull();
        await expect(part(canvasElement, 'running-stroke')).toBeNull();
        // No trash without `onDelete`: absent, not disabled.
        await expect(canvasElement.querySelector('button[aria-label="Delete run window"]')).toBeNull();
    },
};

/** `10071:204475` — only `running` strokes the box; the rail drops its connector under the stroke. */
export const Running: Story = {
    args: { status: 'running' },
    parameters: { design: { type: 'figma', url: `${FIGMA}10071-204475` } },
    play: async ({ canvasElement }) => {
        await expect(part(canvasElement, 'running-stroke')).toHaveAttribute('aria-hidden', 'true');
        await expect(part(canvasElement, 'rail-line')).toBeNull();
    },
};

/** `10173:170496` — `stopped` draws exactly as `scheduled` (the difference lives on `ScheduleCard`'s bar). */
export const Stopped: Story = {
    args: { status: 'stopped' },
    parameters: { design: { type: 'figma', url: `${FIGMA}10173-170496` } },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('[data-status]')).toHaveAttribute('data-status', 'stopped');
        await expect(part(canvasElement, 'running-stroke')).toBeNull();
        await expect(part(canvasElement, 'rail-line')).not.toBeNull();
    },
};

/** `11331:43271` — values as text, nothing in the tab order. */
export const ReadOnly: Story = {
    args: { readOnly: true, onDayPress: fn() },
    parameters: { design: { type: 'figma', url: `${FIGMA}11331-43271` } },
    play: async ({ canvas, canvasElement, args }) => {
        await expect(canvas.queryAllByRole('combobox')).toHaveLength(0);
        await expect(canvasElement.querySelector('button')).toBeNull();
        await expect(canvas.getAllByText('Today')).toHaveLength(2);
        await expect(canvas.getByText('1:00 PM')).toBeInTheDocument();
        // `readOnly` outranks `onDayPress`.
        await expect(args.onDayPress).not.toHaveBeenCalled();
    },
};

/** A read-only `Forever` with no clock time: the time cell is not drawn and the day cell spans both. */
export const ReadOnlyForever: Story = {
    args: { readOnly: true, end: { day: 'forever', time: '' }, runtime: '∞' },
    play: async ({ canvas, canvasElement }) => {
        await expect(canvas.getByText('Forever')).toBeInTheDocument();
        await expect(part(canvasElement, 'end-time')).toBeNull();
        await expect(part(canvasElement, 'start-time')).not.toBeNull();
        await expect(part(canvasElement, 'end-day')?.className).toContain('calc(');
    },
};

/** Controlled: picking a time reports the whole `{ day, time }`, never a partial. */
export const Controlled: Story = {
    args: { onStartChange: fn(), onEndChange: fn() },
    render: function Controlled(args: ScheduleWindowProps) {
        const [start, setStart] = useState(args.start);
        const [end, setEnd] = useState(args.end);
        return (
            <ScheduleWindow
                {...args}
                start={start}
                end={end}
                onStartChange={(next) => {
                    setStart(next);
                    args.onStartChange?.(next);
                }}
                onEndChange={(next) => {
                    setEnd(next);
                    args.onEndChange?.(next);
                }}
            />
        );
    },
    play: async ({ canvas, canvasElement, args }) => {
        const body = within(canvasElement.ownerDocument.body);

        await userEvent.click(canvas.getByRole('combobox', { name: 'Start time' }));
        await userEvent.click(await body.findByRole('option', { name: '9:00 AM' }));
        await expect(args.onStartChange).toHaveBeenCalledWith({ day: '2026-01-01', time: '9:00' });
        await waitFor(() => {
            return expect(canvas.getByRole('combobox', { name: 'Start time' })).toHaveTextContent('9:00 AM');
        });

        await userEvent.click(canvas.getByRole('combobox', { name: 'End day' }));
        await userEvent.click(await body.findByRole('option', { name: 'Forever' }));
        await expect(args.onEndChange).toHaveBeenCalledWith({ day: 'forever', time: '19:00' });
    },
};

/** `11089:140347` — day cells as chevron-less buttons that open the caller's own picker; empty cells prompt. */
export const PressableDays: Story = {
    args: {
        start: { day: '', time: '' },
        end: { day: '', time: '' },
        runtime: '0h 0m',
        avgWeather: '- °F · - RH',
        dayPlaceholder: 'Today',
        timePlaceholder: 'Time',
        onDayPress: fn(),
        onStartChange: fn(),
    },
    parameters: {
        design: { type: 'figma', url: `${FIGMA}11089-140347` },
        // label-content-name-mismatch: an empty cell draws the prompt word (`Today`) but is named for the
        // control (`Start day`) — amber's choice, so the prompt is not announced as a held value.
        a11y: { test: 'todo' },
    },
    play: async ({ canvas, args }) => {
        // Named for the control, not the prompt word drawn in it.
        const startDay = canvas.getByRole('button', { name: 'Start day' });
        await expect(startDay).toHaveTextContent('Today');
        await expect(startDay.className).toContain('text-text-general-medium');
        await userEvent.click(startDay);
        await expect(args.onDayPress).toHaveBeenCalledWith('start');
        await userEvent.click(canvas.getByRole('button', { name: 'End day' }));
        await expect(args.onDayPress).toHaveBeenLastCalledWith('end');
        // Time cells stay selects.
        await expect(canvas.getByRole('combobox', { name: 'Start time' })).toBeInTheDocument();
        await expect(args.onStartChange).not.toHaveBeenCalled();
    },
};

/** A held day: the button names its value, in the ordinary ink. */
export const PressableDaysAnswered: Story = {
    args: { dayPlaceholder: 'Today', onDayPress: fn() },
    play: async ({ canvas, args }) => {
        const startDay = canvas.getByRole('button', { name: 'Start day: Today' });
        await expect(startDay.className).not.toContain('text-text-general-medium');
        await userEvent.click(startDay);
        await expect(args.onDayPress).toHaveBeenCalledWith('start');
    },
};

/** The row and every control in it go disabled. */
export const Disabled: Story = {
    // Figma draws the disabled row at 50% opacity; its secondary ink drops under 4.5:1 by design.
    parameters: { a11y: { test: 'todo' } },
    args: { disabled: true, onDelete: fn(), onDayPress: fn() },
    play: async ({ canvas, args }) => {
        await expect(canvas.getByRole('button', { name: 'Delete run window' })).toBeDisabled();
        await expect(canvas.getByRole('button', { name: 'Start day: Today' })).toBeDisabled();
        await expect(canvas.getByRole('combobox', { name: 'Start time' })).toBeDisabled();
        await expect(args.onDelete).not.toHaveBeenCalled();
        await expect(args.onDayPress).not.toHaveBeenCalled();
    },
};

/** Message inside the box, under the two lines. */
export const WithMessage: Story = {
    args: { message: 'Automation Period Expired: Maintaining last scheduled run' },
    play: async ({ canvasElement }) => {
        const message = part(canvasElement, 'message');
        await expect(message?.closest('[data-part="box"]')).not.toBeNull();
    },
};

/** A missing reading draws a dash, not an empty labelled slot. */
export const NoReading: Story = {
    args: { avgWeather: undefined },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Avg Weather').nextElementSibling).toHaveTextContent('—');
    },
};

/** `entranceIndex` set: each cell flips in from an empty face (skipped under reduced motion). */
export const Entrance: Story = {
    args: { entranceIndex: 0 },
    play: async ({ canvasElement }) => {
        const faces = canvasElement.querySelectorAll('[data-part="flip-front"]');
        await expect(faces).toHaveLength(4);
        // End day is slot 2: two staggers after the row's start.
        await expect((faces[2] as HTMLElement).style.animationDelay).toBe('300ms');
    },
};

/** Running stroke and rail per schedule mode. */
export const Modes: Story = {
    render: function Modes(args: ScheduleWindowProps) {
        return (
            <div className="flex flex-col gap-xl">
                {(['cooling', 'drying', 'reconditioning', 'custom', 'manual'] as const).flatMap((mode) => {
                    return [
                        <ScheduleWindow key={`${mode}-run`} {...args} mode={mode} status="running" />,
                        <ScheduleWindow key={`${mode}-sched`} {...args} mode={mode} />,
                    ];
                })}
            </div>
        );
    },
};

function Cell({ name, width, ...props }: ScheduleWindowProps & { name: string; width: string }) {
    return (
        <div className="flex shrink-0 flex-col gap-s">
            <span className="text-caption-m text-text-general-medium">{name}</span>
            <div className={`shrink-0 ${width}`}>
                <ScheduleWindow {...props} />
            </div>
        </div>
    );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-l">
            <h2 className="text-heading-s text-text-general-strong">{title}</h2>
            <div className="flex flex-wrap items-start gap-xl">{children}</div>
        </section>
    );
}

const noop = () => {
    return undefined;
};

function Cells({ width }: { width: string }) {
    return (
        <>
            <Group title="Editing">
                <Cell name="9300:55251 — editable" width={width} {...BASE} onStartChange={noop} />
                <Cell name="9299:47982 — deletable" width={width} {...BASE} onDelete={noop} onStartChange={noop} />
                <Cell name="11331:43271 — read-only" width={width} {...BASE} readOnly />
            </Group>
            <Group title="Status">
                <Cell name="9298:49201 — scheduled" width={width} {...BASE} />
                <Cell name="10071:204475 — running" width={width} {...BASE} status="running" />
                <Cell name="10173:170496 — stopped" width={width} {...BASE} status="stopped" />
            </Group>
            <Group title="Sentinels and slots">
                <Cell name="Now" width={width} {...BASE} start={{ day: 'now', time: '13:00' }} runtime="2h 14m" />
                <Cell name="Forever" width={width} {...BASE} end={{ day: 'forever', time: '19:00' }} runtime="∞" />
                <Cell name="Message" width={width} {...BASE} message="Automation Period Expired" onDelete={noop} />
                <Cell name="Disabled" width={width} {...BASE} disabled onDelete={noop} />
                <Cell name="Long weather" width={width} {...BASE} avgWeather="38°F · 51% RH · 12 mph NNW" />
            </Group>
            {width === MOBILE_WIDTH ? null : (
                <Group title="With chart">
                    <Cell name="Editable" width={width} {...BASE} chart={<ChartStub />} onDelete={noop} />
                    <Cell name="Read-only" width={width} {...BASE} readOnly chart={<ChartStub />} />
                </Group>
            )}
        </>
    );
}

/** Every cell at 331 / 432 / 620, for review against the Figma frame. */
export const Matrix: Story = {
    // Holds the disabled cells (50% opacity, design contrast).
    parameters: { rowWidth: 'w-auto', a11y: { test: 'todo' } },
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-4xl">
                <Cells width={MOBILE_WIDTH} />
                <Cells width={DESKTOP_WIDTH} />
                <Cells width={WIDE_WIDTH} />
            </div>
        );
    },
};
