import type { DateRangeFieldProps, DateRangeFieldsProps } from './types';
import CalendarIcon from '@/assets/icons/calendar.svg?react';
import { cn } from '@/lib/cn';
import { Field } from '@/components/ui/Field';
import { Input, InputAddonButton } from '@/components/ui/Input';
import { DATE_INPUT_MAX_LENGTH, DATE_INPUT_PLACEHOLDER } from './utils/dateInput';

/** Each field takes an equal share of the row and may shrink; `Field.Root` owns the 6px stack. */
const FIELD_CLASSES = 'min-w-px flex-1';

/* Ink stated: the glyph is `currentColor` and `Input`'s body carries no `text-*`. Bare only without `onShowToday`. */
const CALENDAR_GLYPH = <CalendarIcon aria-hidden className="size-2xl shrink-0 text-icons-general-strong" />;

/**
 * One endpoint's box. `inputMode="numeric"` for the digit keypad; `maxLength` restates the mask's ceiling.
 * `type="text"`, not `date`: the native picker would put a second calendar beside ours.
 */
function DateRangeField({ label, field, onFocus, endAddon, className, invalid }: DateRangeFieldProps) {
    return (
        <Field.Root className={className} invalid={invalid || field.error !== null}>
            <Field.Label>{label}</Field.Label>
            <Input
                value={field.value}
                onValueChange={field.onValueChange}
                onFocus={onFocus}
                placeholder={DATE_INPUT_PLACEHOLDER}
                inputMode="numeric"
                autoComplete="off"
                maxLength={DATE_INPUT_MAX_LENGTH}
                endAddon={endAddon}
            />
            <Field.Error>{field.error}</Field.Error>
        </Field.Root>
    );
}

/**
 * The two typed boxes beside a range `Calendar`, fed by `useDateRangeInput` — the draft's endpoints as
 * text, not an applied value. What a date *is* (mask, bounds, pair messages) is the hook's.
 */
function DateRangeFields({
    from,
    to,
    fromLabel,
    toLabel,
    onFieldFocus,
    onShowToday,
    fromEndAddon,
    toEndAddon,
    className,
    fieldClassName,
    invalid = false,
}: DateRangeFieldsProps) {
    const fieldClassNames = cn`${FIELD_CLASSES} ${fieldClassName}`;

    const fromCalendarAddon = onShowToday ? (
        <InputAddonButton
            icon={<CalendarIcon />}
            aria-label="Show today"
            onClick={() => {
                onShowToday('from');
            }}
        />
    ) : (
        CALENDAR_GLYPH
    );
    const toCalendarAddon = onShowToday ? (
        <InputAddonButton
            icon={<CalendarIcon />}
            aria-label="Show today"
            onClick={() => {
                onShowToday('to');
            }}
        />
    ) : (
        CALENDAR_GLYPH
    );

    return (
        <div className={cn`flex w-full items-start gap-l ${className}`}>
            <DateRangeField
                label={fromLabel}
                field={from}
                onFocus={() => {
                    onFieldFocus?.('from');
                }}
                endAddon={fromEndAddon ?? fromCalendarAddon}
                className={fieldClassNames}
                invalid={invalid}
            />
            <DateRangeField
                label={toLabel}
                field={to}
                onFocus={() => {
                    onFieldFocus?.('to');
                }}
                endAddon={toEndAddon ?? toCalendarAddon}
                className={fieldClassNames}
                invalid={invalid}
            />
        </div>
    );
}

export { DateRangeFields };
export { useDateRangeInput } from './hooks/useDateRangeInput';
