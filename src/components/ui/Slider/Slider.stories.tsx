import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SliderProps } from './types';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { Field } from '@/components/ui/Field';
import { Slider } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/** The drawn `Priority` scale (8217:8122): three positions of a `0…2` range. */
const PRIORITY = ['Low', 'Medium', 'High'];
/** The drawn `Auto-Update` scale (10058:191272); `Continious` is Figma's spelling, kept for the diff. */
const AUTO_UPDATE = ['1', '2', '3', '4', '5', '6', 'Continious'];
/** The drawn `Detection Sensivity` scale (11870:6064): positions 0, 5, 10 of `0…10`. */
const SENSITIVITY = ['Less Sensitive', 'Default', 'More Sensitive'];

function inputOf(root: HTMLElement) {
    return root.querySelector<HTMLInputElement>('input[type="range"]')!;
}

/** `Slider` takes no `aria-label`: `Field.Label` names it. Drawn Mobile width 327px. */
function Labelled({ label, ...props }: SliderProps & { label: string }) {
    return (
        <Field.Root className="w-[327px]">
            <Field.Label>{label}</Field.Label>
            <Slider {...props} />
        </Field.Root>
    );
}

const meta = {
    title: 'UI/Slider',
    component: Slider,
    args: {
        min: 0,
        max: 2,
        defaultValue: 1,
        labels: PRIORITY,
        disabled: false,
        showIndicator: true,
        origin: 'start',
        ticks: false,
        highlightActiveLabel: false,
        onValueChange: fn(),
        onValueCommitted: fn(),
    },
    argTypes: {
        origin: { control: 'inline-radio', options: ['start', 'center'] },
        disabled: { control: 'boolean' },
        showIndicator: { control: 'boolean' },
        ticks: { control: 'boolean' },
        highlightActiveLabel: { control: 'boolean' },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}9850-118472` } },
    render: function Render(args) {
        return <Labelled {...args} label="Aeration priority" />;
    },
} satisfies Meta<typeof Slider>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Range reaches the input; arrows move by `step`, clamp at the ends; focus sits on the input, not the thumb. */
export const Default: Story = {
    args: { max: 6, step: 2, defaultValue: 2, labels: undefined },
    parameters: { design: { type: 'figma', url: `${FIGMA}8217-8122` } },
    play: async ({ canvas, canvasElement, args, userEvent }) => {
        const input = inputOf(canvasElement);
        await expect(input).toHaveAttribute('min', '0');
        await expect(input).toHaveAttribute('max', '6');
        await expect(input).toHaveAttribute('step', '2');
        await expect(input).toHaveAttribute('aria-valuenow', '2');
        await expect(input).not.toHaveAttribute('aria-valuetext');
        await expect(await canvas.findByRole('slider', { name: 'Aeration priority' })).toBe(input);

        await userEvent.tab();
        await expect(input).toHaveFocus();
        await expect(input.parentElement!.matches(':focus-visible')).toBe(false);
        await userEvent.keyboard('{ArrowRight}');
        await expect(args.onValueChange).toHaveBeenLastCalledWith(4, expect.anything());
        await userEvent.keyboard('{ArrowLeft}');
        await expect(args.onValueChange).toHaveBeenLastCalledWith(2, expect.anything());
        await expect(args.onValueChange).toHaveBeenCalledTimes(2);
        await expect(args.onValueCommitted).toHaveBeenLastCalledWith(2, expect.anything());

        await userEvent.keyboard('{End}{ArrowRight}');
        await expect(args.onValueChange).toHaveBeenLastCalledWith(6, expect.anything());
        await expect(args.onValueChange).toHaveBeenCalledTimes(3);
        await userEvent.keyboard('{Home}');
        await expect(args.onValueChange).toHaveBeenLastCalledWith(0, expect.anything());
    },
};

/** Scale row is a plain `<div>` (not `<output>`/live region), labels are bare spans; string label → valuetext. */
export const ThreePosition: Story = {
    args: { value: 2, defaultValue: undefined },
    parameters: { design: { type: 'figma', url: `${FIGMA}9850-118483` } },
    play: async ({ canvas, canvasElement }) => {
        const input = inputOf(canvasElement);
        await expect(input).toHaveAttribute('aria-valuetext', 'High');
        const scale = canvas.getByText('High').parentElement!;
        await expect(scale.tagName).toBe('DIV');
        await expect(scale).not.toHaveAttribute('for');
        await expect(scale).not.toHaveAttribute('aria-hidden');
        await expect(canvas.queryByRole('status')).toBeNull();
        for (const label of Array.from(scale.children)) {
            await expect(label.tagName).toBe('SPAN');
        }
    },
};

/** Seven positions; `Continious` announced, not `7`. */
export const SevenPosition: Story = {
    args: { max: 6, value: 6, defaultValue: undefined, labels: AUTO_UPDATE },
    parameters: { design: { type: 'figma', url: `${FIGMA}9850-118493` } },
    play: async ({ canvasElement }) => {
        await expect(inputOf(canvasElement)).toHaveAttribute('aria-valuetext', 'Continious');
    },
};

/** Exact match only: between positions nothing is highlighted and no valuetext is set. */
export const Highlighted: Story = {
    args: { step: 0.5, value: 1.5, defaultValue: undefined, highlightActiveLabel: true },
    play: async ({ canvasElement }) => {
        const input = inputOf(canvasElement);
        await expect(input).not.toHaveAttribute('aria-valuetext');
        await expect(input).toHaveAttribute('aria-valuenow', '1.5');
    },
};

/** `ReactNode` labels have no text to announce. */
export const ReactNodeLabels: Story = {
    args: {
        max: 1,
        value: 0,
        defaultValue: undefined,
        highlightActiveLabel: true,
        labels: [<span key="less">&darr; less</span>, 'Speed'],
    },
    play: async ({ canvasElement }) => {
        await expect(inputOf(canvasElement)).not.toHaveAttribute('aria-valuetext');
    },
};

/** Preference axis (11239:5902): no fill. */
export const WithoutIndicator: Story = {
    args: {
        max: 1,
        step: 0.01,
        value: 0.65,
        defaultValue: undefined,
        labels: ['Accuracy', 'Speed'],
        showIndicator: false,
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}11239-5902` } },
    play: async ({ canvasElement }) => {
        await expect(inputOf(canvasElement)).toHaveAttribute('aria-valuenow', '0.65');
    },
};

/** Invented (no Figma cell): `opacity-50` over the whole control; the keyboard is refused. */
export const Disabled: Story = {
    args: { disabled: true },
    // color-contrast off: dimmed scale labels; WCAG 1.4.3 exempts inactive UI, which axe can't infer here.
    parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
    play: async ({ canvasElement, args, userEvent }) => {
        const input = inputOf(canvasElement);
        await expect(input).toBeDisabled();
        await userEvent.tab();
        await userEvent.keyboard('{ArrowRight}');
        await expect(args.onValueChange).not.toHaveBeenCalled();
    },
};

/** `Field` composition: label names it, description describes it, `disabled` is inherited. */
export const InField: Story = {
    render: function InField(args) {
        return (
            <div className="flex w-[327px] flex-col gap-xl">
                <Field.Root name="priority">
                    <Field.Label>Aeration priority</Field.Label>
                    <Slider {...args} />
                    <Field.Description>Low, Medium or High.</Field.Description>
                </Field.Root>
                <Field.Root name="priority-disabled" disabled>
                    <Field.Label>Disabled priority</Field.Label>
                    {/* No scale: dimmed labels trip axe contrast (see `Disabled`). */}
                    <Slider {...args} labels={undefined} />
                </Field.Root>
            </div>
        );
    },
    play: async ({ canvas }) => {
        const slider = await canvas.findByRole('slider', { name: 'Aeration priority' });
        await expect(slider).toHaveAccessibleDescription('Low, Medium or High.');
        await expect(await canvas.findByRole('slider', { name: 'Disabled priority' })).toBeDisabled();
    },
};

/** Plain `useState`. */
export const Controlled: Story = {
    render: function Controlled(args) {
        const [value, setValue] = useState(1);

        return (
            <div className="flex flex-col gap-s">
                <Labelled
                    {...args}
                    label="Aeration priority"
                    defaultValue={undefined}
                    value={value}
                    onValueChange={(next, details) => {
                        setValue(next);
                        args.onValueChange?.(next, details);
                    }}
                />
                <span className="text-caption-m text-text-general-medium">value: {value}</span>
            </div>
        );
    },
    play: async ({ canvas, args, userEvent }) => {
        // Wait for mount: in a production build `tab()` can run before the input exists.
        const slider = await canvas.findByRole('slider', { name: 'Aeration priority' });
        await userEvent.tab();
        await expect(slider).toHaveFocus();
        await userEvent.keyboard('{ArrowRight}');
        await expect(await canvas.findByText('value: 2')).toBeVisible();
        await expect(args.onValueChange).toHaveBeenCalledWith(2, expect.anything());
    },
};

/** `origin="center"` + `ticks`: 2px track, 11 dots, a 2×8 midpoint bar; the fill grows from the middle. */
export const CenterOrigin: Story = {
    args: {
        max: 10,
        value: 8,
        defaultValue: undefined,
        origin: 'center',
        ticks: true,
        labels: SENSITIVITY,
        highlightActiveLabel: true,
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}11870-6064` } },
    play: async ({ canvasElement }) => {
        const ticks = canvasElement.querySelector('[data-slider-ticks]')!;
        await expect(ticks).toHaveAttribute('aria-hidden', 'true');
        await expect(ticks).toHaveTextContent('');
        await expect(ticks.children).toHaveLength(11);
    },
};

/** Every drawn instance plus the invented cells, for side-by-side review against Figma. */
export const Matrix: Story = {
    render: function Matrix() {
        const cells: (SliderProps & { label: string })[] = [
            { label: 'Priority min — 8217:8122', min: 0, max: 2, value: 0, labels: PRIORITY },
            { label: 'Priority middle — 9850:118473', min: 0, max: 2, value: 1, labels: PRIORITY },
            { label: 'Priority max — 9850:118483', min: 0, max: 2, value: 2, labels: PRIORITY },
            { label: 'Auto-Update 0 — 10061:199808', min: 0, max: 6, value: 0, labels: AUTO_UPDATE },
            { label: 'Auto-Update 2 — 10058:191272', min: 0, max: 6, value: 2, labels: AUTO_UPDATE },
            { label: 'Auto-Update 6 — 9850:118493', min: 0, max: 6, value: 6, labels: AUTO_UPDATE },
            {
                label: 'Preference axis — 11239:5902',
                min: 0,
                max: 1,
                step: 0.01,
                value: 0.65,
                labels: ['Accuracy', 'Speed'],
                showIndicator: false,
            },
            {
                label: 'Sensitivity midpoint — 12334:309319',
                min: 0,
                max: 10,
                value: 5,
                origin: 'center',
                ticks: true,
                labels: SENSITIVITY,
                highlightActiveLabel: true,
            },
            {
                label: 'Sensitivity left of midpoint',
                min: 0,
                max: 10,
                value: 1,
                origin: 'center',
                ticks: true,
                labels: SENSITIVITY,
                highlightActiveLabel: true,
            },
            { label: 'Ticks, start origin (invented)', min: 0, max: 10, value: 3, ticks: true, labels: SENSITIVITY },
            {
                label: 'Crowded labels (invented)',
                min: 0,
                max: 4,
                value: 2,
                labels: ['Very low', 'Below normal', 'Normal', 'Above normal', 'Very high'],
            },
            { label: 'Disabled (invented)', min: 0, max: 2, value: 1, disabled: true },
        ];

        return (
            <div className="grid grid-cols-2 gap-x-3xl gap-y-xl">
                {cells.map((cell) => {
                    return <Labelled key={cell.label} {...cell} />;
                })}
            </div>
        );
    },
};
