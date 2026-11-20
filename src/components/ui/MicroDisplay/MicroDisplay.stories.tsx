import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { Meter } from '@/components/ui/Meter';
import { MicroDisplay } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = preview.meta({
    title: 'UI/MicroDisplay',
    component: MicroDisplay,
    args: {
        status: 'positive',
        title: 'Inventory',
        valueLabel: 'Bushels',
        value: '22,000',
        meter: <Meter value={95} variant="level" label="Bin fullness" caption="% Full" />,
    },
    argTypes: {
        status: { control: 'inline-radio', options: ['positive', 'warning', 'negative'] },
        tone: { control: 'inline-radio', options: ['default', 'positive', 'negative'] },
        headingLevel: { control: 'inline-radio', options: [2, 3, 4, 5, 6] },
        loading: { control: 'boolean' },
        meter: { control: false },
        value: { control: 'text' },
    },
    decorators: [
        function CardWidth(Story) {
            return (
                <div className="flex w-[22rem]">
                    <Story />
                </div>
            );
        },
    ],
    parameters: {
        design: [
            { name: 'MicroDisplay', type: 'figma', url: `${FIGMA}9256-44165` },
            { name: 'Loading', type: 'figma', url: `${FIGMA}14499-271398` },
        ],
    },
});

/** Playground — switch status/tone/heading level/loading in Controls. */
export const Default = meta.story();

/** A named group; the title is an `h3` carrying the status in words; label/value is a `<dl>` pair. */
Default.test('a named group with a status-bearing h3 and a dl pair', async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: /^Inventory ?, normal$/ });
    await expect(group).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { level: 3, name: /^Inventory ?, normal$/ })).toBeInTheDocument();
    await expect(canvas.getByRole('term')).toHaveTextContent('Bushels');
    await expect(canvas.getByRole('definition')).toHaveTextContent('22,000');
    await expect(canvas.getByRole('meter', { name: 'Bin fullness' })).toBeInTheDocument();
});

/** `negative` status + `negative` tone: the word carries the colour, the heading says "critical". */
Default.test(
    'negative status and tone read as critical and colour the value',
    {
        args: {
            status: 'negative',
            tone: 'negative',
            title: 'Fan',
            valueLabel: 'Status',
            value: 'OFFLINE',
            meter: <Meter value={0} variant="progress" label="Run window completion" caption="% Completion" />,
        },
    },
    async ({ canvas }) => {
        await expect(canvas.getByRole('heading', { name: /^Fan ?, critical$/ })).toBeInTheDocument();
        await expect(canvas.getByText('OFFLINE')).toHaveClass('text-text-negative');
    }
);

/** Caller-composed value, custom heading level and status wording. */
Default.test(
    'custom heading level and status wording',
    {
        args: {
            title: 'Fan',
            valueLabel: 'Status',
            value: 'ON | 0:53:12',
            tone: 'positive',
            headingLevel: 2,
            statusLabel: 'running',
            meter: <Meter value={35} variant="progress" label="Run window completion" caption="% Completion" />,
        },
    },
    async ({ canvas }) => {
        await expect(canvas.getByRole('heading', { level: 2, name: /^Fan ?, running$/ })).toBeInTheDocument();
    }
);

/** Figma `14499:271398`: the value box spins a labelled 12px loader; label and meter stay. */
Default.test('loading spins a labelled loader in the value box', { args: { loading: true } }, async ({ canvas }) => {
    await expect(canvas.getByRole('status', { name: 'Loading Bushels' })).toBeInTheDocument();
    await expect(canvas.getByRole('definition')).toHaveAttribute('aria-busy', 'true');
    await expect(canvas.queryByText('22,000')).toBeNull();
});

/** No meter: the card ends at the value box. */
Default.test('without a meter the card ends at the value box', { args: { meter: undefined } }, async ({ canvas }) => {
    await expect(canvas.queryByRole('meter')).toBeNull();
});

/** The dashboard row (desktop `11555:436601`, mobile `10600:236392`): same three cards at both widths. */
export const Row = meta.story({
    parameters: {
        design: [
            { name: 'Desktop row', type: 'figma', url: `${FIGMA}11555-436601` },
            { name: 'Mobile row', type: 'figma', url: `${FIGMA}10600-236392` },
        ],
        layout: 'padded',
    },
    decorators: [
        function Unconstrained(Story) {
            return <Story />;
        },
    ],
    render: function Row() {
        const cards = (
            <>
                <MicroDisplay
                    status="positive"
                    title="Fan"
                    valueLabel="Status"
                    value="ON | 0:53:12"
                    meter={<Meter value={83} variant="progress" label="Run window completion" caption="% Completion" />}
                />
                <MicroDisplay
                    status="positive"
                    title="Inventory"
                    valueLabel="Bushels"
                    value="22,000"
                    meter={<Meter value={95} variant="level" label="Bin fullness" caption="% Full" />}
                />
                <MicroDisplay
                    status="warning"
                    title="Grain Risk"
                    valueLabel="CO2 PPM"
                    value="1,205"
                    meter={<Meter value={78} variant="score" label="Grain risk" caption="Risk Score" />}
                />
            </>
        );
        return (
            <div className="flex flex-col gap-xl">
                <div className="flex w-[67rem] items-start gap-s">{cards}</div>
                <div className="flex w-[22rem] items-start gap-s">{cards}</div>
            </div>
        );
    },
});
