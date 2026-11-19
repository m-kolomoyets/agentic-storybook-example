import { cva } from 'class-variance-authority';
import { FAN_DIAL_ATTENTION_TINT, FAN_DIAL_ERROR_TINT, FAN_DIAL_STATE_TINT } from './fanDial';

// Rectangle 26579 — Small crop's bottom fade (11445:10439), as a mask so it works on any surface.
const SMALL_FADE = '[mask-image:linear-gradient(-0.7427deg,transparent_1.5%,black_58.83%)]';

/*
 * Root. `cn` keeps the last declaration per arbitrary property, so order state → error → attention
 * matters. `mode` is not a variant (see `resolveFanDialMode`). The transition list lives here because
 * descendants read the tints via `var()`; `transition-all` skips custom properties.
 */
export const fanDialRootVariants = cva(
    `
        relative overflow-hidden text-text-general-strong
        transition-[--fan-dial-sweep,--fan-dial-arc-bright,--fan-dial-arc-mid,--fan-dial-fill-glow,--fan-dial-fill-orb,--fan-dial-fill-wash,--fan-dial-gauge-fade,--fan-dial-gauge-head,--fan-dial-gauge-mid,--fan-dial-glow,--fan-dial-live-alpha,--fan-dial-live-bloom,--fan-dial-live-line,--fan-dial-orb,--fan-dial-orb-alpha,--fan-dial-rim,--fan-dial-wash-edge,--fan-dial-wash-mid]
        duration-500 ease-out motion-reduce:transition-none
    `,
    {
        variants: {
            state: FAN_DIAL_STATE_TINT,
            size: {
                regular: 'h-[333px] w-[375px]',
                // 351×166 window; the fade sits on the root because the rect is measured in the window.
                small: `h-[166px] w-[351px] ${SMALL_FADE}`,
            },
            error: { true: FAN_DIAL_ERROR_TINT, false: '' },
            attention: { true: FAN_DIAL_ATTENTION_TINT, false: '' },
        },
        defaultVariants: { state: 'ready', size: 'regular', error: false, attention: false },
    }
);

// Small: same 375-wide drawing inside the 351 window at x -12 → 106.83761% wide, -3.4188% left.
export const fanDialDrawingVariants = cva('absolute top-none aspect-[375/333]', {
    variants: {
        size: {
            regular: 'left-none w-full',
            small: 'left-[-3.4188%] w-[106.83761%]',
        },
    },
    defaultVariants: { size: 'regular' },
});
