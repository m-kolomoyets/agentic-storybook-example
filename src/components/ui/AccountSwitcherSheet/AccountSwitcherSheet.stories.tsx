import type { SelectOption } from '@/components/ui/OptionList/types';
import type { AccountSwitcherSheetProps } from './types';
import { useState } from 'react';
import preview from '#.storybook/preview';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Button } from '@/components/ui/Button';
import { AccountSwitcherSheet } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const ACCOUNTS: SelectOption[] = [
    { value: 'decent', label: 'Decent Ag Co' },
    { value: 'amber', label: 'Amber Prod Test' },
    { value: 'arbor', label: 'Arbor Hill Farms' },
    {
        value: 'green',
        label: 'Green Acres Farm Cooperative of the Northern Plains, Eastern Valley & Lower River Region',
    },
    { value: 'hanks', label: "Hank's Rolling Hills" },
    { value: 'insane', label: 'Insane Grain' },
];

const MANY_ACCOUNTS: SelectOption[] = Array.from({ length: 30 }, (_, index) => {
    return { value: `farm-${index}`, label: `Farm ${String(index + 1).padStart(2, '0')}` };
});

type StoryArgs = Pick<AccountSwitcherSheetProps, 'loading' | 'searchPlaceholder' | 'onValueChange'> & {
    options?: SelectOption[];
    /** Story-only: pre-typed query. */
    initialQuery?: string;
    /** Story-only: spied alongside the harness's own state. */
    onSearchChange?: (query: string) => void;
    onOpenChange?: (open: boolean) => void;
};

/** Owns what `AccountSwitcher` owns on mobile: `open`, the value and the query. Opens on load. */
function Demo({
    options = ACCOUNTS,
    initialQuery = '',
    onValueChange,
    onSearchChange,
    onOpenChange,
    ...rest
}: StoryArgs) {
    const [open, setOpen] = useState(true);
    const [value, setValue] = useState(options[1]?.value ?? null);
    const [query, setQuery] = useState(initialQuery);
    const name =
        options.find((option) => {
            return option.value === value;
        })?.label ?? '';

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
                {name}
            </Button>
            <AccountSwitcherSheet
                {...rest}
                open={open}
                onOpenChange={(next) => {
                    onOpenChange?.(next);
                    setOpen(next);
                }}
                name={name}
                value={value}
                options={options}
                onValueChange={(next) => {
                    onValueChange?.(next);
                    setValue(next);
                }}
                searchValue={query}
                onSearchChange={(next) => {
                    onSearchChange?.(next);
                    setQuery(next);
                }}
            />
        </div>
    );
}

const meta = preview.type<{ args: StoryArgs }>().meta({
    title: 'UI/AccountSwitcherSheet',
    // `AccountSwitcher`'s mobile branch, rendered directly at phone width.
    globals: { viewport: { value: 'mobile2', isRotated: false } },
    args: { onValueChange: fn(), onSearchChange: fn(), onOpenChange: fn() },
    argTypes: { options: { control: false } },
    render: function Render(args) {
        return <Demo {...args} />;
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}13942-423473` } },
});

function sheetOf(canvasElement: HTMLElement) {
    return within(canvasElement.ownerDocument.body).findByRole('dialog', { name: 'Switch Organization' });
}

function rowNames(sheet: HTMLElement) {
    return within(sheet)
        .getAllByRole('listitem')
        .map((row) => {
            return row.textContent;
        });
}

/** Current account leads (filled + check), the rest alphabetical. A tap switches and closes. */
export const Default = meta.story();

Default.test(
    'current account leads, the rest alphabetical; a tap switches and closes',
    async ({ canvasElement, args, userEvent }) => {
        const sheet = await sheetOf(canvasElement);
        await expect(rowNames(sheet)).toEqual([
            'Amber Prod Test',
            'Arbor Hill Farms',
            'Decent Ag Co',
            'Green Acres Farm Cooperative of the Northern Plains, Eastern Valley & Lower River Region',
            "Hank's Rolling Hills",
            'Insane Grain',
        ]);
        await expect(within(sheet).getByRole('button', { name: 'Amber Prod Test' })).toHaveAttribute(
            'aria-current',
            'true'
        );
        await userEvent.click(within(sheet).getByRole('button', { name: 'Insane Grain' }));
        await expect(args.onValueChange).toHaveBeenCalledWith('insane');
        await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
        await waitFor(() => {
            return expect(canvasElement.ownerDocument.querySelector('[role=dialog]')).toBeNull();
        });
    }
);

/** Tapping the current row only closes; nothing is reported. */
Default.test('tapping the current row only closes; nothing is reported', async ({ canvasElement, args, userEvent }) => {
    const sheet = await sheetOf(canvasElement);
    await userEvent.click(within(sheet).getByRole('button', { name: 'Amber Prod Test' }));
    await expect(args.onValueChange).not.toHaveBeenCalled();
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => {
        return expect(canvasElement.ownerDocument.querySelector('[role=dialog]')).toBeNull();
    });
});

/** Thirty rows: the list scrolls inside the pinned-height sheet. */
Default.test(
    'thirty rows scroll inside the pinned-height sheet',
    {
        args: { options: MANY_ACCOUNTS },
    },
    async ({ canvasElement }) => {
        const sheet = await sheetOf(canvasElement);
        await expect(rowNames(sheet)).toHaveLength(30);
        await expect(rowNames(sheet)[0]).toBe('Farm 02');
    }
);

/** Narrowed per keystroke; the current row stays first while it matches. */
Default.test(
    'the query narrows the rows; the current row stays first while it matches',
    {
        args: { initialQuery: 'er' },
    },
    async ({ canvasElement }) => {
        const sheet = await sheetOf(canvasElement);
        await expect(rowNames(sheet)).toEqual([
            'Amber Prod Test',
            'Green Acres Farm Cooperative of the Northern Plains, Eastern Valley & Lower River Region',
        ]);
    }
);

/** No match: the empty state is a live status. */
Default.test(
    'no match: the empty state is a live status',
    {
        args: { initialQuery: 'Beans Farm' },
    },
    async ({ canvasElement }) => {
        const sheet = await sheetOf(canvasElement);
        await expect(within(sheet).getByRole('status')).toHaveTextContent('No organizations found');
    }
);

/** While loading, an empty result waits silently instead of flashing "No organizations found". */
Default.test(
    'while loading, an empty result waits silently',
    {
        args: { initialQuery: 'Beans Farm', loading: true },
    },
    async ({ canvasElement }) => {
        const sheet = await sheetOf(canvasElement);
        await expect(within(sheet).queryByRole('status')).toBeNull();
    }
);

/** Closing over a query clears it, so the next opening starts unfiltered. */
Default.test('closing over a query clears it', async ({ canvasElement, args, userEvent }) => {
    const sheet = await sheetOf(canvasElement);
    await userEvent.type(within(sheet).getByLabelText('Search organizations'), 'Co');
    await expect(args.onSearchChange).toHaveBeenLastCalledWith('Co');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Close organization switcher' }));
    await expect(args.onSearchChange).toHaveBeenLastCalledWith('');
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => {
        return expect(canvasElement.ownerDocument.querySelector('[role=dialog]')).toBeNull();
    });
});
