import type { OptionListHandle, OptionListProps, SelectOption } from './types';
import { useRef } from 'react';
import GrainIcon from '@/assets/icons/grains.svg?react';
import { Combobox } from '@base-ui/react/combobox';
import preview from '#.storybook/preview';
import { expect, fn, waitFor } from 'storybook/test';
import { Field } from '@/components/ui/Field';
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
const meta = preview.type<{ args: StoryArgs }>().meta({
    title: 'UI/OptionList',
    component: OptionList,
    args: { items: oneLine(12), 'aria-label': 'Grains' },
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
        // No `Matrix`: the per-cell Figma links live here, as tabs in the Design panel.
        design: [
            { name: 'List', type: 'figma', url: `${FIGMA}8915-27188` },
            { name: 'Big (two-line)', type: 'figma', url: `${FIGMA}8750-15849` },
            { name: 'Radio (mobile sheet)', type: 'figma', url: `${FIGMA}11165-148548` },
        ],
    },
});

/** 12 one-line options: five rows visible, the rest scroll. Rows live in the `listbox`; clicking selects. */
export const Default = meta.story({
    args: { onValueChange: fn() },
});

Default.test(
    'five rows visible, the rest scroll; clicking selects',
    async ({ canvas, canvasElement, userEvent, args }) => {
        const listbox = canvas.getByRole('listbox', { name: 'Grains' });
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
    }
);

/** Max-height, not height: three options hug. */
Default.test(
    'max-height, not height: three options hug',
    {
        args: { items: oneLine(3) },
    },
    async ({ canvasElement }) => {
        const viewport = canvasElement.querySelector<HTMLElement>('[data-scroll-viewport]');
        await waitFor(() => {
            return expect(viewport!.clientHeight).toBe(3 * 50);
        });
    }
);

/** ~400 options: only a window is in the DOM, but each row announces its position in the whole list. */
Default.test(
    '~400 options are windowed but announce their position in the whole list',
    {
        args: { items: oneLine(400) },
    },
    async ({ canvasElement }) => {
        const rows = rowsOf(canvasElement);
        await expect(rows.length).toBeLessThan(20);
        rows.forEach((row, offset) => {
            void expect(row).toHaveAttribute('aria-setsize', '400');
            void expect(row).toHaveAttribute('aria-posinset', String(offset + 1));
        });
    }
);

/** Big list: any `subtitle` switches the whole list to two-line rows, six visible. */
Default.test(
    'any subtitle switches the whole list to two-line rows, six visible',
    {
        args: { items: twoLine(12) },
    },
    async ({ canvasElement }) => {
        const viewport = canvasElement.querySelector<HTMLElement>('[data-scroll-viewport]');
        await waitFor(() => {
            return expect(viewport!.clientHeight).toBe(6 * 50 + 5 * 2);
        });
    }
);

/** `renderItem` fills row text only; the row is still `Option`, so its checkmark slot survives. */
Default.test(
    'renderItem fills row text only; the checkmark slot survives',
    {
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
    },
    async ({ canvas }) => {
        const row = canvas.getByRole('option', { name: /Corn 1/ });
        await expect(row.querySelector('[data-slot="check"]')).toBeInTheDocument();
        await expect(row.querySelector('svg:not([data-slot])')).toBeInTheDocument();
    }
);

/** Disabled rows get `aria-disabled` (not native `disabled`) so arrow keys still reach them; hover still highlights. */
Default.test(
    'disabled rows use aria-disabled so arrow keys still reach them',
    {
        args: {
            items: oneLine(12).map((item, index) => {
                return { ...item, disabled: [1, 2, 6].includes(index) };
            }),
        },
    },
    async ({ canvas, userEvent }) => {
        const row = canvas.getByRole('option', { name: 'Soybeans 2' });
        await expect(row).toHaveAttribute('aria-disabled', 'true');
        await expect(row).not.toHaveAttribute('disabled');
        await expect(row).toHaveAttribute('data-disabled');
        await userEvent.hover(row);
        await waitFor(() => {
            return expect(row).toHaveAttribute('data-highlighted');
        });
    }
);

/** `group` inserts a `presentation` header whenever it changes; the same value may repeat across groups. */
Default.test(
    'group inserts a presentation header whenever it changes',
    {
        args: {
            items: [
                { value: 'America/Chicago', label: 'Chicago', group: 'Recommended' },
                { value: 'America/Chicago', label: 'Chicago', group: 'America' },
                { value: 'America/Denver', label: 'Denver', group: 'America' },
                { value: 'Europe/Berlin', label: 'Berlin', group: 'Europe' },
                { value: 'Europe/Paris', label: 'Paris', group: 'Europe' },
            ],
        },
    },
    async ({ canvas, canvasElement }) => {
        const headers = canvasElement.querySelectorAll('[role=listbox] > [role=presentation]');
        await expect(
            Array.from(headers, (header) => {
                return header.textContent;
            })
        ).toEqual(['Recommended', 'America', 'Europe']);
        await expect(headers[0]).toHaveClass('pt-none');
        await expect(canvas.getAllByRole('option', { name: 'Chicago' })).toHaveLength(2);
        await expect(rowsOf(canvasElement).at(-1)).toHaveAttribute('aria-setsize', '5');
    }
);

/** Mobile-sheet rows: radio ring, 36px rows inset 12px. */
Default.test(
    'radio indicator: ring, 36px rows inset 12px',
    {
        args: { indicator: 'radio' },
    },
    async ({ canvasElement }) => {
        const [first] = rowsOf(canvasElement);
        await expect(first?.querySelector('[data-slot="radio"]')).toBeInTheDocument();
        await expect(first?.getBoundingClientRect().height).toBe(36);
    }
);

/** `ref.scrollToIndex` brings a filtered index into view (what `Select` calls on keyboard highlight). */
export const ScrollToIndex = meta.story({
    args: { items: oneLine(100) },
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
});

ScrollToIndex.test('ref.scrollToIndex brings a filtered index into view', async ({ canvas, userEvent }) => {
    await expect(canvas.queryByRole('option', { name: 'Soybeans 80' })).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Jump to 80' }));
    await expect(await canvas.findByRole('option', { name: 'Soybeans 80' })).toBeVisible();
});

/** Inside a `Field`, the `Field.Label` names the listbox (`aria-labelledby` beats the `aria-label` fallback). */
export const InField = meta.story({
    render: function InField({ items, ...props }) {
        return (
            <Field.Root>
                <Field.Label>Grain</Field.Label>
                <Combobox.Root inline open virtualized items={items} itemToStringLabel={labelOf}>
                    <OptionList {...props} />
                </Combobox.Root>
            </Field.Root>
        );
    },
});

InField.test('Field.Label names the listbox', async ({ canvas }) => {
    await expect(canvas.getByRole('listbox', { name: 'Grain' })).toHaveAttribute('aria-labelledby');
});
