import type { OTPField } from '@base-ui/react/otp-field';

/**
 * Omitted: `length` (fixed), `validationType` (`'numeric'` default filters whitespace, so `123 456` pastes clean),
 * `inputMode` (follows `validationType`).
 */
type OTPFieldProps = Omit<
    OTPField.Root.Props,
    'length' | 'validationType' | 'inputMode' | 'className' | 'style' | 'children' | 'render'
>;

export type OTPInputProps = OTPFieldProps & {
    /**
     * Standalone hook; error is whole-group. Inside `Field.Root` use `invalid` — both write `data-invalid`
     * on the root. Visual only; `aria-invalid` comes from Field context.
     */
    error?: boolean;
    /**
     * Default `true`, unlike Base UI: every screen using this is a code step whose only control is "verify".
     * Pass `false` where the code is one field among several.
     * @default true
     */
    autoSubmit?: boolean;
    /** Lands on the root row, not a cell. */
    className?: string;
    /** Labels are `Field.Label`, never a child. */
    children?: never;
};
