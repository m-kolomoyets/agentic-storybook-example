import type { ReactNode } from 'react';
import type { FanDialMode, FanDialProps } from '.';
import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { FanDial } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

// What the adapter hands a running fan with a window under way.
const RUN = { progress: 0.62, status: 'RUNNING', timer: '01:58:01' } as const;

const MODES_DRAWN = [
    ['none', 'No Mode'],
    ['custom', 'Custom'],
    ['cool', 'Cooling'],
    ['dry', 'Drying'],
    ['recondition', 'Recondition'],
    ['manual', 'Manual'],
] as const satisfies readonly (readonly [FanDialMode, string])[];

// `manual` is drawn only while running; idle it falls back to `none`.
const IDLE_MODES = MODES_DRAWN.filter(([mode]) => {
    return mode !== 'manual';
});

// Freezes the crest at its peak: `paused` alone leaves it at the trough (`opacity-0`).
const PEAK = '[&_[data-part=fill]]:opacity-100';

/*
 * Every story but `Motion` passes `paused` (amber ADR-0013's freeze), so each test renders one
 * deterministic frame: no spin, no pulse — screenshots and axe never race the animation.
 */
const meta = preview.meta({
    title: 'UI/FanDial',
    component: FanDial,
    args: { ...RUN, state: 'running', mode: 'cool', paused: true },
    argTypes: {
        state: {
            control: 'select',
            options: ['ready', 'running', 'offline', 'interrupted', 'critical', 'updating'],
        },
        mode: { control: 'select', options: ['none', 'cool', 'dry', 'recondition', 'custom', 'manual'] },
        size: { control: 'inline-radio', options: ['regular', 'small'] },
        gauge: { control: 'inline-radio', options: ['segment', 'progress'] },
        progress: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
        label: { control: 'text' },
        status: { control: 'text' },
        timer: { control: 'text' },
        orbRef: { control: false },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}11440-9451` } },
});

function getDial(canvasElement: HTMLElement) {
    const dial = canvasElement.querySelector<HTMLElement>('[data-state]');
    if (!dial) {
        throw new Error('FanDial root not rendered');
    }
    return dial;
}

function part(canvasElement: HTMLElement, name: string) {
    return canvasElement.querySelector<HTMLElement>(`[data-part="${name}"]`);
}

/** 11445:9913 — the reference cell. One `img` whose name carries state, mode and runtime. */
export const Default = meta.story({
    parameters: { design: { type: 'figma', url: `${FIGMA}11445-9913` } },
});

Default.test('one img named for state, mode and runtime; frozen', async ({ canvas, canvasElement }) => {
    const dial = canvas.getByRole('img', { name: 'Fan running, cooling mode, 1 hour 58 minutes remaining' });
    await expect(dial).toHaveAttribute('data-paused');
    await expect(dial).toHaveAttribute('data-mode', 'cool');
    // Frozen: the rotating group carries no spin flag and the crest has no animation.
    await expect(part(canvasElement, 'liveness')).not.toHaveAttribute('data-spinning');
    await expect(getComputedStyle(part(canvasElement, 'fill')!).animationName).toBe('none');
    // Segment gauge rides the liveness group; text stack is real DOM text.
    await expect(part(canvasElement, 'gauge-arc')).toBeInTheDocument();
    await expect(canvas.getByText('RUNNING')).toBeInTheDocument();
    await expect(canvas.getByText('01:58:01')).toBeInTheDocument();
});

/** Live: 3s crest pulse, 2.5s liveness spin. The only unfrozen test; it asserts motion, not pixels. */
Default.test('unpaused it pulses and spins', { args: { paused: false } }, async ({ canvasElement }) => {
    await expect(getDial(canvasElement)).not.toHaveAttribute('data-paused');
    await expect(part(canvasElement, 'liveness')).toHaveAttribute('data-spinning');
    await expect(getComputedStyle(part(canvasElement, 'fill')!).animationName).toBe('fan-dial-fill');
});

/** `critical`: mode arcs, red orb, still says RUNNING; the name adds the fault. */
Default.test(
    'critical adds the fault to the name, no crest',
    { args: { state: 'critical' } },
    async ({ canvas, canvasElement }) => {
        await canvas.findByRole('img', {
            name: 'Fan running, fault reported, cooling mode, 1 hour 58 minutes remaining',
        });
        // No crest in `critical`: the pulse lives on the orb wrapper, and paused drops it.
        await expect(part(canvasElement, 'fill')).toBeNull();
        await expect(part(canvasElement, 'pulse')?.className).not.toContain('animate-pulse');
    }
);

/** Without a `status` string the state names itself; `progress` stands in for a missing timer. */
Default.test(
    'progress stands in for a missing timer',
    { args: { status: undefined, timer: undefined, progress: 0.25 } },
    async ({ canvas }) => {
        await canvas.findByRole('img', { name: 'Fan running, cooling mode, 25% of run window remaining' });
    }
);

/** Infinite run: `"∞"` reads as "runs until stopped". */
Default.test(
    'an infinite timer reads as runs until stopped',
    { args: { mode: 'manual', timer: '∞' } },
    async ({ canvas }) => {
        await canvas.findByRole('img', { name: 'Fan running, manual mode, runs until stopped' });
    }
);

/** `progress` is clamped, not validated: out-of-range and NaN never throw. */
Default.test(
    'progress is clamped',
    { args: { status: undefined, timer: undefined, progress: 3, gauge: 'progress' } },
    async ({ canvas, canvasElement }) => {
        await canvas.findByRole('img', { name: 'Fan running, cooling mode, 100% of run window remaining' });
        await expect(getDial(canvasElement).style.getPropertyValue('--fan-dial-sweep')).toBe('360deg');
    }
);

/** Ready idle fan with a fault: red rim and the error circle badge. `manual` idle falls back to `none`. */
Default.test(
    'ready with error shows the badge; idle manual falls back to none',
    { args: { state: 'ready', mode: 'manual', error: true, status: 'OFF', timer: undefined, progress: 0 } },
    async ({ canvas, canvasElement }) => {
        await canvas.findByRole('img', { name: 'Fan off, fault reported' });
        await expect(getDial(canvasElement)).toHaveAttribute('data-mode', 'none');
        await expect(part(canvasElement, 'error-badge')).toBeInTheDocument();
        // No run → no liveness group.
        await expect(part(canvasElement, 'liveness')).toBeNull();
    }
);

/** CO2 alert wins the single badge slot over `error`. */
Default.test(
    'co2 alert wins the badge slot over error',
    { args: { error: true, co2Alert: true } },
    async ({ canvas, canvasElement }) => {
        await canvas.findByRole('img', { name: /fault reported, CO2 alert$/ });
        await expect(part(canvasElement, 'co2-badge')).toBeInTheDocument();
        await expect(part(canvasElement, 'error-badge')).toBeNull();
    }
);

/** 11452:7491 — violet attention overlay. */
Default.test(
    'attention names itself',
    { args: { state: 'ready', attention: true, status: 'ATTENTION', timer: undefined, progress: 0 } },
    async ({ canvas }) => {
        await canvas.findByRole('img', { name: 'Fan attention, cooling mode, needs attention' });
    }
);

/** 13876:376172 — `updating` is neutral whatever the mode: `none` tint, crest breathes, no arcs. */
Default.test(
    'updating is neutral whatever the mode',
    { args: { state: 'updating', status: 'UPDATING', timer: undefined, progress: 0 } },
    async ({ canvas, canvasElement }) => {
        await canvas.findByRole('img', { name: 'Fan updating' });
        await expect(getDial(canvasElement)).toHaveAttribute('data-mode', 'none');
        await expect(part(canvasElement, 'fill')).toBeInTheDocument();
        await expect(part(canvasElement, 'liveness')).toBeNull();
    }
);

/** Offline: the liveness arc drawn at rest, never spinning. */
Default.test(
    'offline draws the liveness arc at rest',
    { args: { state: 'offline', paused: false, status: 'OFFLINE', timer: undefined } },
    async ({ canvasElement }) => {
        await expect(part(canvasElement, 'liveness')).toBeInTheDocument();
        await expect(part(canvasElement, 'liveness')).not.toHaveAttribute('data-spinning');
    }
);

/** 11446:7790 — `small` is a crop: text hidden, hairline ring drawn. Decorative → out of the a11y tree. */
Default.test(
    'small decorative is out of the a11y tree',
    { args: { state: 'ready', size: 'small', decorative: true, status: undefined, timer: undefined, progress: 0 } },
    async ({ canvas, canvasElement }) => {
        await expect(canvas.queryByRole('img')).toBeNull();
        await expect(getDial(canvasElement)).toHaveAttribute('aria-hidden', 'true');
        await expect(part(canvasElement, 'hairline-ring')).toBeInTheDocument();
        await expect(canvas.queryByText('STATUS')).toBeNull();
    }
);

/** A caller-supplied name replaces the generated sentence. */
Default.test('aria-label replaces the generated name', { args: { 'aria-label': 'Bin 4 fan' } }, async ({ canvas }) => {
    await canvas.findByRole('img', { name: 'Bin 4 fan' });
});

/** `gauge="progress"` at five lengths: tail at 12 o'clock, bright head travels. */
export const Progress = meta.story({
    render: function Progress(args) {
        return (
            <div className="flex flex-wrap gap-xl">
                {[0, 0.25, 0.5, 0.75, 1].map((progress) => {
                    return <FanDial key={progress} {...args} gauge="progress" progress={progress} />;
                })}
            </div>
        );
    },
});

Progress.test('five arcs, the empty one flagged', async ({ canvasElement }) => {
    const arcs = canvasElement.querySelectorAll('[data-part="gauge-arc"]');
    await expect(arcs).toHaveLength(5);
    await expect(arcs[0]).toHaveAttribute('data-empty');
});

function Cell({ name, ...props }: FanDialProps & { name: string }) {
    return (
        <div className="flex w-fit flex-col gap-s">
            <span className="text-caption-m text-text-general-medium">{name}</span>
            <FanDial {...props} paused />
        </div>
    );
}

function Row({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-l">
            <h2 className="text-heading-s">{title}</h2>
            <div className="flex flex-wrap gap-xl">{children}</div>
        </section>
    );
}

/** Every state × mode production derives, all frozen, for review against Figma. */
export const Matrix = meta.story({
    parameters: {
        layout: 'padded',
        design: [
            { name: 'Running', type: 'figma', url: `${FIGMA}11445-9913` },
            { name: 'Attention', type: 'figma', url: `${FIGMA}11452-7491` },
            { name: 'Updating', type: 'figma', url: `${FIGMA}13876-376172` },
            { name: 'Small', type: 'figma', url: `${FIGMA}11446-7790` },
        ],
    },
    render: function Matrix() {
        return (
            <div className="flex flex-col gap-4xl">
                <Row title="Ready">
                    {IDLE_MODES.map(([mode, name]) => {
                        return <Cell key={mode} name={`Ready, ${name}`} mode={mode} status="OFF" />;
                    })}
                </Row>
                <Row title="Ready + Error">
                    {IDLE_MODES.map(([mode, name]) => {
                        return <Cell key={mode} name={`Ready, ${name}, Error`} mode={mode} error status="OFF" />;
                    })}
                </Row>
                <Row title="Running — trough">
                    {MODES_DRAWN.map(([mode, name]) => {
                        return <Cell key={mode} name={`Running, ${name}`} state="running" mode={mode} {...RUN} />;
                    })}
                </Row>
                <Row title="Running/Filled — peak">
                    {MODES_DRAWN.map(([mode, name]) => {
                        return (
                            <Cell
                                key={mode}
                                name={`Running/Filled, ${name}`}
                                className={PEAK}
                                state="running"
                                mode={mode}
                                {...RUN}
                            />
                        );
                    })}
                </Row>
                <Row title="Critical">
                    {MODES_DRAWN.map(([mode, name]) => {
                        return <Cell key={mode} name={`Critical, ${name}`} state="critical" mode={mode} {...RUN} />;
                    })}
                </Row>
                <Row title="Updating">
                    <Cell name="Updating, trough" state="updating" status="UPDATING" />
                    <Cell name="Updating, peak" className={PEAK} state="updating" status="UPDATING" />
                </Row>
                <Row title="Offline / Interrupted">
                    {IDLE_MODES.map(([mode, name]) => {
                        return (
                            <Cell
                                key={`offline-${mode}`}
                                name={`Offline, ${name}`}
                                state="offline"
                                mode={mode}
                                progress={0.62}
                                status="OFFLINE"
                            />
                        );
                    })}
                    {IDLE_MODES.map(([mode, name]) => {
                        return (
                            <Cell
                                key={`interrupted-${mode}`}
                                name={`Interrupted, ${name}`}
                                state="interrupted"
                                mode={mode}
                                progress={0.62}
                                status="INTERRUPTED"
                            />
                        );
                    })}
                </Row>
                <Row title="Size=Small">
                    {IDLE_MODES.map(([mode, name]) => {
                        return <Cell key={mode} name={`Ready, ${name}, Small`} decorative size="small" mode={mode} />;
                    })}
                </Row>
            </div>
        );
    },
});
