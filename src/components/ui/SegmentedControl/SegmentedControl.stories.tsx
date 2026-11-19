import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SegmentedControlItem } from './types';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { SegmentedControl } from '.';

const ITEMS: SegmentedControlItem[] = [
    { value: 'PUSH_ONLY', label: 'Push Only' },
    { value: 'TEXT_ONLY', label: 'Text Messages' },
    { value: 'PUSH_AND_TEXT', label: 'Push & Text' },
];

/* No Figma node is referenced by the amber source. */
const meta = {
    title: 'UI/SegmentedControl',
    component: SegmentedControl,
    args: {
        'aria-label': 'Notification channel',
        items: ITEMS,
        value: 'PUSH_AND_TEXT',
        disabled: false,
        onValueChange: fn(),
    },
    argTypes: {
        value: {
            control: 'inline-radio',
            options: [
                null,
                ...ITEMS.map((item) => {
                    return item.value;
                }),
            ],
        },
        disabled: { control: 'boolean' },
    },
    render: function Interactive({ value: initial, onValueChange, ...props }) {
        const [value, setValue] = useState(initial);
        return (
            <SegmentedControl
                {...props}
                value={value}
                onValueChange={(next) => {
                    setValue(next);
                    onValueChange(next);
                }}
            />
        );
    },
} satisfies Meta<typeof SegmentedControl>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A named group of `aria-pressed` buttons; pressing one selects it, pressing it again keeps it. */
export const Default: Story = {
    play: async ({ canvas, userEvent, args }) => {
        await expect(canvas.getByRole('group', { name: 'Notification channel' })).toBeInTheDocument();
        await expect(canvas.getAllByRole('button')).toHaveLength(3);
        await expect(canvas.getByRole('button', { name: 'Push & Text' })).toHaveAttribute('aria-pressed', 'true');

        await userEvent.click(canvas.getByRole('button', { name: 'Push Only' }));
        await expect(args.onValueChange).toHaveBeenCalledWith('PUSH_ONLY');
        await expect(canvas.getByRole('button', { name: 'Push Only' })).toHaveAttribute('aria-pressed', 'true');
        await expect(canvas.getByRole('button', { name: 'Push & Text' })).toHaveAttribute('aria-pressed', 'false');

        await userEvent.click(canvas.getByRole('button', { name: 'Push Only' }));
        await expect(args.onValueChange).toHaveBeenCalledOnce();
        await expect(canvas.getByRole('button', { name: 'Push Only' })).toHaveAttribute('aria-pressed', 'true');
    },
};

/** `value={null}`: nothing pressed. */
export const NoSelection: Story = {
    args: { value: null },
    play: async ({ canvas }) => {
        for (const button of canvas.getAllByRole('button')) {
            await expect(button).toHaveAttribute('aria-pressed', 'false');
        }
    },
};

/** Whole group disabled: no press reaches `onValueChange`. */
export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Push Only' }));
        await expect(args.onValueChange).not.toHaveBeenCalled();
    },
};

/** One item disabled. */
export const ItemDisabled: Story = {
    args: { items: [ITEMS[0]!, { ...ITEMS[1]!, disabled: true }, ITEMS[2]!] },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: 'Text Messages' })).toBeDisabled();
        await expect(canvas.getByRole('button', { name: 'Push Only' })).toBeEnabled();
    },
};
