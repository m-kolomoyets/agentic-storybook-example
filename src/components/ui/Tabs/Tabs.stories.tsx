import type { Meta, StoryObj } from '@storybook/react-vite';
import type { TabsListProps, TabsSize } from './types';
import { useState } from 'react';
import HistoryIcon from '@/assets/icons/history.svg?react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { TAB_DISABLED_REASONS, tabCellClassName, Tabs } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const SIZES: TabsSize[] = ['sm', 'md', 'lg'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type StoryArgs = TabsListProps & {
    onValueChange?: (value: string) => void;
    /** Story-only: which tab is disabled. */
    disabledValue?: string;
};

/** A chart series dot — the caller's, not the tab's. */
function Dot({ className }: { className: string }) {
    return <span aria-hidden className={`size-m shrink-0 rounded-full ${className}`} />;
}

const meta = {
    title: 'UI/Tabs',
    component: Tabs.List,
    args: { size: 'lg', fill: false, activateOnFocus: false, children: null },
    argTypes: {
        size: { control: 'inline-radio', options: SIZES },
        fill: { control: 'boolean' },
        children: { control: false },
        activateOnFocus: { control: 'boolean' },
        disabledValue: { control: 'inline-radio', options: [undefined, '1d', '1w', '1m'] },
    },
    render: function TabRow({ onValueChange, disabledValue, children: _children, ...list }) {
        return (
            <Tabs.Root defaultValue="1d" onValueChange={onValueChange}>
                <Tabs.List {...list}>
                    {['1d', '1w', '1m'].map((value) => {
                        return (
                            <Tabs.Tab key={value} value={value} disabled={disabledValue === value}>
                                {value.toUpperCase()}
                            </Tabs.Tab>
                        );
                    })}
                </Tabs.List>
            </Tabs.Root>
        );
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}8711-12035` } },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** ARIA tab pattern; click selects. Selected cell is Figma `Big` (8711:12034). */
export const Default: Story = {
    args: { onValueChange: fn() },
    parameters: { design: { type: 'figma', url: `${FIGMA}8711-12034` } },
    play: async ({ canvas, userEvent, args }) => {
        await expect(canvas.getByRole('tablist')).toBeInTheDocument();
        await expect(canvas.getAllByRole('tab')).toHaveLength(3);
        await expect(canvas.getByRole('tab', { name: '1D' })).toHaveAttribute('aria-selected', 'true');
        await expect(canvas.getByRole('tab', { name: '1D' })).toHaveAttribute('data-active');

        await userEvent.click(canvas.getByRole('tab', { name: '1W' }));
        await expect(args.onValueChange).toHaveBeenCalledOnce();
        await expect(args.onValueChange).toHaveBeenCalledWith('1w', expect.anything());
        await expect(canvas.getByRole('tab', { name: '1W' })).toHaveAttribute('aria-selected', 'true');
        await expect(canvas.getByRole('tab', { name: '1D' })).toHaveAttribute('aria-selected', 'false');
    },
};

/** Manual activation (default): arrows move focus only; Enter or Space selects once. */
export const ManualActivation: Story = {
    args: { onValueChange: fn() },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.tab();
        await expect(canvas.getByRole('tab', { name: '1D' })).toHaveFocus();
        await userEvent.keyboard('{ArrowRight}{ArrowRight}');
        await expect(canvas.getByRole('tab', { name: '1M' })).toHaveFocus();
        await expect(args.onValueChange).not.toHaveBeenCalled();
        await expect(canvas.getByRole('tab', { name: '1D' })).toHaveAttribute('aria-selected', 'true');

        await userEvent.keyboard('{Enter}');
        await expect(args.onValueChange).toHaveBeenCalledOnce();
        await expect(args.onValueChange).toHaveBeenLastCalledWith('1m', expect.anything());

        await userEvent.keyboard('{ArrowLeft} ');
        await expect(args.onValueChange).toHaveBeenCalledTimes(2);
        await expect(args.onValueChange).toHaveBeenLastCalledWith('1w', expect.anything());
    },
};

/** `activateOnFocus` restores ARIA's automatic activation. */
export const ActivateOnFocus: Story = {
    args: { activateOnFocus: true, onValueChange: fn() },
    play: async ({ userEvent, args }) => {
        await userEvent.tab();
        await userEvent.keyboard('{ArrowRight}');
        await expect(args.onValueChange).toHaveBeenCalledOnce();
        await expect(args.onValueChange).toHaveBeenCalledWith('1w', expect.anything());
    },
};

/**
 * Disabled (invented): reachable by arrow key with `aria-disabled`, refuses selection on every route, and
 * answers a press with its reason (also its accessible description).
 */
export const Disabled: Story = {
    args: { disabledValue: '1w', onValueChange: fn() },
    play: async ({ canvas, canvasElement, userEvent, args }) => {
        const tab = canvas.getByRole('tab', { name: '1W' });
        await expect(tab).toHaveAccessibleDescription(TAB_DISABLED_REASONS.unavailable);

        await userEvent.tab();
        await userEvent.keyboard('{ArrowRight}');
        await expect(tab).toHaveFocus();
        await expect(tab).toHaveAttribute('aria-disabled', 'true');

        await userEvent.keyboard('{Enter}');
        await userEvent.keyboard(' ');
        await userEvent.click(tab);
        await expect(args.onValueChange).not.toHaveBeenCalled();
        await expect(tab).toHaveAttribute('aria-selected', 'false');
        await expect(canvas.getByRole('tab', { name: '1D' })).toHaveAttribute('aria-selected', 'true');

        const body = within(canvasElement.ownerDocument.body);
        await waitFor(() => {
            return expect(
                body.getByText(TAB_DISABLED_REASONS.unavailable, { selector: ':not([hidden])' })
            ).toBeVisible();
        });
    },
};

/** A caller's own reason; a bare press (no hover or focus) still opens it. */
export const DisabledReason: Story = {
    render: function DisabledReason() {
        return (
            <Tabs.Root defaultValue="1d">
                <Tabs.List>
                    <Tabs.Tab value="1d">1D</Tabs.Tab>
                    <Tabs.Tab value="3m" disabled disabledReason={TAB_DISABLED_REASONS.busy}>
                        3M
                    </Tabs.Tab>
                </Tabs.List>
            </Tabs.Root>
        );
    },
    play: async ({ canvas, canvasElement }) => {
        const tab = canvas.getByRole('tab', { name: '3M' });
        await expect(tab).toHaveAccessibleDescription(TAB_DISABLED_REASONS.busy);
        tab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const body = within(canvasElement.ownerDocument.body);
        await waitFor(() => {
            return expect(body.getByText(TAB_DISABLED_REASONS.busy, { selector: ':not([hidden])' })).toBeVisible();
        });
    },
};

/** Density ramp 24 → 32 → 36px (mobile). `md` has the smallest type: it is the chart-legend tab. */
export const Sizes: Story = {
    render: function Sizes() {
        return (
            <div className="flex flex-col items-start gap-xl">
                {SIZES.map((size) => {
                    return (
                        <Tabs.Root key={size} defaultValue="1d">
                            <Tabs.List size={size}>
                                <Tabs.Tab value="1d">1D</Tabs.Tab>
                                <Tabs.Tab value="1w">1W</Tabs.Tab>
                                <Tabs.Tab value="1m">1M</Tabs.Tab>
                            </Tabs.List>
                        </Tabs.Root>
                    );
                })}
            </div>
        );
    },
    globals: { viewport: { value: 'mobile1' } },
    play: async ({ canvas }) => {
        const heights = canvas.getAllByRole('tab', { name: '1D' }).map((tab) => {
            return tab.getBoundingClientRect().height;
        });
        await expect(heights).toEqual([24, 32, 36]);
    },
};

/** `with Icon` (9298:50324) is `sm` plus a child glyph. */
export const WithIcon: Story = {
    args: { size: 'sm' },
    parameters: { design: { type: 'figma', url: `${FIGMA}9298-50324` } },
    render: function WithIcon({
        children: _children,
        onValueChange: _onValueChange,
        disabledValue: _disabledValue,
        ...list
    }) {
        return (
            <Tabs.Root defaultValue="live">
                <Tabs.List {...list}>
                    <Tabs.Tab value="live">Live</Tabs.Tab>
                    <Tabs.Tab value="history">
                        <HistoryIcon aria-hidden className="size-xl shrink-0" />
                        History
                    </Tabs.Tab>
                </Tabs.List>
            </Tabs.Root>
        );
    },
};

/** `Medium` cell (8688:11774) with caller-supplied series dots; padding ships symmetric. */
export const WithStatusDot: Story = {
    args: { size: 'md' },
    parameters: { design: { type: 'figma', url: `${FIGMA}8688-11774` } },
    render: function WithStatusDot({
        children: _children,
        onValueChange: _onValueChange,
        disabledValue: _disabledValue,
        ...list
    }) {
        return (
            <Tabs.Root defaultValue="temp">
                <Tabs.List {...list}>
                    <Tabs.Tab value="temp">
                        <Dot className="bg-surface-tertiary" />
                        Temp
                    </Tabs.Tab>
                    <Tabs.Tab value="co2">
                        <Dot className="bg-border-focused" />
                        CO2 (PPM)
                    </Tabs.Tab>
                    <Tabs.Tab value="humidity">Humidity</Tabs.Tab>
                </Tabs.List>
            </Tabs.Root>
        );
    },
};

/** `Tabs.Panel` wired to each tab. */
export const WithPanels: Story = {
    render: function WithPanels({
        children: _children,
        onValueChange: _onValueChange,
        disabledValue: _disabledValue,
        ...list
    }) {
        return (
            <Tabs.Root defaultValue="overview" className="flex flex-col gap-l text-body-m text-text-general-strong">
                <Tabs.List {...list}>
                    <Tabs.Tab value="overview">Overview</Tabs.Tab>
                    <Tabs.Tab value="members">Members</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="overview">Overview panel</Tabs.Panel>
                <Tabs.Panel value="members">Members panel</Tabs.Panel>
            </Tabs.Root>
        );
    },
    play: async ({ canvas, userEvent }) => {
        await expect(canvas.getByRole('tabpanel')).toHaveTextContent('Overview panel');
        await userEvent.click(canvas.getByRole('tab', { name: 'Members' }));
        await waitFor(() => {
            return expect(canvas.getByRole('tabpanel')).toHaveTextContent('Members panel');
        });
        await expect(canvas.getByRole('tab', { name: 'Members' })).toHaveAttribute(
            'aria-controls',
            canvas.getByRole('tabpanel').id
        );
    },
};

/** Controlled, no panels — the chart range-picker shape. */
export const Controlled: Story = {
    args: { size: 'sm' },
    render: function Controlled({
        children: _children,
        onValueChange: _onValueChange,
        disabledValue: _disabledValue,
        ...list
    }) {
        const [range, setRange] = useState('1w');
        return (
            <div className="flex flex-col items-start gap-l text-body-m text-text-general-strong">
                <Tabs.Root value={range} onValueChange={setRange}>
                    <Tabs.List {...list}>
                        <Tabs.Tab value="1d">1D</Tabs.Tab>
                        <Tabs.Tab value="1w">1W</Tabs.Tab>
                        <Tabs.Tab value="1m">1M</Tabs.Tab>
                    </Tabs.List>
                </Tabs.Root>
                <output>Range: {range}</output>
            </div>
        );
    },
    play: async ({ canvas, userEvent }) => {
        await expect(canvas.getByRole('tab', { name: '1W' })).toHaveAttribute('aria-selected', 'true');
        await userEvent.click(canvas.getByRole('tab', { name: '1M' }));
        await expect(canvas.getByText('Range: 1m')).toBeInTheDocument();
    },
};

/** The track is a horizontal `ScrollArea`; focus still reaches tabs scrolled out of view. */
export const Overflowing: Story = {
    args: { size: 'sm' },
    render: function Overflowing({
        children: _children,
        onValueChange: _onValueChange,
        disabledValue: _disabledValue,
        ...list
    }) {
        return (
            <div className="max-w-[320px]">
                <Tabs.Root defaultValue="Mar">
                    <Tabs.List {...list}>
                        {MONTHS.map((month) => {
                            return (
                                <Tabs.Tab key={month} value={month}>
                                    {month}
                                </Tabs.Tab>
                            );
                        })}
                    </Tabs.List>
                </Tabs.Root>
            </div>
        );
    },
    play: async ({ canvas, canvasElement, userEvent }) => {
        const viewport = canvasElement.querySelector<HTMLElement>('[data-scroll-viewport]')!;
        await expect(viewport.scrollWidth).toBeGreaterThan(viewport.clientWidth);
        await userEvent.click(canvas.getByRole('tab', { name: 'Mar' }));
        await userEvent.keyboard('{End}');
        await expect(canvas.getByRole('tab', { name: 'Dec' })).toHaveFocus();
        await waitFor(() => {
            return expect(viewport.scrollLeft).toBeGreaterThan(0);
        });
    },
};

/** `fill` (Chart Overlay 11555:436702): equal columns across the container. */
export const Filling: Story = {
    args: { size: 'sm', fill: true },
    parameters: { design: { type: 'figma', url: `${FIGMA}11555-436702` } },
    render: function Filling({
        children: _children,
        onValueChange: _onValueChange,
        disabledValue: _disabledValue,
        ...list
    }) {
        return (
            <div className="w-[464px]">
                <Tabs.Root defaultValue="temperature">
                    <Tabs.List {...list}>
                        <Tabs.Tab value="temperature">Temperature</Tabs.Tab>
                        <Tabs.Tab value="moisture">Moisture</Tabs.Tab>
                        <Tabs.Tab value="risk">Risk</Tabs.Tab>
                    </Tabs.List>
                </Tabs.Root>
            </div>
        );
    },
    play: async ({ canvas }) => {
        const widths = canvas.getAllByRole('tab').map((tab) => {
            return Math.round(tab.getBoundingClientRect().width);
        });
        await expect(new Set(widths).size).toBe(1);
        await expect(
            widths.reduce((sum, width) => {
                return sum + width;
            }, 0)
        ).toBe(464 - 8);
    },
};

/** `tabCellClassName` dresses a non-tab control (e.g. `aria-pressed` series toggles) in the drawn cell. */
export const CellClassName: Story = {
    render: function CellClassName() {
        const [pressed, setPressed] = useState(true);
        return (
            <button
                type="button"
                aria-pressed={pressed}
                data-active={pressed ? '' : undefined}
                className={tabCellClassName('md')}
                onClick={() => {
                    setPressed(!pressed);
                }}
            >
                Temp
            </button>
        );
    },
    play: async ({ canvas, userEvent }) => {
        const toggle = canvas.getByRole('button', { name: 'Temp' });
        await expect(toggle).toHaveAttribute('data-active');
        await userEvent.click(toggle);
        await expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await expect(toggle).not.toHaveAttribute('data-active');
    },
};

/** Every size × state, for review against Figma (hover/focus are invented and need a pointer). */
export const Matrix: Story = {
    render: function Matrix() {
        return (
            <div className="flex flex-col items-start gap-xl">
                {SIZES.map((size) => {
                    return (
                        <Tabs.Root key={size} defaultValue="selected">
                            <Tabs.List size={size}>
                                <Tabs.Tab value="selected">Selected</Tabs.Tab>
                                <Tabs.Tab value="unselected">Unselected</Tabs.Tab>
                                <Tabs.Tab value="disabled" disabled>
                                    Disabled
                                </Tabs.Tab>
                            </Tabs.List>
                        </Tabs.Root>
                    );
                })}
            </div>
        );
    },
};
