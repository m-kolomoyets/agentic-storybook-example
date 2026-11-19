import type { Meta, StoryObj } from '@storybook/react-vite';
import type { IconButtonSize } from './types';
import AddIcon from '@/assets/icons/add.svg?react';
import CloseIcon from '@/assets/icons/close.svg?react';
import ModeEditIcon from '@/assets/icons/mode-edit.svg?react';
import MyLocationIcon from '@/assets/icons/my-location.svg?react';
import ZoomOutMapIcon from '@/assets/icons/zoom-out-map.svg?react';
import { expect, fn } from 'storybook/test';
import { IconButton } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const SIZES: IconButtonSize[] = ['md', 'sm', 'xs'];

const meta = {
    title: 'UI/IconButton',
    component: IconButton,
    args: { 'aria-label': 'Add item', icon: <AddIcon />, variant: 'secondary', size: 'md', onClick: fn() },
    argTypes: {
        variant: { control: 'inline-radio', options: ['secondary', 'ghost', 'elevated'] },
        size: { control: 'inline-radio', options: SIZES },
        loading: { control: 'boolean' },
        disabled: { control: 'boolean' },
        icon: { control: false },
        render: { control: false },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}8016-314` } },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** `aria-label` is the name; the glyph is hidden from the a11y tree. */
export const Default: Story = {
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        const button = canvas.getByRole('button', { name: 'Add item' });
        await expect(button).toHaveAttribute('aria-label', 'Add item');
        await expect(canvasElement.querySelector('svg')?.parentElement).toHaveAttribute('aria-hidden', 'true');
        await userEvent.click(button);
        await expect(args.onClick).toHaveBeenCalledOnce();
    },
};

export const Small: Story = { args: { size: 'sm' } };

/** `xs` binds the primary ramp, as Figma draws it. 20px — under WCAG 2.5.8's 24px target. */
export const ExtraSmall: Story = { args: { size: 'xs', icon: <CloseIcon />, 'aria-label': 'Close' } };

/** Transparent ground; the glyph fills the 20px `xs` box. */
export const Ghost: Story = {
    args: { variant: 'ghost', size: 'xs', icon: <ModeEditIcon />, 'aria-label': 'Edit' },
};

/** Map overlay chip (`15399:457956`): 32px, 16px glyph, size-locked. */
export const Elevated: Story = {
    args: { variant: 'elevated', size: undefined, icon: <MyLocationIcon />, 'aria-label': 'Move to my location' },
    parameters: { design: { type: 'figma', url: `${FIGMA}15399-457956` } },
    play: async ({ canvas }) => {
        const button = canvas.getByRole('button', { name: 'Move to my location' });
        await expect(button).toHaveClass('size-4xl');
        await expect(button).not.toHaveClass('p-l');
    },
};

/** Busy, not disabled: focusable, named, activation refused. */
export const Loading: Story = {
    args: { loading: true, 'aria-label': 'Saving' },
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        const button = canvas.getByRole('button', { name: 'Saving' });
        await expect(button).not.toBeDisabled();
        await expect(button).toHaveAttribute('aria-busy', 'true');
        await expect(canvasElement.querySelector('.animate-spin')).toBeInTheDocument();
        await userEvent.tab();
        await expect(button).toHaveFocus();
        await userEvent.click(button);
        await expect(args.onClick).not.toHaveBeenCalled();
    },
};

export const Disabled: Story = {
    args: { disabled: true, icon: <CloseIcon />, 'aria-label': 'Close' },
    play: async ({ canvas }) => {
        const button = canvas.getByRole('button', { name: 'Close' });
        await expect(button).toBeDisabled();
        await expect(button).toHaveAttribute('aria-disabled', 'true');
    },
};

/** `render` → `<a>`: `disabled` is held back, `aria-disabled` announces it; activation refused. */
export const AsLink: Story = {
    // Content is supplied by IconButton through `useRender`.
    // eslint-disable-next-line jsx-a11y-x/anchor-has-content
    args: { render: <a href="#settings" />, disabled: true, 'aria-label': 'Settings', icon: <ZoomOutMapIcon /> },
    play: async ({ canvas, args, userEvent }) => {
        const link = canvas.getByRole('link', { name: 'Settings' });
        await expect(link).not.toHaveAttribute('disabled');
        await expect(link).toHaveAttribute('aria-disabled', 'true');
        await userEvent.click(link);
        await expect(args.onClick).not.toHaveBeenCalled();
    },
};

type StateName = 'default' | 'hover' | 'focused' | 'pressed' | 'loading' | 'disabled';

const STATES: StateName[] = ['default', 'hover', 'focused', 'pressed', 'loading', 'disabled'];

/* Pointer states pinned with the cva cell's own tokens; `xs` uses the primary ramp. */
const SECONDARY_FORCED: Partial<Record<StateName, string>> = {
    hover: 'bg-button-secondary-hover',
    focused: 'bg-button-secondary-focused inset-ring-border-focused',
    pressed: 'bg-button-secondary-pressed',
};
const PRIMARY_FORCED: Partial<Record<StateName, string>> = {
    hover: 'bg-button-primary-hover',
    focused: 'bg-button-primary-focused inset-ring-1 inset-ring-border-focused',
    pressed: 'bg-button-primary-pressed',
};

/** Every size × state cell, plus ghost and elevated, for review against Figma. */
export const Matrix: Story = {
    render: function Matrix() {
        return (
            <div className="grid grid-cols-7 items-center gap-l">
                {SIZES.map((size) => {
                    const forced = size === 'xs' ? PRIMARY_FORCED : SECONDARY_FORCED;
                    return [
                        <span key={`${size}-label`} className="text-caption-m text-text-general-medium">
                            {size}
                        </span>,
                        ...STATES.map((state) => {
                            return (
                                <IconButton
                                    key={`${size}-${state}`}
                                    aria-label={`Add (${size}, ${state})`}
                                    icon={<AddIcon />}
                                    size={size}
                                    loading={state === 'loading'}
                                    disabled={state === 'disabled'}
                                    className={`justify-self-start ${forced[state] ?? ''}`}
                                />
                            );
                        }),
                    ];
                })}
                <span className="text-caption-m text-text-general-medium">ghost</span>
                {SIZES.map((size) => {
                    return (
                        <IconButton
                            key={`ghost-${size}`}
                            aria-label={`Edit (ghost ${size})`}
                            icon={<ModeEditIcon />}
                            variant="ghost"
                            size={size}
                            className="justify-self-start"
                        />
                    );
                })}
                <span className="col-span-3" />
                <span className="text-caption-m text-text-general-medium">elevated</span>
                {(['default', 'loading', 'disabled'] as const).map((state) => {
                    return (
                        <IconButton
                            key={`elevated-${state}`}
                            aria-label={`Locate (${state})`}
                            icon={<MyLocationIcon />}
                            variant="elevated"
                            loading={state === 'loading'}
                            disabled={state === 'disabled'}
                            className="justify-self-start"
                        />
                    );
                })}
            </div>
        );
    },
};
