import type { ReactNode, Ref } from 'react';

/** Not a "fan status" (domain enum `unknown | stopped | pending | running`). */
export type FanDialState =
    /** Idle and well. No arcs. */
    | 'ready'
    /** Run under way. Both arcs, pulsing halo; orb drawn as `ready`. */
    | 'running'
    /** Controller unreachable. Red, static. */
    | 'offline'
    /** Scheduled run did not start. Yellow, static (pulsing would read as activity). */
    | 'interrupted'
    /** Run under way and faulty: mode-tinted arcs, red orb. */
    | 'critical'
    /** Controllers applying a start/stop. `none` tint whatever the mode, static, no arcs (14695:482264). */
    | 'updating';

/**
 * Aeration goal the dial is tinted for. First five match the badge's aeration-mode words.
 * `manual` has no badge and is drawn only under `running` / `critical`.
 */
export type FanDialMode = 'none' | 'cool' | 'dry' | 'recondition' | 'custom' | 'manual';

export type FanDialSize = 'regular' | 'small';

export type FanDialGauge = 'segment' | 'progress';

export type FanDialProps = {
    /** @default 'ready' */
    state?: FanDialState;
    /**
     * Aeration goal tint. `'manual'` is only drawn under `running`/`critical`; elsewhere falls back
     * to `'none'` (no such Figma cell).
     * @default 'none'
     */
    mode?: FanDialMode;
    /** Red rim around the orb; overlays `mode`, does not replace it. */
    error?: boolean;
    /** Violet cell 11452:7491. Overlays like `error`. */
    attention?: boolean;
    /** CO2 alert: red triangle badge above the label (reserved for CO2). Wins over `error`'s circle. */
    co2Alert?: boolean;
    /**
     * `'small'` is a crop, not a smaller dial: same 375×333 drawing clipped to 351×166, text hidden
     * (11446:7790). Neither size scales to its container.
     * @default 'regular'
     */
    size?: FanDialSize;
    /**
     * Remaining runtime 0–1, clamped. Gauge arc drains as it falls.
     * @default 0
     */
    progress?: number;
    /** 8px tracked word above the status. Pass `null` for an empty line without reflow. @default 'STATUS' */
    label?: ReactNode;
    /** 20px line: `READY`, `RUNNING`, `OFFLINE`, `INTERRUPTED`, `ATTENTION`. */
    status?: ReactNode;
    /** Pill under the status, `hh:mm:ss`. Dial has no notion of infinite; pass `"∞"`. */
    timer?: ReactNode;
    /**
     * Freezes spin and pulse. Production surface (amber ADR-0013): email-capture routes render in
     * headless Chromium and need a deterministic frame. Not the reduced-motion path.
     */
    paused?: boolean;
    /** Text alternative; defaults to a sentence built from the props (`describeFanDial`). */
    'aria-label'?: string;
    /** Hides the dial from assistive tech when it illustrates a choice announced elsewhere. */
    decorative?: boolean;
    /** The orb's rim, for a caller to measure and scroll to. */
    orbRef?: Ref<HTMLDivElement>;
    /**
     * Outer gauge arc. `'segment'` (11830:210078): fixed-length arc riding the liveness arc's head,
     * drawn only with it; `progress` not shown. `'progress'`: length = `progress`, tail at 12 o'clock.
     * @default 'segment'
     */
    gauge?: FanDialGauge;
    className?: string;
    /** Test hook; the role is `img`, and one page can hold several dials. */
    'data-testid'?: string;
};
