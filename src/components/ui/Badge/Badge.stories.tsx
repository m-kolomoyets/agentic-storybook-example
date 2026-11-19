import type { Meta, StoryObj } from '@storybook/react-vite';
import type { BadgeSize, BadgeVariant } from './types';
import { useState } from 'react';
import GrainIcon from '@/assets/icons/grains.svg?react';
import { expect, fn } from 'storybook/test';
import { Badge } from '.';

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

const meta = {
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
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Decorative label: a bare `<span>` — no role, no tabindex, no `aria-*`. Natural-case text, kit draws caps. */
export const Default: Story = {
    parameters: { design: { type: 'figma', url: `${FIGMA}8673-4507` } },
    play: async ({ canvasElement, canvas }) => {
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
    },
};

/** Aeration variants draw a decorative gradient dot before the label. */
export const Mode: Story = {
    args: { variant: 'cool', children: 'Cool' },
    parameters: { design: { type: 'figma', url: `${FIGMA}11640-163194` } },
    play: async ({ canvasElement }) => {
        const dot = canvasElement.querySelector('span > span[aria-hidden="true"]');
        await expect(dot).toBeInTheDocument();
    },
};

/** Leading SVG icon is sized by the root (14px) and inherits the ink. */
export const WithIcon: Story = {
    args: {
        children: (
            <>
                <GrainIcon />
                White corn
            </>
        ),
    },
};

/** Chip: `selected` defined → `<button type="button">` with `aria-pressed`; Enter and Space activate it. */
export const Chip: Story = {
    args: { selected: false, onClick: fn(), size: 'lg' },
    parameters: { design: { type: 'figma', url: `${FIGMA}10330-187048` } },
    play: async ({ args, canvas, userEvent }) => {
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
    },
};

export const ChipSelected: Story = {
    args: { selected: true, onClick: fn(), size: 'lg' },
    parameters: { design: { type: 'figma', url: `${FIGMA}10330-198995` } },
    play: async ({ args, canvas, userEvent }) => {
        const chip = canvas.getByRole('button', { name: 'White corn' });
        await expect(chip).toHaveAttribute('aria-pressed', 'true');
        await expect(chip).toHaveAttribute('data-selected', 'true');
        await userEvent.click(chip);
        await expect(args.onClick).toHaveBeenCalledOnce();
    },
};

/** Figma-drawn disabled ink (`text-on-surface-disabled`) is below 4.5:1; WCAG exempts disabled controls. */
export const ChipDisabled: Story = {
    args: { selected: false, disabled: true, onClick: fn(), size: 'lg' },
    parameters: { design: { type: 'figma', url: `${FIGMA}10330-198999` } },
    play: async ({ args, canvas, userEvent }) => {
        const chip = canvas.getByRole('button', { name: 'White corn' });
        await expect(chip).toBeDisabled();
        await expect(chip).toHaveAttribute('aria-disabled', 'true');
        await userEvent.click(chip);
        await expect(args.onClick).not.toHaveBeenCalled();
    },
};

/**
 * `render` to an anchor: disablement travels as `aria-disabled` (no `disabled` attribute). The anchor stays
 * focusable and named, so the click handler guard is what blocks activation.
 */
export const AsLinkDisabled: Story = {
    // Amber behaviour kept: `aria-pressed` on an `<a>` is not an allowed attr (axe aria-allowed-attr).
    parameters: { a11y: { test: 'todo' } },
    args: {
        selected: false,
        disabled: true,
        onClick: fn(),
        size: 'lg',
        render: function CropsLink(props) {
            return (
                <a href="#crops" {...props}>
                    {props.children}
                </a>
            );
        },
    },
    play: async ({ args, canvas, userEvent }) => {
        const link = canvas.getByRole('link', { name: 'White corn' });
        await expect(link).not.toHaveAttribute('disabled');
        await expect(link).toHaveAttribute('aria-disabled', 'true');
        await expect(link).toHaveAttribute('data-disabled', 'true');
        await expect(link).not.toHaveAttribute('type');
        await userEvent.tab();
        await expect(link).toHaveFocus();
        await userEvent.click(link);
        await userEvent.keyboard('{Enter}');
        await expect(args.onClick).not.toHaveBeenCalled();
    },
};

/** Live toggle: `aria-pressed` follows the value. */
export const ChipToggle: Story = {
    args: { selected: false, onClick: fn(), size: 'lg' },
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
    play: async ({ args, canvas, userEvent }) => {
        const chip = canvas.getByRole('button', { name: 'White corn' });
        await userEvent.click(chip);
        await expect(chip).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(chip);
        await expect(chip).toHaveAttribute('aria-pressed', 'false');
        await expect(args.onClick).toHaveBeenCalledTimes(2);
    },
};

/** Every variant × size (every cell legal; Figma draws `md` plus neutral at `sm`/`lg`), plus chip states. */
export const Matrix: Story = {
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
};
