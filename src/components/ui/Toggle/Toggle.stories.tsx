import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { Toggle } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

/** The caller's bare `<label>` — the only way `Toggle` gets a name. */
function Row({ children }: { children: ReactNode }) {
    return <label className="inline-flex items-center gap-m text-body-m text-text-general-strong">{children}</label>;
}

const meta = {
    title: 'UI/Toggle',
    component: Toggle,
    args: { disabled: false, onCheckedChange: fn() },
    argTypes: { disabled: { control: 'boolean' }, defaultChecked: { control: 'boolean' } },
    parameters: { design: { type: 'figma', url: `${FIGMA}9506-75537` } },
    render: function Render(args) {
        return (
            <Row>
                <Toggle {...args} />
                Run aeration
            </Row>
        );
    },
} satisfies Meta<typeof Toggle>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Role is `switch` whatever the export is called; clicking the label text toggles exactly once. */
export const Default: Story = {
    parameters: { design: { type: 'figma', url: `${FIGMA}9506-75538` } },
    play: async ({ canvas, args, userEvent }) => {
        const toggle = canvas.getByRole('switch', { name: 'Run aeration' });
        await expect(toggle).not.toBeChecked();
        await userEvent.click(canvas.getByText('Run aeration'));
        await expect(args.onCheckedChange).toHaveBeenCalledTimes(1);
        await expect(args.onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
        await expect(toggle).toBeChecked();
        await userEvent.keyboard(' ');
        await expect(toggle).not.toBeChecked();
    },
};

export const On: Story = {
    args: { defaultChecked: true },
    parameters: { design: { type: 'figma', url: `${FIGMA}9506-75536` } },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('switch')).toBeChecked();
    },
};

/** Drawn in the on position (9572:142613); disabled + off is invented — same colours, thumb left. */
export const Disabled: Story = {
    args: { disabled: true, defaultChecked: true },
    parameters: { design: { type: 'figma', url: `${FIGMA}9572-142613` } },
    play: async ({ canvas, args, userEvent }) => {
        const toggle = canvas.getByRole('switch');
        await expect(toggle).toHaveAttribute('aria-disabled', 'true');
        await userEvent.click(toggle);
        await expect(toggle).toBeChecked();
        await expect(args.onCheckedChange).not.toHaveBeenCalled();
    },
};

/** Plain `useState`. */
export const Controlled: Story = {
    render: function Controlled(args) {
        const [checked, setChecked] = useState(false);

        return (
            <div className="flex flex-col gap-m">
                <Row>
                    <Toggle
                        {...args}
                        checked={checked}
                        onCheckedChange={(next, details) => {
                            setChecked(next);
                            args.onCheckedChange?.(next, details);
                        }}
                    />
                    Run aeration
                </Row>
                <span className="text-caption-m text-text-general-medium">{checked ? 'on' : 'off'}</span>
            </div>
        );
    },
    play: async ({ canvas, args, userEvent }) => {
        await userEvent.click(canvas.getByRole('switch'));
        await expect(canvas.getByText('on')).toBeVisible();
        await expect(args.onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
    },
};

const STATES = ['default', 'focused', 'disabled'] as const;

/** Focus pinned with the same utilities the `focus-visible` gate applies. */
const FORCED: Record<(typeof STATES)[number], string> = {
    default: '',
    focused: 'outline-solid outline-1 outline-border-focused outline-offset-2',
    disabled: '',
};

/** off/on × default/focus-visible/disabled. Disabled + off is invented. */
export const Matrix: Story = {
    render: function Matrix() {
        return (
            <div className="grid grid-cols-4 items-center gap-l">
                <span />
                {STATES.map((state) => {
                    return (
                        <span key={state} className="text-caption-m text-text-general-medium">
                            {state}
                        </span>
                    );
                })}
                {[false, true].map((checked) => {
                    return [
                        <span key={`${checked}`} className="text-caption-m text-text-general-medium">
                            {checked ? 'on' : 'off'}
                        </span>,
                        ...STATES.map((state) => {
                            return (
                                <label key={`${checked}-${state}`} className="inline-flex">
                                    <Toggle
                                        checked={checked}
                                        disabled={state === 'disabled'}
                                        className={FORCED[state]}
                                    />
                                    <span className="sr-only">{`${checked ? 'on' : 'off'} ${state}`}</span>
                                </label>
                            );
                        }),
                    ];
                })}
            </div>
        );
    },
};
