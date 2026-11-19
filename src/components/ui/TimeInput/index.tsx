import type { Meridiem, TimeInputProps } from './types';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import {
    formatTimeValue,
    isTimeValue,
    maskTimeText,
    parseDisplayTime,
    TIME_INPUT_MAX_LENGTH,
    TIME_INPUT_PLACEHOLDER,
    toDisplayTime,
    withMeridiem,
} from './utils/timeInput';
import { MeridiemPicker } from './components/MeridiemPicker';

/**
 * Time-of-day field: a 12-hour text box (`2:15`) with an `AM`/`PM` addon — Figma `Time Picker` 9449:9198.
 * Use instead of `<input type="time">`, whose picker, keyboard and drawing are the browser's.
 *
 * `value` / `onValueChange` speak 24-hour; the 12-hour text is display. Keystrokes are masked; the
 * half-typed draft lives here and is parsed on blur / `Enter` — a bare hour (`2:`) is that hour on the
 * dot, an unfinished minute (`2:1`) is dropped and the field redraws its value. `''` is in neither half
 * of the day, so an empty field holds its own meridiem until a value arrives.
 */
function TimeInput({
    value,
    onValueChange,
    toValue = formatTimeValue,
    meridiemLabel,
    placeholder = TIME_INPUT_PLACEHOLDER,
    disabled,
    onBlur,
    onKeyDown,
    ...rest
}: TimeInputProps) {
    /* `null` is "showing the value"; `''` is "the user cleared it and has not left yet". */
    const [draft, setDraft] = useState<string | null>(null);
    /* The half of the day while `value` is not a time; `null` is "take it from the value". */
    const [heldMeridiem, setHeldMeridiem] = useState<Meridiem | null>(null);

    const display = toDisplayTime(value);
    const hasTime = isTimeValue(value);
    const meridiem = hasTime ? display.meridiem : (heldMeridiem ?? display.meridiem);
    const addonName = meridiemLabel ?? rest['aria-label'] ?? 'Time';

    function emit(next: string) {
        setHeldMeridiem(null);
        if (next !== value) {
            onValueChange(next);
        }
    }

    function commit() {
        if (draft === null) {
            return;
        }
        setDraft(null);
        // A cleared field is an answer too: the caller decides whether a time is required.
        if (draft.trim() === '') {
            emit('');
            return;
        }
        const parsed = parseDisplayTime(draft, meridiem, toValue);
        if (parsed !== null) {
            emit(parsed);
        }
    }

    function pickMeridiem(next: Meridiem) {
        // The pending text goes with the pick — committing it against the old meridiem writes the wrong half.
        const parsed = draft === null ? null : parseDisplayTime(draft, next, toValue);
        setDraft(null);

        if (parsed !== null) {
            emit(parsed);
            return;
        }
        if (hasTime) {
            emit(withMeridiem(value, next, toValue));
            return;
        }
        setHeldMeridiem(next);
    }

    return (
        <Input
            {...rest}
            value={draft ?? display.text}
            placeholder={placeholder}
            disabled={disabled}
            type="text"
            // Digits-only keypad on phones; the mask owns the `:`.
            inputMode="numeric"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={TIME_INPUT_MAX_LENGTH}
            onChange={(event) => {
                const deleting = (event.nativeEvent as InputEvent).inputType?.startsWith('delete') ?? false;
                setDraft(maskTimeText(event.target.value, deleting));
            }}
            onBlur={(event) => {
                commit();
                onBlur?.(event);
            }}
            onKeyDown={(event) => {
                // Enter with an edit pending commits it and stays; with none it falls through to the form's submit.
                if (event.key === 'Enter' && draft !== null) {
                    event.preventDefault();
                    commit();
                }
                onKeyDown?.(event);
            }}
            endAddon={
                <MeridiemPicker label={addonName} value={meridiem} onValueChange={pickMeridiem} disabled={disabled} />
            }
        />
    );
}

export { MeridiemPicker, TimeInput };
export {
    formatTimeValue,
    isTimeValue,
    maskTimeText,
    parseDisplayTime,
    TIME_INPUT_INVALID_ERROR,
    TIME_INPUT_MAX_LENGTH,
    TIME_INPUT_PLACEHOLDER,
    TIME_VALUE_PATTERN,
    toDisplayTime,
    toMinutesOfDay,
    withMeridiem,
} from './utils/timeInput';
