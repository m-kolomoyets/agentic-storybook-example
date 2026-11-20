import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import type { SelectOption } from '@/components/ui/OptionList/types';
import type { DropdownContentProps } from './types';
import { useState } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { expect, waitFor } from 'storybook/test';
import { DropdownContent } from '.';

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
    return Array.from(root.querySelectorAll<HTMLElement>('[role=option]')).map((row) => {
        return row.textContent;
    });
}

type StoryArgs = DropdownContentProps & {
    /** Story-only: what the surrounding `Combobox.Root` is given. */
    items: SelectOption[];
    /** Story-only: pre-typed query (controlled `inputValue`, so the field stays interactive). */
    query?: string;
};

/** `inline open`: highlight is driven by the open root; `Combobox.Popup` throws outside a Positioner. */
function Root({ items, query = '', children }: { items: SelectOption[]; query?: string; children: ReactNode }) {
    const [inputValue, setInputValue] = useState(query);

    return (
        <Combobox.Root
            inline
            open
            virtualized
            items={items}
            inputValue={inputValue}
            onInputValueChange={setInputValue}
            itemToStringLabel={labelOf}
        >
            {children}
        </Combobox.Root>
    );
}

const meta = {
    title: 'UI/DropdownContent',
    component: DropdownContent,
    args: { items: oneLine(12), searchPlaceholder: 'Search', listLabel: 'Grains' },
    argTypes: {
        indicator: { control: 'inline-radio', options: ['check', 'radio'] },
        items: { control: false },
        renderItem: { control: false },
        listRef: { control: false },
    },
    render: function Harness({ items, query, ...props }) {
        return (
            // Figma's 343px, supplied by the positioner in the real thing.
            <div className="flex w-[343px] flex-col">
                <Root items={items} query={query}>
                    <DropdownContent {...props} />
                </Root>
            </div>
        );
    },
    parameters: {
        design: { type: 'figma', url: `${FIGMA}8915-27188` },
    },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Search, five rows visible, twelve in the list. Empty live region stays mounted while rows exist. */
export const Default: Story = {
    play: async ({ canvas, canvasElement }) => {
        await expect(canvas.getByRole('listbox', { name: 'Grains' })).toBeInTheDocument();
        await waitFor(() => {
            return expect(rowsOf(canvasElement).length).toBeGreaterThan(0);
        });
        const announcer = canvas.getByRole('status');
        await expect(announcer).toHaveAttribute('aria-live', 'polite');
        await expect(announcer).toHaveTextContent('');
    },
};

/** Clear empties the filter (not the selection), restores rows, refocuses the search, popup stays open. */
export const ClearFilter: Story = {
    args: { clearLabel: 'Clear the bin filter' },
    play: async ({ canvas, canvasElement, userEvent }) => {
        const search = canvas.getByRole('combobox');
        await userEvent.type(search, 'Corn 1');
        await waitFor(() => {
            return expect(rowsOf(canvasElement)).toEqual(['Corn 1']);
        });

        await userEvent.click(canvas.getByRole('button', { name: 'Clear the bin filter' }));

        await expect(search).toHaveValue('');
        await waitFor(() => {
            return expect(rowsOf(canvasElement).length).toBeGreaterThan(1);
        });
        await expect(search).toHaveFocus();
        await expect(search).toHaveAttribute('aria-expanded', 'true');
        await expect(canvas.queryByRole('button', { name: 'Clear the bin filter' })).toBeNull();
    },
};

/** Figma 8750:15849 — no search field, so no input renders at all; arrow-keys-only. */
export const NotSearchable: Story = {
    args: { items: oneLine(5), searchable: false },
    parameters: { design: { type: 'figma', url: `${FIGMA}8750-15849` } },
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('combobox')).toBeNull();
    },
};

/** A query typed, the list narrowed, the clear button showing. */
export const Filtered: Story = {
    args: { query: 'corn' },
    play: async ({ canvas, canvasElement }) => {
        await waitFor(() => {
            return expect(rowsOf(canvasElement)).toEqual(['Corn 1', 'Corn 7']);
        });
        await expect(canvas.getByRole('button', { name: 'Clear search' })).toBeVisible();
    },
};

/** A query matching nothing: the panel hugs the message. */
export const Empty: Story = {
    args: { query: 'sorghum', emptyMessage: 'No bins match that name' },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('status')).toHaveTextContent('No bins match that name');
    },
};

/** Big list: every option carries a subtitle, six rows visible. */
export const TwoLine: Story = {
    args: { items: twoLine(6) },
    parameters: { design: { type: 'figma', url: `${FIGMA}8750-15849` } },
};

/** ~400 options (timezones): hugs max-height and virtualizes. */
export const Large: Story = {
    args: { items: oneLine(400) },
    play: async ({ canvasElement }) => {
        await waitFor(() => {
            return expect(rowsOf(canvasElement).length).toBeGreaterThan(0);
        });
        await expect(rowsOf(canvasElement).length).toBeLessThan(400);
    },
};

/** Async search: rows dimmed and inert under the spinner, search stays live, "No results" stays silent. */
export const Loading: Story = {
    args: { loading: true, loadingLabel: 'Searching bins' },
    play: async ({ canvas, canvasElement, userEvent }) => {
        const panel = canvasElement.querySelector('[aria-busy="true"]');
        await expect(panel).not.toBeNull();
        // `status` takes no name from content; the sr-only label lives inside the live region.
        await expect(canvas.getByText('Searching bins').closest('[role=status]')).not.toBeNull();

        await userEvent.type(canvas.getByRole('combobox'), 'sorghum');
        await expect(canvas.getByRole('combobox')).toHaveValue('sorghum');
        await expect(canvas.queryByText('No results')).toBeNull();
    },
};

/** Standard geometry serves both popups; two-line rows gain horizontal padding. */
export const Matrix: Story = {
    render: function Matrix() {
        const columns: { label: string; items: SelectOption[]; props: Partial<DropdownContentProps> }[] = [
            { label: 'one-line', items: oneLine(5), props: {} },
            { label: 'two-line, not searchable', items: twoLine(5), props: { searchable: false } },
            { label: 'radio indicator', items: oneLine(5), props: { indicator: 'radio' } },
            { label: 'loading', items: oneLine(5), props: { loading: true } },
        ];
        return (
            <div className="flex flex-wrap items-start gap-xl">
                {columns.map((column) => {
                    return (
                        <div key={column.label} className="flex w-[343px] flex-col gap-xs">
                            <span className="text-caption-m text-text-general-medium">{column.label}</span>
                            <Root items={column.items}>
                                <DropdownContent
                                    searchPlaceholder="Search"
                                    listLabel={column.label}
                                    {...column.props}
                                />
                            </Root>
                        </div>
                    );
                })}
            </div>
        );
    },
};
