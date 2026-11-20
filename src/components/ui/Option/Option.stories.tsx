import type { Meta, StoryObj } from '@storybook/react-vite';
import GrainIcon from '@/assets/icons/grains.svg?react';
import { Menu } from '@base-ui/react/menu';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Option, SelectValue } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/* Popup surface at Figma's 343px. State stories set `data-*` by hand — exactly what a host item does. */
const meta = {
    title: 'UI/Option',
    component: Option,
    args: { label: 'Corn', indicator: 'check' },
    argTypes: {
        indicator: { control: 'inline-radio', options: ['check', 'radio'] },
        subtitle: { control: 'text' },
        startAddon: { control: false },
        endAddon: { control: false },
        labelContent: { control: false },
    },
    decorators: [
        function Panel(Story) {
            return (
                <div className="flex w-[343px] flex-col gap-xxs rounded-m border border-border-primary bg-surface-control p-xs">
                    <Story />
                </div>
            );
        },
    ],
    parameters: { design: { type: 'figma', url: `${FIGMA}8915-27038` } },
} satisfies Meta<typeof Option>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Label only. The checkmark is in the DOM but hidden until the host marks the row selected. */
export const Default: Story = {
    parameters: { design: { type: 'figma', url: `${FIGMA}8915-27037` } },
    play: async ({ canvasElement }) => {
        const check = canvasElement.querySelector('[data-slot="check"]');
        await expect(check).toBeInTheDocument();
        await expect(check).not.toBeVisible();
    },
};

/** Leading slot is opt-in. */
export const WithStartAddon: Story = {
    args: { startAddon: <GrainIcon aria-hidden className="size-full" /> },
};

/** The Big row is a `subtitle` and nothing else. */
export const WithSubtitle: Story = {
    args: { subtitle: 'Bin 4 · 12,400 BU' },
    parameters: { design: { type: 'figma', url: `${FIGMA}8750-15829` } },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Bin 4 · 12,400 BU')).toBeVisible();
    },
};

/** Both lines truncate; the accessible name keeps the full text. */
export const LongText: Story = {
    args: {
        label: 'North bin block, west row, unit fourteen — commissioned spring 2019',
        subtitle: 'Bin 4 · 12,400 bu · corn · last read 14 minutes ago',
    },
    play: async ({ canvasElement, args }) => {
        const row = canvasElement.querySelector<HTMLElement>('.group\\/option');
        await expect(row).toHaveTextContent(args.label);
        await expect(row!.scrollWidth).toBeLessThanOrEqual(row!.clientWidth);
    },
};

/** `data-selected` reveals the checkmark (Big set 11279:17235 is followed). */
export const Selected: Story = {
    args: { 'data-selected': '' } as Story['args'],
    parameters: { design: { type: 'figma', url: `${FIGMA}11279-17235` } },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('[data-slot="check"]')).toBeVisible();
    },
};

/** Hover and keyboard focus share one look via `data-highlighted`. */
export const Highlighted: Story = {
    args: { 'data-highlighted': '' } as Story['args'],
    parameters: { design: { type: 'figma', url: `${FIGMA}8915-27048` } },
};

/** Presentational greying; the host owns activation. */
export const Disabled: Story = {
    args: { 'data-disabled': '' } as Story['args'],
    // color-contrast off: Figma-drawn disabled ink on a bare `div` (no `aria-disabled`, host-owned).
    parameters: {
        design: { type: 'figma', url: `${FIGMA}8915-27066` },
        a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
    },
};

/** `radio` indicator (mobile sheet): leading ring replaces the checkmark; selected ring fills. */
export const Radio: Story = {
    args: { indicator: 'radio', 'data-selected': '' } as Story['args'],
    parameters: { design: { type: 'figma', url: `${FIGMA}11165-148548` } },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('[data-slot="check"]')).toBeNull();
        const ring = canvasElement.querySelector('[data-slot="radio"]');
        await expect(ring).toBeVisible();
        const [unchecked, checked] = ring!.querySelectorAll('svg');
        await expect(unchecked).not.toBeVisible();
        await expect(checked).toBeVisible();
    },
};

/** `Option` as `Menu.Item`'s `render` with no props threaded; highlight comes from the menu. */
export const InsideMenu: Story = {
    args: { onClick: fn() },
    decorators: [
        function Bare(Story) {
            return <Story />;
        },
    ],
    render: function InsideMenu({ onClick }) {
        return (
            <Menu.Root>
                <Menu.Trigger className="rounded-s border border-border-primary bg-surface-input px-l py-s text-body-m text-text-general-strong">
                    Open menu
                </Menu.Trigger>
                <Menu.Portal>
                    <Menu.Positioner sideOffset={4}>
                        <Menu.Popup className="flex w-[343px] flex-col gap-xxs rounded-m border border-border-primary bg-surface-control p-xs">
                            <Menu.Item onClick={onClick} render={<Option label="Corn" />} />
                            <Menu.Item render={<Option label="Soybeans" subtitle="Bin 7 · 8,100 BU" />} />
                            <Menu.Item disabled render={<Option label="Wheat" />} />
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.Root>
        );
    },
    play: async ({ canvas, canvasElement, userEvent, args }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(canvas.getByRole('button', { name: 'Open menu' }));
        const corn = await body.findByRole('menuitem', { name: 'Corn' });
        await userEvent.hover(corn);
        await waitFor(() => {
            return expect(corn).toHaveAttribute('data-highlighted');
        });
        await expect(body.getByRole('menuitem', { name: 'Wheat' })).toHaveAttribute('aria-disabled', 'true');
        await userEvent.click(corn);
        await expect(args.onClick).toHaveBeenCalledOnce();
    },
};

/** Trigger value display: placeholder, label, label + subtitle. */
export const SelectValueStates: Story = {
    parameters: { design: { type: 'figma', url: `${FIGMA}8915-27414` } },
    render: function SelectValueStates() {
        return (
            <div className="flex flex-col gap-l p-l">
                <SelectValue placeholder="Select a bin" />
                <SelectValue label="Corn" />
                <SelectValue label="Corn" subtitle="Bin 4 · 12,400 BU" />
            </div>
        );
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Select a bin')).toHaveClass('text-text-general-medium');
        await expect(canvas.getAllByText('Corn')[0]).toHaveClass('text-text-general-strong');
    },
};

const ROW_STATES: { name: string; attributes: Record<string, string> }[] = [
    { name: 'default', attributes: {} },
    { name: 'highlighted', attributes: { 'data-highlighted': '' } },
    { name: 'selected', attributes: { 'data-selected': '' } },
    { name: 'disabled', attributes: { 'data-disabled': '' } },
];

/** Every drawn and derived cell: standard and Big × state × indicator. */
export const Matrix: Story = {
    // color-contrast off: includes the disabled rows (see `Disabled`). Other rules still run.
    parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
    decorators: [
        function Bare(Story) {
            return <Story />;
        },
    ],
    render: function Matrix() {
        return (
            <div className="flex flex-wrap gap-xl">
                {(['check', 'radio'] as const).map((indicator) => {
                    return [false, true].map((big) => {
                        return (
                            <div
                                key={`${indicator}-${big}`}
                                className="flex w-[343px] flex-col gap-xxs rounded-m border border-border-primary bg-surface-control p-xs"
                            >
                                {ROW_STATES.map((state) => {
                                    return (
                                        <Option
                                            key={state.name}
                                            indicator={indicator}
                                            label={`Corn — ${state.name}`}
                                            subtitle={big ? 'Bin 4 · 12,400 BU' : undefined}
                                            {...state.attributes}
                                        />
                                    );
                                })}
                            </div>
                        );
                    });
                })}
            </div>
        );
    },
};
