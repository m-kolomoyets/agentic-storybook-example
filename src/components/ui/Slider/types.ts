import type { Slider as BaseSlider } from '@base-ui/react/slider';
import type { ReactNode } from 'react';

export type SliderOrigin = 'start' | 'center';

export type SliderProps = {
    /** Required: Base UI's 0/100 default is a silent wrong answer. */
    min: number;
    /** Required. See `min`. */
    max: number;
    /** Base UI's, default `1`. `labels` never sets it. */
    step?: number;
    /** A plain `number`; no range slider is drawn. */
    value?: number;
    /** The uncontrolled form of `value`. */
    defaultValue?: number;
    /** Base UI's; `eventDetails.reason` is `'drag'`, `'keyboard'`, `'track-press'`, … */
    onValueChange?: (value: number, eventDetails: BaseSlider.Root.ChangeEventDetails) => void;
    /** Fires once the interaction ends; persist from this one. */
    onValueCommitted?: (value: number, eventDetails: BaseSlider.Root.CommitEventDetails) => void;
    /** Dims the whole control including the scale row. */
    disabled?: boolean;
    /** Fill from track start to thumb. Turn off for a pure preference axis. @default true */
    showIndicator?: boolean;
    /**
     * Where the fill grows from. `'center'` is Figma's `Detection Sensivity` variant: a 2px track and an
     * accent fill from the range midpoint to the thumb, for an axis whose middle is neutral.
     * @default 'start'
     */
    origin?: SliderOrigin;
    /** A 2px dot per `step`, a taller bar at the midpoint. Drawn only for ≤100 steps. @default false */
    ticks?: boolean;
    /**
     * Scale annotations below the track, evenly spaced over `min…max`; they never define the range.
     * String labels reach `aria-valuetext`. Fewer than two renders no scale row.
     */
    labels?: ReactNode[];
    /** Brightens the label the value is exactly on (no nearest-match). @default false */
    highlightActiveLabel?: boolean;
    /** Identifies the field when a form is submitted. */
    name?: string;
    /** Merged onto the Base UI `Root`. */
    className?: string;
};
