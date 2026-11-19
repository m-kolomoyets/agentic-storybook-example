import type { ReactNode } from 'react';
import type { ScheduleCardOverlayStatus, ScheduleCardProps } from './types';
import { Children } from 'react';
import CalendarIcon from '@/assets/icons/calendar.svg?react';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg?react';
import ClockIcon from '@/assets/icons/clock.svg?react';
import ErrorIcon from '@/assets/icons/error.svg?react';
import FlashAutoIcon from '@/assets/icons/flash-auto.svg?react';
import PlusIcon from '@/assets/icons/plus.svg?react';
import { cn } from '@/lib/cn';
import { OVERLAY_DURATION_SHORT } from '@/lib/ui/overlayMotion';
import { DEFAULT_SCHEDULE_MODE, SCHEDULE_MODE_PROGRESS } from '@/lib/ui/scheduleMode';
import { Progress } from '@/components/ui/Progress';
import { StatusIcon } from '@/components/ui/StatusIcon';

const ROOT_CLASSES = 'flex w-full flex-col gap-s';

/* `Surface/control` at `Radius/l`, `pl 8 / pr 12 / py 12`; shared by the card and the notice slab. */
const BOX_CLASSES = 'rounded-m bg-surface-control py-l pl-m pr-l';

const CARD_CLASSES = `flex w-full flex-col gap-l overflow-hidden ${BOX_CLASSES}`;

const HEADER_CLASSES = 'flex w-full flex-col gap-xs pl-xs';

const TITLE_ROW_CLASSES = 'flex w-full items-center justify-between gap-m';

const TITLE_CLASSES = 'text-body-m-medium text-text-general-strong';

/* `ml-auto` as well as `justify-between`: the no-data cell has no title. */
const ACTIONS_CLASSES = 'ml-auto flex shrink-0 items-center gap-m';

const FOCUS_RING_CLASSES =
    'outline-none focus-visible:outline-solid focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-border-focused';

/* Bare 20px glyph control (under WCAG 2.5.8's 24px, as drawn). No hover colour: none is drawn. */
const ACTION_CLASSES = `
    flex size-2xl shrink-0 cursor-pointer items-center justify-center
    rounded-xxs bg-transparent p-none text-icons-general-strong
    ${FOCUS_RING_CLASSES}
`;

/* `flex-wrap` only fires on a long automation note. */
const META_CLASSES = 'flex flex-wrap items-center gap-3xl';
const META_ITEM_CLASSES = 'flex min-w-px items-center gap-xs';
const META_ICON_CLASSES = 'size-l shrink-0 text-icons-general-medium';
const META_TEXT_CLASSES = 'min-w-px text-caption-m text-text-general-medium';

/* Count pill. Static it pads 6 both sides; as the toggle it carries the chevron at `pr 2`. */
const BADGE_CLASSES = 'flex shrink-0 items-center rounded-full bg-surface-card py-xxs';
const BADGE_STATIC_CLASSES = `${BADGE_CLASSES} px-s`;
const BADGE_BUTTON_CLASSES = `${BADGE_CLASSES} cursor-pointer pl-s pr-xxs text-icons-general-strong ${FOCUS_RING_CLASSES}`;

const COUNT_CLASSES = 'text-caption-m-medium text-text-general-strong';

/* Rotates on `aria-expanded` read off the button. */
const BADGE_CHEVRON_CLASSES = `
    size-2xl shrink-0
    transition-transform ${OVERLAY_DURATION_SHORT} motion-reduce:transition-none
    in-aria-expanded:rotate-180
`;

const BODY_CLASSES = 'flex w-full flex-col gap-l';

/* The list's 8px gap lives inside the collapsing wrapper, so a closed card carries none. */
const LIST_CLASSES = 'flex w-full flex-col';

/*
 * Rows past the first stay mounted and collapse via `grid-template-rows` (`0fr` → `1fr` transitions,
 * `height: auto` does not). The 8px above them sits on a further child: padding on the shrinking
 * element would leave an 8px sliver on a closed card.
 */
const MORE_CLASSES = `
    grid grid-rows-[0fr] data-[open]:grid-rows-[1fr]
    transition-[grid-template-rows] ${OVERLAY_DURATION_SHORT} motion-reduce:transition-none
`;
const MORE_INNER_CLASSES = 'min-h-[0px] w-full overflow-hidden';
const MORE_ROWS_CLASSES = 'flex w-full flex-col gap-m pt-m';

/*
 * A card that never collapses draws every row as a sibling in one list: splitting into head + more
 * would re-parent the second row whenever the first is removed, remounting it.
 */
const FLAT_LIST_CLASSES = 'flex w-full flex-col gap-m';

const WINDOWS_CLASSES = 'w-full';
const WINDOWS_OVERLAID_CLASSES = 'w-full relative min-h-schedule-card-slab';

/* Starts at the window box's left edge so the rail hangs in the gutter. Last child: paints over rows without `z-*`. */
const OVERLAY_CLASSES = `
    absolute inset-y-none right-none left-l flex items-center justify-center overflow-hidden
    rounded-s py-l pl-m pr-l schedule-overlay
`;

/* Notice slab: the card's box at a window's height, 4px left inset (no rail). */
const SLAB_CLASSES = `ml-xs flex flex-col items-center justify-center min-h-schedule-card-slab ${BOX_CLASSES}`;

const EMPTY_CLASSES = 'flex w-full min-h-schedule-card-slab items-center justify-center';

/* Chip at 44 (`p-l` around a 20px glyph), overriding `StatusIcon`'s 40 box for this frame only. */
const STATUS_CHIP_CLASSES = 'size-auto shrink-0 p-l';
const STATUS_CLASSES = 'flex w-full flex-col items-center gap-l';
const STATUS_TEXT_CLASSES = 'flex w-full flex-col items-center gap-xs text-center';
const STATUS_TITLE_CLASSES = 'w-full text-body-s-medium text-text-general-strong';
const STATUS_DESCRIPTION_CLASSES = 'w-full text-caption-m text-text-general-medium';

/* 12px gutter, lining up with the windows above. */
const PROGRESS_CLASSES = 'ml-l';

const VALIDATION_CLASSES = 'px-l text-caption-m text-text-negative';

const DEFAULT_TITLE = 'Schedule';

/** Accessible name for the bar (`role="progressbar"` needs one, WCAG 4.1.2). Not a prop. */
const PROGRESS_LABEL = 'Schedule progress';

type MetaItemProps = {
    icon: ReactNode;
    children: ReactNode;
    part: string;
};

function MetaItem({ icon, children, part }: MetaItemProps) {
    return (
        <span className={META_ITEM_CLASSES} data-part={part}>
            <span aria-hidden className={META_ICON_CLASSES}>
                {icon}
            </span>
            <p className={META_TEXT_CLASSES}>{children}</p>
        </span>
    );
}

type StatusBlockProps = {
    status: 'default' | ScheduleCardOverlayStatus;
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
};

/** `surface="general"`: the card stands on the dark ground, where the `on-surface` chip is a smudge. */
function StatusBlock({ status, icon, title, description }: StatusBlockProps) {
    return (
        <div className={STATUS_CLASSES}>
            <StatusIcon status={status} surface="general" icon={icon} className={STATUS_CHIP_CLASSES} />
            <div className={STATUS_TEXT_CLASSES}>
                <p className={STATUS_TITLE_CLASSES}>{title}</p>
                {description !== undefined && (
                    <p className={STATUS_DESCRIPTION_CLASSES} data-part="empty-description">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * The card a schedule's run windows are drawn in; the one thing it decides is how many to draw.
 * Figma: `Schedule` 9298:49202.
 */
function ScheduleCard({
    title = DEFAULT_TITLE,
    date,
    time,
    automationNote,
    count,
    onAdd,
    open,
    onOpenChange,
    children,
    progress,
    mode = DEFAULT_SCHEDULE_MODE,
    overlay,
    notice,
    empty,
    validationMessage,
    className,
}: ScheduleCardProps) {
    const windowsClasses = overlay === undefined ? WINDOWS_CLASSES : WINDOWS_OVERLAID_CLASSES;

    // Truncation is the card's: `Children.toArray` drops nulls, so `open={false}` draws the first rendered row.
    // eslint-disable-next-line @eslint-react/no-children-to-array
    const items = Children.toArray(children);
    const [head, ...rest] = items;

    // `automationNote` hides the `+` even with `onAdd`: an automation owns its windows.
    const showAdd = onAdd !== undefined && automationNote === undefined;
    // A chevron that reports nothing is not drawn; `open` alone still truncates.
    const showChevron = onOpenChange !== undefined;
    const isOpen = open !== false;
    // Neither prop: the card can never truncate, so it needs no `more` box.
    const isCollapsible = open !== undefined || showChevron;

    // `title` is a node: check null, not falsiness.
    const hasTitle = title !== null && title !== undefined;
    const hasMeta = automationNote !== undefined || date !== undefined || time !== undefined;
    const hasActions = showAdd || showChevron || count !== undefined;
    const hasHeader = hasTitle || hasMeta || hasActions;

    const countPill =
        count === undefined ? null : (
            <span className={COUNT_CLASSES} data-part="count">
                {count}
            </span>
        );

    return (
        <div
            className={cn`${ROOT_CLASSES} ${className}`}
            data-open={isOpen ? '' : undefined}
            data-progress={progress?.state}
            data-mode={mode}
        >
            <div className={CARD_CLASSES} data-part="card">
                {hasHeader && (
                    <div className={HEADER_CLASSES} data-part="header">
                        <div className={TITLE_ROW_CLASSES}>
                            {hasTitle && (
                                <p className={TITLE_CLASSES} data-part="title">
                                    {title}
                                </p>
                            )}
                            {hasActions && (
                                <div className={ACTIONS_CLASSES}>
                                    {showAdd && (
                                        <button
                                            type="button"
                                            aria-label="Add run window"
                                            className={ACTION_CLASSES}
                                            data-part="add"
                                            onClick={onAdd}
                                        >
                                            <PlusIcon aria-hidden className="size-full" />
                                        </button>
                                    )}
                                    {showChevron && (
                                        <button
                                            type="button"
                                            aria-expanded={isOpen}
                                            className={BADGE_BUTTON_CLASSES}
                                            data-part="chevron"
                                            onClick={() => {
                                                onOpenChange(!isOpen);
                                            }}
                                        >
                                            {/* Hidden text, not `aria-label`: the visible count must be
                                                part of the name (WCAG 2.5.3). */}
                                            <span className="sr-only">Toggle schedule</span>
                                            {countPill}
                                            <ChevronDownIcon aria-hidden className={BADGE_CHEVRON_CLASSES} />
                                        </button>
                                    )}
                                    {!showChevron && countPill !== null && (
                                        <span className={BADGE_STATIC_CLASSES}>{countPill}</span>
                                    )}
                                </div>
                            )}
                        </div>
                        {hasMeta && (
                            <div className={META_CLASSES} data-part="meta">
                                {automationNote === undefined ? (
                                    <>
                                        {date !== undefined && (
                                            <MetaItem icon={<CalendarIcon className="size-full" />} part="date">
                                                {date}
                                            </MetaItem>
                                        )}
                                        {time !== undefined && (
                                            <MetaItem icon={<ClockIcon className="size-full" />} part="time">
                                                {time}
                                            </MetaItem>
                                        )}
                                    </>
                                ) : (
                                    <MetaItem icon={<FlashAutoIcon className="size-full" />} part="automation-note">
                                        {automationNote}
                                    </MetaItem>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* `empty` replaces everything; `notice` is a slab above the list, `overlay` a layer over it. */}
                {empty === undefined ? (
                    <div className={BODY_CLASSES} data-part="body">
                        {notice !== undefined && (
                            <div className={SLAB_CLASSES} data-part="notice">
                                {/* The `!` disc, not the `default` checkmark: the tile states a condition. */}
                                <StatusBlock
                                    status="default"
                                    icon={<ErrorIcon className="size-full" />}
                                    title={notice}
                                />
                            </div>
                        )}
                        {(items.length > 0 || overlay !== undefined) && (
                            <div className={windowsClasses} data-part="windows">
                                {items.length > 0 && !isCollapsible && (
                                    <div className={FLAT_LIST_CLASSES} data-part="list">
                                        {items}
                                    </div>
                                )}
                                {items.length > 0 && isCollapsible && (
                                    <div className={LIST_CLASSES} data-part="list">
                                        {head}
                                        {/* Collapsed rows stay mounted; `inert` takes them out of tab order. */}
                                        {rest.length > 0 && (
                                            <div
                                                className={MORE_CLASSES}
                                                data-part="more"
                                                data-open={isOpen ? '' : undefined}
                                                data-pair-height-ignore=""
                                            >
                                                <div className={MORE_INNER_CLASSES} inert={!isOpen}>
                                                    <div className={MORE_ROWS_CLASSES}>{rest}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Rows underneath stay in the a11y tree on purpose. */}
                                {overlay !== undefined && (
                                    <div className={OVERLAY_CLASSES} data-part="overlay">
                                        <StatusBlock status={overlay.status} title={overlay.title} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={EMPTY_CLASSES} data-part="empty">
                        <StatusBlock
                            status="default"
                            icon={<ClockIcon className="size-full" />}
                            title={empty.title}
                            description={empty.description}
                        />
                    </div>
                )}

                {progress !== undefined && (
                    // Gradient stops are re-declared on the gutter so `Progress` keeps one drawing.
                    <div className={cn`${PROGRESS_CLASSES} ${SCHEDULE_MODE_PROGRESS[mode]}`} data-part="progress">
                        <Progress
                            value={progress.value}
                            label={PROGRESS_LABEL}
                            disabled={progress.state === 'stopped'}
                        />
                    </div>
                )}
            </div>
            {validationMessage !== undefined && (
                <p className={VALIDATION_CLASSES} data-part="validation">
                    {validationMessage}
                </p>
            )}
        </div>
    );
}

export { ScheduleCard };
