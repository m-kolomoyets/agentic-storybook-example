import type { MockInstance } from 'storybook/test';
import type { TooltipContentProps } from './types';
import preview from '#.storybook/preview';
import { userEvent as baseUserEvent, expect, fn, spyOn, waitFor, within } from 'storybook/test';
import { Tooltip } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const TITLE = 'Cooling Potential';
const DESCRIPTOR = 'Measures how effectively the system circulates air to support cooling performance';

/* Story scaffolding: Figma draws no trigger. */
const TRIGGER_CLASSES =
    'rounded-s border border-border-primary bg-surface-control px-l py-s text-body-m text-text-general-strong';

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

type StoryArgs = TooltipContentProps & { onOpenChange?: (open: boolean) => void; disabled?: boolean };

const meta = preview.meta({
    title: 'UI/Tooltip',
    component: Tooltip.Content,
    args: { side: 'top', align: 'center', children: null },
    argTypes: {
        side: { control: 'inline-radio', options: ['top', 'right', 'bottom', 'left'] },
        align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
        children: { control: false },
    },
    beforeEach: spyOnConsoleError,
    render: function Default({ onOpenChange, disabled, ...content }: StoryArgs) {
        return (
            <Tooltip.Root onOpenChange={onOpenChange} disabled={disabled}>
                <Tooltip.Trigger
                    className={TRIGGER_CLASSES}
                    render={<button type="button" aria-label={`${TITLE}. ${DESCRIPTOR}`} />}
                >
                    Cooling potential
                </Tooltip.Trigger>
                <Tooltip.Content {...content}>
                    <Tooltip.Title>{TITLE}</Tooltip.Title>
                    <Tooltip.Descriptor>{DESCRIPTOR}</Tooltip.Descriptor>
                </Tooltip.Content>
            </Tooltip.Root>
        );
    },
    decorators: [
        function Stage(Story) {
            return (
                <div className="flex min-h-[16rem] items-center justify-center text-body-m text-text-general-strong">
                    <Story />
                </div>
            );
        },
    ],
    parameters: { design: { type: 'figma', url: `${FIGMA}11246-6661` } },
});

/** Controlled `open`, as a coach mark would drive it. */
function Open({ onOpenChange: _onOpenChange, disabled: _disabled, ...content }: StoryArgs) {
    return (
        <Tooltip.Root open>
            <Tooltip.Trigger className={TRIGGER_CLASSES}>Cooling potential</Tooltip.Trigger>
            <Tooltip.Content {...content}>
                <Tooltip.Title>{TITLE}</Tooltip.Title>
                <Tooltip.Descriptor>{DESCRIPTOR}</Tooltip.Descriptor>
            </Tooltip.Content>
        </Tooltip.Root>
    );
}

/** Any element via `render`; a link takes focus and opens the card. */
function LinkTrigger() {
    return (
        <Tooltip.Root>
            <Tooltip.Trigger render={<a href="#cooling" className="underline" aria-label="Cooling" />}>
                Cooling
            </Tooltip.Trigger>
            <Tooltip.Content>
                <Tooltip.Title>{TITLE}</Tooltip.Title>
            </Tooltip.Content>
        </Tooltip.Root>
    );
}

/** Dev guards: a `<span>` trigger cannot take focus; an icon-only trigger has no name; an empty card. */
function DevGuards() {
    return (
        <div className="flex gap-xl">
            <Tooltip.Root>
                <Tooltip.Trigger render={<span />}>A span</Tooltip.Trigger>
                <Tooltip.Content>
                    <Tooltip.Title>{TITLE}</Tooltip.Title>
                </Tooltip.Content>
            </Tooltip.Root>
            <Tooltip.Root>
                <Tooltip.Trigger className={TRIGGER_CLASSES}>
                    <svg aria-hidden className="size-l" />
                </Tooltip.Trigger>
                <Tooltip.Content>
                    <Tooltip.Title>{TITLE}</Tooltip.Title>
                </Tooltip.Content>
            </Tooltip.Root>
            <Tooltip.Root open>
                <Tooltip.Trigger className={TRIGGER_CLASSES}>Empty card</Tooltip.Trigger>
                <Tooltip.Content>{null}</Tooltip.Content>
            </Tooltip.Root>
        </div>
    );
}

/** Playground — focus or hover the trigger; switch side/align in Controls. */
export const Default = meta.story({
    args: { onOpenChange: fn() },
});

/** Keyboard focus opens instantly; Escape closes (WCAG 1.4.13). The card is not wired to the trigger. */
Default.test(
    'focus opens instantly; Escape closes; trigger is not described by the card',
    async ({ canvas, canvasElement, userEvent, args }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.tab();
        await waitFor(() => {
            return expect(body.getByText(TITLE)).toBeVisible();
        });
        await expect(body.getByText(DESCRIPTOR)).toBeVisible();
        await expect(args.onOpenChange).toHaveBeenCalledWith(true, expect.anything());

        const trigger = canvas.getByRole('button');
        await expect(trigger).toHaveFocus();
        await expect(trigger).not.toHaveAttribute('aria-describedby');
        await expect(trigger).toHaveAccessibleName(`${TITLE}. ${DESCRIPTOR}`);
        await expect(body.queryByRole('tooltip')).toBeNull();

        await userEvent.keyboard('{Escape}');
        await waitFor(() => {
            return expect(body.queryByText(TITLE)).toBeNull();
        });
        await expect(args.onOpenChange).toHaveBeenLastCalledWith(false, expect.anything());
        await expect(consoleError).not.toHaveBeenCalled();
    }
);

/** Hover opens after Base UI's 600ms delay, and the pointer can travel into the card without closing it. */
Default.test(
    'hover opens after a delay; the pointer can enter the card',
    async ({ canvas, canvasElement, userEvent }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.hover(canvas.getByRole('button'));
        await waitFor(
            () => {
                return expect(body.getByText(TITLE)).toBeVisible();
            },
            { timeout: 2000 }
        );
        // Floating UI's safe-polygon blocks pointer events mid-travel; a real pointer still lands in the card.
        await baseUserEvent.setup({ pointerEventsCheck: 0 }).hover(body.getByText(TITLE));
        await new Promise((resolve) => {
            setTimeout(resolve, 300);
        });
        await expect(body.getByText(TITLE)).toBeVisible();
    }
);

/** `disabled` stops it opening without disabling the trigger. */
Default.test(
    'disabled never opens but the trigger stays focusable',
    { args: { disabled: true } },
    async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.tab();
        await expect(canvas.getByRole('button')).toHaveFocus();
        await new Promise((resolve) => {
            setTimeout(resolve, 200);
        });
        await expect(within(canvasElement.ownerDocument.body).queryByText(TITLE)).toBeNull();
    }
);

Default.test('controlled open card: 8px radius, 280px cap', { render: Open }, async ({ canvasElement }) => {
    const title = await within(canvasElement.ownerDocument.body).findByText(TITLE);
    const card = title.parentElement!;
    await expect(getComputedStyle(card).borderRadius).toBe('8px');
    await expect(card.getBoundingClientRect().width).toBeLessThanOrEqual(280);
});

Default.test(
    'a link trigger takes focus and opens the card',
    { render: LinkTrigger },
    async ({ canvas, canvasElement, userEvent }) => {
        const link = canvas.getByRole('link', { name: 'Cooling' });
        await userEvent.tab();
        await expect(await within(canvasElement.ownerDocument.body).findByText(TITLE)).toBeInTheDocument();
        await expect(link).toHaveFocus();
    }
);

Default.test(
    'dev guards warn on an unfocusable, unnamed or empty tooltip',
    {
        render: DevGuards,
        // button-name off: the unnamed icon-only trigger is the deliberate mistake under test.
        parameters: { a11y: { config: { rules: [{ id: 'button-name', enabled: false }] } } },
    },
    async () => {
        // Guards are dev-only: a production build (Chromatic) strips them.
        if (!import.meta.env.DEV) {
            return;
        }
        await waitFor(() => {
            return expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('cannot take focus'));
        });
        await expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('no accessible name'));
        await expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('neither <Tooltip.Title>'));
    }
);

/** No placement is drawn; Base UI flips on collision. */
export const Placements = meta.story({
    render: function Placements() {
        return (
            <div className="flex flex-wrap items-center justify-center gap-xl">
                {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
                    return (
                        <Tooltip.Root key={side} open>
                            <Tooltip.Trigger className={TRIGGER_CLASSES}>{side}</Tooltip.Trigger>
                            <Tooltip.Content side={side}>
                                <Tooltip.Title>{side}</Tooltip.Title>
                            </Tooltip.Content>
                        </Tooltip.Root>
                    );
                })}
            </div>
        );
    },
    decorators: [
        function Roomy(Story) {
            return (
                <div className="p-8xl">
                    <Story />
                </div>
            );
        },
    ],
});

/** 280px is a cap: a title-only card hugs; long copy wraps; rich `ReactNode` content is fine. */
export const Content = meta.story({
    render: function Content() {
        return (
            <div className="flex items-start gap-8xl pt-8xl">
                <Tooltip.Root open>
                    <Tooltip.Trigger className={TRIGGER_CLASSES}>Short</Tooltip.Trigger>
                    <Tooltip.Content>
                        <Tooltip.Title>Fan on</Tooltip.Title>
                    </Tooltip.Content>
                </Tooltip.Root>
                <Tooltip.Root open>
                    <Tooltip.Trigger className={TRIGGER_CLASSES}>Rich</Tooltip.Trigger>
                    <Tooltip.Content side="bottom">
                        <Tooltip.Title>
                            <span className="flex items-center gap-s">
                                <span
                                    aria-hidden
                                    className="size-m rounded-full bg-surface-datavis-dotindicator-positive"
                                />
                                {TITLE}
                            </span>
                        </Tooltip.Title>
                        <Tooltip.Descriptor>
                            Currently <strong className="text-text-general-strong">high</strong> — {DESCRIPTOR}.
                        </Tooltip.Descriptor>
                    </Tooltip.Content>
                </Tooltip.Root>
            </div>
        );
    },
});

Content.test('a title-only card hugs its content', async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const short = (await body.findByText('Fan on')).parentElement!;
    await expect(short.getBoundingClientRect().width).toBeLessThan(200);
    await expect(consoleError).not.toHaveBeenCalled();
});
