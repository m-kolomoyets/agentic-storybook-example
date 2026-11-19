import type { Transition, Variants } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import type { FanDialProps, FanDialState } from './types';
import ErrorIcon from '@/assets/icons/error.svg?react';
import ReportProblemIcon from '@/assets/icons/report-problem.svg?react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { cn } from '@/lib/cn';
import {
    clampFanDialProgress,
    describeFanDial,
    FAN_DIAL_ARC_STATES,
    FAN_DIAL_BREATHING_STATES,
    FAN_DIAL_INNER_RING_STROKE,
    FAN_DIAL_MODE_TINT,
    FAN_DIAL_PLATE_FILL,
    FAN_DIAL_RING_STROKE,
    FAN_DIAL_RUNNING_STATES,
    resolveFanDialMode,
} from './utils/fanDial';
import {
    GAUGE_ARC_BOX,
    GAUGE_ARC_PAINT,
    GAUGE_ARC_RING,
    HAIRLINE_RING_BOX,
    HAIRLINE_RING_MASK,
    LIVENESS_ARC_INSET,
    LIVENESS_ARC_PAINT,
    LIVENESS_ARC_RING,
    LIVENESS_BLOOM_FALLOFF,
    LIVENESS_BLOOM_PAINT,
    LIVENESS_CORE_FALLOFF,
    LIVENESS_GROUP_BOX,
    ORB_BOX,
    ORB_FILL_HALO,
    ORB_FILL_RIM,
    ORB_FILL_VEIL,
    ORB_FILL_WASH_PAINT,
    ORB_HALO,
    ORB_VEIL_PAINT,
    ORB_WASH_PAINT,
    TICKS_PAINT,
    TICKS_RING,
} from './utils/paint';
import { fanDialDrawingVariants, fanDialRootVariants } from './utils/variants';
import { useLivenessSpin } from './hooks/useLivenessSpin';

// Base `opacity-0`; the animation lifts it, so a paused dial sits at the resting (trough) cell.
const FILL_PULSE = 'animate-fan-dial-fill';

// `critical` only — `running`'s loop is the crest group. Unguarded for reduced motion on purpose:
// a stationary change of light, not movement.
const PULSE = 'animate-pulse [animation-duration:3s]';

/*
 * State changes, animated (colour needs nothing: every tint is a registered property the root
 * transitions). Status word slides in from a blur; icons/pill pop; running layers mount with a
 * quarter-turn sweep. First paint is drawn in place (`initial={false}`).
 */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const TEXT_SWAP: Transition = { duration: 0.36, ease: EASE_OUT };
const TEXT_SHIFT = 10;
const BLURRED = 'blur(6px)';
const SHARP = 'blur(0px)';
const LAYOUT_SHIFT: Transition = { layout: { duration: 0.36, ease: EASE_OUT } };
const POP_IN = { opacity: 1, scale: 1, filter: SHARP };
const POP_OUT = { opacity: 0, scale: 0.7, filter: BLURRED };
/** The gauge segment: Figma's arc, head on the liveness arc's head at 315°, 75° long. */
const GAUGE_SEGMENT_SWEEP = 75;
const GAUGE_SEGMENT_HEAD = 315;
const RUN_MOUNT: Transition = { duration: 0.6, ease: EASE_OUT };
const RUN_EXIT: Transition = { duration: 0.3, ease: EASE_OUT };

const LIVENESS_MOUNT: Variants = {
    hidden: { opacity: 0, rotate: -90, transition: { ...RUN_EXIT, when: 'afterChildren' } },
    shown: { opacity: 1, rotate: 0, transition: { ...RUN_MOUNT, staggerChildren: 0.12 } },
};
const LIVENESS_LAYER: Variants = {
    hidden: { opacity: 0, scale: 0.94, transition: RUN_EXIT },
    shown: { opacity: 1, scale: 1, transition: RUN_MOUNT },
};

/** A status word's key: the word itself, or the state when the caller passed an element. */
function statusKey(status: ReactNode, state: FanDialState) {
    return typeof status === 'string' || typeof status === 'number' ? String(status) : state;
}

/**
 * Fan dial illustration. Figma `Fan Control Illustration` 11440:9451. Pure primitive, no interaction.
 * Hybrid drawing: inline SVG for flat fills, conic-gradient + mask divs for the arcs. No SVG `<defs>`
 * (ids are document-global).
 */
function FanDial({
    state = 'ready',
    mode = 'none',
    error = false,
    attention = false,
    co2Alert = false,
    size = 'regular',
    progress = 0,
    label = 'STATUS',
    status,
    timer,
    paused = false,
    'aria-label': ariaLabel,
    decorative = false,
    orbRef,
    gauge = 'segment',
    className,
    'data-testid': testId,
}: FanDialProps) {
    const drawnMode = resolveFanDialMode(state, mode);
    const progressFraction = clampFanDialProgress(progress);

    // Gauge arc is drawn whenever there is runtime to measure; liveness arc for any state that had a
    // run (`offline`/`interrupted` included) and moves only while one is under way.
    const running = FAN_DIAL_RUNNING_STATES.includes(state);
    const animated = running && !paused;
    const spin = useLivenessSpin(animated, paused);
    const arcs = FAN_DIAL_ARC_STATES.includes(state);
    const breathing = FAN_DIAL_BREATHING_STATES.includes(state);
    // Ellipse 1278 gate. `drawnMode`, so an illegal pair that fell back to `none` does not draw it.
    const hairlineRing = size === 'small' || (state === 'ready' && drawnMode === 'custom');

    // `role="img"`: the text stack alone says only `STATUS RUNNING`, and nothing under `small`. Not a
    // live region — the timer changes every second.
    const a11y = decorative
        ? ({ 'aria-hidden': true } as const)
        : ({
              role: 'img',
              'aria-label':
                  ariaLabel ??
                  describeFanDial({
                      state,
                      mode: drawnMode,
                      error,
                      attention,
                      co2Alert,
                      progress: progressFraction,
                      status: typeof status === 'string' ? status : undefined,
                      timer: typeof timer === 'string' ? timer : undefined,
                  }),
          } as const);

    const pulseClasses = animated && state === 'critical' ? PULSE : '';
    const fillPulseClasses = paused ? '' : FILL_PULSE;

    return (
        <div
            {...a11y}
            data-testid={testId}
            data-state={state}
            data-mode={drawnMode}
            data-paused={paused ? '' : undefined}
            // Continuous value → inline style; registered with `@property` so the root transition interpolates.
            style={{ '--fan-dial-sweep': `${progressFraction * 360}deg` } as CSSProperties}
            // Mode triplet FIRST: `offline`/`interrupted` must overrule `--fan-dial-glow`.
            className={cn` ${FAN_DIAL_MODE_TINT[drawnMode]} ${fanDialRootVariants({ state, size, error, attention })} ${className} `}
        >
            {/* Reduced motion keeps the fades and drops the travel and turns. */}
            <MotionConfig reducedMotion="user">
                <div className={fanDialDrawingVariants({ size })}>
                    <svg
                        viewBox="0 0 375 333"
                        aria-hidden="true"
                        focusable="false"
                        className="absolute inset-none size-full"
                    >
                        {/* Ellipse 1262 — plate and hairline. */}
                        <circle
                            cx="187.5"
                            cy="166.5"
                            r="151.044"
                            strokeWidth="0.912651"
                            className={cn`${FAN_DIAL_PLATE_FILL} ${FAN_DIAL_RING_STROKE}`}
                        />
                        {/* Ellipse 1266 — inner outline. Centre is Figma's, half a pixel off the plate's. */}
                        <circle
                            cx="187.373"
                            cy="166.373"
                            r="141.917"
                            fill="none"
                            strokeWidth="0.912651"
                            opacity="0.5"
                            className={FAN_DIAL_INNER_RING_STROKE}
                        />
                        {/* Ellipse 1261 — invisible plate-colour disc the liveness radius is measured from. */}
                        <circle cx="187.645" cy="166.645" r="118.645" className={FAN_DIAL_PLATE_FILL} />
                    </svg>

                    {/* Ellipse 1268 / 1275 — tick ring, under the gauge arc. */}
                    <div
                        data-part="ticks"
                        className={cn`pointer-events-none absolute rounded-full opacity-40 ${GAUGE_ARC_BOX} ${TICKS_PAINT} ${TICKS_RING} `}
                    />

                    <div
                        data-part="wash"
                        className={cn`pointer-events-none absolute rounded-full ${ORB_BOX} ${ORB_WASH_PAINT}`}
                    />

                    <div data-part="pulse" className={cn`pointer-events-none absolute inset-none ${pulseClasses}`}>
                        {/* Veil strength is a property: offline/critical paint at 0.5. */}
                        <div
                            data-part="orb"
                            className={cn`absolute rounded-full [opacity:var(--fan-dial-orb-alpha,0.4)] ${ORB_BOX} ${ORB_VEIL_PAINT} `}
                        />
                        <div data-part="glow" className={cn`absolute rounded-full ${ORB_BOX} ${ORB_HALO}`} />
                    </div>

                    {/* Crest — `Running/Filled` cross-fading over the resting orb. No `Critical/Filled` cell. */}
                    <AnimatePresence initial={false}>
                        {breathing && (
                            <motion.div
                                key="fill"
                                className="pointer-events-none absolute inset-none"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1, transition: RUN_MOUNT }}
                                exit={{ opacity: 0, transition: RUN_EXIT }}
                            >
                                <div
                                    data-part="fill"
                                    className={cn`pointer-events-none absolute inset-none opacity-0 ${fillPulseClasses}`}
                                >
                                    <div
                                        data-part="fill-wash"
                                        className={cn`absolute rounded-full ${ORB_BOX} ${ORB_FILL_WASH_PAINT}`}
                                    />
                                    <div
                                        data-part="fill-orb"
                                        className={cn`absolute rounded-full opacity-40 ${ORB_BOX} ${ORB_FILL_VEIL} ${ORB_VEIL_PAINT} `}
                                    />
                                    <div
                                        data-part="fill-glow"
                                        className={cn`absolute rounded-full ${ORB_BOX} ${ORB_FILL_HALO}`}
                                    />
                                    <div
                                        data-part="fill-rim"
                                        className={cn`absolute rounded-full border ${ORB_BOX} ${ORB_FILL_RIM}`}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Rim — outside the pulse: a fault indicator must not fade. 1.5px is the drawn stroke. */}
                    <div
                        ref={orbRef}
                        data-part="rim"
                        className={cn`pointer-events-none absolute rounded-full border-[1.5px] ${ORB_BOX} [border-color:var(--fan-dial-rim)]`}
                    />

                    {/* Always mounted when drawn: staying mounted at sweep 0 lets the last second drain, not pop. */}
                    {gauge === 'progress' && (
                        <div
                            data-part="gauge-arc"
                            data-empty={progressFraction === 0 ? '' : undefined}
                            className={cn`pointer-events-none absolute rounded-full ${GAUGE_ARC_BOX} ${GAUGE_ARC_PAINT} ${GAUGE_ARC_RING} `}
                        />
                    )}

                    <AnimatePresence initial={false}>
                        {arcs && (
                            // Rotating group: one box, one animation — separate spins drift apart across a pause.
                            // The mount wrapper turns on its own so its sweep never fights the spin.
                            <motion.div
                                key="liveness"
                                className="pointer-events-none absolute inset-none"
                                variants={LIVENESS_MOUNT}
                                initial="hidden"
                                animate="shown"
                                exit="hidden"
                            >
                                <motion.div
                                    data-part="liveness"
                                    data-spinning={animated ? '' : undefined}
                                    className="absolute inset-none"
                                    style={{ rotate: spin }}
                                >
                                    {/* `isolate`: the core blends with the bloom, not the plate. */}
                                    <div
                                        data-part="liveness-group"
                                        className={cn`absolute isolate ${LIVENESS_GROUP_BOX}`}
                                    >
                                        <motion.div variants={LIVENESS_LAYER} className="absolute inset-none z-[1]">
                                            {/* Ellipse 1271: crisp line on the bloom's outer edge. */}
                                            <div
                                                className={cn`absolute rounded-full ${LIVENESS_ARC_INSET} ${LIVENESS_ARC_PAINT} ${LIVENESS_ARC_RING} `}
                                            />
                                            {/* Vector 950 — spoke closing the head at 315°. */}
                                            <svg
                                                viewBox="0 0 245.2 245.2"
                                                aria-hidden="true"
                                                focusable="false"
                                                className="absolute inset-none size-full"
                                            >
                                                <line
                                                    x1="38.17"
                                                    y1="38.17"
                                                    x2="54.36"
                                                    y2="54.36"
                                                    strokeWidth="1.5"
                                                    className="[stroke:var(--fan-dial-live-line)]"
                                                />
                                            </svg>
                                        </motion.div>
                                        <motion.div variants={LIVENESS_LAYER} className="absolute inset-none">
                                            <div
                                                data-part="liveness-bloom"
                                                className={cn`absolute inset-none rounded-full [opacity:var(--fan-dial-live-alpha,1)] ${LIVENESS_BLOOM_PAINT} `}
                                                style={{ maskImage: LIVENESS_BLOOM_FALLOFF }}
                                            />
                                            <div
                                                data-part="liveness-core"
                                                className={cn`absolute inset-none rounded-full [opacity:var(--fan-dial-live-alpha,1)] mix-blend-color-dodge ${LIVENESS_BLOOM_PAINT} `}
                                                style={{ maskImage: LIVENESS_CORE_FALLOFF }}
                                            />
                                        </motion.div>
                                    </div>
                                    {gauge === 'segment' && (
                                        <motion.div
                                            variants={LIVENESS_LAYER}
                                            data-part="gauge-arc"
                                            className={cn`absolute rounded-full ${GAUGE_ARC_BOX} ${GAUGE_ARC_PAINT} ${GAUGE_ARC_RING} `}
                                            style={
                                                {
                                                    '--fan-dial-sweep': `${GAUGE_SEGMENT_SWEEP}deg`,
                                                    rotate: `${GAUGE_SEGMENT_HEAD - GAUGE_SEGMENT_SWEEP}deg`,
                                                } as CSSProperties
                                            }
                                        />
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {hairlineRing && (
                        <div
                            data-part="hairline-ring"
                            className={cn`pointer-events-none absolute rounded-full bg-white-alpha-8 ${HAIRLINE_RING_BOX} ${HAIRLINE_RING_MASK} `}
                        />
                    )}

                    {/* Text stack, hidden under `small`. Kit steps plus pinned leading/tracking where Figma
                        draws off-scale (label 8/8 3.84px; status 20/24 0.4px). */}
                    {size === 'regular' && (
                        <div className="absolute inset-none flex flex-col items-center justify-center gap-s">
                            {/* One badge: CO2 triangle first (reserved for CO2), else error circle (14283:425723). */}
                            <AnimatePresence initial={false} mode="popLayout">
                                {(co2Alert || error) && (
                                    <motion.span
                                        key={co2Alert ? 'co2-badge' : 'error-badge'}
                                        className="block"
                                        initial={POP_OUT}
                                        animate={POP_IN}
                                        exit={POP_OUT}
                                        transition={TEXT_SWAP}
                                    >
                                        {co2Alert ? (
                                            <ReportProblemIcon
                                                aria-hidden="true"
                                                data-part="co2-badge"
                                                className="size-[24px] text-icons-negative"
                                            />
                                        ) : (
                                            <ErrorIcon
                                                aria-hidden="true"
                                                data-part="error-badge"
                                                className="size-[24px] text-icons-negative"
                                            />
                                        )}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            <motion.span
                                layout="position"
                                transition={LAYOUT_SHIFT}
                                className="text-caption-s-medium leading-[8px] tracking-[3.84px] opacity-50"
                            >
                                {label}
                            </motion.span>
                            {status !== undefined && (
                                <motion.span
                                    layout="position"
                                    transition={LAYOUT_SHIFT}
                                    className="grid justify-items-center text-heading-s leading-[24px] tracking-[0.4px]"
                                >
                                    <AnimatePresence initial={false}>
                                        <motion.span
                                            key={statusKey(status, state)}
                                            className="whitespace-nowrap [grid-area:1/1]"
                                            initial={{ opacity: 0, x: -TEXT_SHIFT, filter: BLURRED }}
                                            animate={{ opacity: 1, x: 0, filter: SHARP }}
                                            exit={{ opacity: 0, x: TEXT_SHIFT, filter: BLURRED }}
                                            transition={TEXT_SWAP}
                                        >
                                            {status}
                                        </motion.span>
                                    </AnimatePresence>
                                </motion.span>
                            )}
                            <AnimatePresence initial={false} mode="popLayout">
                                {timer !== undefined && (
                                    <motion.span
                                        key="timer"
                                        layout="position"
                                        initial={POP_OUT}
                                        animate={POP_IN}
                                        exit={POP_OUT}
                                        transition={{ ...TEXT_SWAP, ...LAYOUT_SHIFT }}
                                        className="rounded-full border border-white-alpha-16 px-m py-xxs text-body-s-medium tabular-nums"
                                    >
                                        {timer}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </MotionConfig>
        </div>
    );
}

export { FanDial };
export type { FanDialMode, FanDialProps, FanDialState } from './types';
