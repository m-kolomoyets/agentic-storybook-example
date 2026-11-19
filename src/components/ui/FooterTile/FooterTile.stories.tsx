import type { Meta, StoryObj } from '@storybook/react-vite';
import BellIcon from '@/assets/icons/bell.svg?react';
import GroupIcon from '@/assets/icons/group.svg?react';
import { expect } from 'storybook/test';
import { FooterTile } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = {
    title: 'UI/FooterTile',
    component: FooterTile,
    args: { label: 'Team', icon: <GroupIcon />, to: '#team' },
    argTypes: {
        selected: { control: 'boolean' },
        disabled: { control: 'boolean' },
        indicator: { control: { type: 'number', min: 0 } },
        icon: { control: false },
        render: { control: false },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}12439-12100` } },
} satisfies Meta<typeof FooterTile>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvas }) => {
        const link = canvas.getByRole('link', { name: 'Team' });
        await expect(link).toHaveAttribute('href', '#team');
        await expect(link).not.toHaveAttribute('aria-current');
    },
};

export const Selected: Story = {
    args: { selected: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('link', { name: 'Team' })).toHaveAttribute('aria-current', 'page');
    },
};

/** No destination: a `<span>`, not a link. */
export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('link')).toBeNull();
        const tile = canvas.getByText('Team').parentElement;
        await expect(tile?.tagName).toBe('SPAN');
        await expect(tile).toHaveAttribute('aria-disabled', 'true');
        await expect(tile).not.toHaveAttribute('href');
    },
};

/** The count joins the accessible name; the visual badge is hidden so it is not read twice. */
export const WithIndicator: Story = {
    // a11y todo: Figma badge white-on-`surface-negative` is 3.65:1; axe's label-content-name-mismatch heuristic
    // counts the hidden badge digit as visible label text (the visible word is in the name, so WCAG 2.5.3 holds).
    parameters: { a11y: { test: 'todo' } },
    args: { label: 'Notifications', icon: <BellIcon />, to: '#notifications', indicator: 8 },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('link', { name: 'Notifications, 8 unread' })).toBeInTheDocument();
        await expect(canvas.getByText('8').closest('[aria-hidden="true"]')).not.toBeNull();
    },
};

/** Above 99 the badge reads `99+`; the name keeps the real count. */
export const IndicatorCapped: Story = {
    // a11y todo: Figma badge white-on-`surface-negative` is 3.65:1; axe's label-content-name-mismatch heuristic
    // counts the hidden badge digit as visible label text (the visible word is in the name, so WCAG 2.5.3 holds).
    parameters: { a11y: { test: 'todo' } },
    args: { label: 'Notifications', icon: <BellIcon />, to: '#notifications', indicator: 120 },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('link', { name: 'Notifications, 120 unread' })).toBeInTheDocument();
        await expect(canvas.getByText('99+')).toBeInTheDocument();
    },
};

/** Zero draws no badge and leaves the name as the label. */
export const IndicatorZero: Story = {
    args: { label: 'Notifications', icon: <BellIcon />, to: '#notifications', indicator: 0 },
    play: async ({ canvas }) => {
        const link = canvas.getByRole('link', { name: 'Notifications' });
        await expect(link).not.toHaveAttribute('aria-label');
        await expect(canvas.queryByText('0')).toBeNull();
    },
};

/** `render` hands navigation to a router element (stand-in anchor here). */
export const AsRouterLink: Story = {
    // Content is supplied by FooterTile through `useRender`.
    // eslint-disable-next-line jsx-a11y-x/anchor-has-content
    args: { to: undefined, render: <a href="#router-team" /> },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('link', { name: 'Team' })).toHaveAttribute('href', '#router-team');
    },
};

/** Pointer/focus cells pinned with the ramp's own tokens, for review against Figma. */
export const Matrix: Story = {
    // a11y todo: Figma badge white-on-`surface-negative` is 3.65:1; axe's label-content-name-mismatch heuristic
    // counts the hidden badge digit as visible label text (the visible word is in the name, so WCAG 2.5.3 holds).
    parameters: { a11y: { test: 'todo' } },
    render: function Matrix() {
        const rows = [
            { state: 'default', props: {} },
            { state: 'hover', props: { className: 'bg-button-secondary-hover' } },
            { state: 'focused', props: { className: 'inset-ring-1 inset-ring-border-focused' } },
            { state: 'selected', props: { selected: true } },
            { state: 'disabled', props: { disabled: true } },
        ];
        return (
            <div className="grid grid-cols-[auto_auto_auto] items-center gap-l">
                {rows.map(({ state, props }) => {
                    return [
                        <span key={`${state}-label`} className="text-caption-m text-text-general-medium">
                            {state}
                        </span>,
                        <FooterTile key={`${state}-team`} label="Team" icon={<GroupIcon />} to="#team" {...props} />,
                        <FooterTile
                            key={`${state}-bell`}
                            label="Notifications"
                            icon={<BellIcon />}
                            to="#notifications"
                            indicator={8}
                            {...props}
                        />,
                    ];
                })}
            </div>
        );
    },
};
