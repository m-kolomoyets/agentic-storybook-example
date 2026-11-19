import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MockInstance } from 'storybook/test';
import type { BottomSheetActionProps } from './types';
import { useState } from 'react';
import { expect, fn, spyOn, waitFor, within } from 'storybook/test';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const TRIGGER = 'Open the sheet';
const TITLE = 'Stop reconditioning mode?';
const DESCRIPTOR = 'The fans will shut down within a minute and the current cycle will not resume.';

type StoryArgs = {
    title?: string;
    descriptor?: string;
    /** Rows in `Content`; 0 renders no `Content`. */
    rows: number;
    footer: boolean;
    withClose: boolean;
    actionVariant: NonNullable<BottomSheetActionProps['variant']>;
    loading: boolean;
    onOpenChange: (open: boolean) => void;
    onAction: () => void;
};

let consoleError: MockInstance<typeof console.error>;

/** Silences and records `console.error` so the dev-only title guard can be asserted. */
function spyOnConsoleError() {
    consoleError = spyOn(console, 'error').mockImplementation(() => {
        return undefined;
    });
    return () => {
        consoleError.mockRestore();
    };
}

function Reading({ bin, moisture }: { bin: string; moisture: string }) {
    return (
        <div className="flex items-center justify-between border-b border-border-primary px-l py-m">
            <span className="text-body-s text-text-general-strong">{bin}</span>
            <span className="text-body-s text-text-general-medium">{moisture}</span>
        </div>
    );
}

/* Local `open` state: the sheet is controlled-only and has no trigger part. */
function Demo({
    title,
    descriptor,
    rows,
    footer,
    withClose,
    actionVariant,
    loading,
    onOpenChange,
    onAction,
}: StoryArgs) {
    const [open, setOpen] = useState(false);

    function handleOpenChange(next: boolean) {
        setOpen(next);
        onOpenChange(next);
    }

    return (
        <div className="flex min-h-[150vh] flex-col gap-l p-xl">
            <Button
                variant="secondary"
                size="sm"
                className="w-fit"
                onClick={() => {
                    handleOpenChange(true);
                }}
            >
                {TRIGGER}
            </Button>
            <span className="text-caption-m text-text-general-medium">
                The column is taller than the viewport — it must not scroll while the sheet is open.
            </span>
            <BottomSheet.Root open={open} onOpenChange={handleOpenChange}>
                <BottomSheet.Popup>
                    {withClose ? <BottomSheet.Close aria-label="Dismiss reconditioning dialog" /> : null}
                    {title === undefined ? null : <BottomSheet.Title>{title}</BottomSheet.Title>}
                    {descriptor === undefined ? null : <BottomSheet.Descriptor>{descriptor}</BottomSheet.Descriptor>}
                    {rows > 0 ? (
                        <BottomSheet.Content>
                            {Array.from({ length: rows }, (_, index) => {
                                return (
                                    <Reading
                                        key={index}
                                        bin={`Bin ${index + 12}`}
                                        moisture={`${13 + (index % 4)}.4%`}
                                    />
                                );
                            })}
                        </BottomSheet.Content>
                    ) : null}
                    {footer ? (
                        <BottomSheet.Footer>
                            <BottomSheet.Cancel>Cancel</BottomSheet.Cancel>
                            <BottomSheet.Action variant={actionVariant} loading={loading} onClick={onAction}>
                                Stop
                            </BottomSheet.Action>
                        </BottomSheet.Footer>
                    ) : null}
                </BottomSheet.Popup>
            </BottomSheet.Root>
        </div>
    );
}

const meta = {
    title: 'UI/BottomSheet',
    component: Demo,
    args: {
        title: TITLE,
        descriptor: DESCRIPTOR,
        rows: 0,
        footer: true,
        withClose: false,
        actionVariant: 'primary',
        loading: false,
        onOpenChange: fn(),
        onAction: fn(),
    },
    argTypes: {
        rows: { control: { type: 'range', min: 0, max: 40 } },
        actionVariant: { control: 'inline-radio', options: ['primary', 'secondary', 'destructive'] },
    },
    beforeEach: spyOnConsoleError,
    // The sheet is the phone surface: render (and test) it at phone width.
    globals: { viewport: { value: 'mobile2', isRotated: false } },
    parameters: { layout: 'fullscreen', design: { type: 'figma', url: `${FIGMA}8370-24957` } },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

async function openSheet({ canvas, canvasElement, userEvent }: PlayContext) {
    await userEvent.click(canvas.getByRole('button', { name: TRIGGER }));
    return within(canvasElement.ownerDocument.body).findByRole('dialog');
}

/** Base UI locks scroll on `<html>` or `<body>` depending on the scrollbar; either counts. */
function isScrollLocked(document: Document) {
    return [document.documentElement, document.body].some((element) => {
        return getComputedStyle(element).overflowY === 'hidden';
    });
}

async function expectClosed({ canvasElement }: PlayContext) {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => {
        return expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    });
}

/**
 * Frame 8370:24957. Named by `Title`, described by `Descriptor`; modal focus trap, inert page, scroll lock.
 * Escape closes. No prop disables dismissal.
 */
export const Default: Story = {
    play: async (context) => {
        const { canvasElement, userEvent, args } = context;
        const body = within(canvasElement.ownerDocument.body);
        const dialog = await openSheet(context);

        await expect(dialog).toHaveAccessibleName(TITLE);
        await expect(dialog).toHaveAttribute('aria-labelledby', body.getByRole('heading', { name: TITLE }).id);
        await expect(dialog).toHaveAccessibleDescription(DESCRIPTOR);
        await expect(dialog).toHaveAttribute('aria-describedby', body.getByText(DESCRIPTOR).id);
        await expect(dialog.querySelector('[data-home-indicator]')).toHaveAttribute('aria-hidden', 'true');
        await waitFor(() => {
            return expect(dialog.contains(canvasElement.ownerDocument.activeElement)).toBe(true);
        });
        // The page behind is hidden from assistive tech.
        await expect(body.queryByRole('button', { name: TRIGGER })).toBeNull();
        await expect(isScrollLocked(canvasElement.ownerDocument)).toBe(true);
        await expect(consoleError).not.toHaveBeenCalled();
        await expect(args.onOpenChange).toHaveBeenLastCalledWith(true);

        await userEvent.keyboard('{Escape}');
        await expectClosed(context);
        await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
    },
};

/** `Cancel` closes with no handler; `Action` never does — the caller closes on success. */
export const Confirmation: Story = {
    play: async (context) => {
        const { userEvent, args } = context;
        const dialog = within(await openSheet(context));

        await userEvent.click(dialog.getByRole('button', { name: 'Stop' }));
        await expect(args.onAction).toHaveBeenCalledOnce();
        await expect(dialog.getByRole('heading', { name: TITLE })).toBeVisible();

        await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
        await expectClosed(context);
        await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
    },
};

/** Not drawn; `Action` passes `Button`'s variant through. */
export const Destructive: Story = {
    args: { actionVariant: 'destructive' },
};

/**
 * Busy `Action` is `loading`, not `disabled`: still named and focusable, refuses activation. Nothing else
 * locks — Cancel, ✕, Escape, backdrop and swipe still close.
 */
export const Loading: Story = {
    args: { loading: true, withClose: true },
    play: async (context) => {
        const { userEvent, args } = context;
        const dialog = within(await openSheet(context));
        const action = dialog.getByRole('button', { name: 'Stop' });

        await expect(action).toBeEnabled();
        await userEvent.click(action);
        await expect(args.onAction).not.toHaveBeenCalled();

        await userEvent.keyboard('{Escape}');
        await expectClosed(context);
    },
};

/**
 * Figma 8938:19290 is a bare 20px glyph; `IconButton size="sm"` adds a 40px target (WCAG 2.5.8) with the
 * glyph on the drawn 12px inset. Its name is the caller's.
 */
export const Closable: Story = {
    args: { withClose: true, rows: 3, title: 'Set the target moisture', descriptor: 'Applies to every bin.' },
    parameters: { design: { type: 'figma', url: `${FIGMA}8938-19290` } },
    play: async (context) => {
        const { userEvent, args } = context;
        const dialog = within(await openSheet(context));
        const close = dialog.getByRole('button', { name: 'Dismiss reconditioning dialog' });

        await expect(close.querySelector('svg')).toBeInTheDocument();
        await userEvent.click(close);
        await expectClosed(context);
        await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
    },
};

/** Frame 8938:19311. Content is full-bleed (title inset 24px, footer 12px). Gaps: 24px above, 32px below. */
export const WithContent: Story = {
    args: { rows: 3, title: 'Set the target moisture', descriptor: 'Applies to every bin in the current cycle.' },
    parameters: { design: { type: 'figma', url: `${FIGMA}8938-19311` } },
    play: async (context) => {
        const dialog = within(await openSheet(context));
        await expect(dialog.getByText('Bin 14')).toBeVisible();
        await context.userEvent.keyboard('{Escape}');
        await expectClosed(context);
    },
};

/** 40 rows past the 85dvh cap: title and footer stay pinned, only the list scrolls. */
export const ScrollingContent: Story = {
    args: { rows: 40, title: 'Pick a bin', descriptor: 'The title and the buttons stay put; the list scrolls.' },
    play: async (context) => {
        const dialog = await openSheet(context);
        const viewportHeight = canvasHeight(context.canvasElement);

        await waitFor(() => {
            return expect(dialog.getBoundingClientRect().height).toBeLessThanOrEqual(viewportHeight * 0.85 + 1);
        });
        await expect(within(dialog).getByRole('button', { name: 'Stop' })).toBeVisible();
    },
};

function canvasHeight(canvasElement: HTMLElement) {
    return canvasElement.ownerDocument.defaultView?.innerHeight ?? 0;
}

/** Long title and descriptor wrap, both centred, as drawn. */
export const LongText: Story = {
    args: {
        footer: false,
        title: 'Stop reconditioning mode on bin 14 before the cycle completes?',
        descriptor:
            'The fans will shut down within a minute, the current cycle will not resume, and the grain will hold ' +
            'at its present moisture until reconditioning is started again.',
    },
};

/**
 * Footerless (frame 11089:139884): dismissal is Escape, outside press or swipe. The 34px home-indicator block
 * stays as bottom padding; its pill hides above `md:`.
 */
export const Footerless: Story = {
    args: { footer: false },
    parameters: { design: { type: 'figma', url: `${FIGMA}11089-139884` } },
};

/** Dev-only guard: no `Title` → `console.error`, and the sheet still renders. */
export const MissingTitle: Story = {
    args: { title: undefined },
    // The unnamed dialog is the point of this story.
    parameters: { a11y: { test: 'todo' } },
    play: async (context) => {
        const dialog = await openSheet(context);
        await expect(dialog).toBeInTheDocument();
        await waitFor(() => {
            return expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('BottomSheet.Popup'));
        });
        await context.userEvent.keyboard('{Escape}');
        await expectClosed(context);
    },
};
