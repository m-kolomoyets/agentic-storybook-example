import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { Avatar } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/* Inline, 3:2 (not square) so an `object-cover` regression is visible. */
const PHOTO =
    'data:image/svg+xml,' +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
            <rect width="120" height="80" fill="#2f6f4e"/>
            <circle cx="60" cy="34" r="18" fill="#f2d9b1"/>
            <path d="M28 80c0-18 14-28 32-28s32 10 32 28z" fill="#f2d9b1"/>
        </svg>`
    );

const BROKEN_PHOTO = 'data:image/png;base64,not-a-png';

const SIZES = [
    { label: '44 (default)', className: undefined },
    { label: '48', className: 'size-avatar-md' },
    { label: '80', className: 'size-avatar-lg text-heading-s' },
];

const meta = {
    title: 'UI/Avatar',
    component: Avatar,
    args: { children: 'J' },
    parameters: { design: { type: 'figma', url: `${FIGMA}10237-174118` } },
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Decorative by default: fallback `aria-hidden`, no `img` role, root carries no role. */
export const Fallback: Story = {
    args: { children: 'JS' },
    play: async ({ canvasElement, canvas }) => {
        const root = canvasElement.querySelector('span');
        await expect(root).not.toHaveAttribute('role');
        await expect(root!.querySelector('span')).toHaveAttribute('aria-hidden', 'true');
        await expect(canvas.queryByRole('img')).toBeNull();
    },
};

/** `alt` names the fallback (`role="img"`); the root still has no role. */
export const Labelled: Story = {
    args: { children: 'JS', alt: 'Jane Smith' },
    play: async ({ canvasElement, canvas }) => {
        await expect(canvas.getByRole('img', { name: 'Jane Smith' })).toBeInTheDocument();
        await expect(canvasElement.querySelector('span')).not.toHaveAttribute('role');
    },
};

/** Photo loads; its `alt` defaults to `''`. */
export const Photo: Story = {
    args: { src: PHOTO },
    play: async ({ canvasElement }) => {
        await waitFor(async () => {
            await expect(canvasElement.querySelector('img')).toBeInTheDocument();
        });
        await expect(canvasElement.querySelector('img')).toHaveAttribute('alt', '');
    },
};

/** A failing `src` falls back to the initials. */
export const BrokenPhoto: Story = {
    args: { src: BROKEN_PHOTO },
    play: async ({ canvasElement, canvas }) => {
        await waitFor(async () => {
            await expect(canvas.getByText('J')).toBeInTheDocument();
        });
        await expect(canvasElement.querySelector('img')).toBeNull();
    },
};

/** 44 / 48 / 80, fallback and photo. The 80px size needs `text-heading-s` alongside it. */
export const Matrix: Story = {
    render: function Matrix() {
        return (
            <div className="grid grid-cols-[8rem_auto_auto] items-center gap-l">
                {SIZES.map((size) => {
                    return [
                        <span key={`${size.label}-l`} className="text-caption-m text-text-general-medium">
                            {size.label}
                        </span>,
                        <Avatar key={`${size.label}-f`} className={size.className}>
                            J
                        </Avatar>,
                        <Avatar key={`${size.label}-p`} className={size.className} src={PHOTO}>
                            J
                        </Avatar>,
                    ];
                })}
            </div>
        );
    },
};
