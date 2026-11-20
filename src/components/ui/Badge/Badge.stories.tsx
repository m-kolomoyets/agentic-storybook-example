import type { FigmaVariant } from '../../../../visual/figma/types';
import type { BadgeSize, BadgeVariant } from './types';
import { useState } from 'react';
import GrainIcon from '@/assets/icons/grains.svg?react';
import preview from '#.storybook/preview';
import { expect, fn } from 'storybook/test';
import { Badge } from '.';
import { figmaContent, KitIcon } from '../../../../visual/figma/content';
import { FigmaMatrix as FigmaMatrixGrid } from '../../../../visual/figma/FigmaMatrix';
import { FIGMA_SETS } from '../../../../visual/figma/sets';
import { FIGMA_COMPARE_GLOBAL } from '../../../../visual/figma/types';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const VARIANTS: { variant: BadgeVariant; content: string; node: string }[] = [
    { variant: 'neutral', content: 'White corn', node: '8673-4507' },
    { variant: 'info', content: 'Hardware', node: '11633-162208' },
    { variant: 'warning', content: 'Pending', node: '11633-162212' },
    { variant: 'negative', content: 'Failed', node: '11643-163253' },
    { variant: 'positive', content: 'Passed', node: '11643-163257' },
    { variant: 'cool', content: 'Cool', node: '11640-163194' },
    { variant: 'dry', content: 'Dry', node: '11640-163237' },
    { variant: 'recondition', content: 'Recondition', node: '11640-163245' },
    { variant: 'custom', content: 'Custom', node: '11640-163249' },
];

const SIZES: BadgeSize[] = ['sm', 'md', 'lg'];

const meta = preview.meta({
    title: 'UI/Badge',
    component: Badge,
    args: { children: 'White corn', variant: 'neutral', size: 'md' },
    argTypes: {
        variant: {
            control: 'select',
            options: VARIANTS.map((v) => {
                return v.variant;
            }),
        },
        size: { control: 'inline-radio', options: SIZES },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}8673-4388` } },
});

/** Playground — switch variant/size in Controls. Every visual cell lives in `Matrix`. */
export const Default = meta.story({
    parameters: { design: { type: 'figma', url: `${FIGMA}8673-4507` } },
});

/** Decorative label: a bare `<span>` — no role, no tabindex, no `aria-*`. Natural-case text, kit draws caps. */
Default.test('is a bare span with no role, tabindex or aria-*', async ({ canvasElement, canvas }) => {
    const badge = canvasElement.querySelector('span');
    await expect(badge).not.toBeNull();
    await expect(badge).toHaveTextContent('White corn');
    await expect(badge).not.toHaveAttribute('role');
    await expect(badge).not.toHaveAttribute('tabindex');
    await expect(
        badge!.getAttributeNames().filter((n) => {
            return n.startsWith('aria-');
        })
    ).toEqual([]);
    await expect(canvas.queryByRole('button')).toBeNull();
});

/** Aeration variants draw a decorative gradient dot before the label. */
Default.test(
    'aeration variants draw a decorative dot',
    { args: { variant: 'cool', children: 'Cool' } },
    async ({ canvasElement }) => {
        const dot = canvasElement.querySelector('span > span[aria-hidden="true"]');
        await expect(dot).toBeInTheDocument();
    }
);

/** Chip: `selected` defined → `<button type="button">` with `aria-pressed`; Enter and Space activate it. */
export const Chip = meta.story({
    args: { selected: false, onClick: fn(), size: 'lg' },
    parameters: { design: { type: 'figma', url: `${FIGMA}10330-187048` } },
});

Chip.test('is a type=button toggle; Enter and Space activate it', async ({ args, canvas, userEvent }) => {
    const chip = canvas.getByRole('button', { name: 'White corn' });
    await expect(chip).toHaveAttribute('type', 'button');
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await expect(chip).toHaveAttribute('data-selected', 'false');
    await userEvent.tab();
    await expect(chip).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(' ');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
});

Chip.test(
    'selected chip is pressed and still clickable',
    { args: { selected: true } },
    async ({ args, canvas, userEvent }) => {
        const chip = canvas.getByRole('button', { name: 'White corn' });
        await expect(chip).toHaveAttribute('aria-pressed', 'true');
        await expect(chip).toHaveAttribute('data-selected', 'true');
        await userEvent.click(chip);
        await expect(args.onClick).toHaveBeenCalledOnce();
    }
);

/** Figma-drawn disabled ink (`text-on-surface-disabled`) is below 4.5:1; WCAG exempts disabled controls. */
Chip.test('disabled chip refuses activation', { args: { disabled: true } }, async ({ args, canvas, userEvent }) => {
    const chip = canvas.getByRole('button', { name: 'White corn' });
    await expect(chip).toBeDisabled();
    await expect(chip).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(chip);
    await expect(args.onClick).not.toHaveBeenCalled();
});

/**
 * `render` to an anchor: no `aria-pressed` (button-only); disablement travels as `aria-disabled` (no
 * `disabled` attribute). The anchor stays focusable and named, so the click handler guard is what blocks activation.
 */
Chip.test(
    'disabled anchor chip carries aria-disabled, no aria-pressed, refuses activation',
    {
        args: {
            disabled: true,
            render: function CropsLink(props) {
                return (
                    <a href="#crops" {...props}>
                        {props.children}
                    </a>
                );
            },
        },
    },
    async ({ args, canvas, userEvent }) => {
        const link = canvas.getByRole('link', { name: 'White corn' });
        await expect(link).not.toHaveAttribute('disabled');
        await expect(link).toHaveAttribute('aria-disabled', 'true');
        await expect(link).toHaveAttribute('data-disabled', 'true');
        await expect(link).not.toHaveAttribute('type');
        // ARIA 1.2: `aria-pressed` is not allowed on a link.
        await expect(link).not.toHaveAttribute('aria-pressed');
        await userEvent.tab();
        await expect(link).toHaveFocus();
        await userEvent.click(link);
        await userEvent.keyboard('{Enter}');
        await expect(args.onClick).not.toHaveBeenCalled();
    }
);

/** Live toggle: `aria-pressed` follows the value. */
Chip.test(
    'live toggle: aria-pressed follows the value',
    {
        render: function ChipToggle(args) {
            const [picked, setPicked] = useState(false);
            return (
                <Badge
                    size="lg"
                    selected={picked}
                    onClick={(event) => {
                        setPicked((value) => {
                            return !value;
                        });
                        args.onClick?.(event);
                    }}
                >
                    White corn
                </Badge>
            );
        },
    },
    async ({ args, canvas, userEvent }) => {
        const chip = canvas.getByRole('button', { name: 'White corn' });
        await userEvent.click(chip);
        await expect(chip).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(chip);
        await expect(chip).toHaveAttribute('aria-pressed', 'false');
        await expect(args.onClick).toHaveBeenCalledTimes(2);
    }
);

/** Every variant × size (every cell legal; Figma draws `md` plus neutral at `sm`/`lg`), plus icon and chip states. */
export const Matrix = meta.story({
    parameters: {
        design: [
            ...VARIANTS.map((spec) => {
                return { name: spec.variant, type: 'figma' as const, url: `${FIGMA}${spec.node}` };
            }),
            { name: 'chip', type: 'figma', url: `${FIGMA}10330-187048` },
            { name: 'chip selected', type: 'figma', url: `${FIGMA}10330-198995` },
            { name: 'chip disabled', type: 'figma', url: `${FIGMA}10330-198999` },
        ],
    },
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-xl">
                {SIZES.map((size) => {
                    return (
                        <div key={size} className="flex flex-col gap-xs">
                            <span className="text-caption-m text-text-general-medium">{size}</span>
                            <div className="flex flex-wrap items-center gap-l">
                                {VARIANTS.map((spec) => {
                                    return (
                                        <Badge key={spec.variant} variant={spec.variant} size={size}>
                                            {spec.content}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                <div className="flex flex-wrap items-center gap-l">
                    <Badge variant="positive">+22,3%</Badge>
                    <Badge variant="negative">+22,3%</Badge>
                    <Badge variant="neutral">0%</Badge>
                    {/* Leading SVG icon is sized by the root (14px) and inherits the ink. */}
                    <Badge variant="neutral">
                        <GrainIcon />
                        White corn
                    </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-l">
                    <Badge size="lg" selected={false} onClick={fn()}>
                        Default
                    </Badge>
                    <Badge size="lg" selected onClick={fn()}>
                        Selected
                    </Badge>
                    <Badge size="lg" selected={false} disabled onClick={fn()}>
                        Disabled
                    </Badge>
                    <Badge size="lg" selected disabled onClick={fn()}>
                        Selected disabled
                    </Badge>
                </div>
            </div>
        );
    },
});

/** Figma `Tone` (Type ≠ Mode) and `Mode` (Type = Mode) → code `variant`. Unlisted values have no code variant. */
const FIGMA_TONE: Partial<Record<string, BadgeVariant>> = {
    Neutral: 'neutral',
    Positive: 'positive',
    Negative: 'negative',
    Info: 'info',
    Warning: 'warning',
};
const FIGMA_MODE: Partial<Record<string, BadgeVariant>> = {
    Cool: 'cool',
    Dry: 'dry',
    Recondition: 'recondition',
    Custom: 'custom',
};
const FIGMA_SIZE: Record<string, BadgeSize> = { Big: 'lg', Medium: 'md', Small: 'sm' };
/** States drawn as a plain badge; `Selected`/`Disabled` are chip states; the rest have no code equivalent. */
const PLAIN_STATES = ['Default', 'Error', 'Running', 'Updating'];
const FIGMA_BLOCK = { set: FIGMA_SETS.badge, layout: { sections: 'Type', columns: 'Size' } };

/** One Figma `Badge` variant → the code badge, with the cell's own label and leading glyph. */
function figmaBadge(cell: FigmaVariant) {
    const isMode = cell.props.Type === 'Mode';
    const variant = isMode ? FIGMA_MODE[cell.props.Mode ?? ''] : FIGMA_TONE[cell.props.Tone ?? ''];
    const state = cell.props.State ?? 'Default';
    if (!variant || !(PLAIN_STATES.includes(state) || state === 'Selected' || state === 'Disabled')) {
        return null;
    }
    const content = figmaContent(cell);
    // Aeration variants draw their own dot; other leading glyphs are kit icons.
    const children = (
        <>
            {!isMode && content.leading && <KitIcon figma={content.leading} />}
            {content.text}
        </>
    );
    const size = FIGMA_SIZE[cell.props.Size ?? ''];
    if (state === 'Selected' || state === 'Disabled') {
        return (
            <Badge size={size} selected={state === 'Selected'} disabled={state === 'Disabled'} onClick={fn()}>
                {children}
            </Badge>
        );
    }

    return (
        <Badge size={size} variant={variant}>
            {children}
        </Badge>
    );
}

/**
 * Every variant of Figma `Badge` (8673:4388): a sparse set (31 of its Size × State × Tone × Type × Leading × Mode
 * combinations are drawn), grouped by Type with Size across, held to Figma per cell by `pnpm vrt figma`
 * (visual/FIGMA-TESTING.md). Variants the code can't express show as "no code equivalent".
 */
export const FigmaMatrix = meta.story({
    tags: ['figma', '!autodocs'],
    parameters: {
        layout: 'padded',
        design: { type: 'figma', url: FIGMA_SETS.badge },
        figmaMatrix: { blocks: [FIGMA_BLOCK] },
    },
    render: function FigmaMatrixStory(_args, { globals }) {
        return (
            <FigmaMatrixGrid
                compare={globals[FIGMA_COMPARE_GLOBAL]}
                blocks={[{ ...FIGMA_BLOCK, renderCell: figmaBadge }]}
            />
        );
    },
});
