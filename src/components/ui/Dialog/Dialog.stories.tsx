import type { StoryContext } from '@storybook/react-vite';
import type { MockInstance } from 'storybook/test';
import { useState } from 'react';
import preview from '#.storybook/preview';
import { expect, fn, spyOn, waitFor, within } from 'storybook/test';
import { Button } from '@/components/ui/Button';
import { Dialog } from '.';

/* The drawn dialog lives in the `UI Layouts` file (one loose instance, no component set). */
const FIGMA_LAYOUTS = 'https://www.figma.com/design/SWvndmde1arVFyaeGPccpK/Amber-Agriculture---UI-Layouts?node-id=';

const TRIGGER = 'Open the dialog';
const TITLE = 'Discard changes?';
const DESCRIPTOR = 'Your current changes will be lost if you update the grain level.';

const MOBILE = { viewport: { value: 'mobile2', isRotated: false } };

type StoryArgs = {
    title?: string;
    descriptor?: string;
    /** Rows in `Content`; 0 renders no `Content`. */
    rows: number;
    /** Footer buttons: 0, 1 (Done) or 2 (Cancel + Continue). */
    buttons: 0 | 1 | 2;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

let consoleError: MockInstance<typeof console.error>;

/** Silences and records `console.error` so the dev-only guards can be asserted. */
function spyOnConsoleError() {
    consoleError = spyOn(console, 'error').mockImplementation(() => {
        return undefined;
    });
    return () => {
        consoleError.mockRestore();
    };
}

/* Local `open` state: the dialog is controlled-only and has no trigger part. */
function Demo({ title, descriptor, rows, buttons, onOpenChange, onConfirm }: StoryArgs) {
    const [open, setOpen] = useState(false);

    function handleOpenChange(next: boolean) {
        setOpen(next);
        onOpenChange(next);
    }

    function close() {
        handleOpenChange(false);
    }

    function handleConfirm() {
        onConfirm();
        close();
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
            <Dialog.Root open={open} onOpenChange={handleOpenChange}>
                <Dialog.Popup>
                    {title === undefined ? null : <Dialog.Title>{title}</Dialog.Title>}
                    {descriptor === undefined ? null : <Dialog.Descriptor>{descriptor}</Dialog.Descriptor>}
                    {rows > 0 ? (
                        <Dialog.Content>
                            <ul className="flex flex-col gap-m">
                                {Array.from({ length: rows }, (_, index) => {
                                    return (
                                        <li key={index} className="text-body-m text-text-general-strong">
                                            Bin {index + 1} · 14.{index % 10}% moisture
                                        </li>
                                    );
                                })}
                            </ul>
                        </Dialog.Content>
                    ) : null}
                    {buttons > 0 ? (
                        <Dialog.Footer>
                            {buttons === 2 ? (
                                <Button variant="secondary" fullWidth onClick={close}>
                                    Cancel
                                </Button>
                            ) : null}
                            <Button
                                variant={buttons === 2 ? 'destructive' : 'primary'}
                                fullWidth
                                onClick={handleConfirm}
                            >
                                {buttons === 2 ? 'Continue' : 'Done'}
                            </Button>
                        </Dialog.Footer>
                    ) : null}
                </Dialog.Popup>
            </Dialog.Root>
        </div>
    );
}

const meta = preview.meta({
    title: 'UI/Dialog',
    component: Demo,
    args: {
        title: TITLE,
        descriptor: DESCRIPTOR,
        rows: 0,
        buttons: 2,
        onOpenChange: fn(),
        onConfirm: fn(),
    },
    argTypes: {
        rows: { control: { type: 'range', min: 0, max: 40 } },
        buttons: { control: 'inline-radio', options: [0, 1, 2] },
    },
    beforeEach: spyOnConsoleError,
    // Desktop by default (vitest's 1200×900); `*OnMobile` stories pin a phone viewport for the sheet branch.
    parameters: {
        layout: 'fullscreen',
        design: [
            { name: 'Dialog', type: 'figma', url: `${FIGMA_LAYOUTS}11555-437944` },
            { name: 'With content', type: 'figma', url: `${FIGMA_LAYOUTS}11555-437960` },
        ],
    },
});

type PlayContext = Pick<StoryContext, 'canvas' | 'canvasElement' | 'userEvent'>;

async function openDialog({ canvas, canvasElement, userEvent }: PlayContext) {
    await userEvent.click(canvas.getByRole('button', { name: TRIGGER }));
    return within(canvasElement.ownerDocument.body).findByRole('dialog');
}

async function expectClosed({ canvasElement }: PlayContext) {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => {
        return expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    });
}

/** Base UI locks scroll on `<html>` or `<body>` depending on the scrollbar; either counts. */
function isScrollLocked(document: Document) {
    return [document.documentElement, document.body].some((element) => {
        return getComputedStyle(element).overflowY === 'hidden';
    });
}

/** Title, descriptor and buttons stay pinned while the rows scroll. */
const WITH_CONTENT = {
    rows: 30,
    buttons: 2,
    title: 'Update grain level',
    descriptor: 'Pick the bin this ticket applies to.',
} as const;

async function expectFooterPinned(context: PlayContext) {
    const dialog = await openDialog(context);
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });

    await waitFor(() => {
        return expect(cancel).toBeVisible();
    });
    await expect(cancel.getBoundingClientRect().bottom).toBeLessThanOrEqual(dialog.getBoundingClientRect().bottom);
    await context.userEvent.click(cancel);
    await expectClosed(context);
}

/**
 * Drawn frame: centred panel, named and described, labelled ✕ the caller never composes. Modal: focus trap,
 * inert page, scroll lock. The footer buttons are the caller's. Rows/buttons are Controls.
 */
export const Default = meta.story();

Default.test('named, described, modal; Continue confirms and closes', async (context) => {
    const { canvasElement, userEvent, args } = context;
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await openDialog(context);

    await expect(dialog).toHaveAccessibleName(TITLE);
    await expect(dialog).toHaveAttribute('aria-labelledby', body.getByRole('heading', { name: TITLE }).id);
    await expect(dialog).toHaveAccessibleDescription(DESCRIPTOR);
    await expect(dialog).toHaveAttribute('aria-describedby', body.getByText(DESCRIPTOR).id);
    await expect(dialog).toContainElement(body.getByRole('button', { name: 'Close dialog' }));
    // Desktop branch: no sheet chrome.
    await expect(dialog.querySelector('[data-home-indicator]')).toBeNull();
    await waitFor(() => {
        return expect(dialog.contains(canvasElement.ownerDocument.activeElement)).toBe(true);
    });
    await expect(body.queryByRole('button', { name: TRIGGER })).toBeNull();
    await expect(isScrollLocked(canvasElement.ownerDocument)).toBe(true);
    await expect(consoleError).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    await expect(args.onConfirm).toHaveBeenCalledOnce();
    await expectClosed(context);
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
});

Default.test('with content the footer stays pinned while rows scroll', { args: WITH_CONTENT }, expectFooterPinned);

/**
 * Escape, the backdrop and the ✕ — with no footer, these are the whole exit. `disablePointerDismissal` is not
 * exposed: a surface that refuses to close is an `alertdialog`. Focus returns to the trigger.
 */
Default.test(
    'Escape and the ✕ close it; focus returns to the trigger',
    { args: { buttons: 0, title: 'Three ways out', descriptor: 'Escape, the backdrop and the close button.' } },
    async (context) => {
        const { canvas, canvasElement, userEvent } = context;
        const body = within(canvasElement.ownerDocument.body);

        await openDialog(context);
        await userEvent.keyboard('{Escape}');
        await expectClosed(context);
        await waitFor(() => {
            return expect(canvas.getByRole('button', { name: TRIGGER })).toHaveFocus();
        });

        await openDialog(context);
        await userEvent.click(body.getByRole('button', { name: 'Close dialog' }));
        await expectClosed(context);
    }
);

/** Dev-only guard: no `Title` → `console.error`, and the dialog still renders. */
Default.test(
    'missing Title logs a dev error and still renders',
    {
        args: { title: undefined },
        // aria-dialog-name off: the unnamed dialog is the point of this test.
        parameters: { a11y: { config: { rules: [{ id: 'aria-dialog-name', enabled: false }] } } },
    },
    async (context) => {
        await expect(await openDialog(context)).toBeInTheDocument();
        // Guard is dev-only: a production build (Chromatic) strips it.
        if (import.meta.env.DEV) {
            await waitFor(() => {
                return expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('<Dialog.Title>'));
            });
        }
        await context.userEvent.keyboard('{Escape}');
        await expectClosed(context);
    }
);

/** Dev-only guard: no `Descriptor` → `console.error` (every drawn dialog has one). */
Default.test('missing Descriptor logs a dev error', { args: { descriptor: undefined } }, async (context) => {
    await expect(await openDialog(context)).toBeInTheDocument();
    // Guard is dev-only: a production build (Chromatic) strips it.
    if (import.meta.env.DEV) {
        await waitFor(() => {
            return expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('<Dialog.Descriptor>'));
        });
    }
    await expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('<Dialog.Title>'));
    await context.userEvent.keyboard('{Escape}');
    await expectClosed(context);
});

/** Below `md:` the same composition is a `BottomSheet`: same name and description, sheet chrome, ✕ kept. */
export const DefaultOnMobile = meta.story({
    globals: MOBILE,
});

DefaultOnMobile.test('sheet branch keeps name, description and the ✕', async (context) => {
    const { canvasElement, userEvent, args } = context;
    const dialog = await openDialog(context);

    await expect(dialog).toHaveAccessibleName(TITLE);
    await expect(dialog).toHaveAccessibleDescription(DESCRIPTOR);
    await expect(dialog.querySelector('[data-home-indicator]')).toBeInTheDocument();
    await expect(consoleError).not.toHaveBeenCalled();

    await userEvent.click(within(canvasElement.ownerDocument.body).getByRole('button', { name: 'Close dialog' }));
    await expectClosed(context);
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
});

/** Sheet branch with scrolling content: the scrolled box takes the sheet's `px-l` gutter. */
DefaultOnMobile.test('with content the footer stays pinned in the sheet', { args: WITH_CONTENT }, expectFooterPinned);
