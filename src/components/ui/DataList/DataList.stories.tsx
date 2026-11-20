import InfoIcon from '@/assets/icons/info.svg?react';
import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { DataList } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = preview.meta({
    title: 'UI/DataList',
    component: DataList,
    args: {
        items: [
            { label: 'Grain Level', value: '44,7 BU' },
            { label: 'Estimated Airflow', value: '2,41 CFM/BU' },
            { label: 'Temperature Front', value: '6 hrs' },
            { label: 'Moisture Front', value: '311 hrs' },
        ],
    },
    parameters: {
        design: [
            { name: 'DataList', type: 'figma', url: `${FIGMA}10048-189245` },
            { name: 'With columns', type: 'figma', url: `${FIGMA}12067-339626` },
        ],
    },
    decorators: [
        function Card(Story) {
            return (
                <div className="w-[21.9375rem]">
                    <Story />
                </div>
            );
        },
    ],
});

/** Playground — edit `items` / `columns` in Controls (long values wrap; absence is the caller's string). */
export const Default = meta.story();

/** A `<dl>` of term/value pairs; hairline between rows, none above the first; 8px corner. */
Default.test('a dl of term/value pairs with hairlines between rows', async ({ canvasElement, canvas }) => {
    const list = canvasElement.querySelector('dl')!;
    await expect(getComputedStyle(list).borderTopLeftRadius).toBe('8px');
    const terms = canvas.getAllByRole('term');
    await expect(terms).toHaveLength(4);
    await expect(canvas.getAllByRole('definition')).toHaveLength(4);
    await expect(terms[0]).toHaveTextContent('Grain Level');
    const rows = list.querySelectorAll(':scope > div');
    await expect(getComputedStyle(rows[0]).borderTopWidth).toBe('0px');
    await expect(getComputedStyle(rows[1]).borderTopWidth).toBe('1px');
});

/** Column-heading row: `aria-hidden`, not a term/value pair. */
Default.test(
    'column-heading row is hidden, not a term',
    {
        args: {
            columns: { label: 'Alert', value: 'Threshold' },
            items: [
                { label: 'Inspect', value: '1000 PPM' },
                { label: 'Take action', value: '1500 PPM' },
            ],
        },
    },
    async ({ canvasElement, canvas }) => {
        await expect(canvasElement.querySelector('[data-columns]')).toHaveAttribute('aria-hidden', 'true');
        await expect(canvas.getAllByRole('term')).toHaveLength(2);
        await expect(canvas.queryByRole('term', { name: 'Alert' })).toBeNull();
    }
);

/** Info glyph after the label, at the drawn 4px. */
export const WithLabelAddons = meta.story({
    args: {
        items: [
            {
                label: 'Cooling Potential',
                value: '≥0.1 CFM/BU',
                labelAddon: <InfoIcon aria-hidden className="size-xl text-icons-general-medium" />,
            },
            {
                label: 'Moisture Potential',
                value: '≥0.8 CFM/BU',
                labelAddon: <InfoIcon aria-hidden className="size-xl text-icons-general-medium" />,
            },
        ],
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}10048-189453` } },
});
