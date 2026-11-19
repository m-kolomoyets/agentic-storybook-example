import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ScheduleCardProps } from './types';
import { useState } from 'react';
import { expect, fn, userEvent } from 'storybook/test';
import { ScheduleWindow } from '@/components/ui/ScheduleWindow';
import { ScheduleCard } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const DAYS = [
    { value: 'now', label: 'Now' },
    { value: '2026-01-01', label: 'Today' },
    { value: '2026-01-02', label: 'Tue' },
    { value: '2026-01-03', label: 'Wed' },
];

const END_DAYS = [...DAYS.slice(1), { value: 'forever', label: 'Forever' }];

const TIMES = [
    { value: '1:00', label: '1:00 AM' },
    { value: '4:00', label: '4:00 AM' },
    { value: '13:00', label: '1:00 PM' },
    { value: '17:00', label: '5:00 PM' },
];

function noop() {
    return undefined;
}

/* Real rows; each carries a trash button so collapsed-row `inert` is observable. */
const WINDOWS = [
    {
        key: 'a',
        start: { day: '2026-01-01', time: '13:00' },
        end: { day: '2026-01-01', time: '17:00' },
        runtime: '4h 0m',
    },
    {
        key: 'b',
        start: { day: '2026-01-02', time: '4:00' },
        end: { day: '2026-01-02', time: '17:00' },
        runtime: '13h 0m',
    },
    {
        key: 'c',
        start: { day: '2026-01-03', time: '1:00' },
        end: { day: '2026-01-03', time: '17:00' },
        runtime: '16h 0m',
    },
    { key: 'd', start: { day: '2026-01-01', time: '13:00' }, end: { day: 'forever', time: '17:00' }, runtime: '∞' },
].map(({ key, ...window }) => {
    return (
        <ScheduleWindow
            key={key}
            {...window}
            startDayOptions={DAYS}
            endDayOptions={END_DAYS}
            timeOptions={TIMES}
            avgWeather="38°F · 51% RH"
            onStartChange={noop}
            onEndChange={noop}
            onDelete={noop}
        />
    );
});

function rootOf(canvasElement: HTMLElement) {
    return canvasElement.querySelector('[data-mode]');
}

/* Row trash buttons outside an `inert` subtree — what a keyboard or screen-reader user can reach. */
function reachableTrash(canvasElement: HTMLElement) {
    return [...canvasElement.querySelectorAll('button[aria-label="Delete run window"]')].filter((button) => {
        return button.closest('[inert]') === null;
    });
}

const meta = {
    title: 'UI/ScheduleCard',
    component: ScheduleCard,
    args: {
        date: 'Mon, Jan 1, 2026',
        time: '4:00 PM',
        children: WINDOWS,
    },
    argTypes: {
        mode: { control: 'inline-radio', options: ['cooling', 'drying', 'reconditioning', 'custom', 'manual'] },
        open: { control: 'boolean' },
        count: { control: 'number' },
        children: { control: false },
    },
    decorators: [
        function MobileFrame(Story) {
            return (
                <div className="w-[351px] max-w-full">
                    <Story />
                </div>
            );
        },
    ],
    parameters: { design: { type: 'figma', url: `${FIGMA}9298-49202` } },
} satisfies Meta<typeof ScheduleCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Never collapses (no `open`, no `onOpenChange`): every row in one flat list, no chevron. */
export const Default: Story = {
    play: async ({ canvas, canvasElement }) => {
        await expect(canvas.getByText('Schedule')).toBeInTheDocument();
        await expect(reachableTrash(canvasElement)).toHaveLength(4);
        await expect(canvas.queryByRole('button', { name: /^Toggle schedule/ })).toBeNull();
        await expect(canvasElement.querySelector('[data-part="more"]')).toBeNull();
        // Meta glyphs are decoration.
        for (const glyph of canvasElement.querySelectorAll('[data-part="meta"] svg')) {
            await expect(glyph.closest('[aria-hidden]')).not.toBeNull();
        }
    },
};

/**
 * `9298:49201` — closed: all four rows are passed, the first is drawn; the rest stay mounted, `inert`.
 * The `+` and the count/chevron toggle are bare glyph buttons.
 */
export const Closed: Story = {
    args: { open: false, count: 4, onOpenChange: fn(), onAdd: fn() },
    parameters: { design: { type: 'figma', url: `${FIGMA}9298-49201` } },
    play: async ({ canvas, canvasElement, args }) => {
        const toggle = canvas.getByRole('button', { name: /^Toggle schedule/ });
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle).toHaveTextContent('4');
        await expect(reachableTrash(canvasElement)).toHaveLength(1);

        await userEvent.click(toggle);
        await expect(args.onOpenChange).toHaveBeenCalledWith(true);

        await userEvent.click(canvas.getByRole('button', { name: 'Add run window' }));
        await expect(args.onAdd).toHaveBeenCalledOnce();
    },
};

/** Controlled open/close: the caller's list never changes, the card decides how many rows show. */
export const Controlled: Story = {
    args: { count: 4 },
    render: function Controlled(args: ScheduleCardProps) {
        const [open, setOpen] = useState(false);
        return <ScheduleCard {...args} open={open} onOpenChange={setOpen} />;
    },
    play: async ({ canvas, canvasElement }) => {
        const toggle = canvas.getByRole('button', { name: /^Toggle schedule/ });
        await userEvent.click(toggle);
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(rootOf(canvasElement)).toHaveAttribute('data-open');
        await expect(reachableTrash(canvasElement)).toHaveLength(4);
        await userEvent.click(toggle);
        await expect(reachableTrash(canvasElement)).toHaveLength(1);
    },
};

/** `open` alone still truncates; with no `onOpenChange` the count is a static pill, no chevron. */
export const StaticCount: Story = {
    args: { open: false, count: 4 },
    parameters: { design: { type: 'figma', url: `${FIGMA}11048-21063` } },
    play: async ({ canvas, canvasElement }) => {
        await expect(canvas.queryByRole('button', { name: /^Toggle schedule/ })).toBeNull();
        await expect(canvas.getByText('4')).toBeInTheDocument();
        await expect(reachableTrash(canvasElement)).toHaveLength(1);
    },
};

/** Progress bar under the list. `running`/`default` share the gradient; `stopped` is the flat fill. */
export const ProgressRunning: Story = {
    args: { open: false, onOpenChange: fn(), progress: { value: 68, state: 'running' } },
    parameters: { design: { type: 'figma', url: `${FIGMA}10607-211328` } },
    play: async ({ canvas, canvasElement }) => {
        await expect(canvas.getByRole('progressbar', { name: 'Schedule progress' })).toHaveAttribute(
            'aria-valuenow',
            '68'
        );
        await expect(rootOf(canvasElement)).toHaveAttribute('data-progress', 'running');
    },
};

export const ProgressStopped: Story = {
    args: { open: false, progress: { value: 4, state: 'stopped' } },
    play: async ({ canvasElement }) => {
        await expect(rootOf(canvasElement)).toHaveAttribute('data-progress', 'stopped');
    },
};

/** A wash over the windows; the chip is decorative (the title says what happened), rows stay in the a11y tree. */
export const Overlay: Story = {
    args: {
        open: false,
        onOpenChange: fn(),
        overlay: { status: 'negative', title: 'Fan Failed to Start' },
        progress: { value: 4, state: 'stopped' },
    },
    play: async ({ canvas, canvasElement }) => {
        const layer = canvasElement.querySelector('[data-part="overlay"]');
        await expect(layer?.querySelector('[aria-hidden="true"]')).not.toBeNull();
        await expect(canvas.getByText('Fan Failed to Start')).toBeInTheDocument();
        await expect(reachableTrash(canvasElement)).toHaveLength(1);
    },
};

/** Overlay with no rows: drawn at one window's height. */
export const OverlayWithoutRows: Story = {
    args: { children: undefined, overlay: { status: 'warning', title: 'Scheduled Run Interrupted' } },
};

/** Neutral slab above the list, independent of `overlay`. */
export const Notice: Story = {
    args: {
        open: false,
        notice: 'On Site Manual Run',
        overlay: { status: 'negative', title: 'Fan Failed to Stop' },
        progress: { value: 4, state: 'stopped' },
    },
};

/** `10062:200895` — the empty state replaces the body; `title={null}` drops the title. */
export const Empty: Story = {
    args: {
        title: null,
        date: undefined,
        time: undefined,
        children: undefined,
        empty: {
            title: 'No Recommended Cooling Windows',
            description: 'Adjust the automation period to see recommendations',
        },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}10062-200895` } },
    play: async ({ canvas, canvasElement }) => {
        await expect(canvasElement.querySelector('[data-part="header"]')).toBeNull();
        await expect(canvas.getByText('No Recommended Cooling Windows')).toBeInTheDocument();
    },
};

/** `10085:201062` — the red line sits under the card, not inside it. */
export const Validation: Story = {
    args: { open: false, validationMessage: 'Please select a start and end date and time to continue' },
    parameters: { design: { type: 'figma', url: `${FIGMA}10085-201062` } },
    play: async ({ canvasElement }) => {
        const line = canvasElement.querySelector('[data-part="validation"]');
        await expect(line?.closest('[data-part="card"]')).toBeNull();
    },
};

/** `11375:30546` — automation note replaces date/time and hides the `+` even with `onAdd`. */
export const Automation: Story = {
    args: {
        automationNote: 'Auto-updating windows until Jan 3, 2026, 4:00 PM',
        onAdd: fn(),
        open: false,
        onOpenChange: fn(),
        count: 4,
        progress: { value: 68, state: 'running' },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}11375-30546` } },
    play: async ({ canvas, args }) => {
        await expect(canvas.queryByRole('button', { name: 'Add run window' })).toBeNull();
        await expect(canvas.queryByText('Mon, Jan 1, 2026')).toBeNull();
        await expect(args.onAdd).not.toHaveBeenCalled();
    },
};

/** One progress gradient per schedule mode (frames 11085:137991 … 11085:138816). */
export const Modes: Story = {
    render: function Modes(args: ScheduleCardProps) {
        return (
            <div className="flex flex-col gap-xl">
                {(['drying', 'reconditioning', 'cooling', 'custom', 'manual'] as const).map((mode) => {
                    return (
                        <ScheduleCard
                            key={mode}
                            {...args}
                            title={`Mode=${mode}`}
                            mode={mode}
                            open={false}
                            progress={{ value: 68, state: 'running' }}
                        />
                    );
                })}
            </div>
        );
    },
};
