import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MouseEventHandler } from 'react';
import type { SplitButtonProps } from './types';
import PlayIcon from '@/assets/icons/play.svg?react';
import StopIcon from '@/assets/icons/stop-circle.svg?react';
import { Popover } from '@base-ui/react/popover';
import { expect, fn, waitFor, within } from 'storybook/test';
import { SplitButton } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

type StoryArgs = SplitButtonProps & {
    onAction: MouseEventHandler<HTMLButtonElement>;
    onDisclose: MouseEventHandler<HTMLButtonElement>;
};

const meta = {
    title: 'UI/SplitButton',
    component: SplitButton,
    args: { loading: false, disabled: false, onAction: fn(), onDisclose: fn() },
    argTypes: {
        loading: { control: 'boolean' },
        disabled: { control: 'boolean' },
        onAction: { table: { disable: true } },
        onDisclose: { table: { disable: true } },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}9153-36710` } },
    render: function Pair({ onAction, onDisclose, ...args }) {
        return (
            <SplitButton {...args}>
                <SplitButton.Action startIcon={<PlayIcon />} onClick={onAction}>
                    Start
                </SplitButton.Action>
                <SplitButton.Disclosure value="15 min" onClick={onDisclose} />
            </SplitButton>
        );
    },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A `role="group"` holding two real buttons; the divider is hidden; no `render` → no `aria-haspopup`. */
export const Default: Story = {
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        await expect(canvas.getByRole('group')).toBeInTheDocument();
        await expect(canvas.getAllByRole('button')).toHaveLength(2);
        await expect(canvasElement.querySelectorAll('[aria-hidden="true"] > .w-px')).toHaveLength(1);

        const action = canvas.getByRole('button', { name: 'Start' });
        const disclosure = canvas.getByRole('button', { name: '15 min' });
        await expect(action).not.toHaveAttribute('aria-haspopup');
        await expect(disclosure).not.toHaveAttribute('aria-haspopup');
        await expect(action).toHaveAttribute('data-position', 'first');
        await expect(disclosure).toHaveAttribute('data-position', 'last');

        await userEvent.click(action);
        await expect(args.onAction).toHaveBeenCalledOnce();
        await expect(args.onDisclose).not.toHaveBeenCalled();
        await userEvent.click(disclosure);
        await expect(args.onDisclose).toHaveBeenCalledOnce();
    },
};

/** Figma `8885:21013`: both zones spin and refuse activation, yet stay focusable — not `disabled`. */
export const Loading: Story = {
    args: { loading: true },
    parameters: { design: { type: 'figma', url: `${FIGMA}8885-21013` } },
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        await expect(canvas.getByRole('group')).toHaveAttribute('aria-busy', 'true');
        const [action, disclosure] = canvas.getAllByRole('button');
        for (const zone of [action, disclosure]) {
            await expect(zone).not.toBeDisabled();
            await expect(zone).toHaveAttribute('aria-busy', 'true');
        }
        await expect(canvasElement.querySelectorAll('.animate-spin')).toHaveLength(2);

        await userEvent.tab();
        await expect(action).toHaveFocus();
        await userEvent.tab();
        await expect(disclosure).toHaveFocus();

        await userEvent.click(action);
        await userEvent.click(disclosure);
        await expect(args.onAction).not.toHaveBeenCalled();
        await expect(args.onDisclose).not.toHaveBeenCalled();
    },
};

/** Figma `9263:9015`: disabled fill, border and ink on both zones. */
export const Disabled: Story = {
    args: { disabled: true },
    parameters: { design: { type: 'figma', url: `${FIGMA}9263-9015` } },
    play: async ({ canvas, args }) => {
        for (const zone of canvas.getAllByRole('button')) {
            await expect(zone).toBeDisabled();
            await expect(zone).toHaveAttribute('aria-disabled', 'true');
        }
        await expect(args.onAction).not.toHaveBeenCalled();
    },
};

/** Popover state lives in the caller's `Popover.Root`; `render` earns `aria-haspopup`, caller names its kind. */
export const WithPopover: Story = {
    render: function WithPopover({ onAction, onDisclose, ...args }) {
        return (
            <Popover.Root>
                <SplitButton {...args}>
                    <SplitButton.Action startIcon={<PlayIcon />} onClick={onAction}>
                        Start
                    </SplitButton.Action>
                    <SplitButton.Disclosure
                        value="15 min"
                        aria-haspopup="dialog"
                        render={<Popover.Trigger />}
                        onClick={onDisclose}
                    />
                </SplitButton>
                <Popover.Portal>
                    <Popover.Positioner sideOffset={8}>
                        <Popover.Popup
                            aria-label="Run duration"
                            className="rounded-s bg-surface-ground p-m text-body-s text-text-general-strong inset-ring-1 inset-ring-border-primary"
                        >
                            15 min · 30 min · 60 min
                        </Popover.Popup>
                    </Popover.Positioner>
                </Popover.Portal>
            </Popover.Root>
        );
    },
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        const disclosure = canvas.getByRole('button', { name: '15 min' });
        await expect(disclosure).toHaveAttribute('aria-haspopup', 'dialog');
        await expect(canvas.getByRole('button', { name: 'Start' })).not.toHaveAttribute('aria-haspopup');

        await userEvent.click(disclosure);
        await expect(args.onDisclose).toHaveBeenCalledOnce();
        const body = within(canvasElement.ownerDocument.body);
        await waitFor(() => {
            return expect(body.getByRole('dialog')).toBeInTheDocument();
        });
        await expect(disclosure).toHaveAttribute('data-popup-open');
        await expect(disclosure).toHaveAttribute('data-position', 'last');
        await expect(args.onAction).not.toHaveBeenCalled();
    },
};

/** A `render` alone defaults `aria-haspopup` to `true`. */
export const RenderedDisclosure: Story = {
    render: function RenderedDisclosure({ onAction, onDisclose, ...args }) {
        return (
            <SplitButton {...args}>
                <SplitButton.Action onClick={onAction}>Start</SplitButton.Action>
                <SplitButton.Disclosure value="15 min" render={<button type="button" />} onClick={onDisclose} />
            </SplitButton>
        );
    },
    play: async ({ canvas, args, userEvent }) => {
        const disclosure = canvas.getByRole('button', { name: '15 min' });
        await expect(disclosure).toHaveAttribute('aria-haspopup', 'true');
        await userEvent.click(canvas.getByRole('button', { name: 'Start' }));
        await expect(args.onAction).toHaveBeenCalledOnce();
        await expect(args.onDisclose).not.toHaveBeenCalled();
    },
};

/** Two action zones (`Start │ Stop`); a disabled zone rendered as a link uses `aria-disabled`. */
export const LinkZone: Story = {
    args: { disabled: true },
    render: function LinkZone({ onAction, onDisclose, ...args }) {
        return (
            <SplitButton {...args}>
                {/* Content is supplied by the zone through `useRender`. */}
                {/* eslint-disable-next-line jsx-a11y-x/anchor-has-content */}
                <SplitButton.Action startIcon={<PlayIcon />} render={<a href="#start" />} onClick={onAction}>
                    Start
                </SplitButton.Action>
                <SplitButton.Action startIcon={<StopIcon />} onClick={onDisclose}>
                    Stop
                </SplitButton.Action>
            </SplitButton>
        );
    },
    play: async ({ canvas, args, userEvent }) => {
        const link = canvas.getByRole('link', { name: 'Start' });
        await expect(link).not.toHaveAttribute('disabled');
        await expect(link).toHaveAttribute('aria-disabled', 'true');
        await userEvent.click(link);
        await expect(args.onAction).not.toHaveBeenCalled();
        await expect(args.onDisclose).not.toHaveBeenCalled();
    },
};

type StateName = 'default' | 'hover' | 'focused' | 'pressed' | 'loading' | 'disabled';

const STATES: StateName[] = ['default', 'hover', 'focused', 'pressed', 'loading', 'disabled'];

/* Pointer states pinned per zone with the cva cell's tokens. */
const ZONE_FORCED: Partial<Record<StateName, string>> = {
    hover: 'bg-button-remote-hover',
    focused: 'bg-button-remote-focused border-border-focused',
    pressed: 'bg-button-remote-pressed',
};

/** Every state × highlighted zone: exactly one half changes on hover/press — the half under the pointer. */
export const Matrix: Story = {
    render: function Matrix() {
        return (
            <div className="grid grid-cols-3 items-center gap-l">
                <span className="text-caption-m text-text-general-medium">state \ zone</span>
                <span className="text-caption-m text-text-general-medium">action</span>
                <span className="text-caption-m text-text-general-medium">disclosure</span>
                {STATES.map((state) => {
                    return [
                        <span key={`${state}-label`} className="text-caption-m text-text-general-medium">
                            {state}
                        </span>,
                        ...(['action', 'disclosure'] as const).map((target) => {
                            return (
                                <SplitButton
                                    key={`${state}-${target}`}
                                    loading={state === 'loading'}
                                    disabled={state === 'disabled'}
                                >
                                    <SplitButton.Action
                                        startIcon={<PlayIcon />}
                                        className={target === 'action' ? ZONE_FORCED[state] : ''}
                                    >
                                        Start
                                    </SplitButton.Action>
                                    <SplitButton.Disclosure
                                        value="15 min"
                                        className={target === 'disclosure' ? ZONE_FORCED[state] : ''}
                                    />
                                </SplitButton>
                            );
                        }),
                    ];
                })}
            </div>
        );
    },
};
