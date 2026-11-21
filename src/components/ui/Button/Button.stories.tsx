import type { FigmaMatrixBlock, FigmaVariant } from '../../../../visual/figma/types';
import type { ButtonProps, ButtonSize, ButtonVariant } from './types';
import AddIcon from '@/assets/icons/add.svg?react';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg?react';
import PlayIcon from '@/assets/icons/play.svg?react';
import preview from '#.storybook/preview';
import { expect, fn } from 'storybook/test';
import { Button } from '.';
import { figmaContent, KitIcon } from '../../../../visual/figma/content';
import { FigmaMatrix as FigmaMatrixGrid } from '../../../../visual/figma/FigmaMatrix';
import { FIGMA_SETS } from '../../../../visual/figma/sets';

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

/*
 * Pointer states can't be triggered statically: `data-force` turns on the component's own `hover:` / `active:` /
 * `focus-visible:` classes, gates included (.storybook/preview.css), so no tokens are copied here.
 */
const FORCE: Partial<Record<StateName, string>> = { hover: 'hover', focused: 'focus-visible', pressed: 'active' };

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
                        data-force={FORCE[state]}
                        className="justify-self-start"
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

/** Figma `Size` / `State` → props. Pointer states use the `FORCE` attribute of `Matrix`. */
const FIGMA_SIZE: Record<string, ButtonSize> = { Big: 'lg', Medium: 'md', Small: 'sm' };
const FIGMA_STATE: Record<string, StateName> = {
    Default: 'default',
    Hover: 'hover',
    Focused: 'focused',
    Focus: 'focused',
    Pressed: 'pressed',
    Loading: 'loading',
    Disabled: 'disabled',
};
/** Code variants without a `size` prop (one size only), and those without `lg` (types.ts). */
const SIZELESS: ButtonVariant[] = ['remote', 'secondary-elevated'];
const NO_LG: ButtonVariant[] = ['primary-on-surface', 'link-primary', 'link-secondary', 'link-tertiary'];

const BY_SIZE = { sections: 'Size', columns: 'State' };
const LINK_HIT_TARGET = {
    reason: 'Links keep a 40/48px hit target (WCAG 2.5.8); Figma draws a 16–24px hug frame (utils/variants.ts).',
};
const FIGMA_BUTTONS: (FigmaMatrixBlock & { variant: ButtonVariant })[] = [
    { variant: 'primary', set: FIGMA_SETS.buttonPrimary, layout: BY_SIZE },
    {
        variant: 'primary-on-surface',
        set: FIGMA_SETS.buttonPrimaryOnSurface,
        layout: BY_SIZE,
        approved: [
            {
                when: { State: ['Focused', 'Loading'] },
                reason: 'Figma 9642:177476 draws no focus stroke and no spinner; both added (WCAG 2.4.7; double activation).',
            },
        ],
    },
    { variant: 'secondary', set: FIGMA_SETS.buttonSecondary, layout: BY_SIZE },
    {
        variant: 'secondary-elevated',
        set: FIGMA_SETS.buttonSecondaryElevated,
        layout: { sections: null, columns: 'State' },
    },
    { variant: 'destructive', set: FIGMA_SETS.buttonDestructive, layout: BY_SIZE },
    { variant: 'remote', set: FIGMA_SETS.buttonRemote, layout: { sections: null, columns: 'State' } },
    { variant: 'link-primary', set: FIGMA_SETS.buttonLinkPrimary, layout: BY_SIZE, approved: [LINK_HIT_TARGET] },
    { variant: 'link-secondary', set: FIGMA_SETS.buttonLinkSecondary, layout: BY_SIZE, approved: [LINK_HIT_TARGET] },
    { variant: 'link-tertiary', set: FIGMA_SETS.buttonLinkTertiary, layout: BY_SIZE, approved: [LINK_HIT_TARGET] },
];

/** One Figma variant of a Button set → the code button, with the cell's own label and glyphs. */
function figmaButton(variant: ButtonVariant) {
    return function FigmaButtonCell(cell: FigmaVariant) {
        const size = cell.props.Size === undefined ? undefined : FIGMA_SIZE[cell.props.Size];
        // Undrawable in code (types.ts forbids it): reported as missing, not faked.
        if (size === 'lg' && NO_LG.includes(variant)) {
            return null;
        }
        const state = FIGMA_STATE[cell.props.State ?? ''] ?? 'default';
        const content = figmaContent(cell);
        // The union in types.ts can't follow runtime Figma data; legality is checked just above.
        const props = {
            variant,
            size: SIZELESS.includes(variant) ? undefined : size,
            loading: state === 'loading',
            disabled: state === 'disabled',
            startIcon: content.leading ? <KitIcon figma={content.leading} /> : undefined,
            endIcon: content.trailing ? <KitIcon figma={content.trailing} /> : undefined,
        } as ButtonProps;

        return (
            <Button {...props} data-force={FORCE[state]}>
                {content.text ?? cell.name}
            </Button>
        );
    };
}

/**
 * Every variant of every Figma Button set (one set per code `variant`), grouped by each set's own Size × State
 * properties and held to Figma per cell by `pnpm vrt figma` (visual/FIGMA-TESTING.md). Labels and glyphs come from
 * the Figma cells, so the pixels are comparable.
 */
export const FigmaMatrix = meta.story({
    tags: ['figma', '!autodocs'],
    parameters: {
        layout: 'fullscreen',
        design: FIGMA_BUTTONS.map(({ variant, set }) => {
            return { name: variant, type: 'figma', url: set };
        }),
        figmaMatrix: { blocks: FIGMA_BUTTONS },
        // Same contrast exception as `Matrix`: Figma-drawn white on `button-destructive-default`.
        a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
    },
    render: function FigmaMatrixStory(_args, context) {
        return (
            <FigmaMatrixGrid
                context={context}
                blocks={FIGMA_BUTTONS.map((block) => {
                    return {
                        ...block,
                        title: `${block.variant} · Figma ${block.set.split('node-id=')[1]}`,
                        renderCell: figmaButton(block.variant),
                    };
                })}
            />
        );
    },
});
