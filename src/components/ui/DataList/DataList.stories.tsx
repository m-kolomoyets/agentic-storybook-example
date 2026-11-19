import type { Meta, StoryObj } from '@storybook/react-vite';
import InfoIcon from '@/assets/icons/info.svg?react';
import { expect } from 'storybook/test';
import { DataList } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = {
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
    parameters: { design: { type: 'figma', url: `${FIGMA}10048-189245` } },
    decorators: [
        function Card(Story) {
            return (
                <div className="w-[21.9375rem]">
                    <Story />
                </div>
            );
        },
    ],
} satisfies Meta<typeof DataList>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A `<dl>` of term/value pairs; hairline between rows, none above the first; 8px corner. */
export const Default: Story = {
    play: async ({ canvasElement, canvas }) => {
        const list = canvasElement.querySelector('dl')!;
        await expect(getComputedStyle(list).borderTopLeftRadius).toBe('8px');
        const terms = canvas.getAllByRole('term');
        await expect(terms).toHaveLength(4);
        await expect(canvas.getAllByRole('definition')).toHaveLength(4);
        await expect(terms[0]).toHaveTextContent('Grain Level');
        const rows = list.querySelectorAll(':scope > div');
        await expect(getComputedStyle(rows[0]).borderTopWidth).toBe('0px');
        await expect(getComputedStyle(rows[1]).borderTopWidth).toBe('1px');
    },
};

/** Info glyph after the label, at the drawn 4px. */
export const WithLabelAddons: Story = {
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
};

/** Long values wrap; absence is the caller's formatted string. */
export const LongAndMissingValues: Story = {
    args: {
        items: [
            { label: 'Start–End', value: 'Apr 21, 3:58 AM → Apr 22, 4:30 PM' },
            { label: 'Start Reason', value: 'Custom Scheduled Start' },
            { label: 'Avg Amp Draw', value: 'N/A' },
            { label: 'Exhaust Temperature', value: '—' },
        ],
    },
};

export const SingleRow: Story = {
    args: { items: [{ label: 'Run Time', value: '36h 31m' }] },
};

/** Column-heading row: `aria-hidden`, not a term/value pair. */
export const WithColumns: Story = {
    args: {
        columns: { label: 'Alert', value: 'Threshold' },
        items: [
            { label: 'Inspect', value: '1000 PPM' },
            { label: 'Take action', value: '1500 PPM' },
        ],
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}12067-339626` } },
    play: async ({ canvasElement, canvas }) => {
        await expect(canvasElement.querySelector('[data-columns]')).toHaveAttribute('aria-hidden', 'true');
        await expect(canvas.getAllByRole('term')).toHaveLength(2);
        await expect(canvas.queryByRole('term', { name: 'Alert' })).toBeNull();
    },
};
