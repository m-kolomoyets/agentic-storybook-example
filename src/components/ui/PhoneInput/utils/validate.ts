/*
 * The one phone validator, from the `/min` bundle `PhoneInput` formats with (ADR-0006).
 * amber re-exported `isValidPhoneNumber` for react-hook-form call sites; here it also ships as a
 * Zod schema for TanStack Form.
 */
import type { CountryCode } from 'libphonenumber-js/min';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js/min';
import { z } from 'zod';

export { isValidPhoneNumber };

/** A stored `PhoneInput` value that is a complete, valid number. Optional field: `.or(z.literal(''))`. */
export const phoneNumberSchema = z.string().refine(
    (value) => {
        return isValidPhoneNumber(value);
    },
    { message: 'Enter a complete phone number.' }
);

/**
 * E.164 (`+14155550123`), or `null` when unparseable. Without `defaultCountry` the input must carry
 * its own `+`, as stored values do.
 */
export function toE164(input: string, defaultCountry?: CountryCode): string | null {
    try {
        return parsePhoneNumber(input, defaultCountry).number;
    } catch {
        return null;
    }
}

/** Figma phone-verify copy: `+1 ··· ··· 4428` (calling code + last 4). */
export function formatMaskedPhone(telephone: string): string {
    try {
        const parsed = parsePhoneNumber(telephone);
        const national = parsed.nationalNumber;
        const last4 = national.length <= 4 ? national : national.slice(-4);
        return `+${parsed.countryCallingCode} ··· ··· ${last4}`;
    } catch {
        const digits = telephone.replace(/\D/g, '');
        const last4 = digits.slice(-4) || '····';
        return `+·· ··· ··· ${last4}`;
    }
}
