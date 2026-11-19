import type { Meta, StoryObj } from '@storybook/react-vite';
import type { BreadcrumbItem } from './types';
import DotsIcon from '@/assets/icons/dots-three-outline-vertical.svg?react';
import { expect } from 'storybook/test';
import { IconButton } from '@/components/ui/IconButton';
import { Breadcrumbs } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const TRAIL: BreadcrumbItem[] = [
    { label: 'Gulf Bin', to: '#/bin/1' },
    { label: 'Fan Controls', to: '#/bin/1/fan' },
    { label: 'Cool Mode' },
];

const meta = {
    title: 'UI/Breadcrumbs',
    component: Breadcrumbs,
    args: { items: TRAIL },
    argTypes: { action: { control: false } },
    decorators: [
        function Column(Story) {
            return (
                <div className="w-[40rem] max-w-full">
                    <Story />
                </div>
            );
        },
    ],
    parameters: { design: { type: 'figma', url: `${FIGMA}10827-215593` } },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Leaf unlinked with `aria-current`; separators hidden; back arrow targets the parent crumb. */
export const Default: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();

        const leaf = canvas.getByText('Cool Mode');
        await expect(leaf).toHaveAttribute('aria-current', 'page');
        await expect(leaf.tagName).not.toBe('A');
        await expect(canvas.queryByRole('link', { name: 'Cool Mode' })).toBeNull();

        const separators = canvas.getAllByText('/');
        await expect(separators).toHaveLength(2);
        for (const separator of separators) {
            await expect(separator).toHaveAttribute('aria-hidden');
        }
        await expect(canvas.getByRole('link', { name: 'Fan Controls' })).toHaveAttribute('href', '#/bin/1/fan');
        await expect(canvas.getByRole('link', { name: 'Back to Fan Controls' })).toHaveAttribute('href', '#/bin/1/fan');
    },
};

/** A leaf carrying a destination stays unlinked; a single crumb has no parent, so no back arrow. */
export const SingleCrumb: Story = {
    args: { items: [{ label: 'Gulf Bin', to: '#/bin/1' }] },
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('link')).toBeNull();
        await expect(canvas.getByText('Gulf Bin')).toHaveAttribute('aria-current', 'page');
    },
};

/** An unlinked parent renders as text and earns no back arrow. */
export const WithoutBackArrow: Story = {
    args: { items: [{ label: 'CHS Account' }, { label: 'Team Members' }] },
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('link')).toBeNull();
        await expect(canvas.getByText('CHS Account').tagName).toBe('SPAN');
    },
};

/** `render` hands navigation to a router element (stand-in anchors here). */
export const AsRouterLinks: Story = {
    args: {
        items: [
            // Content is supplied by the crumb through `useRender`.
            // eslint-disable-next-line jsx-a11y-x/anchor-has-content
            { label: 'Gulf Bin', render: <a href="#/router/bin/1" /> },
            // eslint-disable-next-line jsx-a11y-x/anchor-has-content
            { label: 'Fan Controls', render: <a href="#/router/bin/1/fan" /> },
            { label: 'Cool Mode' },
        ],
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('link', { name: 'Gulf Bin' })).toHaveAttribute('href', '#/router/bin/1');
        await expect(canvas.getByRole('link', { name: 'Back to Fan Controls' })).toHaveAttribute(
            'href',
            '#/router/bin/1/fan'
        );
    },
};

/** Over four crumbs the middle collapses to `…`; its sr-only text and `title` name what it hides. */
export const Overflow: Story = {
    args: {
        items: [
            { label: 'CHS', to: '#/' },
            { label: 'Maple Park', to: '#/site/2' },
            { label: 'Gulf Bin', to: '#/bin/1' },
            { label: 'Fan Controls', to: '#/bin/1/fan' },
            { label: 'Cool Mode', to: '#/bin/1/fan/cool' },
            { label: 'Schedule' },
        ],
    },
    play: async ({ canvas }) => {
        await expect(canvas.getAllByRole('listitem')).toHaveLength(4);
        await expect(canvas.getByText('Maple Park, Gulf Bin, Fan Controls')).toHaveClass('sr-only');
        await expect(canvas.getByTitle('Maple Park / Gulf Bin / Fan Controls')).toBeInTheDocument();
        await expect(canvas.queryByRole('link', { name: 'Gulf Bin' })).toBeNull();
        await expect(canvas.getByRole('link', { name: 'CHS' })).toBeInTheDocument();
        // The back arrow still targets the real parent, which the tail keeps visible.
        await expect(canvas.getByRole('link', { name: 'Back to Cool Mode' })).toBeInTheDocument();
    },
};

/** Long labels truncate on one line rather than wrap. */
export const LongLabels: Story = {
    args: {
        items: [
            { label: 'Maple Park Cooperative Elevator', to: '#/site/2' },
            { label: 'North Bin 14 — Fan Controls', to: '#/bin/1/fan' },
            { label: 'Cool Mode Schedule' },
        ],
    },
    decorators: [
        function Narrow(Story) {
            return (
                <div className="w-[20rem]">
                    <Story />
                </div>
            );
        },
    ],
};

/** The right-hand slot is opaque: text or a control. */
export const WithAction: Story = {
    args: { action: <IconButton aria-label="Page actions" icon={<DotsIcon />} /> },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: 'Page actions' })).toBeInTheDocument();
    },
};

/** No items renders nothing. */
export const Empty: Story = {
    args: { items: [] },
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('navigation')).toBeNull();
    },
};
