import type { ComponentProps } from 'react';
import type { CountryCode, PhoneInputProps } from './types';
import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useFieldState } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import {
    countryFromInput,
    isInternationalInput,
    placeholderFor,
    reCountry,
    toDisplayValue,
    toStoredValue,
} from './utils/phoneNumber';
import { CountryPicker } from './components/CountryPicker';

/* The row is the whole component, and the popup's anchor. `gap-xs` = drawn 4px (72 − 68). */
const ROW_CLASSES = 'flex w-full items-center gap-xs';

/*
 * ADR-0002 deviation: the visible input holds the *formatted* string, so it must never submit.
 * Base UI resolves `fieldName ?? nameProp` (Field wins), so only `render` can drop the name;
 * the E.164 value goes out on the hidden input instead.
 */
function renderUnnamedInput(props: ComponentProps<'input'>) {
    return <input {...props} name={undefined} />;
}

/**
 * Country picker + text input that agree: typing a `+code` moves the picker, picking re-codes the
 * number. Value is always `+<code><digits>`. Figma: `Phone Number Input` 10417:262835.
 */
function PhoneInput({
    value,
    defaultValue,
    onValueChange,
    country,
    defaultCountry = 'US',
    onCountryChange,
    countries,
    locale,
    placeholder,
    error = false,
    disabled,
    name,
    id,
    className,
}: PhoneInputProps) {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? '');
    const isValueControlled = value !== undefined;
    const storedValue = isValueControlled ? value : uncontrolledValue;

    /* A lone `+` normalizes to `''` but is mid-typing; remembered until a digit follows (else `+44` → `+144`). */
    const [internationalPrefix, setInternationalPrefix] = useState(false);

    const [uncontrolledCountry, setUncontrolledCountry] = useState<CountryCode>(defaultCountry);
    const isCountryControlled = country !== undefined;
    const currentCountry = isCountryControlled ? country : uncontrolledCountry;

    const rowRef = useRef<HTMLDivElement>(null);

    /*
     * The picker's nested Field.Root shadows the outer one, so the outer state is read here and
     * handed down — else `<Field.Root invalid>` paints only the input. `disabled` uses `??`:
     * `undefined` means "no opinion".
     */
    const field = useFieldState();
    const isInvalid = error || field.invalid;
    const isDisabled = disabled ?? field.disabled;

    const formattedValue = toDisplayValue(storedValue, currentCountry);
    const displayValue = internationalPrefix && storedValue === '' ? '+' : formattedValue;
    const inputPlaceholder = placeholder ?? placeholderFor(currentCountry);

    function emitValue(next: string) {
        if (!isValueControlled) {
            setUncontrolledValue(next);
        }
        onValueChange?.(next);
    }

    function emitCountry(next: CountryCode) {
        if (!isCountryControlled) {
            setUncontrolledCountry(next);
        }
        onCountryChange?.(next);
    }

    /* The picker moves only for a prefix that means one region; clearing leaves it where it was. */
    function handleInputValueChange(next: string) {
        setInternationalPrefix(isInternationalInput(next));
        emitValue(toStoredValue(next, currentCountry));

        const implied = countryFromInput(next);
        if (implied === undefined || implied === currentCountry) {
            return;
        }
        emitCountry(implied);
    }

    /* A trailing lone `+` is abandoned typing; drop it on leave (a controlled reset to `''` can't be told apart). */
    function handleBlur() {
        setInternationalPrefix(false);
    }

    /* Keep national digits, swap the code. Two emits: value and country are separate caller state. */
    function handleCountryChange(next: CountryCode) {
        emitValue(reCountry(storedValue, currentCountry, next));
        emitCountry(next);
    }

    return (
        <div ref={rowRef} className={cn`${ROW_CLASSES} ${className}`}>
            <CountryPicker
                country={currentCountry}
                onCountryChange={handleCountryChange}
                countries={countries}
                locale={locale}
                disabled={isDisabled}
                error={isInvalid}
                anchorRef={rowRef}
            />
            {/* `tel` both ways so phones open a keypad. */}
            <Input
                render={renderUnnamedInput}
                id={id}
                type="tel"
                inputMode="tel"
                value={displayValue}
                onValueChange={handleInputValueChange}
                onBlur={handleBlur}
                placeholder={inputPlaceholder}
                error={isInvalid}
                disabled={isDisabled}
            />
            {/* Only when named, so a controlled field in a Field.Root grows no stray input. */}
            {name === undefined ? null : <input type="hidden" name={name} value={storedValue} />}
        </div>
    );
}

export { PhoneInput };
export { isValidPhoneNumber, phoneNumberSchema, toE164, formatMaskedPhone } from './utils/validate';
