import type { ReactNode } from 'react';
import type { CheckboxSize } from './types';
import { useState } from 'react';
import preview from '#.storybook/preview';
import { expect, fn } from 'storybook/test';
import { Checkbox } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/**
 * A caller's bare `<label>` — the only way `Checkbox` gets a name (it takes no `aria-label`).
 */
function CheckboxLabel({ children, srOnly = false }: { children: ReactNode; srOnly?: boolean }) {
    return (
        <label
            className={srOnly ? 'inline-flex' : 'inline-flex items-center gap-m text-body-m text-text-general-strong'}
        >
            {children}
        </label>
    );
}

const meta = preview.meta({
    title: 'UI/Checkbox',
    component: Checkbox,
    args: { size: 'md', disabled: false, onCheckedChange: fn() },
    argTypes: {
        size: { control: 'inline-radio', options: ['md', 'lg'] },
        disabled: { control: 'boolean' },
        indeterminate: { control: 'boolean' },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}9183-5528` } },
    render: function Render(args) {
        return (
            <CheckboxLabel>
                <Checkbox {...args} />
                Dry the bin
            </CheckboxLabel>
        );
    },
});

/** Playground — switch size/disabled/indeterminate in Controls. Every visual cell lives in `Matrix`. */
export const Default = meta.story({
    parameters: { design: { type: 'figma', url: `${FIGMA}9185-4488` } },
});

/** `md`, unchecked, at rest. Click toggles and reports the next state. */
Default.test('click and Space toggle and report the next state', async ({ canvas, args, userEvent }) => {
    const box = canvas.getByRole('checkbox', { name: 'Dry the bin' });
    await expect(box).not.toBeChecked();
    await userEvent.click(box);
    await expect(box).toBeChecked();
    await expect(args.onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
    await userEvent.keyboard(' ');
    await expect(box).not.toBeChecked();
});

/** The tick is a transparent hole knocked out of a solid square, not a layered glyph. */
Default.test('defaultChecked starts checked', { args: { defaultChecked: true, size: 'lg' } }, async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox')).toBeChecked();
});

/** Base UI re-asserts `indeterminate` after every click — the caller clears it (see `Controlled`). */
Default.test(
    'indeterminate stays mixed after a click',
    { args: { indeterminate: true } },
    async ({ canvas, userEvent }) => {
        const box = canvas.getByRole('checkbox');
        await expect(box).toHaveAttribute('aria-checked', 'mixed');
        await userEvent.click(box);
        await expect(box).toHaveAttribute('aria-checked', 'mixed');
    }
);

/** 6% glyph; clicks are ignored. */
Default.test('disabled ignores clicks', { args: { disabled: true } }, async ({ canvas, args, userEvent }) => {
    const box = canvas.getByRole('checkbox');
    await expect(box).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(box);
    await expect(box).not.toBeChecked();
    await expect(args.onCheckedChange).not.toHaveBeenCalled();
});

/** No `label` prop: a caller's bare `<label>` supplies the name. Clicking the text toggles exactly once. */
Default.test(
    'clicking the label text toggles exactly once',
    { args: { name: 'dry' } },
    async ({ canvas, userEvent }) => {
        const box = canvas.getByRole('checkbox', { name: 'Dry the bin' });
        await userEvent.click(canvas.getByText('Dry the bin'));
        await expect(box).toBeChecked();
    }
);

/** Plain `useState`: starts mixed, the caller clears `indeterminate` on the first change. */
export const Controlled = meta.story({
    render: function Controlled(args) {
        const [checked, setChecked] = useState(false);
        const [indeterminate, setIndeterminate] = useState(true);

        return (
            <div className="flex flex-col gap-m text-body-m text-text-general-strong">
                <CheckboxLabel>
                    <Checkbox
                        checked={checked}
                        indeterminate={indeterminate}
                        onCheckedChange={(next, details) => {
                            setIndeterminate(false);
                            setChecked(next);
                            args.onCheckedChange?.(next, details);
                        }}
                    />
                    Starts mixed, clears on the first click
                </CheckboxLabel>
                <span className="text-caption-m text-text-general-medium">
                    checked: {String(checked)} · indeterminate: {String(indeterminate)}
                </span>
            </div>
        );
    },
});

Controlled.test('caller clears indeterminate on the first change', async ({ canvas, args, userEvent }) => {
    const box = canvas.getByRole('checkbox');
    await expect(box).toHaveAttribute('aria-checked', 'mixed');
    await userEvent.click(box);
    await expect(box).toBeChecked();
    await expect(args.onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
    await expect(canvas.getByText('checked: true · indeterminate: false')).toBeVisible();
});

const STATES = ['default', 'hover', 'pressed', 'focused', 'disabled'] as const;
const STATUSES = ['unchecked', 'checked', 'indeterminate'] as const;
const SIZES: CheckboxSize[] = ['lg', 'md'];

/** Pins for states a static canvas can't trigger — the same tokens the component's gates apply. */
const FORCED: Record<(typeof STATES)[number], string> = {
    default: '',
    hover: 'text-border-control-hover',
    // No Figma cell binds this token; without it there is no pointer-down feedback.
    pressed: 'text-border-control-pressed',
    // Figma `State=Active` (9183:5532), shipped as `focus-visible`.
    focused: 'text-border-focused',
    disabled: '',
};

/**
 * Every size × status × state. Rest column ≈1.4:1 over the ground (WCAG 1.4.11 wants 3:1) — token defect,
 * shipped as drawn.
 */
export const Matrix = meta.story({
    parameters: {
        design: [
            { name: 'Unchecked', type: 'figma', url: `${FIGMA}9185-4488` },
            { name: 'Checked', type: 'figma', url: `${FIGMA}9183-5526` },
            { name: 'Indeterminate', type: 'figma', url: `${FIGMA}9185-4452` },
            { name: 'Disabled', type: 'figma', url: `${FIGMA}9183-5535` },
        ],
        // The one billed Chromatic snapshot for Checkbox (preview disables the rest).
        chromatic: { disableSnapshot: false },
    },
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-xl">
                {SIZES.map((size) => {
                    return (
                        <div key={size} className="grid grid-cols-6 items-center gap-l">
                            <span className="text-body-s-semibold text-text-general-strong">{size}</span>
                            {STATES.map((state) => {
                                return (
                                    <span key={state} className="text-caption-m text-text-general-medium">
                                        {state}
                                    </span>
                                );
                            })}
                            {STATUSES.map((status) => {
                                return [
                                    <span key={status} className="text-caption-m text-text-general-medium">
                                        {status}
                                    </span>,
                                    ...STATES.map((state) => {
                                        return (
                                            <CheckboxLabel key={`${status}-${state}`} srOnly>
                                                <Checkbox
                                                    size={size}
                                                    checked={status === 'checked'}
                                                    indeterminate={status === 'indeterminate'}
                                                    disabled={state === 'disabled'}
                                                    className={FORCED[state]}
                                                />
                                                <span className="sr-only">{`${size} ${status} ${state}`}</span>
                                            </CheckboxLabel>
                                        );
                                    }),
                                ];
                            })}
                        </div>
                    );
                })}
            </div>
        );
    },
});
