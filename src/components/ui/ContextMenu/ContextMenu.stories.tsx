import type { StoryContext } from '@storybook/react-vite';
import type { ContextMenuAlign, ContextMenuItem, ContextMenuSide } from './types';
import ArchiveIcon from '@/assets/icons/archive.svg?react';
import DotsIcon from '@/assets/icons/dots-three-outline-vertical.svg?react';
import MoveIcon from '@/assets/icons/drive-file-move-outline.svg?react';
import GroupIcon from '@/assets/icons/group.svg?react';
import ModeEditIcon from '@/assets/icons/mode-edit.svg?react';
import preview from '#.storybook/preview';
import { expect, fn, waitFor, within } from 'storybook/test';
import { IconButton } from '@/components/ui/IconButton';
import { ContextMenu } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const TRIGGER = 'Bin actions';
const LABELS = ['Edit Bin Details', 'Move to Group', 'Create New Group', 'Archive Bin'];

const MOBILE = { viewport: { value: 'mobile2', isRotated: false } };

type StoryArgs = {
    side: ContextMenuSide;
    align: ContextMenuAlign;
    sheetTitle: string;
    disabled: boolean;
    withIcons: boolean;
    /** Greys `Create New Group`. */
    disableCreate: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit: () => void;
    onMove: () => void;
    onCreate: () => void;
    onArchive: () => void;
};

function buildItems({ withIcons, disableCreate, onEdit, onMove, onCreate, onArchive }: StoryArgs): ContextMenuItem[] {
    // The four rows the drawn instance carries, verbatim.
    const items: ContextMenuItem[] = [
        { label: LABELS[0], icon: <ModeEditIcon />, onSelect: onEdit },
        { label: LABELS[1], icon: <MoveIcon />, onSelect: onMove },
        { label: LABELS[2], icon: <GroupIcon />, disabled: disableCreate, onSelect: onCreate },
        { label: LABELS[3], icon: <ArchiveIcon />, destructive: true, onSelect: onArchive },
    ];
    return withIcons
        ? items
        : items.map(({ icon: _icon, ...item }) => {
              return item;
          });
}

const meta = preview.type<{ args: StoryArgs }>().meta({
    title: 'UI/ContextMenu',
    args: {
        side: 'bottom',
        align: 'end',
        sheetTitle: 'Actions',
        disabled: false,
        withIcons: true,
        disableCreate: false,
        onOpenChange: fn(),
        onEdit: fn(),
        onMove: fn(),
        onCreate: fn(),
        onArchive: fn(),
    },
    argTypes: {
        side: { control: 'inline-radio', options: ['top', 'right', 'bottom', 'left'] },
        align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
    },
    render: function Default(args) {
        return (
            <ContextMenu.Root disabled={args.disabled} onOpenChange={args.onOpenChange}>
                <ContextMenu.Trigger render={<IconButton size="md" aria-label={TRIGGER} icon={<DotsIcon />} />} />
                <ContextMenu.Content
                    items={buildItems(args)}
                    side={args.side}
                    align={args.align}
                    sheetTitle={args.sheetTitle}
                />
            </ContextMenu.Root>
        );
    },
    decorators: [
        function Stage(Story) {
            return (
                <div className="flex min-h-[28rem] items-center justify-center p-4xl">
                    <Story />
                </div>
            );
        },
    ],
    // Desktop panel by default (vitest's 1200×900); `*OnMobile` stories pin a phone viewport for the sheet.
    parameters: { design: { type: 'figma', url: `${FIGMA}11309-7784` } },
});

type PlayContext = StoryContext<StoryArgs>;

function bodyOf({ canvasElement }: PlayContext) {
    return within(canvasElement.ownerDocument.body);
}

async function openMenu(context: PlayContext) {
    const trigger = context.canvas.getByRole('button', { name: TRIGGER });
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await context.userEvent.click(trigger);
    return bodyOf(context).findByRole('menu');
}

async function expectMenuClosed(context: PlayContext) {
    await waitFor(() => {
        return expect(bodyOf(context).queryByRole('menu')).not.toBeInTheDocument();
    });
}

/**
 * One `menuitem` per item, in order. Escape closes and returns focus to the trigger (WCAG 2.1.2). Selecting a
 * row closes the menu and calls its `onSelect`.
 */
export const Default = meta.story();

Default.test('one menuitem per item; Escape returns focus; a pick closes and calls onSelect', async (context) => {
    const { canvas, userEvent, args } = context;
    const menu = within(await openMenu(context));

    await expect(
        menu.getAllByRole('menuitem').map((row) => {
            return row.textContent;
        })
    ).toEqual(LABELS);
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(true, expect.anything());

    await userEvent.keyboard('{Escape}');
    await expectMenuClosed(context);
    await expect(canvas.getByRole('button', { name: TRIGGER })).toHaveFocus();

    await userEvent.click(within(await openMenu(context)).getByRole('menuitem', { name: 'Edit Bin Details' }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await expectMenuClosed(context);
});

/** Roving focus with the arrow keys, typeahead by label, Enter selects — the reason this wraps Base UI `menu`. */
Default.test('arrow keys rove, typeahead by label, Enter selects', async (context) => {
    const { userEvent, args } = context;
    const menu = within(await openMenu(context));

    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => {
        return expect(menu.getByRole('menuitem', { name: 'Edit Bin Details' })).toHaveFocus();
    });
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => {
        return expect(menu.getByRole('menuitem', { name: 'Move to Group' })).toHaveFocus();
    });
    await userEvent.keyboard('{Enter}');
    await expect(args.onMove).toHaveBeenCalledOnce();
    await expectMenuClosed(context);

    const reopened = within(await openMenu(context));
    await userEvent.keyboard('arch');
    await waitFor(() => {
        return expect(reopened.getByRole('menuitem', { name: 'Archive Bin' })).toHaveFocus();
    });
    await userEvent.keyboard('{Enter}');
    await expect(args.onArchive).toHaveBeenCalledOnce();
    await expectMenuClosed(context);
});

/** A disabled row stays arrow-reachable (so its unavailability is discoverable), takes no fill, does nothing. */
Default.test(
    'a disabled row stays arrow-reachable and does nothing',
    {
        args: { disableCreate: true },
    },
    async (context) => {
        const { userEvent, args } = context;
        const menu = within(await openMenu(context));
        const create = menu.getByRole('menuitem', { name: 'Create New Group' });

        await expect(create).toHaveAttribute('aria-disabled', 'true');
        await userEvent.keyboard('{ArrowUp}{ArrowUp}');
        await waitFor(() => {
            return expect(create).toHaveFocus();
        });
        await userEvent.click(create);
        await expect(args.onCreate).not.toHaveBeenCalled();
        await userEvent.keyboard('{Escape}');
        await expectMenuClosed(context);
    }
);

/** `disabled` on `Root` stops it opening without disabling the trigger element. */
Default.test(
    'disabled Root does not open but the trigger stays enabled',
    {
        args: { disabled: true },
    },
    async (context) => {
        await context.userEvent.click(context.canvas.getByRole('button', { name: TRIGGER }));
        await expect(bodyOf(context).queryByRole('menu')).toBeNull();
        await expect(context.args.onOpenChange).not.toHaveBeenCalled();
    }
);

/** The icon is optional; labels still align because the slot is absent, not empty. */
Default.test(
    'without icons the slot is absent, not empty',
    {
        args: { withIcons: false },
    },
    async (context) => {
        const menu = await openMenu(context);
        await expect(menu.querySelector('svg')).toBeNull();
    }
);

/** Every state at once for review against Figma: hover fill, disabled, destructive. */
export const States = meta.story({
    args: { disableCreate: true },
    // Setup, not a test: opens the panel and parks the pointer so the review state is visible.
    play: async (context) => {
        const menu = within(await openMenu(context));
        await context.userEvent.hover(menu.getByRole('menuitem', { name: 'Move to Group' }));
    },
});

/** Base UI flips a placement that would collide with the viewport. */
Default.test(
    'a colliding placement flips',
    {
        render: function Placements(args) {
            return (
                <div className="flex flex-wrap items-center justify-center gap-4xl">
                    {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
                        return (
                            <ContextMenu.Root key={side}>
                                <ContextMenu.Trigger
                                    render={<IconButton size="md" aria-label={`${side} actions`} icon={<DotsIcon />} />}
                                />
                                <ContextMenu.Content items={buildItems(args).slice(0, 2)} side={side} align="center" />
                            </ContextMenu.Root>
                        );
                    })}
                </div>
            );
        },
    },
    async (context) => {
        await context.userEvent.click(context.canvas.getByRole('button', { name: 'top actions' }));
        await waitFor(() => {
            return expect(bodyOf(context).getByRole('menu').closest('[data-side]')).toHaveAttribute('data-side', 'top');
        });
    }
);

/** The panel is portalled, so a trigger inside an `overflow: hidden` card is not clipped with it. */
Default.test(
    'the portalled panel is not clipped by an overflow-hidden ancestor',
    {
        decorators: [
            function ClippingCard(Story) {
                return (
                    <div className="flex w-[24rem] items-center justify-between overflow-hidden rounded-m border border-border-primary bg-surface-card p-l">
                        <span className="text-body-s-medium">Gulf Bin 4</span>
                        <Story />
                    </div>
                );
            },
        ],
    },
    async (context) => {
        const menu = await openMenu(context);
        await expect(context.canvasElement.contains(menu)).toBe(false);
    }
);

/**
 * Below `md:` the same `Root` renders the drawn `Actions` bottom sheet (Figma 10600:285692): a named dialog of
 * plain buttons. A row closes the sheet, then fires `onSelect`.
 */
export const DefaultOnMobile = meta.story({
    globals: MOBILE,
    args: { disableCreate: true },
    parameters: { design: { type: 'figma', url: `${FIGMA}10600-285692` } },
});

DefaultOnMobile.test('renders a named sheet of buttons; a row closes it, then fires onSelect', async (context) => {
    const { canvas, userEvent, args } = context;
    const body = bodyOf(context);
    const trigger = canvas.getByRole('button', { name: TRIGGER });

    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);

    const sheet = within(await body.findByRole('dialog', { name: 'Actions' }));
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(true, expect.anything());
    await expect(sheet.getByRole('button', { name: 'Create New Group' })).toBeDisabled();

    await userEvent.click(sheet.getByRole('button', { name: 'Archive Bin' }));
    await expect(args.onArchive).toHaveBeenCalledOnce();
    await waitFor(() => {
        return expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false, expect.anything());
});

/** The sheet is named whatever the caller titles it; its ✕ follows. */
DefaultOnMobile.test(
    'the sheet and its close button follow sheetTitle',
    {
        // `disableCreate` back to the meta default; the parent story greys it.
        args: { sheetTitle: 'Bin actions menu', disableCreate: false },
    },
    async (context) => {
        const body = bodyOf(context);
        await context.userEvent.click(context.canvas.getByRole('button', { name: TRIGGER }));
        await body.findByRole('dialog', { name: 'Bin actions menu' });
        await context.userEvent.click(body.getByRole('button', { name: 'Close bin actions menu' }));
        await waitFor(() => {
            return expect(body.queryByRole('dialog')).not.toBeInTheDocument();
        });
    }
);
