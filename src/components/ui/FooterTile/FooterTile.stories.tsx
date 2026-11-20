import BellIcon from '@/assets/icons/bell.svg?react';
import GroupIcon from '@/assets/icons/group.svg?react';
import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { FooterTile } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/*
 * color-contrast off: Figma badge white-on-`surface-negative` is 3.65:1. label-content-name-mismatch off: axe
 * counts the hidden badge digit as visible label text (the visible word is in the name, so WCAG 2.5.3 holds).
 */
const INDICATOR_A11Y = {
    a11y: {
        config: {
            rules: [
                { id: 'color-contrast', enabled: false },
                { id: 'label-content-name-mismatch', enabled: false },
            ],
        },
    },
};

const meta = preview.meta({
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
});

/** Playground — switch selected/disabled/indicator in Controls. Every visual cell lives in `Matrix`. */
export const Default = meta.story();

Default.test('is a link to its destination, not current', async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Team' });
    await expect(link).toHaveAttribute('href', '#team');
    await expect(link).not.toHaveAttribute('aria-current');
});

Default.test('selected marks aria-current=page', { args: { selected: true } }, async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Team' })).toHaveAttribute('aria-current', 'page');
});

/** No destination: a `<span>`, not a link. */
Default.test('disabled renders a span, not a link', { args: { disabled: true } }, async ({ canvas }) => {
    await expect(canvas.queryByRole('link')).toBeNull();
    const tile = canvas.getByText('Team').parentElement;
    await expect(tile?.tagName).toBe('SPAN');
    await expect(tile).toHaveAttribute('aria-disabled', 'true');
    await expect(tile).not.toHaveAttribute('href');
});

/** The count joins the accessible name; the visual badge is hidden so it is not read twice. */
Default.test(
    'indicator count joins the name; the badge is hidden',
    {
        args: { label: 'Notifications', icon: <BellIcon />, to: '#notifications', indicator: 8 },
        parameters: INDICATOR_A11Y,
    },
    async ({ canvas }) => {
        await expect(canvas.getByRole('link', { name: 'Notifications, 8 unread' })).toBeInTheDocument();
        await expect(canvas.getByText('8').closest('[aria-hidden="true"]')).not.toBeNull();
    }
);

/** Above 99 the badge reads `99+`; the name keeps the real count. */
Default.test(
    'indicator above 99 reads 99+; the name keeps the real count',
    {
        args: { label: 'Notifications', icon: <BellIcon />, to: '#notifications', indicator: 120 },
        parameters: INDICATOR_A11Y,
    },
    async ({ canvas }) => {
        await expect(canvas.getByRole('link', { name: 'Notifications, 120 unread' })).toBeInTheDocument();
        await expect(canvas.getByText('99+')).toBeInTheDocument();
    }
);

/** Zero draws no badge and leaves the name as the label. */
Default.test(
    'indicator zero draws no badge and keeps the label as name',
    { args: { label: 'Notifications', icon: <BellIcon />, to: '#notifications', indicator: 0 } },
    async ({ canvas }) => {
        const link = canvas.getByRole('link', { name: 'Notifications' });
        await expect(link).not.toHaveAttribute('aria-label');
        await expect(canvas.queryByText('0')).toBeNull();
    }
);

/** `render` hands navigation to a router element (stand-in anchor here). */
Default.test(
    'render hands navigation to a router element',
    {
        render: function RouterTile({ label, icon }) {
            // Content is supplied by FooterTile through `useRender`.
            // eslint-disable-next-line jsx-a11y-x/anchor-has-content
            return <FooterTile label={label} icon={icon} render={<a href="#router-team" />} />;
        },
    },
    async ({ canvas }) => {
        await expect(canvas.getByRole('link', { name: 'Team' })).toHaveAttribute('href', '#router-team');
    }
);

/** Pointer/focus cells pinned with the ramp's own tokens, for review against Figma. */
export const Matrix = meta.story({
    // color-contrast off: Figma badge white-on-`surface-negative` is 3.65:1. label-content-name-mismatch off: axe
    // counts the hidden badge digit as visible label text (the visible word is in the name, so WCAG 2.5.3 holds).
    parameters: {
        a11y: {
            config: {
                rules: [
                    { id: 'color-contrast', enabled: false },
                    { id: 'label-content-name-mismatch', enabled: false },
                ],
            },
        },
    },
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
});
