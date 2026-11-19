import type { CSSProperties } from 'react';
import type { SliderProps } from './types';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { cn } from '@/lib/cn';
import { fractionAtPosition, positionOfValue, scaleValueText, tickCount } from './utils/scale';

/*
 * Thumb diameter on the root so the control and the sibling scale row both inherit it. `thumbAlignment="edge"`
 * makes travel `width − 16px`; labels and ticks sit at `8px + fraction × (100% − 16px)`.
 * `w-full` is load-bearing: a shrink-wrapped root hides the edge-aligned thumb (e.g. in `Field.Root`).
 * Disabled is an invented opacity (no Figma cell), on the root so the scale dims too.
 */
const ROOT_CLASSES = `
    w-full [--slider-thumb-size:var(--spacing-xl)]
    data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50
`;

// `relative`: Base UI positions the thumb from the control's box. 24 tall; the 16px thumb overhangs.
const CONTROL_CLASSES = 'relative flex h-3xl w-full items-center';

/** The drawn 1px `Border/primary` line. `relative`: the ticks' box. */
const TRACK_CLASSES = 'relative h-px w-full bg-border-primary';

const INDICATOR_CLASSES = 'h-px bg-text-general-strong';

/*
 * Centre origin (Figma 11870:6064): 2px track; 2px accent fill from the midpoint to the thumb. Base UI's
 * Indicator only fills from the start (inline `inset-inline-start: 0`, `width: var(--start-position)`), so
 * those are overridden with `!` and the fill still follows a drag. `left-`, not `start-`: the prod build
 * lowers `inset-inline-start` and drops `!important`.
 */
const CENTER_TRACK_CLASSES = 'h-[2px]';
const CENTER_INDICATOR_CLASSES = `
    h-[2px] rounded-full bg-border-accent
    left-[min(50%,var(--start-position))]!
    w-[max(50%_-_var(--start-position),var(--start-position)_-_50%)]!
`;

/*
 * Ticks on the thumb's ruler. `pointer-events-none`: a press on a tick is a press on the track.
 * `z-10`: the frame draws the dots on top of the fill.
 */
const TICKS_CLASSES = 'pointer-events-none absolute inset-y-[0px] left-[0px] z-10 w-full';
const TICK_CLASSES = `
    absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text-general-strong
    left-[calc(var(--slider-thumb-size)/2+(100%-var(--slider-thumb-size))*var(--slider-scale-position))]
`;
const TICK_DOT_CLASSES = 'size-[2px]';
const TICK_CENTER_CLASSES = 'h-[8px] w-[2px]';

/*
 * 16px disc. Focus halo (invented; WCAG 2.4.7) is a `ring-4` gated on `has-[:focus-visible]`: the focusable
 * element is the hidden range input inside the thumb, so `focus-visible:` on the thumb never paints.
 */
const THUMB_CLASSES = `
    size-[var(--slider-thumb-size)] rounded-full bg-surface-slider-thumb outline-none
    not-data-[disabled]:has-[:focus-visible]:ring-4 not-data-[disabled]:has-[:focus-visible]:ring-border-primary
`;

// Scale row: 4px below the track, labels absolutely positioned (so the height is explicit).
const SCALE_CLASSES = 'relative mt-xs h-xl text-caption-m text-text-general-medium';

/** Per-label fraction of thumb travel. The class reading it is written out in full (Tailwind scans source). */
const SCALE_POSITION_PROPERTY = '--slider-scale-position';

/*
 * Not `justify-between`: unequal-width labels would put centres on a different pitch from the thumb.
 * `whitespace-nowrap`: an absolute box near the right end would otherwise wrap per char.
 */
const SCALE_LABEL_CLASSES = `
    absolute whitespace-nowrap transition-colors
    left-[calc(var(--slider-thumb-size)/2+(100%-var(--slider-thumb-size))*var(--slider-scale-position))]
`;

function positionStyle(position: number) {
    return { [SCALE_POSITION_PROPERTY]: position } as CSSProperties;
}

/** End labels clamp flush to the track ends; the rest centre on their position. */
function scaleLabelPlacement(position: number) {
    if (position === 0) {
        return 'left-[0px]';
    }
    if (position === 1) {
        return 'left-full -translate-x-full';
    }

    return '-translate-x-1/2';
}

/**
 * Pick a value from a range by position. Figma: `Stepped slider` 9850:118472. Composes with `Field`:
 * Base UI wires the label to the hidden range input. Value state, keyboard and ARIA are Base UI's.
 * Not exposed (nothing draws them): `orientation`, `format`/`locale`, range props, a value readout.
 */
function Slider({
    min,
    max,
    showIndicator = true,
    origin = 'start',
    ticks = false,
    labels,
    highlightActiveLabel = false,
    className,
    ...rest
}: SliderProps) {
    // Two labels minimum: `n − 1` is the divisor.
    const scale = labels !== undefined && labels.length > 1 ? labels : undefined;
    const centered = origin === 'center';
    const count = tickCount(min, max, rest.step ?? 1);
    const trackClasses = centered ? CENTER_TRACK_CLASSES : '';
    const indicatorClasses = centered ? CENTER_INDICATOR_CLASSES : '';
    // Cast: `undefined` reproduces Base UI's default, which the prop type does not admit.
    const getAriaValueText = scale
        ? (scaleValueText(scale, min, max) as BaseSlider.Thumb.Props['getAriaValueText'])
        : undefined;

    return (
        <BaseSlider.Root
            {...rest}
            min={min}
            max={max}
            thumbAlignment="edge"
            className={cn`${ROOT_CLASSES} ${className}`}
        >
            <BaseSlider.Control className={CONTROL_CLASSES}>
                <BaseSlider.Track className={cn`${TRACK_CLASSES} ${trackClasses}`}>
                    {ticks && count !== undefined ? (
                        <span aria-hidden className={TICKS_CLASSES} data-slider-ticks>
                            {Array.from({ length: count }, (_, index) => {
                                const position = fractionAtPosition(index, count);
                                const shape = position === 0.5 ? TICK_CENTER_CLASSES : TICK_DOT_CLASSES;

                                return (
                                    <span
                                        key={index}
                                        className={cn`${TICK_CLASSES} ${shape}`}
                                        style={positionStyle(position)}
                                    />
                                );
                            })}
                        </span>
                    ) : null}
                    {showIndicator ? (
                        <BaseSlider.Indicator className={cn`${INDICATOR_CLASSES} ${indicatorClasses}`} />
                    ) : null}
                    <BaseSlider.Thumb className={THUMB_CLASSES} getAriaValueText={getAriaValueText} />
                </BaseSlider.Track>
            </BaseSlider.Control>
            {/*
             * `Value` is the only public door to the clamped, snapped value. `render={<div />}` avoids
             * `<output>`'s implicit `role="status"`; `htmlFor={undefined}` drops its `for`.
             */}
            {scale ? (
                <BaseSlider.Value render={<div />} htmlFor={undefined} className={SCALE_CLASSES}>
                    {(_formattedValues, values) => {
                        const activeIndex = highlightActiveLabel
                            ? positionOfValue(values[0]!, scale.length, min, max)
                            : undefined;

                        return scale.map((label, index) => {
                            const position = fractionAtPosition(index, scale.length);
                            // Colour only; a weight change would reflow the row.
                            const active = index === activeIndex ? 'text-text-general-strong' : '';

                            return (
                                <span
                                    // A label is a position: the index is its identity.
                                    // eslint-disable-next-line @eslint-react/no-array-index-key
                                    key={index}
                                    className={cn`${SCALE_LABEL_CLASSES} ${scaleLabelPlacement(position)} ${active}`}
                                    style={positionStyle(position)}
                                >
                                    {label}
                                </span>
                            );
                        });
                    }}
                </BaseSlider.Value>
            ) : null}
        </BaseSlider.Root>
    );
}

export { Slider };
