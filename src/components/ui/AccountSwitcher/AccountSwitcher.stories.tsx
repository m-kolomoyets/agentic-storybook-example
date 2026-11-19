import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SelectOption } from '@/components/ui/OptionList/types';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { AccountSwitcher } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const MOBILE = { viewport: { value: 'mobile2', isRotated: false } };

const ACCOUNTS: SelectOption[] = [
    { value: 'amber', label: 'Amber Prod Test' },
    { value: 'arbor', label: 'Arbor Hill Farms' },
    { value: 'decent', label: 'Decent Ag Co' },
    { value: 'elite', label: 'Elite Corn' },
    { value: 'flathills', label: 'Flathills Farm Co.' },
    {
        value: 'green-acres',
        label: 'Green Acres Farm Cooperative of the Northern Plains, Eastern Valley & Lower River Region',
    },
    { value: 'hanks', label: "Hank's Rolling Hills" },
    { value: 'insane', label: 'Insane Grain' },
];

const CAPTION = '12 Bins · 4 Barges';

type StoryArgs = {
    /** Story-only: the `single` variant (static card). */
    single?: boolean;
    caption?: string;
    disabled?: boolean;
    loading?: boolean;
    searchPlaceholder?: string;
    className?: string;
    /** Story-only: the account the harness starts on. */
    initialValue?: string;
    onValueChange?: (value: string) => void;
    onSearchChange?: (query: string) => void;
};

/** Stands in for the caller: owns the account and the query, and filters the list as the server would. */
function Live({ single, initialValue = 'amber', onValueChange, onSearchChange, ...rest }: StoryArgs) {
    const [query, setQuery] = useState('');
    const [value, setValue] = useState(initialValue);
    const name =
        ACCOUNTS.find((account) => {
            return account.value === value;
        })?.label ?? '';

    if (single) {
        return <AccountSwitcher single name={name} caption={rest.caption} className={rest.className} />;
    }

    const options = ACCOUNTS.filter((account) => {
        return account.label.toLowerCase().includes(query.toLowerCase());
    });

    return (
        <AccountSwitcher
            {...rest}
            name={name}
            options={options}
            value={value}
            searchValue={query}
            onValueChange={(next) => {
                onValueChange?.(next);
                setValue(next);
            }}
            onSearchChange={(next) => {
                onSearchChange?.(next);
                setQuery(next);
            }}
        />
    );
}

function bodyOf(canvasElement: HTMLElement) {
    return within(canvasElement.ownerDocument.body);
}

/* Desktop: the `Combobox.Trigger` (the popup's search field is also a combobox, but portalled). */
function triggerOf(canvasElement: HTMLElement) {
    const trigger = canvasElement.querySelector<HTMLElement>('button');
    if (!trigger) {
        throw new Error('AccountSwitcher rendered no trigger');
    }
    return trigger;
}

const meta = {
    title: 'UI/AccountSwitcher',
    args: {
        caption: CAPTION,
        searchPlaceholder: 'Search',
        onValueChange: fn(),
        onSearchChange: fn(),
    },
    argTypes: {
        initialValue: {
            control: 'select',
            options: ACCOUNTS.map((account) => {
                return account.value;
            }),
        },
    },
    render: function Render(args) {
        return (
            // Figma's 296px card; story scaffolding only.
            <div className="w-[296px]">
                <Live {...args} />
            </div>
        );
    },
    parameters: {
        // Desktop by default (vitest's 1200×900); `*OnMobile` stories pin a phone viewport for the sheet branch.
        design: { type: 'figma', url: `${FIGMA}12446-6418` },
    },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Multi-account: card is a trigger with the unfold chevron. Opens a searchable list; current row is checked. */
export const Default: Story = {
    play: async ({ canvasElement, userEvent }) => {
        const trigger = triggerOf(canvasElement);
        await expect(trigger).toHaveTextContent('Amber Prod Test');
        await expect(trigger).toHaveTextContent(CAPTION);
        await userEvent.click(trigger);
        const body = bodyOf(canvasElement);
        await body.findByRole('listbox');
        await expect(await body.findByRole('option', { name: 'Amber Prod Test' })).toHaveAttribute(
            'aria-selected',
            'true'
        );
    },
};

/** Drawn `Single` cell: static card, no chevron, nothing to press. */
export const Single: Story = {
    args: { single: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Amber Prod Test')).toBeVisible();
        await expect(canvas.queryByRole('button')).toBeNull();
        await expect(canvas.queryByRole('combobox')).toBeNull();
    },
};

/** Long names truncate to one line. */
export const LongName: Story = {
    args: { initialValue: 'green-acres' },
    play: async ({ canvasElement }) => {
        const name = within(triggerOf(canvasElement)).getByText(/Green Acres/);
        await expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
    },
};

/** Keyboard: Enter opens, typing filters (caller-side), arrows + Enter pick. */
export const KeyboardPick: Story = {
    play: async ({ canvasElement, args, userEvent }) => {
        triggerOf(canvasElement).focus();
        await userEvent.keyboard('{Enter}');
        const body = bodyOf(canvasElement);
        await body.findByRole('listbox');
        await userEvent.type(await body.findByPlaceholderText('Search'), 'Decent');
        await expect(args.onSearchChange).toHaveBeenLastCalledWith('Decent');
        await waitFor(() => {
            return expect(body.getAllByRole('option')).toHaveLength(1);
        });
        await userEvent.keyboard('{ArrowDown}{Enter}');
        await expect(args.onValueChange).toHaveBeenCalledWith('decent');
        await waitFor(() => {
            return expect(triggerOf(canvasElement)).toHaveTextContent('Decent Ag Co');
        });
    },
};

/** Re-picking the current account is not reported. */
export const RepickCurrent: Story = {
    play: async ({ canvasElement, args, userEvent }) => {
        await userEvent.click(triggerOf(canvasElement));
        await userEvent.click(await bodyOf(canvasElement).findByRole('option', { name: 'Amber Prod Test' }));
        await expect(args.onValueChange).not.toHaveBeenCalled();
    },
};

/** Escape closes and clears the query it leaves behind. */
export const EscapeClearsSearch: Story = {
    play: async ({ canvasElement, args, userEvent }) => {
        await userEvent.click(triggerOf(canvasElement));
        const body = bodyOf(canvasElement);
        await userEvent.type(await body.findByPlaceholderText('Search'), 'Co');
        await userEvent.keyboard('{Escape}');
        await waitFor(() => {
            return expect(body.queryByRole('listbox')).toBeNull();
        });
        await expect(args.onSearchChange).toHaveBeenLastCalledWith('');
    },
};

/** Drawn `No results for "…"` empty state. */
export const NoResults: Story = {
    play: async ({ canvasElement, userEvent }) => {
        await userEvent.click(triggerOf(canvasElement));
        const body = bodyOf(canvasElement);
        await userEvent.type(await body.findByPlaceholderText('Search'), 'Beans Farm');
        await expect(await body.findByText('No results for "Beans Farm"')).toBeVisible();
        await expect(body.getByText('Try another search')).toBeVisible();
    },
};

/** Spinner over the list while the caller's search is in flight. */
export const Loading: Story = {
    args: { loading: true },
    play: async ({ canvasElement, userEvent }) => {
        await userEvent.click(triggerOf(canvasElement));
        const body = bodyOf(canvasElement);
        await expect(await body.findByText('Loading results')).toBeInTheDocument();
        const search = body.getByPlaceholderText('Search');
        await waitFor(() => {
            return expect(search).toHaveFocus();
        });
    },
};

/** Disabled: greyed text, does not open. */
export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ canvasElement }) => {
        await expect(triggerOf(canvasElement)).toHaveAttribute('data-disabled');
    },
};

/* `:hover` / `:focus-visible` can't be reached statically; pinned with the ramp's own tokens. */
const STATES = [
    { label: 'single', args: { single: true } },
    { label: 'default', args: {} },
    { label: 'hover', args: { className: 'border-border-control-hover' } },
    { label: 'focused', args: { className: 'border-border-focused bg-button-secondary-hover' } },
    { label: 'disabled', args: { disabled: true } },
];

/** Closed column of the Figma set: Single, default, hover, focused, disabled. */
export const Matrix: Story = {
    render: function Render() {
        return (
            <div className="flex w-[296px] flex-col gap-l">
                {STATES.map((state) => {
                    return (
                        <div key={state.label} className="flex flex-col gap-xs">
                            <span className="text-caption-m text-text-general-medium">{state.label}</span>
                            <Live caption={CAPTION} {...state.args} />
                        </div>
                    );
                })}
            </div>
        );
    },
};

/** Below `md` the card opens the `Switch Organization` sheet; a tap switches and closes. Figma: 13942:423473. */
export const DefaultOnMobile: Story = {
    globals: MOBILE,
    parameters: { design: { type: 'figma', url: `${FIGMA}13942-423473` } },
    play: async ({ canvasElement, args, userEvent }) => {
        const trigger = triggerOf(canvasElement);
        await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
        await userEvent.click(trigger);
        const body = bodyOf(canvasElement);
        const sheet = await body.findByRole('dialog', { name: 'Switch Organization' });
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await userEvent.click(within(sheet).getByRole('button', { name: 'Elite Corn' }));
        await expect(args.onValueChange).toHaveBeenCalledWith('elite');
        await waitFor(() => {
            return expect(body.queryByRole('dialog')).toBeNull();
        });
        await expect(trigger).toHaveTextContent('Elite Corn');
    },
};

/** Typing filters per keystroke; no match shows the sheet's empty state. */
export const NoResultsOnMobile: Story = {
    globals: MOBILE,
    play: async ({ canvasElement, args, userEvent }) => {
        await userEvent.click(triggerOf(canvasElement));
        const sheet = await bodyOf(canvasElement).findByRole('dialog');
        await userEvent.type(within(sheet).getByLabelText('Search organizations'), 'zzz');
        await expect(args.onSearchChange).toHaveBeenLastCalledWith('zzz');
        await expect(await within(sheet).findByRole('status')).toHaveTextContent('No organizations found');
    },
};
