import type { InputProps } from '@/components/ui/Input/types';

export type Meridiem = 'AM' | 'PM';

/** A time as the field draws it: a 12-hour clock, and which half of the day it is in. */
export type TimeOfDayDisplay = {
    text: string;
    meridiem: Meridiem;
};

/** Turns a 24-hour clock position into the stored value. Default: padded `HH:mm`. */
export type ToTimeValue = (hour: number, minute: number) => string;

export type TimeInputProps = Omit<
    InputProps,
    'value' | 'defaultValue' | 'onChange' | 'onValueChange' | 'type' | 'endAddon'
> & {
    /** 24-hour time, or `''` (no time yet). */
    value: string;
    /** Called on commit only — blur, `Enter` or the addon — never per keystroke. */
    onValueChange: (next: string) => void;
    /** How a committed clock position is written. @default padded `HH:mm` */
    toValue?: ToTimeValue;
    /** Names the AM/PM picker (`<name>, PM`). Defaults to `aria-label`, else `Time`. */
    meridiemLabel?: string;
};

export type MeridiemPickerProps = {
    value: Meridiem;
    onValueChange: (next: Meridiem) => void;
    /** Names the trigger: `<label>, AM`. */
    label: string;
    disabled?: boolean;
};
