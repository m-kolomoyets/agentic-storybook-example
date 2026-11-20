import preview from '#.storybook/preview';
import { expect, fn, waitFor } from 'storybook/test';
import { Banner } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const LABEL = 'Rain is forecast for today.';
const DESCRIPTOR = 'Check your aeration settings before the front arrives.';

const OFFLINE_LABEL = 'All fans are offline';
const OFFLINE_DESCRIPTOR = 'Fans are unreachable. Check connections and run diagnostics to restore operation';

function fanItems(onClick: () => void) {
    return [1, 2, 3].map((fan) => {
        return (
            <Banner.Item
                action={{ label: `Run Diagnostics on Fan ${fan}`, onClick }}
                descriptor="Check the fan to restore operation."
                key={fan}
                label={`Fan ${fan} is offline`}
            />
        );
    });
}

const meta = preview.meta({
    title: 'UI/Banner',
    component: Banner,
    args: {
        status: 'default',
        orientation: 'horizontal',
        label: LABEL,
        descriptor: DESCRIPTOR,
    },
    argTypes: {
        status: { control: 'inline-radio', options: ['default', 'negative', 'warning', 'neutral'] },
        orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
        role: { control: 'select', options: [undefined, 'status', 'alert'] },
        icon: { control: false },
        children: { control: false },
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
    parameters: { design: { type: 'figma', url: `${FIGMA}8357-8017` } },
});

/** Playground — switch status/orientation/role in Controls. Every visual cell lives in `Matrix`. */
export const Default = meta.story();

/** Standing advisory: no role by default, so it does not interrupt on load. Gradient edge on `default` only. */
Default.test('has no role by default and says nothing before the label', async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByRole('status')).toBeNull();
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(canvasElement.querySelector('[role]')).toBeNull();
    // `default` says nothing extra before the label.
    await expect(canvas.getByText(LABEL).textContent).toBe(LABEL);
});

/** Severity is said in words (sr-only "Error: "), not only by the fill (WCAG 1.4.1). `role` is forwarded verbatim. */
Default.test(
    'negative alert says "Error:" in sr-only text',
    { args: { status: 'negative', role: 'alert' } },
    async ({ canvas }) => {
        await expect(canvas.getByRole('alert')).toHaveTextContent(`Error: ${LABEL}`);
        await expect(canvas.getByText('Error:')).toHaveClass('sr-only');
    }
);

Default.test('warning status says "Warning:"', { args: { status: 'warning', role: 'status' } }, async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(`Warning: ${LABEL}`);
});

/** `neutral`: the grey `Updating` card, a command in flight. A plain advisory like `default`. */
Default.test(
    'neutral adds no severity prefix',
    { args: { status: 'neutral', role: 'status', label: 'Updating fan schedule…', descriptor: undefined } },
    async ({ canvas }) => {
        await expect(canvas.getByRole('status').textContent?.startsWith('Updating')).toBe(true);
    }
);

/**
 * Horizontal: `sm` buttons in the header, primary first. Clicks stop propagating — a banner is dropped
 * into pages it knows nothing about.
 */
Default.test(
    'horizontal actions: primary first, clicks do not reach the page',
    {
        args: {
            primaryAction: { label: 'Clear and Restart', onClick: fn() },
            secondaryAction: { label: 'Run Diagnostics', onClick: fn() },
        },
    },
    async ({ canvas, canvasElement, args, userEvent }) => {
        // A page-level click listener: actions must not reach it.
        const onHostClick = fn();
        const host = canvasElement.ownerDocument.body;
        host.addEventListener('click', onHostClick);
        const [first, second] = canvas.getAllByRole('button');
        await expect(first).toHaveTextContent('Clear and Restart');
        await expect(second).toHaveTextContent('Run Diagnostics');
        await userEvent.click(first);
        await userEvent.click(second);
        await expect(args.primaryAction?.onClick).toHaveBeenCalledOnce();
        await expect(args.secondaryAction?.onClick).toHaveBeenCalledOnce();
        host.removeEventListener('click', onHostClick);
        await expect(onHostClick).not.toHaveBeenCalled();
    }
);

/** Vertical: full-width `md` pair below the text, different inline padding (as drawn). */
Default.test(
    'vertical actions: a loading action refuses activation',
    {
        args: {
            orientation: 'vertical',
            status: 'negative',
            primaryAction: { label: 'Clear and Restart', onClick: fn() },
            secondaryAction: { label: 'Run Diagnostics', onClick: fn(), loading: true },
        },
    },
    async ({ canvas, args, userEvent }) => {
        const busy = canvas.getByRole('button', { name: 'Run Diagnostics' });
        await expect(busy).toHaveAttribute('aria-busy', 'true');
        await userEvent.click(busy);
        await expect(args.secondaryAction?.onClick).not.toHaveBeenCalled();
        await userEvent.click(canvas.getByRole('button', { name: 'Clear and Restart' }));
        await expect(args.primaryAction?.onClick).toHaveBeenCalledOnce();
    }
);

/** A disabled action stays so the card still names the fix, but is inert. */
Default.test(
    'a disabled action stays but is inert',
    { args: { primaryAction: { label: 'Clear and Restart', onClick: fn(), disabled: true } } },
    async ({ canvas, args }) => {
        const button = canvas.getByRole('button', { name: 'Clear and Restart' });
        await expect(button).toBeDisabled();
        await expect(args.primaryAction?.onClick).not.toHaveBeenCalled();
    }
);

/** Leading glyph (Figma `showAiIcon`) in its own column; decorative. */
Default.test(
    'leading icon renders decoratively',
    { args: { icon: <span aria-hidden="true">✦</span> } },
    async ({ canvas }) => {
        await expect(canvas.getByText('✦')).toHaveAttribute('aria-hidden', 'true');
    }
);

/**
 * `Banner.Item` children make the header a disclosure trigger (Figma 11046:248194). The chevron is
 * decoration; Base UI puts the state on the trigger. Top-level actions stay while open (WCAG 3.2.2).
 */
export const Collapsible = meta.story({
    args: {
        orientation: 'vertical',
        status: 'negative',
        label: OFFLINE_LABEL,
        descriptor: OFFLINE_DESCRIPTOR,
        onOpenChange: fn(),
        primaryAction: { label: 'Run All Diagnostics', onClick: fn() },
    },
    render: function Collapsible(args) {
        return <Banner {...args}>{fanItems(args.primaryAction?.onClick ?? (() => {}))}</Banner>;
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}11046-248194` } },
});

Collapsible.test(
    'header toggles the items; actions stay while open',
    async ({ canvas, canvasElement, args, userEvent }) => {
        const trigger = canvas.getByRole('button', { name: `Error: ${OFFLINE_LABEL} ${OFFLINE_DESCRIPTOR}` });
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await expect(canvasElement.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
        await expect(canvas.queryByText('Fan 1 is offline')).toBeNull();

        await userEvent.click(trigger);
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await expect(args.onOpenChange).toHaveBeenCalledWith(true, expect.anything());
        await waitFor(() => {
            return expect(canvas.getByText('Fan 1 is offline')).toBeVisible();
        });
        await expect(canvas.getByRole('button', { name: 'Run All Diagnostics' })).toBeVisible();

        await userEvent.click(canvas.getByRole('button', { name: 'Run Diagnostics on Fan 2' }));
        await expect(args.primaryAction?.onClick).toHaveBeenCalledOnce();
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    }
);

/** `defaultOpen` — the drawn open cell. */
Collapsible.test(
    'defaultOpen starts expanded',
    {
        args: {
            status: 'warning',
            defaultOpen: true,
            descriptor: undefined,
            primaryAction: undefined,
        },
    },
    async ({ canvas }) => {
        await expect(canvas.getByRole('button', { expanded: true })).toBeInTheDocument();
        await expect(canvas.getByText('Fan 3 is offline')).toBeVisible();
    }
);

/** Every status × orientation, for review against Figma. */
export const Matrix = meta.story({
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-l">
                {(['default', 'negative', 'warning', 'neutral'] as const).map((status) => {
                    return (['horizontal', 'vertical'] as const).map((orientation) => {
                        return (
                            <Banner
                                key={`${status}-${orientation}`}
                                status={status}
                                orientation={orientation}
                                label={`${status} · ${orientation}`}
                                descriptor={DESCRIPTOR}
                                primaryAction={{ label: 'Fix', onClick: () => {} }}
                                secondaryAction={
                                    orientation === 'vertical' ? { label: 'Dismiss', onClick: () => {} } : undefined
                                }
                            />
                        );
                    });
                })}
            </div>
        );
    },
});
