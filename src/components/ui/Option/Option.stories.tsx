import type { OptionProps } from './types';
import GrainIcon from '@/assets/icons/grains.svg?react';
import { Menu } from '@base-ui/react/menu';
import preview from '#.storybook/preview';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Option, SelectValue } from '.';

/** Host-set `data-*` state attributes aren't in the props type; a host item sets them at runtime. */
type OptionArgs = Partial<OptionProps>;

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/* Popup surface at Figma's 343px. State stories set `data-*` by hand — exactly what a host item does. */
const meta = preview.meta({
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
});

/** Playground — label only. The checkmark is in the DOM but hidden until the host marks the row selected. */
export const Default = meta.story();

Default.test(
    'the checkmark is in the DOM but hidden until the host marks the row selected',
    async ({ canvasElement }) => {
        const check = canvasElement.querySelector('[data-slot="check"]');
        await expect(check).toBeInTheDocument();
        await expect(check).not.toBeVisible();
    }
);

/** The Big row is a `subtitle` and nothing else. */
Default.test(
    'the Big row is a subtitle and nothing else',
    {
        args: { subtitle: 'Bin 4 · 12,400 BU' },
    },
    async ({ canvas }) => {
        await expect(canvas.getByText('Bin 4 · 12,400 BU')).toBeVisible();
    }
);

/** Both lines truncate; the accessible name keeps the full text. */
Default.test(
    'both lines truncate; the accessible name keeps the full text',
    {
        args: {
            label: 'North bin block, west row, unit fourteen — commissioned spring 2019',
            subtitle: 'Bin 4 · 12,400 bu · corn · last read 14 minutes ago',
        },
    },
    async ({ canvasElement, args }) => {
        const row = canvasElement.querySelector<HTMLElement>('.group\\/option');
        await expect(row).toHaveTextContent(args.label);
        await expect(row!.scrollWidth).toBeLessThanOrEqual(row!.clientWidth);
    }
);

/** `data-selected` reveals the checkmark (Big set 11279:17235 is followed). */
Default.test(
    'data-selected reveals the checkmark',
    {
        args: { 'data-selected': '' } as OptionArgs,
    },
    async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('[data-slot="check"]')).toBeVisible();
    }
);

/** `radio` indicator (mobile sheet): leading ring replaces the checkmark; selected ring fills. */
Default.test(
    'radio indicator replaces the checkmark; the selected ring fills',
    {
        args: { indicator: 'radio', 'data-selected': '' } as OptionArgs,
    },
    async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('[data-slot="check"]')).toBeNull();
        const ring = canvasElement.querySelector('[data-slot="radio"]');
        await expect(ring).toBeVisible();
        const [unchecked, checked] = ring!.querySelectorAll('svg');
        await expect(unchecked).not.toBeVisible();
        await expect(checked).toBeVisible();
    }
);

/** `Option` as `Menu.Item`'s `render` with no props threaded; highlight comes from the menu. */
export const InsideMenu = meta.story({
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
});

InsideMenu.test('highlight and activation come from the menu', async ({ canvas, canvasElement, userEvent, args }) => {
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
});

/** Trigger value display: placeholder, label, label + subtitle. */
export const SelectValueStates = meta.story({
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
});

SelectValueStates.test('placeholder reads medium, a value reads strong', async ({ canvas }) => {
    await expect(canvas.getByText('Select a bin')).toHaveClass('text-text-general-medium');
    await expect(canvas.getAllByText('Corn')[0]).toHaveClass('text-text-general-strong');
});

const ROW_STATES: { name: string; attributes: Record<string, string> }[] = [
    { name: 'default', attributes: {} },
    { name: 'highlighted', attributes: { 'data-highlighted': '' } },
    { name: 'selected', attributes: { 'data-selected': '' } },
    { name: 'disabled', attributes: { 'data-disabled': '' } },
];

/** Every drawn and derived cell: standard and Big × state × indicator, plus the opt-in leading slot. */
export const Matrix = meta.story({
    parameters: {
        design: [
            { name: 'Option', type: 'figma', url: `${FIGMA}8915-27037` },
            { name: 'Highlighted', type: 'figma', url: `${FIGMA}8915-27048` },
            { name: 'Disabled', type: 'figma', url: `${FIGMA}8915-27066` },
            { name: 'Big', type: 'figma', url: `${FIGMA}8750-15829` },
            { name: 'Big selected', type: 'figma', url: `${FIGMA}11279-17235` },
            { name: 'Radio (mobile sheet)', type: 'figma', url: `${FIGMA}11165-148548` },
        ],
        // color-contrast off: Figma-drawn disabled ink on a bare `div` (no `aria-disabled`, host-owned).
        a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
    },
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
                <div className="flex w-[343px] flex-col gap-xxs rounded-m border border-border-primary bg-surface-control p-xs">
                    <Option label="Corn — startAddon" startAddon={<GrainIcon aria-hidden className="size-full" />} />
                    <Option
                        label="Corn — startAddon, selected"
                        startAddon={<GrainIcon aria-hidden className="size-full" />}
                        data-selected=""
                    />
                </div>
            </div>
        );
    },
});
