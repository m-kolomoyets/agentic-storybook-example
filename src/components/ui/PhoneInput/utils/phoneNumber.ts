/*
 * `PhoneInput`'s value logic, React-free. Two strings, never conflated: the **stored** value
 * (`+<calling code><digits>` or `''`, what `onValueChange` emits) and the **display** value
 * (`AsYouType`'s `+1 555 867 5309`, never leaves the component).
 * `/min` is the one metadata bundle (ADR-0006) — two bundles in one app disagree silently.
 */
import type { CountryCode } from 'libphonenumber-js/min';
import { AsYouType, getCountryCallingCode, parseIncompletePhoneNumber } from 'libphonenumber-js/min';

/**
 * The stored value, emitted **valid or not**: withholding a half-typed number makes it look empty
 * to the form layer (breaks `required`/`dirty`). A lone `+` has no digits, so it is `''`.
 */
export function toStoredValue(input: string, country: CountryCode): string {
    const digits = parseIncompletePhoneNumber(input);
    if (digits === '' || digits === '+') {
        return '';
    }
    // A pasted international code wins over the picker's.
    if (digits.startsWith('+')) {
        return digits;
    }
    return `+${getCountryCallingCode(country)}${digits}`;
}

/**
 * Leading `+`, digits or not. `toStoredValue` can't say this for a lone `+`; without it the `+`
 * vanishes as typed and `+44…` lands as `+144…`.
 */
export function isInternationalInput(input: string): boolean {
    return parseIncompletePhoneNumber(input).startsWith('+');
}

/** Display string. Figma draws `+1 555 867-5309`; the library's separator is kept (ADR-0006). */
export function toDisplayValue(stored: string, country: CountryCode): string {
    return stored === '' ? '' : new AsYouType(country).input(stored);
}

/**
 * The region the typed text implies, or `undefined` — never a guess: `+1` is shared by twenty-odd
 * regions, and a national number implies none.
 */
export function countryFromInput(input: string): CountryCode | undefined {
    const digits = parseIncompletePhoneNumber(input);
    if (!digits.startsWith('+')) {
        return undefined;
    }
    // No country argument: what the *text* implies, not what it means under the current region.
    const formatter = new AsYouType();
    formatter.input(digits);
    return formatter.getCountry();
}

/**
 * Keeps the national digits and swaps the calling code (the common "wrong country" fix shouldn't
 * throw away typing). Empty stays empty — a bare `+52` would make an untouched field dirty.
 */
export function reCountry(stored: string, from: CountryCode, to: CountryCode): string {
    if (stored === '') {
        return '';
    }
    const digits = stored.replace(/\D/g, '');
    const fromCallingCode = getCountryCallingCode(from);
    // Guarded: a pasted `+44…` the picker hasn't caught up with doesn't start with `from`'s code.
    const national = digits.startsWith(fromCallingCode) ? digits.slice(fromCallingCode.length) : digits;
    return `+${getCountryCallingCode(to)}${national}`;
}

/** The drawn `+1 000 000 000` mask; only the calling code tracks the picker. */
export function placeholderFor(country: CountryCode): string {
    return `+${getCountryCallingCode(country)} 000 000 000`;
}
