import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { ScrollArea } from '.';

function rows(count: number, label = 'Row') {
    return Array.from({ length: count }, (_, index) => {
        return (
            <div key={index} className="flex h-4xl items-center px-m whitespace-nowrap">
                {label} {index + 1}
            </div>
        );
    });
}

/* Figma draws no scrollbar, so there is no design node; the boxes are sized in px as review scaffolding. */
const meta = {
    title: 'UI/ScrollArea',
    component: ScrollArea,
    args: {
        orientation: 'vertical',
        scrollbarOutset: false,
        className: 'h-[240px] w-[320px] rounded-s bg-surface-control text-body-m text-text-general-strong',
        children: rows(40),
    },
    argTypes: {
        orientation: { control: 'inline-radio', options: ['vertical', 'horizontal', 'both'] },
        scrollbarOutset: { control: 'boolean' },
        children: { control: false },
        viewportRef: { control: false },
        viewportStyle: { control: false },
    },
} satisfies Meta<typeof ScrollArea>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Vertical (default). Fine pointer: the bar shows whenever the axis overflows. */
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const viewport = canvasElement.querySelector<HTMLElement>('[data-scroll-viewport]');
        await expect(viewport).not.toBeNull();
        await waitFor(() => {
            return expect(viewport!.scrollHeight).toBeGreaterThan(viewport!.clientHeight);
        });
        await waitFor(() => {
            return expect(canvasElement.querySelector('[data-orientation="vertical"]')).not.toBeNull();
        });
        await expect(canvasElement.querySelector('[data-orientation="horizontal"]')).toBeNull();
    },
};

/** `both` is the only orientation that renders the corner; both bars are live. */
export const Both: Story = {
    args: {
        orientation: 'both',
        children: <div className="w-[720px]">{rows(24, 'A row long enough to overflow the box sideways —')}</div>,
    },
    play: async ({ canvasElement }) => {
        await waitFor(() => {
            return expect(canvasElement.querySelectorAll('[data-orientation="horizontal"]').length).toBeGreaterThan(0);
        });
        await expect(canvasElement.querySelectorAll('[data-orientation="vertical"]').length).toBeGreaterThan(0);
    },
};

/** Sideways-only: the viewport releases the vertical axis so a wheel still scrolls the page. */
export const Horizontal: Story = {
    args: {
        orientation: 'horizontal',
        className: 'w-[320px] rounded-s bg-surface-control text-body-m text-text-general-strong',
        children: <div className="flex">{rows(12, 'Tab')}</div>,
    },
    play: async ({ canvasElement }) => {
        const viewport = canvasElement.querySelector<HTMLElement>('[data-scroll-viewport]');
        await expect(viewport!.style.overflowY).toBe('hidden');
        await expect(viewport!.style.overscrollBehaviorY).toBe('auto');
    },
};

/** Nothing to scroll: Base UI drops the overflow attribute and no bar appears. */
export const NoOverflow: Story = {
    args: { children: rows(3) },
    play: async ({ canvasElement }) => {
        const root = canvasElement.querySelector<HTMLElement>('.group\\/scroll-area');
        await expect(root).not.toHaveAttribute('data-has-overflow-y');
    },
};

/** `bottomFadeClassName` fades the bottom edge while content remains below. */
export const BottomFade: Story = {
    args: { bottomFadeClassName: 'to-surface-control', scrollbarOutset: true },
    decorators: [
        function Padded(Story) {
            return (
                <div className="w-fit pr-xs">
                    <Story />
                </div>
            );
        },
    ],
    play: async ({ canvasElement }) => {
        const fade = canvasElement.querySelector('div[aria-hidden]');
        await expect(fade).toHaveClass('to-surface-control');
        await expect(canvasElement.querySelector('.group\\/scroll-area')).toHaveClass('-mr-xs');
    },
};

/** The dropdown's geometry: five 48px option rows + 2px gaps as max-height (what `OptionList` ships). */
export const InPopupGeometry: Story = {
    args: {
        className: 'max-h-[calc(5*var(--size-option-row)+4*var(--spacing-xxs))] w-full',
        children: (
            <div className="flex flex-col gap-xxs text-body-m text-text-general-strong">
                {Array.from({ length: 20 }, (_, index) => {
                    return (
                        <div key={index} className="flex h-[48px] items-center rounded-s px-m">
                            Option {index + 1}
                        </div>
                    );
                })}
            </div>
        ),
    },
    decorators: [
        function Panel(Story) {
            return (
                <div className="w-[351px] rounded-m border border-border-primary bg-surface-control p-xs">
                    <Story />
                </div>
            );
        },
    ],
    play: async ({ canvasElement }) => {
        const viewport = canvasElement.querySelector<HTMLElement>('[data-scroll-viewport]');
        await waitFor(() => {
            return expect(viewport!.clientHeight).toBe(5 * 48 + 4 * 2);
        });
    },
};
