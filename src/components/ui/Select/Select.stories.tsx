import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import type { SelectOption } from '@/components/ui/OptionList/types';
import type { SelectProps } from './types';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Field } from '@/components/ui/Field';
import { Select } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const MOBILE = { viewport: { value: 'mobile2', isRotated: false } };

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

const OPTIONS = oneLine(12);
const TWO_LINE_OPTIONS = twoLine(6);

/* Figma's 343px trigger width; story scaffolding only. */
const COLUMN = 'flex w-[343px] flex-col';

const LABEL = 'Grain';

/** `nativeLabel={false}`: the labelled element is a `<button>`; `aria-labelledby` still names it. */
function Labelled({ label = LABEL, invalid, children }: { label?: string; invalid?: boolean; children: ReactNode }) {
    return (
        <Field.Root invalid={invalid}>
            <Field.Label nativeLabel={false} render={<span />}>
                {label}
            </Field.Label>
            {children}
        </Field.Root>
    );
}

function bodyOf(canvasElement: HTMLElement) {
    return within(canvasElement.ownerDocument.body);
}

function rowsOf(canvasElement: HTMLElement) {
    return Array.from(canvasElement.ownerDocument.querySelectorAll<HTMLElement>('[role=option]')).map((row) => {
        return row.textContent;
    });
}

const meta = {
    title: 'UI/Select',
    component: Select,
    args: {
        items: OPTIONS,
        placeholder: 'Select a grain',
        searchPlaceholder: 'Search',
        onValueChange: fn(),
        onSearchChange: fn(),
    },
    argTypes: {
        items: { control: false },
        filteredItems: { control: false },
        renderItem: { control: false },
        focusAfterSelect: { control: false },
        value: { control: false },
        defaultValue: { control: false },
    },
    render: function Render(args) {
        return (
            <div className={COLUMN}>
                <Labelled>
                    <Select {...args} />
                </Labelled>
            </div>
        );
    },
    parameters: {
        // Desktop by default (vitest's 1200×900); `*OnMobile` stories pin a phone viewport for the sheet branch.
        design: { type: 'figma', url: `${FIGMA}8915-27414` },
    },
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Closed, nothing selected. Opening shows the labelled listbox; a pick reports the value and fills the trigger. */
export const Default: Story = {
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        const trigger = canvas.getByRole('combobox', { name: LABEL });
        await expect(trigger).toHaveTextContent('Select a grain');
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(trigger);
        const body = bodyOf(canvasElement);
        await body.findByRole('listbox');
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        // The surrounding `Field.Label` names the popup too.
        await expect(body.getByRole('dialog')).toHaveAccessibleName(LABEL);

        await userEvent.click(await body.findByRole('option', { name: 'Wheat 3' }));
        await expect(args.onValueChange).toHaveBeenCalledWith('option-2');
        await waitFor(() => {
            return expect(body.queryByRole('listbox')).toBeNull();
        });
        await expect(trigger).toHaveTextContent('Wheat 3');
        await expect(args.onSearchChange).not.toHaveBeenCalled();
    },
};

/** A selection only swaps the placeholder for the label; border unchanged. Popup marks the row selected. */
export const Filled: Story = {
    args: { defaultValue: 'option-2' },
    play: async ({ canvas, canvasElement, userEvent }) => {
        const trigger = canvas.getByRole('combobox', { name: LABEL });
        await expect(trigger).toHaveTextContent('Wheat 3');
        await userEvent.click(trigger);
        const selected = await bodyOf(canvasElement).findByRole('option', { name: 'Wheat 3' });
        await expect(selected).toHaveAttribute('aria-selected', 'true');
    },
};

/** Trigger + 4px + popup with search on top, five rows visible. Figma popup: 8915:27188. */
export const Open: Story = {
    parameters: { design: { type: 'figma', url: `${FIGMA}8915-27188` } },
    play: async ({ canvas, canvasElement, userEvent }) => {
        const trigger = canvas.getByRole('combobox', { name: LABEL });
        await userEvent.click(trigger);
        const body = bodyOf(canvasElement);
        const search = await body.findByPlaceholderText('Search');
        await waitFor(() => {
            return expect(search).toBeVisible();
        });
        await expect(trigger).toHaveAttribute('data-popup-open');
        await waitFor(() => {
            return expect(rowsOf(canvasElement).length).toBeGreaterThan(0);
        });
    },
};

/** Debounced search: the list and `onSearchChange` settle once typing pauses (250ms), not per keystroke. */
export const Search: Story = {
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        await userEvent.click(canvas.getByRole('combobox', { name: LABEL }));
        const search = await bodyOf(canvasElement).findByPlaceholderText('Search');
        await userEvent.type(search, 'Corn');
        await waitFor(() => {
            return expect(args.onSearchChange).toHaveBeenCalledWith('Corn');
        });
        await expect(args.onSearchChange).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            return expect(rowsOf(canvasElement)).toEqual(['Corn 1', 'Corn 7']);
        });
    },
};

/** `searchDebounce={0}`: every keystroke filters and reports synchronously. */
export const SearchUndebounced: Story = {
    args: { searchDebounce: 0 },
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        await userEvent.click(canvas.getByRole('combobox', { name: LABEL }));
        await userEvent.type(await bodyOf(canvasElement).findByPlaceholderText('Search'), 'Oa');
        await expect(args.onSearchChange).toHaveBeenNthCalledWith(1, 'O');
        await expect(args.onSearchChange).toHaveBeenNthCalledWith(2, 'Oa');
        await waitFor(() => {
            return expect(rowsOf(canvasElement)).toEqual(['Oats 5', 'Oats 11']);
        });
    },
};

/** Filter matches nothing: `emptyMessage` is announced through the mounted live region. */
export const NoResults: Story = {
    args: { emptyMessage: 'No grains match', searchDebounce: 0 },
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(canvas.getByRole('combobox', { name: LABEL }));
        const body = bodyOf(canvasElement);
        await userEvent.type(await body.findByPlaceholderText('Search'), 'Rye');
        await expect(await body.findByText('No grains match')).toBeVisible();
        await expect(rowsOf(canvasElement)).toEqual([]);
    },
};

/**
 * No search field and no typeahead (ADR-0003). Short lists only. Known gap (Base UI 1.9): with no
 * `Combobox.Input`, focus lands on the popup and arrow keys do not move the highlight, so this is pointer-only.
 */
export const NotSearchable: Story = {
    args: { items: oneLine(5), searchable: false },
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        const trigger = canvas.getByRole('combobox', { name: LABEL });
        await userEvent.click(trigger);
        const body = bodyOf(canvasElement);
        await body.findByRole('listbox');
        await expect(body.getByRole('dialog').querySelector('input')).toBeNull();
        await userEvent.click(await body.findByRole('option', { name: 'Soybeans 2' }));
        await expect(args.onValueChange).toHaveBeenCalledWith('option-1');
    },
};

/** Two-line rows; items with subtitles drive it (no `size` prop). Figma Big: 8750:15815. */
export const TwoLine: Story = {
    args: {
        items: TWO_LINE_OPTIONS,
        defaultValue: 'option-0',
        placeholder: 'Select a bin',
        searchPlaceholder: 'Search bins',
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}8750-15815` } },
    play: async ({ canvas }) => {
        const trigger = canvas.getByRole('combobox', { name: LABEL });
        await expect(trigger).toHaveTextContent('Corn 1');
        await expect(trigger).toHaveTextContent('Bin 1 · 1200 BU');
    },
};

/** ~400 options (`SelectTimezone`'s size): virtualized, so only a window of rows mounts. */
export const Large: Story = {
    args: { items: oneLine(400) },
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(canvas.getByRole('combobox', { name: LABEL }));
        await bodyOf(canvasElement).findByRole('listbox');
        await waitFor(() => {
            return expect(rowsOf(canvasElement).length).toBeGreaterThan(0);
        });
        await expect(rowsOf(canvasElement).length).toBeLessThan(40);
        const first = canvasElement.ownerDocument.querySelector('[role=option]');
        await expect(first).toHaveAttribute('aria-setsize', '400');
    },
};

/** Standalone error: red border only; messages live in `Field`. */
export const Error: Story = {
    args: { error: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('combobox', { name: LABEL })).toHaveAttribute('data-invalid');
    },
};

/** `Border/control-disabled` and `text-text-disabled`; the trigger does not open. */
export const Disabled: Story = {
    args: { disabled: true, defaultValue: 'option-2' },
    play: async ({ canvas }) => {
        const trigger = canvas.getByRole('combobox', { name: LABEL });
        await expect(trigger).toHaveAttribute('data-disabled');
        await expect(trigger).toHaveTextContent('Wheat 3');
    },
};

/** `Field.Root invalid` reaches the trigger via context; `Field` owns the message. */
export const InvalidField: Story = {
    render: function Render(args) {
        return (
            <div className={COLUMN}>
                <Field.Root invalid>
                    <Field.Label nativeLabel={false} render={<span />}>
                        {LABEL}
                    </Field.Label>
                    <Select {...args} />
                    <Field.Error>Pick a grain</Field.Error>
                </Field.Root>
            </div>
        );
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('combobox', { name: LABEL })).toHaveAttribute('data-invalid');
        await expect(canvas.getByText('Pick a grain')).toBeVisible();
    },
};

/** While `loading`, list keys are swallowed (no pick) but `Escape` still closes (WCAG 2.1.2). */
export const Loading: Story = {
    args: { loading: true },
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        await userEvent.click(canvas.getByRole('combobox', { name: LABEL }));
        const body = bodyOf(canvasElement);
        const search = await body.findByPlaceholderText('Search');
        await expect(body.getByText('Loading results')).toBeInTheDocument();
        search.focus();
        await userEvent.keyboard('{ArrowDown}{Enter}');
        await expect(args.onValueChange).not.toHaveBeenCalled();
        await userEvent.keyboard('{Escape}');
        await waitFor(() => {
            return expect(body.queryByRole('listbox')).toBeNull();
        });
    },
};

/** Async: the caller owns the rows (`filteredItems`) and `loading`; the "server" is a 300ms timer. */
export const AsyncSearch: Story = {
    render: function Render(args) {
        const [results, setResults] = useState<SelectOption[]>(OPTIONS);
        const [loading, setLoading] = useState(false);

        function handleSearchChange(query: string) {
            args.onSearchChange?.(query);
            setLoading(true);
            window.setTimeout(() => {
                setResults(
                    OPTIONS.filter((item) => {
                        return item.label.toLowerCase().includes(query.toLowerCase());
                    })
                );
                setLoading(false);
            }, 300);
        }

        return (
            <div className={COLUMN}>
                <Labelled>
                    <Select
                        {...args}
                        filteredItems={results}
                        loading={loading}
                        onSearchChange={handleSearchChange}
                        searchDebounce={0}
                    />
                </Labelled>
            </div>
        );
    },
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        await userEvent.click(canvas.getByRole('combobox', { name: LABEL }));
        await userEvent.type(await bodyOf(canvasElement).findByPlaceholderText('Search'), 'barley');
        await expect(args.onSearchChange).toHaveBeenLastCalledWith('barley');
        await waitFor(() => {
            return expect(rowsOf(canvasElement)).toEqual(['Barley 4', 'Barley 10']);
        });
    },
};

function FocusAfterSelectHarness(args: SelectProps<string | number>) {
    function getNext() {
        return document.getElementById('next-field');
    }
    return (
        <div className={`${COLUMN} gap-l`}>
            <Labelled>
                <Select {...args} focusAfterSelect={getNext} />
            </Labelled>
            <input id="next-field" aria-label="Next" className="rounded-s border border-border-primary p-s" />
        </div>
    );
}

/** `focusAfterSelect`: a pick moves focus to the next field instead of back to the trigger. */
export const FocusAfterSelect: Story = {
    args: { items: oneLine(3) },
    render: FocusAfterSelectHarness,
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(canvas.getByRole('combobox', { name: LABEL }));
        (await bodyOf(canvasElement).findByPlaceholderText('Search')).focus();
        await userEvent.keyboard('{ArrowDown}{Enter}');
        await waitFor(() => {
            return expect(canvas.getByRole('textbox', { name: 'Next' })).toHaveFocus();
        });
    },
};

/** …but `Escape` still returns focus to the trigger. */
export const FocusAfterSelectEscape: Story = {
    args: { items: oneLine(3) },
    render: FocusAfterSelectHarness,
    play: async ({ canvas, canvasElement, userEvent }) => {
        const trigger = canvas.getByRole('combobox', { name: LABEL });
        await userEvent.click(trigger);
        (await bodyOf(canvasElement).findByPlaceholderText('Search')).focus();
        await userEvent.keyboard('{Escape}');
        await waitFor(() => {
            return expect(trigger).toHaveFocus();
        });
    },
};

type StateName = 'default' | 'hover' | 'focused' | 'open' | 'error' | 'disabled';

const STATES: StateName[] = ['default', 'hover', 'focused', 'open', 'error', 'disabled'];

/* Pins for states a static canvas cannot reach; bare `border-*` so the merge overrides the trigger's own. */
const FORCED: Record<StateName, string> = {
    default: '',
    hover: 'border-border-control-hover',
    focused: 'border-border-focused',
    open: 'border-border-focused',
    error: '',
    disabled: '',
};

/** Every trigger cell, both layouts. `hover`/`focused`/`open` borders are pinned via `className`. */
export const Matrix: Story = {
    render: function Render() {
        return (
            <div className="flex flex-col gap-xl">
                {[
                    { layout: 'one-line', items: OPTIONS },
                    { layout: 'two-line', items: TWO_LINE_OPTIONS },
                ].map(({ layout, items }) => {
                    return (
                        <div key={layout} className="grid grid-cols-3 gap-l">
                            {STATES.map((state) => {
                                return (
                                    <div key={state} className="w-[280px]">
                                        <Labelled label={`${layout} · ${state}`}>
                                            <Select
                                                items={items}
                                                defaultValue="option-0"
                                                error={state === 'error'}
                                                disabled={state === 'disabled'}
                                                className={FORCED[state]}
                                            />
                                        </Labelled>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        );
    },
};

/** Below `md` the trigger is a plain button opening a titled `SelectSheet`; a pick closes it. */
export const DefaultOnMobile: Story = {
    globals: MOBILE,
    parameters: { design: { type: 'figma', url: `${FIGMA}11165-148548` } },
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        const trigger = canvas.getByRole('button', { name: /Select a grain/ });
        await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
        await userEvent.click(trigger);
        const body = bodyOf(canvasElement);
        const sheet = await body.findByRole('dialog', { name: 'Select a grain' });
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await userEvent.click(await within(sheet).findByRole('option', { name: 'Barley 4' }));
        await expect(args.onValueChange).toHaveBeenCalledWith('option-3');
        await waitFor(() => {
            return expect(body.queryByRole('dialog')).toBeNull();
        });
        await expect(trigger).toHaveTextContent('Barley 4');
    },
};

/** `sheetTitle` / `sheetDescription` override the placeholder-derived heading. */
export const SheetTitleOnMobile: Story = {
    globals: MOBILE,
    args: { sheetTitle: 'Choose grain', sheetDescription: 'Used for the bin forecast' },
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: /Select a grain/ }));
        const sheet = await bodyOf(canvasElement).findByRole('dialog', { name: 'Choose grain' });
        await expect(within(sheet).getByText('Used for the bin forecast')).toBeVisible();
        await expect(within(sheet).getByRole('button', { name: 'Close choose grain' })).toBeVisible();
    },
};

/** The mobile trigger reads the kit `Field`'s `invalid` (Base UI never marks a plain button). */
export const InvalidFieldOnMobile: Story = {
    ...InvalidField,
    globals: MOBILE,
    play: async ({ canvas }) => {
        const trigger = canvas.getByRole('button', { name: /Select a grain/ });
        await expect(trigger).toHaveAttribute('data-invalid');
        await expect(trigger).toHaveAttribute('aria-invalid', 'true');
    },
};
