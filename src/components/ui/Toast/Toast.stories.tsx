import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import type { ToastLayout, ToastStatus } from './types';
import HistoryIcon from '@/assets/icons/history.svg?react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '@/components/ui/Button';
import { resetToasts, toast } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

type PlaygroundArgs = {
    status: ToastStatus;
    title: string;
    descriptor?: string;
    layout: ToastLayout;
    /** Omitted → per-status lifetime (5s; `negative` sticky). */
    duration?: number;
    actionLabel?: string;
    onAction: () => void;
    onClose: () => void;
};

/*
 * `Toast.Provider` + `Toast.Viewport` are mounted once in `.storybook/preview.tsx`. The manager is
 * module state, so every story starts and ends with an empty queue.
 */
const meta = {
    title: 'UI/Toast',
    args: {
        status: 'positive',
        title: 'Schedule window saved',
        descriptor: 'Bin 14, 08:00–17:00',
        layout: 'inline',
        onAction: fn(),
        onClose: fn(),
    },
    argTypes: {
        status: { control: 'inline-radio', options: ['default', 'positive', 'negative', 'warning'] },
        layout: { control: 'inline-radio', options: ['inline', 'stacked'] },
        duration: { control: 'number' },
        actionLabel: { control: 'text' },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}10768-10277` } },
    beforeEach: () => {
        resetToasts();
        return resetToasts;
    },
    render: function Playground({ status, title, descriptor, layout, duration, actionLabel, onAction, onClose }) {
        function handleFire() {
            toast[status]({
                title,
                descriptor,
                layout,
                duration,
                onClose,
                action: actionLabel ? { label: actionLabel, onClick: onAction } : undefined,
            });
        }
        return <Fire onClick={handleFire}>Raise toast</Fire>;
    },
} satisfies Meta<PlaygroundArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

function Fire({ children, onClick }: { children: ReactNode; onClick: () => void }) {
    return (
        <Button variant="secondary" size="sm" onClick={onClick}>
            {children}
        </Button>
    );
}

function Stack({ children }: { children: ReactNode }) {
    return <div className="flex flex-col items-start gap-l">{children}</div>;
}

/** Toasts portal to `body`, outside the canvas. */
function bodyOf(canvasElement: HTMLElement) {
    return within(canvasElement.ownerDocument.body);
}

/** Scoped to the viewport: a `high` priority toast also renders a hidden `role="alert"` copy beside it. */
function viewportOf(canvasElement: HTMLElement) {
    return within(bodyOf(canvasElement).getByRole('region', { name: 'Notifications' }));
}

/*
 * `hidden: true`: Base UI marks a `high` priority card, and every ✕, `aria-hidden` while the
 * viewport is neither hovered nor focused (the mirror announces it), so plain role queries miss them.
 */
function cardsOf(canvasElement: HTMLElement, role: 'dialog' | 'alertdialog') {
    return viewportOf(canvasElement).queryAllByRole(role, { hidden: true });
}

function closeButtonOf(canvasElement: HTMLElement) {
    return bodyOf(canvasElement).getByLabelText('Dismiss notification', { selector: 'button' });
}

/*
 * Card name/description via the idrefs Base UI wires. Computed-name matchers return '' here: Base UI
 * keeps cards `aria-hidden` until the viewport is hovered or focused.
 */
function idrefText(card: HTMLElement, attribute: 'aria-labelledby' | 'aria-describedby') {
    const id = card.getAttribute(attribute) ?? '';
    return card.ownerDocument.getElementById(id)?.textContent;
}

/*
 * Base UI keeps a `high` priority (negative) card `aria-hidden` while its hidden `role="alert"` mirror
 * announces, yet the card stays `tabindex="0"` → axe `aria-hidden-focus`. Upstream behaviour, not ours.
 */
const NEGATIVE_A11Y = { a11y: { test: 'todo' } } as const;

const HISTORY_GLYPH = <HistoryIcon />;

/** Args-driven. Leaves after 5s; the viewport is a polite live region; the ✕ closes and reports `onClose`. */
export const Default: Story = {
    play: async ({ canvas, canvasElement, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Raise toast' }));
        const region = bodyOf(canvasElement).getByRole('region', { name: 'Notifications' });
        await expect(region).toHaveAttribute('aria-live', 'polite');

        const [card] = cardsOf(canvasElement, 'dialog');
        await expect(idrefText(card, 'aria-labelledby')).toBe('Schedule window saved');
        await expect(idrefText(card, 'aria-describedby')).toBe('Bin 14, 08:00–17:00');

        // Status chip is decoration: the title carries the meaning.
        await expect(card.querySelector('svg')?.closest('div')).toHaveAttribute('aria-hidden', 'true');

        const close = closeButtonOf(canvasElement);
        // Base UI un-hides the ✕ once the viewport is expanded (hover or focus); only then does its name compute.
        await userEvent.hover(card);
        await expect(close).toHaveAccessibleName('Dismiss notification');
        await userEvent.click(close);
        await waitFor(() => {
            return expect(args.onClose).toHaveBeenCalledOnce();
        });
        await waitFor(() => {
            return expect(cardsOf(canvasElement, 'dialog')).toHaveLength(0);
        });
    },
};

/** `negative` interrupts: `role="alertdialog"` plus a hidden `role="alert"` mirror. Others are `dialog`. */
export const Statuses: Story = {
    parameters: NEGATIVE_A11Y,
    render: function Statuses() {
        return (
            <Stack>
                <Fire
                    onClick={() => {
                        toast.default({ title: 'Schedule window deleted', descriptor: 'Bin 14, 08:00–17:00' });
                        toast.positive({ title: 'Reconditioning started', descriptor: 'Bin 3 · fans at 60%' });
                        toast.negative({ title: 'Could not reach the hub', descriptor: 'Last seen 4 minutes ago' });
                    }}
                >
                    Fire three
                </Fire>
                <Fire
                    onClick={() => {
                        toast.warning({
                            title: 'Fan 2 is drawing more current than usual',
                            descriptor: '7.4A against a 6.0A baseline',
                        });
                    }}
                >
                    warning
                </Fire>
            </Stack>
        );
    },
    play: async ({ canvas, canvasElement }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Fire three' }));
        await expect(cardsOf(canvasElement, 'alertdialog')).toHaveLength(1);
        await expect(cardsOf(canvasElement, 'alertdialog')[0]).toHaveTextContent('Could not reach the hub');
        await expect(cardsOf(canvasElement, 'dialog')).toHaveLength(2);
        await expect(bodyOf(canvasElement).getByRole('alert')).toHaveTextContent('Could not reach the hub');
    },
};

/** Figma draws no lifetime: these are the kit's. Hovering the viewport pauses every timer (WCAG 2.2.1). */
export const LifetimeAndHoverPause: Story = {
    args: { status: 'positive', duration: 600, descriptor: undefined },
    play: async ({ canvas, canvasElement, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Raise toast' }));
        // The viewport is `pointer-events-none`; hovering a card bubbles `mouseenter` up to it.
        const [card] = cardsOf(canvasElement, 'dialog');

        await userEvent.hover(card);
        await new Promise((resolve) => {
            setTimeout(resolve, 900);
        });
        await expect(viewportOf(canvasElement).getByText('Schedule window saved')).toBeInTheDocument();

        await userEvent.unhover(card);
        await waitFor(
            () => {
                return expect(viewportOf(canvasElement).queryByText('Schedule window saved')).toBeNull();
            },
            { timeout: 3000 }
        );
        await expect(args.onClose).toHaveBeenCalledOnce();
    },
};

/**
 * Base UI keeps every toast queued and flags overflow `data-limited`; the viewport hides those.
 * Hidden timers still run, so the first three are sticky to make promotion visible.
 */
export const Limit: Story = {
    render: function Limit() {
        return (
            <Fire
                onClick={() => {
                    for (let index = 1; index <= 3; index += 1) {
                        toast.default({ title: `Container ${index} synced`, duration: 0 });
                    }
                    for (let index = 4; index <= 6; index += 1) {
                        toast.default({ title: `Container ${index} synced` });
                    }
                }}
            >
                Fire six
            </Fire>
        );
    },
    play: async ({ canvas, canvasElement }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Fire six' }));
        const cards = cardsOf(canvasElement, 'dialog');
        const visible = cards.filter((card) => {
            return !card.hasAttribute('data-limited');
        });
        await expect(cards).toHaveLength(6);
        await expect(visible).toHaveLength(3);
        await expect(visible[0]).toHaveTextContent('Container 6 synced');
    },
};

/** Only the 20px glyph changes; chip fill and tint stay bound to status. Still `aria-hidden`. */
export const CustomIcon: Story = {
    parameters: NEGATIVE_A11Y,
    render: function CustomIcon() {
        return (
            <Fire
                onClick={() => {
                    toast.negative({ title: 'Retry failed', icon: HISTORY_GLYPH });
                }}
            >
                negative with an override
            </Fire>
        );
    },
    play: async ({ canvas, canvasElement }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'negative with an override' }));
        const [card] = cardsOf(canvasElement, 'alertdialog');
        await expect(card.querySelector('svg')?.closest('div')).toHaveAttribute('aria-hidden', 'true');
    },
};

/** Width caps rather than grows; an unbroken string keeps the ✕ on the card. */
export const LongContent: Story = {
    render: function LongContent() {
        return (
            <Stack>
                <Fire
                    onClick={() => {
                        toast.warning({
                            title: 'Fan 2 in bin 14 is drawing more current than its commissioning baseline',
                            descriptor:
                                'Measured at 7.4A against a 6.0A baseline over the last three hours. The schedule has not been changed; check the impeller for obstruction before the next window opens.',
                        });
                        toast.default({ title: 'Reconditioning-window-scheduling-diagnostics-report-2026-08-18' });
                    }}
                >
                    Fire long content
                </Fire>
            </Stack>
        );
    },
    play: async ({ canvas, canvasElement }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Fire long content' }));
        const close = bodyOf(canvasElement).getAllByLabelText('Dismiss notification', { selector: 'button' });
        for (const button of close) {
            const card = button.closest('[role="dialog"]');
            const cardBox = card?.getBoundingClientRect();
            await expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(cardBox?.right ?? 0);
        }
    },
};

/** Figma 8781:18872. An action closes its toast by default (`closeOnClick`), after running `onClick`. */
export const InlineAction: Story = {
    args: { status: 'default', title: 'Schedule window deleted', actionLabel: 'Undo' },
    parameters: { design: { type: 'figma', url: `${FIGMA}8781-18872` } },
    play: async ({ canvas, canvasElement, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Raise toast' }));
        await userEvent.hover(cardsOf(canvasElement, 'dialog')[0]);
        await userEvent.click(viewportOf(canvasElement).getByRole('button', { name: 'Undo' }));
        await expect(args.onAction).toHaveBeenCalledOnce();
        await waitFor(() => {
            return expect(args.onClose).toHaveBeenCalledOnce();
        });
    },
};

/**
 * Figma 9420:63609. Action below the descriptor, indented to the text; ✕ stays on the first row
 * but follows the action in DOM (WCAG 1.3.2).
 */
export const StackedAction: Story = {
    render: function StackedAction() {
        return (
            <Fire
                onClick={() => {
                    toast.warning({
                        title: 'Bin 14 is running warm',
                        descriptor: 'Grain temperature has been above target for 40 minutes.',
                        layout: 'stacked',
                        action: {
                            label: 'Run Diagnostics',
                            onClick: () => {},
                            variant: 'primary',
                            startIcon: HISTORY_GLYPH,
                        },
                    });
                }}
            >
                Fire stacked
            </Fire>
        );
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}9420-63609` } },
    play: async ({ canvas, canvasElement }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Fire stacked' }));
        const [card] = cardsOf(canvasElement, 'dialog');
        const buttons = within(card).getAllByRole('button', { hidden: true });
        await expect(buttons[0]).toHaveTextContent('Run Diagnostics');
        await expect(buttons.at(-1)).toHaveAttribute('aria-label', 'Dismiss notification');
    },
};

/** Figma 11256:5911. The `md:` breakpoint changes only width cap, padding and edge. */
export const Desktop: Story = {
    render: function Desktop() {
        return (
            <Fire
                onClick={() => {
                    toast.negative({
                        title: 'Fan 3 Offline',
                        descriptor: 'Bin 14',
                        action: { label: 'Run Diagnostics', onClick: () => {}, variant: 'primary' },
                    });
                }}
            >
                Fan 3 goes offline
            </Fire>
        );
    },
    parameters: { ...NEGATIVE_A11Y, design: { type: 'figma', url: `${FIGMA}11256-5911` } },
    play: async ({ canvas, canvasElement }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Fan 3 goes offline' }));
        await expect(cardsOf(canvasElement, 'alertdialog')).toHaveLength(1);
    },
};

/**
 * `closeOnClick: false` keeps the card through its own action; `toast.update` patches it in place.
 * Raising with an id already on screen updates instead of stacking — the only dedup.
 */
export const RetryAndDedup: Story = {
    parameters: NEGATIVE_A11Y,
    render: function Retry() {
        function start() {
            const id = toast.default({
                id: 'fan-3',
                title: 'Retrying…',
                descriptor: 'Fan 3',
                action: { label: 'Retry', onClick: start, closeOnClick: false },
            });
            setTimeout(() => {
                toast.update(id, { status: 'positive', title: 'Fan 3 back online' });
            }, 300);
        }
        return (
            <Stack>
                <Fire onClick={start}>Retry a failing request</Fire>
                <Fire
                    onClick={() => {
                        toast.negative({ id: 'hub', title: 'Could not reach the hub' });
                    }}
                >
                    Dedup by id
                </Fire>
            </Stack>
        );
    },
    play: async ({ canvas, canvasElement }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Retry a failing request' }));
        const [card] = cardsOf(canvasElement, 'dialog');
        await expect(idrefText(card, 'aria-labelledby')).toBe('Retrying…');
        await waitFor(() => {
            return expect(idrefText(card, 'aria-labelledby')).toBe('Fan 3 back online');
        });
        await expect(card).toHaveAttribute('data-type', 'positive');

        const dedup = canvas.getByRole('button', { name: 'Dedup by id' });
        await userEvent.click(dedup);
        await userEvent.click(dedup);
        await expect(cardsOf(canvasElement, 'alertdialog')).toHaveLength(1);
    },
};
