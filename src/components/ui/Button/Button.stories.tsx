import type { ButtonProps, ButtonVariant } from './types';
import AddIcon from '@/assets/icons/add.svg?react';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg?react';
import PlayIcon from '@/assets/icons/play.svg?react';
import StarFourIcon from '@/assets/icons/star-four.svg?react';
import preview from '#.storybook/preview';
import { expect, fn } from 'storybook/test';
import { Button } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const VARIANTS: ButtonVariant[] = [
    'primary',
    'primary-on-surface',
    'secondary',
    'secondary-elevated',
    'destructive',
    'remote',
    'link-primary',
    'link-secondary',
    'link-tertiary',
];

/** Figma cell per variant — shown as tabs in the Design panel of `Matrix`. */
const VARIANT_NODES: Record<ButtonVariant, string> = {
    primary: '8696-12170',
    'primary-on-surface': '9642-177476',
    secondary: '8038-2005',
    'secondary-elevated': '12963-8280',
    destructive: '8274-18709',
    remote: '9263-22344',
    'link-primary': '8887-16205',
    'link-secondary': '9275-43776',
    'link-tertiary': '9315-49693',
};

const meta = preview.meta({
    title: 'UI/Button',
    component: Button,
    args: { children: 'Save', variant: 'primary', onClick: fn() },
    argTypes: {
        variant: { control: 'select', options: VARIANTS },
        size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
        loading: { control: 'boolean' },
        disabled: { control: 'boolean' },
        fullWidth: { control: 'boolean' },
        startIcon: { control: false },
        endIcon: { control: false },
        render: { control: false },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}8696-12170` } },
});

/** Playground — switch variant/size/state in Controls. Every visual cell lives in `Matrix`. */
export const Default = meta.story();

Default.test('is a type=button that calls onClick', async ({ canvas, args, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Save' });
    await expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
});

Default.test(
    'loading stays focusable, keeps its name, refuses activation, one spinner per slot',
    { args: { loading: true, startIcon: <PlayIcon />, endIcon: <ChevronDownIcon /> } },
    async ({ canvas, canvasElement, args, userEvent }) => {
        const button = canvas.getByRole('button', { name: 'Save' });
        await expect(button).not.toBeDisabled();
        await expect(button).toHaveAttribute('aria-busy', 'true');
        await expect(button).toHaveAttribute('data-loading', 'true');
        await expect(canvasElement.querySelectorAll('.animate-spin')).toHaveLength(2);
        await userEvent.tab();
        await expect(button).toHaveFocus();
        await userEvent.click(button);
        await expect(args.onClick).not.toHaveBeenCalled();
    }
);

Default.test(
    'loading without icons shows one leading spinner',
    { args: { loading: true } },
    async ({ canvasElement }) => {
        await expect(canvasElement.querySelectorAll('.animate-spin')).toHaveLength(1);
    }
);

Default.test('disabled leaves the tab order', { args: { disabled: true } }, async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Save' });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-disabled', 'true');
});

Default.test('caller-set aria-busy survives when not loading', { args: { 'aria-busy': true } }, async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-busy', 'true');
});

Default.test('remote is size-locked to 48px', { args: { variant: 'remote' } }, async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Save' })).toHaveClass('h-6xl');
});

Default.test('fullWidth stretches', { args: { fullWidth: true } }, async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Save' })).toHaveClass('w-full');
});

/** `render` swaps the element; `type`/`disabled` are held back and `aria-disabled` carries the state. */
export const AsLink = meta.story({
    // Content is supplied by Button through `useRender`.
    // eslint-disable-next-line jsx-a11y-x/anchor-has-content
    args: { render: <a href="#settings" />, variant: 'secondary', disabled: true, children: 'Settings' },
});

AsLink.test('disabled link keeps no button attrs and refuses activation', async ({ canvas, args, userEvent }) => {
    const link = canvas.getByRole('link', { name: 'Settings' });
    await expect(link).not.toHaveAttribute('disabled');
    await expect(link).not.toHaveAttribute('type');
    await expect(link).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(link);
    await expect(args.onClick).not.toHaveBeenCalled();
});

type StateName = 'default' | 'hover' | 'focused' | 'pressed' | 'loading' | 'disabled';

const STATES: StateName[] = ['default', 'hover', 'focused', 'pressed', 'loading', 'disabled'];

/* Pointer states can't be triggered statically, so they are pinned with the same tokens the cva cell uses. */
const FORCED: Record<ButtonVariant, Partial<Record<StateName, string>>> = {
    primary: {
        hover: 'bg-button-primary-hover',
        focused: 'bg-button-primary-focused inset-ring-1 inset-ring-border-focused',
        pressed: 'bg-button-primary-pressed',
    },
    'primary-on-surface': {
        hover: 'bg-button-primary-on-surface-hover',
        focused: 'bg-button-primary-on-surface-focused inset-ring-1 inset-ring-border-focused',
        pressed: 'bg-button-primary-on-surface-pressed',
    },
    secondary: {
        hover: 'bg-button-secondary-hover',
        focused: 'bg-button-secondary-focused inset-ring-border-focused',
        pressed: 'bg-button-secondary-pressed',
    },
    'secondary-elevated': {
        hover: 'bg-button-secondary-on-surface-hover',
        focused: 'bg-button-secondary-on-surface-focused inset-ring-border-focused',
        pressed: 'bg-button-secondary-on-surface-pressed',
    },
    destructive: {
        hover: 'bg-button-destructive-hover',
        focused: 'bg-button-destructive-focused inset-ring-1 inset-ring-border-focused',
        pressed: 'bg-button-destructive-pressed',
    },
    remote: {
        hover: 'bg-button-remote-hover',
        focused: 'bg-button-remote-focused inset-ring-border-focused',
        pressed: 'bg-button-remote-pressed',
    },
    'link-primary': {
        hover: 'text-text-link-primary-hover',
        focused: 'text-text-link-primary-focused inset-ring-1 inset-ring-border-focused',
        pressed: 'text-text-link-primary-pressed',
    },
    'link-secondary': {
        hover: 'text-text-link-secondary-hover',
        focused: 'text-text-link-secondary-focused inset-ring-1 inset-ring-border-focused',
        pressed: 'text-text-link-secondary-pressed',
    },
    'link-tertiary': {
        hover: 'text-text-link-tertiary-hover',
        focused: 'text-text-link-tertiary-focused inset-ring-1 inset-ring-border-focused',
        pressed: 'text-text-link-tertiary-pressed',
    },
};

type RowProps = ButtonProps & { label: string; onLight?: boolean };

function StateRow({ label, onLight = false, ...props }: RowProps) {
    const labelClassName = onLight ? 'text-text-on-surface-secondary' : 'text-text-general-medium';
    return (
        <>
            <span className={`text-caption-m ${labelClassName}`}>{label}</span>
            {STATES.map((state) => {
                return (
                    <Button
                        key={state}
                        {...props}
                        loading={state === 'loading'}
                        disabled={state === 'disabled'}
                        className={`justify-self-start ${FORCED[props.variant ?? 'primary'][state] ?? ''}`}
                    >
                        {state}
                    </Button>
                );
            })}
        </>
    );
}

const GRID = 'grid grid-cols-7 items-center gap-l';

/** Every legal variant × size × state cell, for review against Figma. Illegal cells don't typecheck. */
export const Matrix = meta.story({
    // Visual-regression target (visual/README.md). On a test-free story: `story.test()` children inherit tags.
    tags: ['vrt'],
    parameters: {
        layout: 'padded',
        design: VARIANTS.map((variant) => {
            return { name: variant, type: 'figma', url: `${FIGMA}${VARIANT_NODES[variant]}` };
        }),
        // The one billed Chromatic snapshot for Button (preview disables the rest).
        chromatic: { disableSnapshot: false },
        // color-contrast off: Figma-drawn white on `button-destructive-default` is 3.65:1 — design decision, tracked.
        a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
    },
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-xl">
                <div className={GRID}>
                    {(['primary', 'secondary', 'destructive'] as const).map((variant) => {
                        return (['lg', 'md', 'sm'] as const).map((size) => {
                            return (
                                <StateRow
                                    key={`${variant}-${size}`}
                                    label={`${variant} ${size}`}
                                    variant={variant}
                                    size={size}
                                />
                            );
                        });
                    })}
                    <StateRow label="remote" variant="remote" startIcon={<PlayIcon />} endIcon={<ChevronDownIcon />} />
                    <StateRow label="secondary-elevated" variant="secondary-elevated" startIcon={<AddIcon />} />
                    {(['link-primary', 'link-tertiary'] as const).map((variant) => {
                        return (['md', 'sm'] as const).map((size) => {
                            return (
                                <StateRow
                                    key={`${variant}-${size}`}
                                    label={`${variant} ${size}`}
                                    variant={variant}
                                    size={size}
                                />
                            );
                        });
                    })}
                </div>
                <div className={`${GRID} rounded-s bg-surface-tertiary p-l`}>
                    {(['primary-on-surface', 'link-secondary'] as const).map((variant) => {
                        return (['md', 'sm'] as const).map((size) => {
                            return (
                                <StateRow
                                    key={`${variant}-${size}`}
                                    label={`${variant} ${size}`}
                                    variant={variant}
                                    size={size}
                                    onLight
                                />
                            );
                        });
                    })}
                </div>
            </div>
        );
    },
});

/** Held to Figma `Size=Medium, State=Default` (8728:14523) by `pnpm vrt figma` — content mirrors the Figma cell. */
export const FigmaMdDefault = meta.story({
    tags: ['figma', '!autodocs'],
    args: { size: 'md', children: 'Generate Automations', startIcon: <StarFourIcon />, endIcon: <StarFourIcon /> },
    parameters: {
        design: { type: 'figma', url: `${FIGMA}8728-14523` },
        figmaRef: { url: `${FIGMA}8728-14523` },
    },
});
