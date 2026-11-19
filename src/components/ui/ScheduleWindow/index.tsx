import type { ReactNode } from 'react';
import type { SelectOption } from '@/components/ui/OptionList/types';
import type { ScheduleWindowEnd, ScheduleWindowProps, ScheduleWindowValue } from './types';
import DeleteIcon from '@/assets/icons/delete.svg?react';
import PlayGreenIcon from '@/assets/icons/play-green.svg?react';
import StopRedIcon from '@/assets/icons/stop-red.svg?react';
import { cn } from '@/lib/cn';
import {
    CONTROL_BORDER,
    CONTROL_SURFACE_FILL,
    CONTROL_SURFACE_FRAME,
    CONTROL_SURFACE_HEIGHT,
    CONTROL_SURFACE_LAYOUT,
    CONTROL_SURFACE_MIN_WIDTH,
} from '@/lib/ui/controlSurface';
import { DEFAULT_SCHEDULE_MODE, SCHEDULE_MODE_STROKE } from '@/lib/ui/scheduleMode';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { useScheduleWindowEntrance } from './hooks/useScheduleWindowEntrance';

/** One cell's flip, ms. */
const CELL_FLIP_MS = 600;
/** Gap between one cell's flip starting and the next's. */
const CELL_FLIP_STAGGER_MS = 150;
const CELL_SLOTS = 4;
/** One row's whole entrance: the last cell's start plus its flip. The next row waits this long. */
const ROW_ENTRANCE_MS = (CELL_SLOTS - 1) * CELL_FLIP_STAGGER_MS + CELL_FLIP_MS;

/* `font-sans`: `--text-*` tokens carry no family, and a host page may set another on `html`. */
const ROOT_CLASSES = 'relative w-full font-sans';

/* The controls also get their own `disabled`. */
const DISABLED_CLASSES = 'pointer-events-none opacity-50';

/* Box and trash on one line; `ml-l` (12px) is the rail's gutter. */
const BODY_CLASSES = 'ml-l flex items-center gap-m';

/* Inset ring, not a border: a border takes 2px from the content and wraps the desktop chart. */
const BOX_CLASSES = `
    relative flex flex-1 flex-col gap-l
    rounded-s bg-surface-ground p-l
    inset-ring-1
`;

const BOX_RING = 'inset-ring-border-primary';

/* Ring gets out of the running overlay's way. */
const BOX_RING_STROKED = 'inset-ring-transparent';

/*
 * Running stroke: an overlay so state cannot change layout; the mask cuts the middle out so the
 * gradient reads as a 1px stroke. Longhands only — the `mask` shorthand resets `mask-composite`.
 */
const RUNNING_STROKE_CLASSES = `
    pointer-events-none absolute inset-none rounded-s p-px
    bg-linear-to-br
    [mask-image:linear-gradient(white_0_0),linear-gradient(white_0_0)]
    [mask-clip:content-box,border-box]
    [mask-composite:exclude]
`;

/* Lines and chart side by side, never wrapped. */
const CONTENT_CLASSES = 'flex w-full flex-nowrap items-start gap-l';

/* 356 basis, shrinking first so the chart keeps its 126 floor. `last:grow`: with no chart the lines fill the row. */
const LINES_CLASSES = 'flex min-w-px shrink grow-0 basis-schedule-window-lines flex-col gap-l last:grow';

const LINE_CLASSES = 'flex w-full items-center gap-m';

/* Fixed input width (92px; 84px from `md:`, leaving the chart room) so details takes the remainder. */
const CELL_CLASSES = 'w-schedule-window-input shrink-0 md:w-schedule-window-input-desktop';

/* A day cell alone on its line (read-only `Forever`): both cells plus their gap, so details stays put. */
const SPANNING_CELL_CLASSES = `
    w-[calc(var(--spacing-schedule-window-input)*2+var(--spacing-m))] shrink-0
    md:w-[calc(var(--spacing-schedule-window-input-desktop)*2+var(--spacing-m))]
`;

/* `px-m` (8px), not the drawn 12: at 12 the 92px cell truncates `Today`. */
const INPUT_PADDING = 'px-m';

/* `[&_span]:truncate`: the value wraps otherwise. */
const INPUT_CLASSES = `${CONTROL_SURFACE_HEIGHT} [&_span]:truncate ${INPUT_PADDING}`;

/* Chevron hidden: `1:00 PM` plus a chevron overflows 92px. `>*:last-child` is the trigger's icon. */
const TIME_INPUT_CLASSES = `${INPUT_CLASSES} [&>*:last-child]:hidden`;

/* Read-only cell: same box, value as text, no control. */
const READ_ONLY_CLASSES = `
    ${CONTROL_SURFACE_LAYOUT} ${CONTROL_SURFACE_MIN_WIDTH} ${CONTROL_SURFACE_HEIGHT}
    ${CONTROL_SURFACE_FRAME} ${CONTROL_BORDER.default} ${CONTROL_SURFACE_FILL}
    ${INPUT_PADDING} py-l text-body-m text-text-general-strong
`;

/* Own `<span>`: `text-overflow` never clips a flex container's own text. */
const READ_ONLY_VALUE_CLASSES = 'min-w-px truncate';

/* Pressable day cell: the read-only box as a control. `text-left` because a `<button>` centres. */
const PRESSABLE_CLASSES = `
    ${READ_ONLY_CLASSES}
    cursor-pointer text-left
    outline-none focus-visible:outline-solid focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-border-focused
`;

/* Placeholder ink, same as `Input`'s. */
const PLACEHOLDER_CLASSES = 'text-text-general-medium';

/* `Event Details`: label over value, centred in the 48px line. */
const DETAILS_CLASSES = 'flex h-full min-w-px flex-1 flex-col items-start justify-center gap-xxs pl-xs';
/* `text-left` explicit: `text-align` inherits from cards whose copy is centred. */
const DETAILS_LABEL_CLASSES = 'w-full text-left text-caption-s text-text-general-medium';
const DETAILS_VALUE_CLASSES = 'w-full text-left text-body-s-medium text-text-general-strong';

/* At least 126, grows into what the lines leave. Phone callers pass no chart. */
const CHART_CLASSES = 'min-w-schedule-window-chart grow basis-schedule-window-chart';

const MESSAGE_CLASSES = 'w-full text-caption-m text-text-general-medium';

/*
 * Rail over the box's left border, sized to its two cells (no `bottom`) so the connector stops at
 * the stop dot even with a `message`. `-left` is half a dot. `z-10` outranks `ScheduleCard`'s overlay.
 */
const RAIL_CLASSES = `
    pointer-events-none absolute top-none z-10 flex w-2xl flex-col gap-l py-l
    -left-[calc(var(--spacing-2xl)/2)]
`;

/* Connector, dot centre to dot centre (`py-l` + half a cell). Drawn first so the opaque dots cover it. */
const RAIL_LINE_CLASSES = `
    absolute left-1/2 w-px -translate-x-1/2
    inset-y-[calc(var(--spacing-l)+var(--spacing-3xl))]
    bg-linear-to-b
`;

const RAIL_DOT_CLASSES = 'relative flex h-6xl shrink-0 items-center justify-center';

/* Bare glyph, not `IconButton` (no chrome drawn). */
const DELETE_CLASSES = `
    flex size-2xl shrink-0 cursor-pointer items-center justify-center
    rounded-xxs border-none bg-transparent p-none text-icons-general-medium
    transition-colors hover:text-icons-general-strong
    outline-none focus-visible:outline-solid focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-border-focused
`;

/* Empty face and live cell share one grid area. Reduced motion skips the turn and drops the face. */
const FLIP_STACK_CLASSES = 'grid shrink-0 *:[grid-area:1/1]';
const FLIP_FRONT_CLASSES = `
    ${READ_ONLY_CLASSES}
    pointer-events-none origin-center backface-hidden animate-schedule-cell-flip-out
    motion-reduce:hidden
`;
const FLIP_BACK_CLASSES = 'origin-center backface-hidden animate-schedule-cell-flip-in motion-reduce:animate-none';

/** Drawn when a reading is missing: a labelled empty slot reads as a bug. */
const NO_READING = '—';

/** Turns `children` over on mount after `delay` ms. No `delay`, no wrapper. */
function FlipIn({ delay, children }: { delay?: number; children: ReactNode }) {
    if (delay === undefined) {
        return children;
    }

    const style = { animationDelay: `${delay}ms` };

    return (
        <div className={FLIP_STACK_CLASSES}>
            <span aria-hidden className={cn`${FLIP_FRONT_CLASSES}`} style={style} data-part="flip-front" />
            <div className={FLIP_BACK_CLASSES} style={style}>
                {children}
            </div>
        </div>
    );
}

type InputCellProps = {
    label: string;
    value: string;
    options: SelectOption[];
    onValueChange: (next: string) => void;
    /** Draws the cell as a button; see `ScheduleWindowProps.onDayPress`. */
    onPress?: () => void;
    readOnly: boolean;
    disabled?: boolean;
    placeholder?: string;
    part: string;
    /** Takes the whole line's input width; only a read-only day cell alone on its line does. */
    spans?: boolean;
    triggerClassName: string;
};

/** One cell: an editable `Select`, a press button, or the value as text. */
function InputCell({
    label,
    value,
    options,
    onValueChange,
    onPress,
    readOnly,
    disabled,
    placeholder,
    part,
    triggerClassName,
    spans = false,
}: InputCellProps) {
    const selected = options.find((option) => {
        return option.value === value;
    });
    /* Label, else raw value, else placeholder; only the placeholder takes the lighter ink. */
    const held = selected?.label ?? (value || undefined);
    const shown = held ?? placeholder ?? '';
    const shownClasses = held === undefined ? PLACEHOLDER_CLASSES : '';

    if (readOnly) {
        return (
            <div className={spans ? cn`${SPANNING_CELL_CLASSES}` : CELL_CLASSES} data-part={part}>
                <p className={cn`${READ_ONLY_CLASSES} ${shownClasses}`}>
                    <span className={READ_ONLY_VALUE_CLASSES}>{shown}</span>
                </p>
            </div>
        );
    }

    if (onPress) {
        return (
            <div className={CELL_CLASSES} data-part={part}>
                {/* `aria-label` names the control; the drawn word stays the value. */}
                <button
                    type="button"
                    aria-label={held === undefined ? label : `${label}: ${held}`}
                    className={cn`${PRESSABLE_CLASSES} ${shownClasses}`}
                    disabled={disabled}
                    onClick={onPress}
                >
                    <span className={READ_ONLY_VALUE_CLASSES}>{shown}</span>
                </button>
            </div>
        );
    }

    return (
        /* Real label, `sr-only`; `nativeLabel={false}` names a `<button>` trigger. */
        <Field.Root className={CELL_CLASSES} disabled={disabled} data-part={part}>
            <Field.Label className="sr-only" nativeLabel={false} render={<span />}>
                {label}
            </Field.Label>
            <Select
                items={options}
                value={value}
                /* `null` is "nothing selected"; keep the held value rather than report a half-cleared window. */
                onValueChange={(next) => {
                    onValueChange(next ?? value);
                }}
                searchable={false}
                placeholder={placeholder}
                className={triggerClassName}
            />
        </Field.Root>
    );
}

/** The `Event Details` column: a label over a value. */
function Details({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className={DETAILS_CLASSES}>
            <p className={DETAILS_LABEL_CLASSES}>{label}</p>
            <p className={DETAILS_VALUE_CLASSES}>{value}</p>
        </div>
    );
}

type LineProps = {
    end: ScheduleWindowEnd;
    value: ScheduleWindowValue;
    dayOptions: SelectOption[];
    timeOptions: SelectOption[];
    detailsLabel: string;
    detailsValue: ReactNode;
    onChange?: (next: ScheduleWindowValue) => void;
    onDayPress?: (end: ScheduleWindowEnd) => void;
    readOnly: boolean;
    disabled?: boolean;
    dayPlaceholder?: string;
    timePlaceholder?: string;
    /** First cell's flip delay, ms; the time cell follows one stagger later. */
    entranceDelay?: number;
};

/** One end of the window. Start and end are the same drawing with different data. */
function Line({
    end,
    value,
    dayOptions,
    timeOptions,
    detailsLabel,
    detailsValue,
    onChange,
    onDayPress,
    readOnly,
    disabled,
    dayPlaceholder,
    timePlaceholder,
    entranceDelay,
}: LineProps) {
    const timeDelay = entranceDelay === undefined ? undefined : entranceDelay + CELL_FLIP_STAGGER_MS;
    /* Whole `{ day, time }` out, never a partial. */
    const changeDay = (day: string) => {
        onChange?.({ day, time: value.time });
    };
    const changeTime = (time: string) => {
        onChange?.({ day: value.day, time });
    };
    const pressDay =
        onDayPress &&
        (() => {
            onDayPress(end);
        });

    const side = end === 'start' ? 'Start' : 'End';

    /*
     * A read-only time cell with nothing to print is not drawn and the day cell takes its width
     * (`Forever` has no clock time). Editable rows keep both cells — the empty one is the prompt.
     */
    const timeLabel = timeOptions.find((option) => {
        return option.value === value.time;
    })?.label;
    const timeShown = timeLabel ?? value.time;
    const dayAlone = readOnly && timeShown === '';

    return (
        <div className={LINE_CLASSES} data-part={`${end}-line`}>
            <FlipIn delay={entranceDelay}>
                <InputCell
                    label={`${side} day`}
                    value={value.day}
                    options={dayOptions}
                    onValueChange={changeDay}
                    onPress={pressDay}
                    readOnly={readOnly}
                    disabled={disabled}
                    placeholder={dayPlaceholder}
                    part={`${end}-day`}
                    triggerClassName={INPUT_CLASSES}
                    spans={dayAlone}
                />
            </FlipIn>
            {!dayAlone && (
                <FlipIn delay={timeDelay}>
                    <InputCell
                        label={`${side} time`}
                        value={value.time}
                        options={timeOptions}
                        onValueChange={changeTime}
                        readOnly={readOnly}
                        disabled={disabled}
                        placeholder={timePlaceholder}
                        part={`${end}-time`}
                        triggerClassName={TIME_INPUT_CLASSES}
                    />
                </FlipIn>
            )}
            <Details label={detailsLabel} value={detailsValue} />
        </div>
    );
}

/**
 * One run window: start and end lines (day + time), runtime and average weather beside them, an
 * optional chart, and the play/stop rail on the box's left border. Figma: `Event` in `Schedule` 9298:49202.
 */
function ScheduleWindow({
    start,
    end,
    startDayOptions,
    endDayOptions,
    timeOptions,
    endTimeOptions,
    onStartChange,
    onEndChange,
    onDayPress,
    readOnly = false,
    dayPlaceholder,
    timePlaceholder,
    runtime,
    avgWeather,
    onDelete,
    chart,
    status = 'scheduled',
    mode = DEFAULT_SCHEDULE_MODE,
    message,
    disabled,
    entranceIndex,
    className,
}: ScheduleWindowProps) {
    const stroked = status === 'running';
    const modeStroke = SCHEDULE_MODE_STROKE[mode];
    const disabledClasses = disabled ? DISABLED_CLASSES : '';
    const ringClasses = stroked ? BOX_RING_STROKED : BOX_RING;
    const endTimes = endTimeOptions ?? timeOptions;
    /* Start line flips slots 0–1, end line 2–3. */
    const startDelay = entranceIndex === undefined ? undefined : entranceIndex * ROW_ENTRANCE_MS;
    const endDelay = startDelay === undefined ? undefined : startDelay + 2 * CELL_FLIP_STAGGER_MS;

    return (
        <div className={cn`${ROOT_CLASSES} ${disabledClasses} ${className}`} data-status={status} data-mode={mode}>
            <div className={BODY_CLASSES}>
                <div className={cn`${BOX_CLASSES} ${ringClasses}`} data-part="box">
                    {stroked && (
                        <span
                            aria-hidden
                            className={cn`${RUNNING_STROKE_CLASSES} ${modeStroke}`}
                            data-part="running-stroke"
                        />
                    )}
                    <div aria-hidden className={cn`${RAIL_CLASSES}`} data-part="rail">
                        {/* No connector under the running stroke: two gradients on one edge read as a thick line. */}
                        {!stroked && <span className={cn`${RAIL_LINE_CLASSES} ${modeStroke}`} data-part="rail-line" />}
                        <span className={RAIL_DOT_CLASSES}>
                            <PlayGreenIcon className="size-2xl" data-part="rail-start" />
                        </span>
                        <span className={RAIL_DOT_CLASSES}>
                            <StopRedIcon className="size-2xl" data-part="rail-end" />
                        </span>
                    </div>

                    <div className={CONTENT_CLASSES}>
                        <div className={LINES_CLASSES}>
                            <Line
                                end="start"
                                value={start}
                                dayOptions={startDayOptions}
                                timeOptions={timeOptions}
                                detailsLabel="Runtime"
                                detailsValue={runtime}
                                entranceDelay={startDelay}
                                onChange={onStartChange}
                                onDayPress={onDayPress}
                                readOnly={readOnly}
                                disabled={disabled}
                                dayPlaceholder={dayPlaceholder}
                                timePlaceholder={timePlaceholder}
                            />
                            <Line
                                end="end"
                                value={end}
                                dayOptions={endDayOptions}
                                timeOptions={endTimes}
                                detailsLabel="Avg Weather"
                                detailsValue={avgWeather ?? NO_READING}
                                entranceDelay={endDelay}
                                onChange={onEndChange}
                                onDayPress={onDayPress}
                                readOnly={readOnly}
                                disabled={disabled}
                                dayPlaceholder={dayPlaceholder}
                                timePlaceholder={timePlaceholder}
                            />
                        </div>

                        {chart && (
                            <div className={CHART_CLASSES} data-part="chart">
                                {chart}
                            </div>
                        )}
                    </div>

                    {message && (
                        <div className={MESSAGE_CLASSES} data-part="message">
                            {message}
                        </div>
                    )}
                </div>

                {/* Absent, not disabled: `Deletion=No` is a frame with no trash. */}
                {onDelete && (
                    <button
                        type="button"
                        aria-label="Delete run window"
                        className={cn`${DELETE_CLASSES}`}
                        disabled={disabled}
                        onClick={onDelete}
                    >
                        <DeleteIcon aria-hidden className="size-full" />
                    </button>
                )}
            </div>
        </div>
    );
}

export { ScheduleWindow, useScheduleWindowEntrance };
