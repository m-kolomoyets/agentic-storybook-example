import type { FanDialMode, FanDialState } from '../types';

/*
 * Colour recipe: class constants per mode / state / flag. Raw palette steps on purpose — no
 * mode-shaped semantic token exists. `--color-*: initial` means an undefined step paints nothing
 * silently (`blue-150` does not exist; plate is `dark-violet-900`, not `-850`).
 *
 * Custom properties are declared on the root and inherited; a new mode is a colour triplet
 * (amber ADR-0012). Each must be registered with `@property` in tokens-supplement.css or the root
 * transition steps instead of fading. Mode sets the arcs; state sets the orb and may overrule.
 */

/** Base plate and orb (`#15171b`). */
export const FAN_DIAL_PLATE_FILL = 'fill-dark-violet-900';

/** Outer circle and tick ring. */
export const FAN_DIAL_RING_STROKE = 'stroke-grey-500';

/** Inner circle: a step darker than the outer, drawn at `opacity 0.5`. */
export const FAN_DIAL_INNER_RING_STROKE = 'stroke-grey-550';

/**
 * Per-mode arc/glow triplet, gauge ramp and `Running/Filled` crest inks. Complete class strings
 * only: Tailwind scans source text. `recondition` is the only mode with an orb wash; `none` has no crest.
 */
export const FAN_DIAL_MODE_TINT: Record<FanDialMode, string> = {
    none: '[--fan-dial-arc-bright:var(--color-grey-250)] [--fan-dial-arc-mid:var(--color-grey-400)] [--fan-dial-gauge-fade:var(--color-grey-250)] [--fan-dial-gauge-head:var(--color-grey-400)] [--fan-dial-gauge-mid:var(--color-grey-400)] [--fan-dial-live-bloom:var(--fan-dial-arc-bright)] [--fan-dial-live-line:var(--fan-dial-arc-mid)] [--fan-dial-glow:var(--color-grey-400)]',
    cool: '[--fan-dial-arc-bright:var(--color-blue-100)] [--fan-dial-arc-mid:var(--color-blue-300)] [--fan-dial-fill-glow:var(--color-cyan-100)] [--fan-dial-fill-orb:var(--color-cyan-600)] [--fan-dial-fill-wash:var(--color-blue-1000)] [--fan-dial-gauge-fade:var(--color-blue-100)] [--fan-dial-gauge-head:var(--color-blue-550)] [--fan-dial-gauge-mid:var(--color-blue-300)] [--fan-dial-live-bloom:var(--fan-dial-arc-bright)] [--fan-dial-live-line:var(--fan-dial-arc-mid)] [--fan-dial-glow:var(--color-blue-550)]',
    dry: '[--fan-dial-arc-bright:var(--color-yellow-100)] [--fan-dial-arc-mid:var(--color-orange-200)] [--fan-dial-fill-glow:var(--color-orange-200)] [--fan-dial-fill-orb:var(--color-orange-300)] [--fan-dial-fill-wash:var(--color-brown-200)] [--fan-dial-gauge-fade:var(--color-yellow-100)] [--fan-dial-gauge-head:var(--color-orange-500)] [--fan-dial-gauge-mid:var(--color-orange-200)] [--fan-dial-live-bloom:var(--fan-dial-arc-bright)] [--fan-dial-live-line:var(--fan-dial-arc-mid)] [--fan-dial-glow:var(--color-orange-500)]',
    recondition:
        '[--fan-dial-arc-bright:var(--color-violet-200)] [--fan-dial-arc-mid:var(--color-purple-400)] [--fan-dial-fill-glow:var(--color-purple-400)] [--fan-dial-fill-orb:var(--color-blue-800)] [--fan-dial-fill-wash:var(--color-purple-800)] [--fan-dial-gauge-fade:var(--color-violet-200)] [--fan-dial-gauge-head:var(--color-purple-450)] [--fan-dial-gauge-mid:var(--color-purple-400)] [--fan-dial-live-bloom:var(--fan-dial-arc-bright)] [--fan-dial-live-line:var(--fan-dial-arc-mid)] [--fan-dial-glow:var(--color-purple-450)] [--fan-dial-wash-edge:var(--color-purple-900)] [--fan-dial-wash-mid:var(--color-purple-950)]',
    custom: '[--fan-dial-arc-bright:var(--color-chartreuse-200)] [--fan-dial-arc-mid:var(--color-green-550)] [--fan-dial-fill-glow:var(--color-chartreuse-200)] [--fan-dial-fill-orb:var(--color-lime-400)] [--fan-dial-fill-wash:var(--color-green-700)] [--fan-dial-gauge-fade:var(--color-chartreuse-200)] [--fan-dial-gauge-head:var(--color-green-750)] [--fan-dial-gauge-mid:var(--color-green-550)] [--fan-dial-live-bloom:var(--fan-dial-arc-bright)] [--fan-dial-live-line:var(--fan-dial-arc-mid)] [--fan-dial-glow:var(--color-green-750)]',
    manual: '[--fan-dial-arc-bright:var(--color-grey-150)] [--fan-dial-arc-mid:var(--color-grey-250)] [--fan-dial-fill-glow:var(--color-blue-50)] [--fan-dial-fill-orb:var(--color-grey-400)] [--fan-dial-fill-wash:var(--color-grey-400)] [--fan-dial-gauge-fade:var(--color-grey-150)] [--fan-dial-gauge-head:var(--color-blue-50)] [--fan-dial-gauge-mid:var(--color-grey-250)] [--fan-dial-live-bloom:var(--fan-dial-arc-bright)] [--fan-dial-live-line:var(--fan-dial-arc-mid)] [--fan-dial-glow:var(--color-blue-50)]',
};

/**
 * Orb fill and rim per state, merged after the mode triplet so its overrules win. `critical` keeps
 * the mode arcs but reds the orb; `offline`/`interrupted` are mode-less and need their own gauge
 * ramp. Fault rows dim the liveness group (`live-alpha 0.3`) and clear the wash.
 */
const HEALTHY_STATE_TINT = '[--fan-dial-orb:transparent] [--fan-dial-rim:var(--fan-dial-arc-mid)]';

export const FAN_DIAL_STATE_TINT: Record<FanDialState, string> = {
    ready: HEALTHY_STATE_TINT,
    running: HEALTHY_STATE_TINT,
    updating:
        '[--fan-dial-orb:transparent] [--fan-dial-rim:var(--fan-dial-arc-mid)] [--fan-dial-fill-glow:var(--color-grey-400)] [--fan-dial-fill-orb:var(--color-grey-400)]',
    offline:
        '[--fan-dial-arc-bright:var(--color-red-850)] [--fan-dial-arc-mid:var(--color-red-600)] [--fan-dial-gauge-fade:var(--color-red-350)] [--fan-dial-gauge-head:var(--color-red-600)] [--fan-dial-gauge-mid:var(--color-red-850)] [--fan-dial-glow:var(--color-brown-500)] [--fan-dial-live-alpha:0.3] [--fan-dial-live-bloom:var(--color-red-600)] [--fan-dial-live-line:var(--color-red-600)] [--fan-dial-orb-alpha:0.5] [--fan-dial-orb:var(--color-red-600)] [--fan-dial-rim:color-mix(in_oklab,var(--color-brown-500)_35%,var(--color-grey-400))] [--fan-dial-wash-edge:transparent] [--fan-dial-wash-mid:transparent]',
    interrupted:
        '[--fan-dial-arc-bright:var(--color-yellow-700)] [--fan-dial-arc-mid:var(--color-yellow-300)] [--fan-dial-gauge-fade:var(--color-yellow-850)] [--fan-dial-gauge-head:var(--color-yellow-300)] [--fan-dial-gauge-mid:var(--color-yellow-700)] [--fan-dial-glow:var(--color-yellow-300)] [--fan-dial-live-alpha:0.3] [--fan-dial-live-bloom:var(--color-yellow-300)] [--fan-dial-live-line:var(--color-yellow-300)] [--fan-dial-orb:var(--color-yellow-300)] [--fan-dial-rim:var(--color-yellow-300)] [--fan-dial-wash-edge:transparent] [--fan-dial-wash-mid:transparent]',
    critical:
        '[--fan-dial-glow:var(--color-brown-500)] [--fan-dial-live-bloom:var(--color-red-600)] [--fan-dial-live-line:var(--color-red-600)] [--fan-dial-orb-alpha:0.5] [--fan-dial-orb:var(--color-red-600)] [--fan-dial-rim:var(--color-red-600)] [--fan-dial-wash-edge:transparent] [--fan-dial-wash-mid:transparent]',
};

/** `error` flag: `red-550` rim only (brighter than the states' `red-600`). */
export const FAN_DIAL_ERROR_TINT = '[--fan-dial-rim:var(--color-red-550)]';

/** `attention` flag: violet wash + `purple-400` glow + `red-600` rim. Merged after `error`, so its rim wins. */
export const FAN_DIAL_ATTENTION_TINT =
    '[--fan-dial-glow:var(--color-purple-400)] [--fan-dial-rim:var(--color-red-600)] [--fan-dial-wash-edge:var(--color-purple-900)] [--fan-dial-wash-mid:var(--color-purple-950)]';

/** States whose orb breathes (the crest pulse). `updating` breathes without spinning. */
export const FAN_DIAL_BREATHING_STATES: readonly FanDialState[] = ['running', 'updating'];

/** States in which the dial moves. */
export const FAN_DIAL_RUNNING_STATES: readonly FanDialState[] = ['running', 'critical'];

/** States that draw the liveness arc; `offline` / `interrupted` draw it at rest. */
export const FAN_DIAL_ARC_STATES: readonly FanDialState[] = ['running', 'critical', 'offline', 'interrupted'];

/**
 * `manual` is drawn only under `running` / `critical`; illegal pairs fall back to `none`. `updating`
 * is always `none`. Not a cva compound variant: two `[--fan-dial-glow:…]` would resolve by stylesheet order.
 */
export function resolveFanDialMode(state: FanDialState, mode: FanDialMode): FanDialMode {
    if (state === 'updating' || (mode === 'manual' && !FAN_DIAL_RUNNING_STATES.includes(state))) {
        return 'none';
    }
    return mode;
}

/** Clamped, not validated: clock skew should shorten an arc, not throw. `NaN` → `0`. */
export function clampFanDialProgress(progress: number): number {
    if (progress > 1) {
        return 1;
    }
    return progress > 0 ? progress : 0;
}

const FAN_DIAL_STATE_TEXT: Record<FanDialState, string> = {
    ready: 'ready',
    running: 'running',
    offline: 'offline',
    interrupted: 'interrupted',
    critical: 'running with a fault',
    updating: 'updating',
};

/** `none` says nothing — there is no goal to name. */
const FAN_DIAL_MODE_TEXT: Record<FanDialMode, string | null> = {
    none: null,
    cool: 'cooling mode',
    dry: 'drying mode',
    recondition: 'reconditioning mode',
    custom: 'custom mode',
    manual: 'manual mode',
};

/** `hh:mm:ss` as words, to the minute: a label that changed every second would be noise. */
function spokenTimer(timer: string): string {
    if (timer === '∞') {
        return 'runs until stopped';
    }
    const match = /^(\d+):(\d{2}):(\d{2})$/.exec(timer);
    if (!match) {
        return `${timer} remaining`;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const parts = [
        hours > 0 ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : null,
        minutes > 0 || hours === 0 ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : null,
    ].filter(Boolean);

    return `${parts.join(' ')} remaining`;
}

export type FanDialDescriptionSource = {
    state: FanDialState;
    /** Already resolved with `resolveFanDialMode`. */
    mode: FanDialMode;
    error: boolean;
    attention: boolean;
    co2Alert?: boolean;
    /** Clamped 0–1 remaining runtime. */
    progress: number;
    /** The drawn status word, when it is a string. */
    status?: string;
    /** The drawn timer, when it is a string. */
    timer?: string;
};

function runtimeText(timer: string | undefined, progress: number): string | null {
    if (timer) {
        return spokenTimer(timer);
    }
    return progress > 0 ? `${Math.round(progress * 100)}% of run window remaining` : null;
}

/**
 * The dial as one sentence — `Fan running, cooling mode, 1 hour 58 minutes remaining`. The drawing
 * carries state, mode, fault and runtime in colour and motion only (WCAG 1.1.1, 1.4.1).
 */
export function describeFanDial({
    state,
    mode,
    error,
    attention,
    co2Alert = false,
    progress,
    status,
    timer,
}: FanDialDescriptionSource): string {
    const parts = [
        `Fan ${status ? status.toLowerCase() : FAN_DIAL_STATE_TEXT[state]}`,
        state === 'critical' && status ? 'fault reported' : null,
        FAN_DIAL_MODE_TEXT[mode],
        runtimeText(timer, progress),
        error ? 'fault reported' : null,
        attention ? 'needs attention' : null,
        co2Alert ? 'CO2 alert' : null,
    ];

    return parts.filter(Boolean).join(', ');
}
