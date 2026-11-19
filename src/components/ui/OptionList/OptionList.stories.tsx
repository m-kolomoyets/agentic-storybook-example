import type { Meta, StoryObj } from '@storybook/react-vite';
import type { OptionListHandle, OptionListProps, SelectOption } from './types';
import { useRef } from 'react';
import GrainIcon from '@/assets/icons/grains.svg?react';
import { Combobox } from '@base-ui/react/combobox';
import { expect, fn, waitFor } from 'storybook/test';
import { OptionList } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const GRAINS = ['Corn', 'Soybeans', 'Wheat', 'Barley', 'Oats', 'Canola'];

function oneLine(count: number): SelectOption[] {
    return Array.from({ length: count }, (_, index) => {
        return { value: `option-${index}`, label: `${GRAINS[index % GRAINS.length]} ${index + 1}` };
    });
}

function twoLine(count: number): SelectOption[] {
    return oneLine(count).map((item, index) => {
        return { ...item, subtitle: `Bin ${index + 1} · ${(index + 1) * 1200} BU` };
    });
}

function labelOf(item: SelectOption) {
    return item.label;
}

function rowsOf(root: HTMLElement) {
    return Array.from(root.querySelectorAll<HTMLElement>('[role=option]'));
}

type StoryArgs = OptionListProps & {
    /** Story-only: what the surrounding `Combobox.Root` is given. */
    items: SelectOption[];
    onValueChange?: (value: SelectOption | null) => void;
};

/*
 * `inline open` is required: highlight is driven by the floating context, so a closed `Root` renders
 * inert rows. `itemToStringLabel`: `SelectOption` is an object.
 */
const meta = {
    title: 'UI/OptionList',
    component: OptionList,
    args: { items: oneLine(12) },
    argTypes: {
        indicator: { control: 'inline-radio', options: ['check', 'radio'] },
        items: { control: false },
        renderItem: { control: false },
    },
    render: function Harness({ items, onValueChange, ...props }) {
        return (
            <Combobox.Root
                inline
                open
                virtualized
                items={items}
                itemToStringLabel={labelOf}
                onValueChange={onValueChange}
            >
                <OptionList {...props} />
            </Combobox.Root>
        );
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
    parameters: {
        design: { type: 'figma', url: `${FIGMA}8915-27188` },
        // The listbox's name comes from the host `Select`'s trigger/label; bare here (amber API has no label prop).
        a11y: { test: 'todo' },
    },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 12 one-line options: five rows visible, the rest scroll. Rows live in the `listbox`; clicking selects. */
export const Default: Story = {
    args: { onValueChange: fn() },
    play: async ({ canvas, canvasElement, userEvent, args }) => {
        const listbox = canvas.getByRole('listbox');
        await expect(rowsOf(canvasElement)[0]?.parentElement).toBe(listbox);
        const viewport = canvasElement.querySelector<HTMLElement>('[data-scroll-viewport]');
        await waitFor(() => {
            return expect(viewport!.clientHeight).toBe(5 * 48 + 4 * 2);
        });
        const row = canvas.getByRole('option', { name: 'Soybeans 2' });
        await userEvent.click(row);
        await expect(args.onValueChange).toHaveBeenCalledWith(
            expect.objectContaining({ value: 'option-1' }),
            expect.anything()
        );
        await expect(row).toHaveAttribute('data-selected');
    },
};

/** Max-height, not height: three options hug. */
export const Short: Story = {
    args: { items: oneLine(3) },
    play: async ({ canvasElement }) => {
        const viewport = canvasElement.querySelector<HTMLElement>('[data-scroll-viewport]');
        await waitFor(() => {
            return expect(viewport!.clientHeight).toBe(3 * 50);
        });
    },
};

/** ~400 options: only a window is in the DOM, but each row announces its position in the whole list. */
export const Large: Story = {
    args: { items: oneLine(400) },
    play: async ({ canvasElement }) => {
        const rows = rowsOf(canvasElement);
        await expect(rows.length).toBeLessThan(20);
        rows.forEach((row, offset) => {
            void expect(row).toHaveAttribute('aria-setsize', '400');
            void expect(row).toHaveAttribute('aria-posinset', String(offset + 1));
        });
    },
};

/** Big list: any `subtitle` switches the whole list to two-line rows, six visible. */
export const TwoLine: Story = {
    args: { items: twoLine(12) },
    parameters: { design: { type: 'figma', url: `${FIGMA}8750-15849` } },
    play: async ({ canvasElement }) => {
        const viewport = canvasElement.querySelector<HTMLElement>('[data-scroll-viewport]');
        await waitFor(() => {
            return expect(viewport!.clientHeight).toBe(6 * 50 + 5 * 2);
        });
    },
};

/** `renderItem` fills row text only; the row is still `Option`, so its checkmark slot survives. */
export const WithRenderItem: Story = {
    args: {
        renderItem: function RowText(item, index) {
            return (
                <span className="flex min-w-px items-center gap-s">
                    <span className="shrink-0 text-caption-m text-text-general-medium">{index + 1}</span>
                    <GrainIcon aria-hidden className="size-2xl shrink-0" />
                    <span className="truncate">{item.label}</span>
                </span>
            );
        },
    },
    play: async ({ canvas }) => {
        const row = canvas.getByRole('option', { name: /Corn 1/ });
        await expect(row.querySelector('[data-slot="check"]')).toBeInTheDocument();
        await expect(row.querySelector('svg:not([data-slot])')).toBeInTheDocument();
    },
};

/** Disabled rows get `aria-disabled` (not native `disabled`) so arrow keys still reach them; hover still highlights. */
export const Disabled: Story = {
    args: {
        items: oneLine(12).map((item, index) => {
            return { ...item, disabled: [1, 2, 6].includes(index) };
        }),
    },
    play: async ({ canvas, userEvent }) => {
        const row = canvas.getByRole('option', { name: 'Soybeans 2' });
        await expect(row).toHaveAttribute('aria-disabled', 'true');
        await expect(row).not.toHaveAttribute('disabled');
        await expect(row).toHaveAttribute('data-disabled');
        await userEvent.hover(row);
        await waitFor(() => {
            return expect(row).toHaveAttribute('data-highlighted');
        });
    },
};

/** `group` inserts a `presentation` header whenever it changes; the same value may repeat across groups. */
export const Grouped: Story = {
    args: {
        items: [
            { value: 'America/Chicago', label: 'Chicago', group: 'Recommended' },
            { value: 'America/Chicago', label: 'Chicago', group: 'America' },
            { value: 'America/Denver', label: 'Denver', group: 'America' },
            { value: 'Europe/Berlin', label: 'Berlin', group: 'Europe' },
            { value: 'Europe/Paris', label: 'Paris', group: 'Europe' },
        ],
    },
    play: async ({ canvas, canvasElement }) => {
        const headers = canvasElement.querySelectorAll('[role=listbox] > [role=presentation]');
        await expect(
            Array.from(headers, (header) => {
                return header.textContent;
            })
        ).toEqual(['Recommended', 'America', 'Europe']);
        await expect(headers[0]).toHaveClass('pt-none');
        await expect(canvas.getAllByRole('option', { name: 'Chicago' })).toHaveLength(2);
        await expect(rowsOf(canvasElement).at(-1)).toHaveAttribute('aria-setsize', '5');
    },
};

/** Mobile-sheet rows: radio ring, 36px rows inset 12px. */
export const Radio: Story = {
    args: { indicator: 'radio' },
    parameters: { design: { type: 'figma', url: `${FIGMA}11165-148548` } },
    play: async ({ canvasElement }) => {
        const [first] = rowsOf(canvasElement);
        await expect(first?.querySelector('[data-slot="radio"]')).toBeInTheDocument();
        await expect(first?.getBoundingClientRect().height).toBe(36);
    },
};

/** `ref.scrollToIndex` brings a filtered index into view (what `Select` calls on keyboard highlight). */
export const ScrollToIndex: Story = {
    args: { items: oneLine(100) },
    // Dynamic source serialisation reads `element.ref`, which React 19 removed — show the static source instead.
    parameters: { docs: { source: { type: 'code' } } },
    render: function ScrollToIndex({ items, ...props }) {
        const listRef = useRef<OptionListHandle>(null);
        return (
            <>
                <button
                    type="button"
                    className="self-start rounded-s border border-border-primary px-l py-s text-body-m text-text-general-strong"
                    onClick={() => {
                        listRef.current?.scrollToIndex(79);
                    }}
                >
                    Jump to 80
                </button>
                <Combobox.Root inline open virtualized items={items} itemToStringLabel={labelOf}>
                    <OptionList {...props} ref={listRef} />
                </Combobox.Root>
            </>
        );
    },
    play: async ({ canvas, userEvent }) => {
        await expect(canvas.queryByRole('option', { name: 'Soybeans 80' })).toBeNull();
        await userEvent.click(canvas.getByRole('button', { name: 'Jump to 80' }));
        await expect(await canvas.findByRole('option', { name: 'Soybeans 80' })).toBeVisible();
    },
};
