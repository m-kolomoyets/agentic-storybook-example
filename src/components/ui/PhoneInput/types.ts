import type { RefObject } from 'react';
import type { CountryCode } from 'libphonenumber-js/min';

export type { CountryCode };

export type PhoneInputProps = {
    /**
     * Stored number: `+<calling code><digits>` or `''` — never the formatted string.
     * `undefined` = uncontrolled (seeded by `defaultValue`).
     */
    value?: string;
    defaultValue?: string;
    /** Every keystroke, normalized — valid or not. Validate with `phoneNumberSchema`/`isValidPhoneNumber`. */
    onValueChange?: (value: string) => void;
    /** Picker region; separate state, never derived from the value (`+1` is shared by ~25 regions). */
    country?: CountryCode;
    /**
     * Product market, not `navigator.language`.
     * @default 'US'
     */
    defaultCountry?: CountryCode;
    /** On pick, or when a typed `+code` implies exactly one region. */
    onCountryChange?: (country: CountryCode) => void;
    /** Narrows the popup to these regions (derived order kept). */
    countries?: CountryCode[];
    /**
     * Names and orders rows via `Intl.DisplayNames`.
     * @default 'en'
     */
    locale?: string;
    /** @default `+<code> 000 000 000`, tracking the picker */
    placeholder?: string;
    /** Paints **both** boxes negative. Inside `Field.Root` use its `invalid`; the Field wins. */
    error?: boolean;
    disabled?: boolean;
    /** Lands on a hidden input carrying the stored value, never on the visible (formatted) one. */
    name?: string;
    /** The text input's id (what `Field.Label` points at). */
    id?: string;
    /** Merged onto the row holding both boxes. */
    className?: string;
    /** Body only: label/helper are `Field.Label`/`Field.Description`. No addons (Figma's are demo glyphs). */
    children?: never;
};

export type CountryPickerProps = {
    country: CountryCode;
    onCountryChange: (country: CountryCode) => void;
    countries?: CountryCode[];
    locale?: string;
    disabled?: boolean;
    error?: boolean;
    /** The popup's anchor — `PhoneInput`'s row, not this button (Figma's overlay spans both boxes). */
    anchorRef: RefObject<HTMLElement | null>;
    /**
     * Purpose half of the button's name; the current country is appended.
     * @default 'Country calling code'
     */
    'aria-label'?: string;
};
