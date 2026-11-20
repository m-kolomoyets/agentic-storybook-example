import type { AerationModeVariant } from '@/components/ui/Badge/utils/modeDot';
import type { ModeGroupItem, ModeGroupProps } from './types';
import { useState } from 'react';
import preview from '#.storybook/preview';
import { expect, fn } from 'storybook/test';
import { Field } from '@/components/ui/Field';
import { MODE_GROUP_DESKTOP_TILE_CLASSES, ModeGroup } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const ITEMS: ModeGroupItem[] = [
    { mode: 'cool', label: 'Cool' },
    { mode: 'dry', label: 'Dry' },
    { mode: 'recondition', label: 'Recondition' },
];

const meta = preview.meta({
    title: 'UI/ModeGroup',
    component: ModeGroup,
    args: { 'aria-label': 'Aeration mode', items: ITEMS, value: null, onValueChange: fn() },
    argTypes: {
        value: { control: 'inline-radio', options: [null, 'cool', 'dry', 'recondition', 'custom'] },
        disabled: { control: 'boolean' },
        invalid: { control: 'boolean' },
        items: { control: false },
    },
    decorators: [
        function MobileFrame(Story) {
            // Figma's 343px mobile row (10600:236415).
            return (
                <div className="w-[343px]">
                    <Story />
                </div>
            );
        },
    ],
    parameters: { design: { type: 'figma', url: `${FIGMA}9262-41931` } },
});

/** Playground — switch value/disabled/invalid in Controls. Every visual cell lives in `Matrix`. */
export const Default = meta.story({
    parameters: { design: { type: 'figma', url: `${FIGMA}10600-236415` } },
});

/** A named group of pressable tiles; nothing pressed; no invalid mark. Pressing reports the mode. */
Default.test('is a named group of tiles; pressing reports the mode', async ({ canvas, userEvent, args }) => {
    const group = canvas.getByRole('group', { name: 'Aeration mode' });
    await expect(group).not.toHaveAttribute('data-invalid');
    await expect(canvas.getAllByRole('button')).toHaveLength(3);
    const cool = canvas.getByRole('button', { name: 'Cool' });
    await expect(cool).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(canvas.getByRole('button', { name: 'Dry' }));
    await expect(args.onValueChange).toHaveBeenCalledWith('dry');
});

/** The dot is decorative: the tile's name is its label alone, not "Cool Cool". Re-press never emits. */
Default.test(
    'pressed tile is named by its label alone; re-press never emits',
    { args: { value: 'cool' } },
    async ({ canvas, userEvent, args }) => {
        const cool = canvas.getByRole('button', { name: 'Cool' });
        await expect(cool).toHaveAccessibleName('Cool');
        await expect(cool.querySelector('[aria-hidden="true"]')).not.toBeNull();
        await expect(cool).toHaveAttribute('aria-pressed', 'true');

        await userEvent.click(cool);
        await expect(args.onValueChange).not.toHaveBeenCalled();
    }
);

/** `invalid` marks the row `data-invalid` (strokes every tile). */
Default.test('invalid marks the row data-invalid', { args: { invalid: true } }, async ({ canvas }) => {
    await expect(canvas.getByRole('group', { name: 'Aeration mode' })).toHaveAttribute('data-invalid');
});

/** A surrounding `Field.Root invalid` marks the row too. */
Default.test(
    'a surrounding Field.Root invalid marks the row',
    {
        render: function InInvalidField(args: ModeGroupProps) {
            return (
                <Field.Root invalid>
                    <ModeGroup {...args} />
                </Field.Root>
            );
        },
    },
    async ({ canvas }) => {
        await expect(canvas.getByRole('group', { name: 'Aeration mode' })).toHaveAttribute('data-invalid');
    }
);

/** Whole group disabled, as the all-offline bar draws it; presses never emit. */
Default.test(
    'disabled group disables every tile; presses never emit',
    { args: { disabled: true, value: 'cool' } },
    async ({ canvas, userEvent, args }) => {
        for (const tile of canvas.getAllByRole('button')) {
            await expect(tile).toBeDisabled();
        }
        await userEvent.click(canvas.getByRole('button', { name: 'Dry' }));
        await expect(args.onValueChange).not.toHaveBeenCalled();
    }
);

/** One tile greyed; the rest stay live. */
Default.test(
    'a disabled item greys one tile; the rest stay live',
    { args: { items: [ITEMS[0]!, { ...ITEMS[1]!, disabled: true }, ITEMS[2]!] } },
    async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: 'Dry' })).toBeDisabled();
        await expect(canvas.getByRole('button', { name: 'Cool' })).toBeEnabled();
    }
);

/** Controlled round-trip: arrow keys move focus, Enter presses. */
export const Interactive = meta.story({
    render: function Interactive(args: ModeGroupProps) {
        const [mode, setMode] = useState<AerationModeVariant | null>(null);
        return (
            <ModeGroup
                {...args}
                value={mode}
                onValueChange={(next) => {
                    setMode(next);
                    args.onValueChange(next);
                }}
            />
        );
    },
});

Interactive.test('arrow keys move focus, Enter presses', async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Cool' }));
    await expect(canvas.getByRole('button', { name: 'Cool' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('button', { name: 'Dry' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('button', { name: 'Dry' })).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByRole('button', { name: 'Cool' })).toHaveAttribute('aria-pressed', 'false');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('dry');
});

/** Desktop row: `MODE_GROUP_DESKTOP_TILE_CLASSES` bumps tiles to 106px from `md:` up. */
export const Desktop = meta.story({
    args: { value: 'recondition', className: MODE_GROUP_DESKTOP_TILE_CLASSES },
    decorators: [
        function DesktopFrame(Story) {
            return (
                <div className="w-[560px]">
                    <Story />
                </div>
            );
        },
    ],
    parameters: { design: { type: 'figma', url: `${FIGMA}11555-437719` } },
});

Desktop.test('desktop tiles are 106px tall', async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Cool' }).getBoundingClientRect().height).toBe(106);
});

/** Every colourway pressed, plus invalid and disabled rows. */
export const Matrix = meta.story({
    parameters: {
        design: [
            { name: 'Default', type: 'figma', url: `${FIGMA}10600-236415` },
            { name: 'Pressed', type: 'figma', url: `${FIGMA}11089-138913` },
            { name: 'Disabled', type: 'figma', url: `${FIGMA}11089-143444` },
        ],
    },
    render: function Matrix() {
        const all: ModeGroupItem[] = [...ITEMS, { mode: 'custom', label: 'Custom' }];
        const rows: { label: string; props: Partial<ModeGroupProps> }[] = [
            ...all.map((item) => {
                return { label: `pressed ${item.mode}`, props: { value: item.mode } };
            }),
            { label: 'invalid', props: { invalid: true } },
            { label: 'disabled', props: { disabled: true, value: 'cool' as const } },
        ];
        return (
            <div className="flex flex-col gap-xl">
                {rows.map((row) => {
                    return (
                        <div key={row.label} className="flex flex-col gap-xs">
                            <span className="text-caption-m text-text-general-medium">{row.label}</span>
                            <ModeGroup
                                aria-label={row.label}
                                items={all}
                                value={null}
                                onValueChange={() => {}}
                                {...row.props}
                            />
                        </div>
                    );
                })}
            </div>
        );
    },
});
