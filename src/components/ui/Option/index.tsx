import type { OptionProps, SelectValueProps } from './types';
import CheckIcon from '@/assets/icons/check.svg?react';
import RadioButtonCheckedIcon from '@/assets/icons/radio-button-checked.svg?react';
import RadioButtonUncheckedIcon from '@/assets/icons/radio-button-unchecked.svg?react';
import { cn } from '@/lib/cn';

/* Shared by `Option` and `SelectValue`. `min-w-px` bounds the stack so a long label truncates, not overflows. */
const TITLE_SUBTITLE_STACK = 'flex min-w-px flex-1 flex-col gap-xxs';

const TITLE_CLASSES = 'text-body-m text-text-general-strong';
const SUBTITLE_CLASSES = 'text-caption-m text-text-general-medium';

/*
 * Lines truncate: labels are user-typed names, and wrapping would break the fixed row height the list
 * and virtualizer measure from. No `title` attr — the accessible name stays the full text.
 */
const TRUNCATE = 'truncate';

/*
 * Height falls out of padding + line-height (48 / 50px). `rounded-s` = Figma's `Radius/m` 8px.
 * `group/option` is namespaced so an ancestor `group` with `data-disabled` cannot grey rows.
 * Hover and keyboard highlight share one look: hosts set `data-highlighted` on hover too. The Big set
 * draws no highlight; derived from standard so keyboard users see focus (WCAG 2.4.7).
 * The checkmark toggles `visibility` so its 20px slot holds whether or not the row is selected.
 * Disabled is presentational only; the host owns activation.
 */
const ROW_CLASSES = `
    group/option flex w-full min-w-px cursor-pointer items-center gap-s rounded-s transition-colors
    text-left text-body-m text-text-general-strong
    not-data-[disabled]:data-[highlighted]:bg-surface-input
    [&_[data-slot=check]]:invisible data-[selected]:[&_[data-slot=check]]:visible
    data-[disabled]:cursor-not-allowed data-[disabled]:text-text-disabled
`;

const ONE_LINE_PADDING = 'p-l';
const TWO_LINE_PADDING = 'px-l py-xs';
/* Mobile sheet radio rows are 36px (Figma 11165:148548). */
const RADIO_ONE_LINE_PADDING = 'px-l py-s';

const ROW_SUBTITLE_CLASSES = `${SUBTITLE_CLASSES} ${TRUNCATE} group-data-[disabled]/option:text-text-disabled`;

/* No `overflow-clip` (Figma export boilerplate): it would clip focus rings of interactive slot content. */
const SLOT_CLASSES = 'size-2xl shrink-0';

const RADIO_LAYER_CLASSES = 'pointer-events-none absolute inset-none size-full';
const RADIO_UNCHECKED_CLASSES = `${RADIO_LAYER_CLASSES} text-border-primary group-data-[selected]/option:hidden`;
/* Brighter on purpose: in radio mode the ring is the only selection indicator. */
const RADIO_CHECKED_CLASSES = `${RADIO_LAYER_CLASSES} text-border-focused hidden group-data-[selected]/option:block`;

/**
 * One dropdown row; presentational, no Base UI import. Hosts pass it as `render` and spread state
 * `data-*` onto it. Figma: 8915:27038 (standard), 8750:15830 (Big).
 */
function Option({
    label,
    subtitle,
    startAddon,
    endAddon,
    labelContent,
    indicator = 'check',
    className,
    ...rest
}: OptionProps) {
    const hasSubtitle = subtitle !== undefined;
    const oneLinePadding = indicator === 'radio' ? RADIO_ONE_LINE_PADDING : ONE_LINE_PADDING;
    const padding = hasSubtitle ? TWO_LINE_PADDING : oneLinePadding;

    const stack = labelContent ?? (
        <>
            <span className={TRUNCATE}>{label}</span>
            {hasSubtitle ? <span className={ROW_SUBTITLE_CLASSES}>{subtitle}</span> : null}
        </>
    );

    /* `...rest` carries the host's data attrs, id, role, aria and ref — dropping it makes the row inert. */
    return (
        <div {...rest} className={cn`${ROW_CLASSES} ${padding} ${className}`}>
            {indicator === 'radio' ? (
                <span
                    aria-hidden
                    data-slot="radio"
                    className="relative size-2xl shrink-0 group-data-[disabled]/option:hidden"
                >
                    <RadioButtonUncheckedIcon aria-hidden className={RADIO_UNCHECKED_CLASSES} />
                    <RadioButtonCheckedIcon aria-hidden className={RADIO_CHECKED_CLASSES} />
                </span>
            ) : null}
            {startAddon ? <span className={SLOT_CLASSES}>{startAddon}</span> : null}
            <div className={TITLE_SUBTITLE_STACK}>{stack}</div>
            {endAddon ? <span className={SLOT_CLASSES}>{endAddon}</span> : null}
            {indicator === 'check' ? <CheckIcon aria-hidden data-slot="check" className={SLOT_CLASSES} /> : null}
        </div>
    );
}

/** The trigger's value display: the selected option's lines, or the placeholder. Figma: 8915:27414. */
function SelectValue({ label, subtitle, placeholder, className, ...rest }: SelectValueProps) {
    const hasLabel = label !== undefined;
    /* `Input`'s placeholder colour. */
    const valueClassName = hasLabel ? TITLE_CLASSES : `${TITLE_CLASSES} text-text-general-medium`;

    return (
        <span {...rest} className={cn`${TITLE_SUBTITLE_STACK} ${className}`}>
            <span className={cn`${valueClassName}`}>{hasLabel ? label : placeholder}</span>
            {subtitle === undefined ? null : <span className={SUBTITLE_CLASSES}>{subtitle}</span>}
        </span>
    );
}

export { Option, SelectValue };
