import type { StoryContext } from '@storybook/react-vite';
import type { MockInstance } from 'storybook/test';
import { useState } from 'react';
import preview from '#.storybook/preview';
import { expect, fn, spyOn, waitFor, within } from 'storybook/test';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { SidePanel } from '.';

/* The drawn panel lives in the `UI Layouts` file, not the kit. */
const FIGMA_LAYOUTS = 'https://www.figma.com/design/SWvndmde1arVFyaeGPccpK/Amber-Agriculture---UI-Layouts?node-id=';

const TRIGGER = 'Open the panel';
const TITLE = 'Customize Dashboard';
const DESCRIPTOR = 'Turn sections on or off and reorder them';

const SECTIONS = ['Fan Controls', 'Bin Simulation', 'Weather Forecast', 'Airspace', 'Inventory Level', 'System Events'];

type StoryArgs = {
    title?: string;
    descriptor?: string;
    rows: number;
    footer: boolean;
    onOpenChange: (open: boolean) => void;
    onDone: () => void;
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

function Row({ label }: { label: string }) {
    return (
        <label className="flex h-7xl w-full items-center gap-l px-3xl">
            <span className="flex-1 text-body-m text-text-general-strong">{label}</span>
            <Toggle defaultChecked />
        </label>
    );
}

/* Local `open` state: the panel is controlled-only and has no trigger part. */
function Demo({ title, descriptor, rows, footer, onOpenChange, onDone }: StoryArgs) {
    const [open, setOpen] = useState(false);

    function handleOpenChange(next: boolean) {
        setOpen(next);
        onOpenChange(next);
    }

    function handleDone() {
        onDone();
        handleOpenChange(false);
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
            <SidePanel.Root open={open} onOpenChange={handleOpenChange}>
                <SidePanel.Popup>
                    {title === undefined ? null : <SidePanel.Title>{title}</SidePanel.Title>}
                    {descriptor === undefined ? null : <SidePanel.Descriptor>{descriptor}</SidePanel.Descriptor>}
                    {rows > 0 ? (
                        <SidePanel.Content>
                            {Array.from({ length: rows }, (_, index) => {
                                const section = SECTIONS[index % SECTIONS.length];
                                const label = index < SECTIONS.length ? section : `${section} ${index + 1}`;
                                return <Row key={label} label={label} />;
                            })}
                        </SidePanel.Content>
                    ) : null}
                    {footer ? (
                        <SidePanel.Footer>
                            <Button variant="secondary" size="md" disabled>
                                Reset Default View
                            </Button>
                            <Button size="md" onClick={handleDone}>
                                Done
                            </Button>
                        </SidePanel.Footer>
                    ) : null}
                </SidePanel.Popup>
            </SidePanel.Root>
        </div>
    );
}

const meta = preview.meta({
    title: 'UI/SidePanel',
    component: Demo,
    args: {
        title: TITLE,
        rows: SECTIONS.length,
        footer: true,
        onOpenChange: fn(),
        onDone: fn(),
    },
    argTypes: {
        rows: { control: { type: 'range', min: 0, max: 40 } },
    },
    beforeEach: spyOnConsoleError,
    // Desktop surface (callers switch to `BottomSheet` below `md:`); vitest's default viewport is 1200×900.
    parameters: { layout: 'fullscreen', design: { type: 'figma', url: `${FIGMA_LAYOUTS}11555-412884` } },
});

type PlayContext = Pick<StoryContext, 'canvas' | 'canvasElement' | 'userEvent'>;

async function openPanel({ canvas, canvasElement, userEvent }: PlayContext) {
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

/**
 * Drawn frame. Named by `Title`; the ✕ is unconditional (the footer has no Cancel). Modal: focus trap,
 * inert page, scroll lock. `Done` is the caller's close. Rows, footer and descriptor are Controls.
 */
export const Default = meta.story();

Default.test('named, modal; Done closes', async (context) => {
    const { canvasElement, userEvent, args } = context;
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await openPanel(context);

    await expect(dialog).toHaveAccessibleName(TITLE);
    await expect(dialog).toHaveAttribute('aria-labelledby', body.getByRole('heading', { name: TITLE }).id);
    await expect(dialog).toContainElement(body.getByRole('button', { name: 'Close panel' }));
    await waitFor(() => {
        return expect(dialog.contains(canvasElement.ownerDocument.activeElement)).toBe(true);
    });
    await expect(body.queryByRole('button', { name: TRIGGER })).toBeNull();
    await expect(isScrollLocked(canvasElement.ownerDocument)).toBe(true);
    await expect(consoleError).not.toHaveBeenCalled();
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(true);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }));
    await expect(args.onDone).toHaveBeenCalledOnce();
    await expectClosed(context);
});

/** Not drawn on desktop (the mobile sheet of the same feature has one). Optional, so not guarded. */
Default.test('an optional Descriptor describes it', { args: { descriptor: DESCRIPTOR } }, async (context) => {
    const dialog = await openPanel(context);
    await expect(dialog).toHaveAccessibleDescription(DESCRIPTOR);
    await context.userEvent.keyboard('{Escape}');
    await expectClosed(context);
});

/** Invented: only the list scrolls; title and footer stay put. */
Default.test('only the list scrolls; the footer stays inside', { args: { rows: 24 } }, async (context) => {
    const dialog = await openPanel(context);
    const done = within(dialog).getByRole('button', { name: 'Done' });

    // The footer stays inside the panel: the list absorbs the overflow.
    await waitFor(() => {
        return expect(done).toBeVisible();
    });
    await expect(done.getBoundingClientRect().bottom).toBeLessThanOrEqual(dialog.getBoundingClientRect().bottom);
});

/** Escape, an outside press and the ✕ each close it; none can be disabled. */
Default.test(
    'Escape and the ✕ close it',
    { args: { footer: false, rows: 1, title: 'No way out but the three' } },
    async (context) => {
        const { canvasElement, userEvent, args } = context;
        const body = within(canvasElement.ownerDocument.body);

        await openPanel(context);
        await userEvent.keyboard('{Escape}');
        await expectClosed(context);

        await openPanel(context);
        await userEvent.click(body.getByRole('button', { name: 'Close panel' }));
        await expectClosed(context);

        await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
    }
);

/** Dev-only guard: no `Title` → `console.error`, and the panel still renders. */
Default.test(
    'missing Title logs a dev error and still renders',
    {
        args: { title: undefined },
        // aria-dialog-name off: the unnamed dialog is the point of this test.
        parameters: { a11y: { config: { rules: [{ id: 'aria-dialog-name', enabled: false }] } } },
    },
    async (context) => {
        const dialog = await openPanel(context);
        await expect(dialog).toBeInTheDocument();
        // Guard is dev-only: a production build (Chromatic) strips it.
        if (import.meta.env.DEV) {
            await waitFor(() => {
                return expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('<SidePanel.Title>'));
            });
        }
        await context.userEvent.keyboard('{Escape}');
        await expectClosed(context);
    }
);
