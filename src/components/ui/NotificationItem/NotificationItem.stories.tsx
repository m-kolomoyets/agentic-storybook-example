import HistoryIcon from '@/assets/icons/history.svg?react';
import preview from '#.storybook/preview';
import { expect, fn } from 'storybook/test';
import { NotificationItem } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/* 2024-03-05T20:32 local — the drawn `08:32 PM`. */
const SENT_AT = new Date(2024, 2, 5, 20, 32);

const LABEL = 'Fan stopped during active process';
const DESCRIPTOR = 'Drying cycle interrupted. Product quality may be affected.';

const DETAIL = (
    <>
        <NotificationItem.DetailRow label="Bin:" value="East Coast" />
        <NotificationItem.DetailRow label="Device:" value="North Fan Controller" />
        <NotificationItem.DetailRow label="Process:" value="Drying" />
        <NotificationItem.DetailRow label="Started:" value="Mar 5, 06:15 PM" />
    </>
);

/*
 * Figma draws four static cards and no interaction: the stretched-link click, keyboard route,
 * accessible name and read transition are the kit's. Stories sit in Figma's 375px frame.
 */
const meta = preview.meta({
    title: 'UI/NotificationItem',
    component: NotificationItem,
    args: {
        status: 'negative',
        label: LABEL,
        descriptor: DESCRIPTOR,
        timestamp: SENT_AT,
        read: false,
        onOpen: fn(),
    },
    argTypes: {
        status: { control: 'inline-radio', options: ['default', 'positive', 'negative', 'warning'] },
        actionVariant: { control: 'inline-radio', options: ['link', 'filled'] },
        delivered: { control: 'select', options: [undefined, true, false] },
        detail: { control: false },
        icon: { control: false },
        timestamp: { control: 'date' },
    },
    decorators: [
        function Frame(Story) {
            return (
                <div className="w-[375px] max-w-full">
                    <Story />
                </div>
            );
        },
    ],
    parameters: { design: { type: 'figma', url: `${FIGMA}9418-63545` } },
});

/** Playground — switch status/read/actions in Controls. Every drawn cell and status lives in `Matrix`. */
export const Default = meta.story();

/**
 * Unread and openable. The label is a real `<button>` (stretched link), so Enter and Space open it;
 * the visually hidden "Unread" names the state the decorative dot draws (WCAG 1.4.1).
 */
Default.test(
    'unread label is a button named "Unread …"; Enter and Space open it',
    async ({ canvas, args, userEvent }) => {
        const open = canvas.getByRole('button');
        await expect(open).toHaveAccessibleName(`Unread ${LABEL}`);
        await expect(canvas.getByText('8:32 PM')).toHaveAttribute('datetime', SENT_AT.toISOString());

        await userEvent.tab();
        await expect(open).toHaveFocus();
        await userEvent.keyboard('{Enter}');
        await userEvent.keyboard(' ');
        await expect(args.onOpen).toHaveBeenCalledTimes(2);
    }
);

/** Read: no fill, Regular weight, secondary ink, dot `invisible` (still in DOM, so nothing shifts). */
Default.test(
    'read drops "Unread" from the name and still opens',
    { args: { read: true } },
    async ({ canvas, args, userEvent }) => {
        const open = canvas.getByRole('button');
        await expect(open).toHaveAccessibleName(LABEL);
        await userEvent.click(open);
        await expect(args.onOpen).toHaveBeenCalledOnce();
    }
);

/** Without `onOpen` the label is inert text: no button, no hover. The status chip stays out of the a11y tree. */
Default.test(
    'without onOpen the label is an inert heading; status chip is hidden',
    { args: { read: true, onOpen: undefined } },
    async ({ canvas, canvasElement }) => {
        await expect(canvas.queryByRole('button')).toBeNull();
        await expect(canvas.getByRole('heading')).toHaveAccessibleName(LABEL);
        await expect(canvasElement.querySelector('svg')?.closest('[aria-hidden="true"]')).toBeInTheDocument();
        await expect(canvas.queryByRole('img')).toBeNull();
    }
);

/** Detailed card: `detail` presence *is* the second drawing (no `layout` prop). Phone glyph = delivered. */
Default.test(
    'detailed card shows rows and a "Delivered to phone" glyph',
    { args: { detail: DETAIL, delivered: true } },
    async ({ canvas }) => {
        await expect(canvas.getByRole('img', { name: 'Delivered to phone' })).toBeInTheDocument();
        await expect(canvas.getByText('North Fan Controller')).toBeInTheDocument();
    }
);

Default.test(
    'detailed card names "Not delivered to phone"',
    { args: { detail: DETAIL, delivered: false, read: true } },
    async ({ canvas }) => {
        await expect(canvas.getByRole('img', { name: 'Not delivered to phone' })).toBeInTheDocument();
    }
);

/**
 * Link pair (compact card): secondary paints first, as drawn. Actions sit above the label's `::after`,
 * so clicking one runs its handler and does not open the row.
 */
Default.test(
    'link actions: secondary first; clicks do not open the row',
    {
        args: {
            primaryAction: { label: 'Fix Now', onClick: fn() },
            secondaryAction: { label: 'Dismiss', onClick: fn() },
        },
    },
    async ({ canvas, args, userEvent }) => {
        const [, first, second] = canvas.getAllByRole('button');
        await expect(first).toHaveTextContent('Dismiss');
        await expect(second).toHaveTextContent('Fix Now');

        await userEvent.click(canvas.getByRole('button', { name: 'Fix Now' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }));
        await expect(args.primaryAction?.onClick).toHaveBeenCalledOnce();
        await expect(args.secondaryAction?.onClick).toHaveBeenCalledOnce();
        await expect(args.onOpen).not.toHaveBeenCalled();
    }
);

/** Filled pair (detailed card): primary paints first — Figma disagrees with itself; both as drawn. */
Default.test(
    'filled actions: primary first',
    {
        args: {
            actionVariant: 'filled',
            detail: DETAIL,
            primaryAction: { label: 'Fix Now', onClick: fn() },
            secondaryAction: { label: 'Dismiss', onClick: fn() },
        },
    },
    async ({ canvas, args, userEvent }) => {
        const [, first, second] = canvas.getAllByRole('button');
        await expect(first).toHaveTextContent('Fix Now');
        await expect(second).toHaveTextContent('Dismiss');
        await userEvent.click(first);
        await expect(args.primaryAction?.onClick).toHaveBeenCalledOnce();
        await userEvent.click(second);
        await expect(args.secondaryAction?.onClick).toHaveBeenCalledOnce();
    }
);

/** Primary only: either action may be absent; with neither there is no actions row at all. */
Default.test(
    'primary only renders a single action',
    { args: { onOpen: undefined, primaryAction: { label: 'Fix Now', onClick: fn() } } },
    async ({ canvas, args, userEvent }) => {
        await expect(canvas.getAllByRole('button')).toHaveLength(1);
        await userEvent.click(canvas.getByRole('button', { name: 'Fix Now' }));
        await expect(args.primaryAction?.onClick).toHaveBeenCalledOnce();
    }
);

/**
 * The four drawn cells (read × unread, compact × detailed), then every status through `StatusIcon`
 * (`surface="general"`); the last overrides only the glyph. For review against Figma.
 */
export const Matrix = meta.story({
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-xl">
                <NotificationItem descriptor={DESCRIPTOR} label={LABEL} status="negative" timestamp={SENT_AT} />
                <NotificationItem descriptor={DESCRIPTOR} label={LABEL} read status="negative" timestamp={SENT_AT} />
                <NotificationItem
                    delivered
                    descriptor={DESCRIPTOR}
                    detail={DETAIL}
                    label={LABEL}
                    status="negative"
                    timestamp={SENT_AT}
                />
                <NotificationItem
                    delivered={false}
                    descriptor={DESCRIPTOR}
                    detail={DETAIL}
                    label={LABEL}
                    read
                    status="negative"
                    timestamp={SENT_AT}
                />
                <NotificationItem
                    descriptor="Drying cycle finished normally."
                    label="Drying complete"
                    status="default"
                    timestamp={SENT_AT}
                />
                <NotificationItem
                    descriptor="Target moisture reached at 14.2%."
                    label="Reconditioning started"
                    status="positive"
                    timestamp={SENT_AT}
                />
                <NotificationItem
                    descriptor="Headspace humidity has been above 70% for six hours."
                    label="Grain condition drifting"
                    status="warning"
                    timestamp={SENT_AT}
                />
                <NotificationItem
                    descriptor="Only the glyph moved; fill and tint stay bound to status."
                    icon={<HistoryIcon />}
                    label="Schedule window changed"
                    status="warning"
                    timestamp={SENT_AT}
                />
            </div>
        );
    },
});
