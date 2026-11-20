import type { SelectOption } from '@/components/ui/OptionList/types';
import type { SelectSheetProps } from './types';
import { useState } from 'react';
import preview from '#.storybook/preview';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Button } from '@/components/ui/Button';
import { SelectSheet } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const GRAINS = ['Corn', 'Soybeans', 'Wheat', 'Barley', 'Oats', 'Canola'];

function options(count: number): SelectOption[] {
    return Array.from({ length: count }, (_, index) => {
        return { value: `option-${index}`, label: `${GRAINS[index % GRAINS.length]} ${index + 1}` };
    });
}

const SHORT = options(4);
const LONG = options(40);

function matching(items: SelectOption[], query: string) {
    const needle = query.trim().toLowerCase();
    if (!needle) {
        return items;
    }
    return items.filter((item) => {
        return item.label.toLowerCase().includes(needle);
    });
}

function rowsOf(root: HTMLElement) {
    return Array.from(root.querySelectorAll<HTMLElement>('[role=option]')).map((row) => {
        return row.textContent;
    });
}

type StoryArgs = Partial<SelectSheetProps> & {
    /** Story-only: the caller's filtered rows; defaults to a local filter over `items`. */
    fixedResults?: SelectOption[];
};

/** Owns what `Select` owns on mobile: `open`, the value and the query. Opens on load. */
function Demo({ items = LONG, fixedResults, onValueChange, onInputValueChange, ...rest }: StoryArgs) {
    const [open, setOpen] = useState(true);
    const [value, setValue] = useState<SelectOption | null>(null);
    const [query, setQuery] = useState('');

    return (
        <div className="flex flex-col gap-l">
            <Button
                variant="secondary"
                size="sm"
                className="w-fit"
                onClick={() => {
                    setOpen(true);
                }}
            >
                {value?.label ?? 'Open the sheet'}
            </Button>
            <SelectSheet
                sheetTitle="Select a grain"
                searchPlaceholder="Search"
                {...rest}
                open={open}
                onOpenChange={setOpen}
                items={items}
                filteredItems={fixedResults ?? matching(items, query)}
                value={value}
                onValueChange={(next) => {
                    onValueChange?.(next);
                    setValue(next);
                    setOpen(false);
                }}
                onInputValueChange={(next) => {
                    onInputValueChange?.(next);
                    setQuery(next);
                }}
                onItemHighlighted={() => {}}
            />
        </div>
    );
}

const meta = preview.type<{ args: StoryArgs }>().meta({
    title: 'UI/SelectSheet',
    // `SelectSheet` is `Select`'s mobile branch; rendered directly here at phone width.
    globals: { viewport: { value: 'mobile2', isRotated: false } },
    args: { items: LONG, onValueChange: fn(), onInputValueChange: fn() },
    argTypes: {
        items: { control: false },
        filteredItems: { control: false },
        fixedResults: { control: false },
        renderItem: { control: false },
        listRef: { control: false },
    },
    render: function Render(args) {
        return <Demo {...args} />;
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}11165-148548` } },
});

function bodyOf(canvasElement: HTMLElement) {
    return within(canvasElement.ownerDocument.body);
}

/** Forty rows with radio indicators; a pick reports the item and closes the sheet. */
export const Default = meta.story();

Default.test('a pick reports the item and closes the sheet', async ({ canvasElement, args, userEvent }) => {
    const body = bodyOf(canvasElement);
    const sheet = await body.findByRole('dialog', { name: 'Select a grain' });
    await expect(within(sheet).getByRole('button', { name: 'Close select a grain' })).toBeVisible();
    await userEvent.click(await within(sheet).findByRole('option', { name: 'Wheat 3' }));
    await expect(args.onValueChange).toHaveBeenCalledWith(expect.objectContaining({ value: 'option-2' }));
    await waitFor(() => {
        return expect(body.queryByRole('dialog')).toBeNull();
    });
    await expect(body.getByRole('button', { name: 'Wheat 3' })).toBeVisible();
});

/** Four rows: shorter than the floor, so the panel is held at half the viewport. */
Default.test(
    'a short list holds the panel at half the viewport',
    {
        args: { items: SHORT },
    },
    async ({ canvasElement }) => {
        const sheet = await bodyOf(canvasElement).findByRole('dialog');
        await waitFor(() => {
            return expect(rowsOf(sheet)).toHaveLength(4);
        });
        const panel = sheet.querySelector<HTMLElement>('[data-base-ui-swipe-ignore]');
        await waitFor(() => {
            return expect(panel?.getBoundingClientRect().height).toBeGreaterThanOrEqual(window.innerHeight * 0.5 - 1);
        });
    }
);

/** Typing narrows the list; the sheet keeps the height it opened at. */
Default.test(
    'typing narrows the list; the sheet keeps its opening height',
    async ({ canvasElement, args, userEvent }) => {
        const sheet = await bodyOf(canvasElement).findByRole('dialog');
        const panel = sheet.querySelector<HTMLElement>('[data-base-ui-swipe-ignore]');
        await waitFor(() => {
            return expect(rowsOf(sheet).length).toBeGreaterThan(4);
        });
        const openedHeight = panel?.getBoundingClientRect().height ?? 0;
        await userEvent.type(within(sheet).getByPlaceholderText('Search'), 'corn 1');
        await expect(args.onInputValueChange).toHaveBeenLastCalledWith('corn 1');
        await waitFor(() => {
            return expect(rowsOf(sheet)).toEqual(['Corn 1', 'Corn 13', 'Corn 19']);
        });
        await expect(panel?.getBoundingClientRect().height).toBeGreaterThanOrEqual(openedHeight - 1);
    }
);

/** `loading` scrims the list and blocks list keys; the search field stays live. */
Default.test(
    'loading scrims the list and blocks list keys; search stays live',
    {
        args: { loading: true },
    },
    async ({ canvasElement }) => {
        const sheet = await bodyOf(canvasElement).findByRole('dialog');
        await expect(within(sheet).getByText('Loading results')).toBeInTheDocument();
        await expect(within(sheet).getByPlaceholderText('Search')).toBeEnabled();
    }
);

/** No matches: `emptyMessage` replaces the list, announced through `Combobox.Empty`. */
Default.test(
    'no matches: emptyMessage replaces the list',
    {
        args: { fixedResults: [], emptyMessage: 'No grains match' },
    },
    async ({ canvasElement }) => {
        const sheet = await bodyOf(canvasElement).findByRole('dialog');
        await expect(await within(sheet).findByText('No grains match')).toBeVisible();
        await expect(rowsOf(sheet)).toEqual([]);
    }
);

/** `sheetDescription` adds a subtitle under the title. */
Default.test(
    'sheetDescription adds a subtitle under the title',
    {
        args: { sheetTitle: 'Choose brand', sheetDescription: 'Shown on every bin card', items: SHORT },
    },
    async ({ canvasElement }) => {
        const sheet = await bodyOf(canvasElement).findByRole('dialog', { name: 'Choose brand' });
        await expect(within(sheet).getByText('Shown on every bin card')).toBeVisible();
    }
);

/** `searchable={false}`: no search field at all; the listbox is still named by the sheet title. */
Default.test(
    'searchable={false}: no search field; the listbox is named by the sheet title',
    {
        args: { searchable: false, items: SHORT },
    },
    async ({ canvasElement }) => {
        const sheet = await bodyOf(canvasElement).findByRole('dialog');
        await expect(within(sheet).queryByPlaceholderText('Search')).toBeNull();
        await expect(within(sheet).getByRole('listbox', { name: 'Select a grain' })).toBeInTheDocument();
        await waitFor(() => {
            return expect(rowsOf(sheet)).toHaveLength(4);
        });
    }
);
