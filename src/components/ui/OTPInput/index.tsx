import type { OTPInputProps } from './types';
import { OTPField } from '@base-ui/react/otp-field';
import { cn } from '@/lib/cn';
import { CONTROL_BORDER, CONTROL_SURFACE_FILL, CONTROL_SURFACE_MIN_WIDTH } from '@/lib/ui/controlSurface';
import { OTP_LENGTH } from './constants';

/** Real `placeholder`: Figma's empty cell draws `-` in `Text/secondary`, so `Filled` is not a state. */
const CELL_PLACEHOLDER = '-';

// `group`: cells read `data-invalid` off the root.
const ROOT_CLASSES = 'group flex w-full items-center gap-xs';

/*
 * Cell is the `<input>` itself, so focus is plain `:focus` (Base UI focuses on mouse down; Figma's `Active`
 * cell is that). Ramp gated, disabled > focus > invalid: `.group[data-invalid] &` ties `&:focus` on
 * specificity (WCAG 2.4.7). Height 58 = `py-xl` + 24px line + borders. Figma's disabled cell draws the
 * placeholder in `Text/disabled` too.
 */
const CELL_CLASSES = `
    ${CONTROL_SURFACE_MIN_WIDTH} flex-1 rounded-s border ${CONTROL_SURFACE_FILL} px-l py-xl
    appearance-none outline-none text-center text-body-m text-text-general-strong
    placeholder:text-text-general-medium caret-text-general-strong
    ${CONTROL_BORDER.default}
    not-disabled:not-focus:group-data-[invalid]:border-border-negative
    not-disabled:focus:border-border-focused
    disabled:border-border-control-disabled disabled:text-text-disabled disabled:placeholder:text-text-disabled
`;

const CELL_INDEXES = Array.from({ length: OTP_LENGTH }, (_, index) => {
    return index;
});

/**
 * One-time-code row. Figma: `Digit-code input` 10497:199701, cell 10495:199848.
 * Cells only; Field wraps it. Bare use needs `aria-label` (lands on `role="group"`). Base UI adds a hidden
 * seventh input carrying the whole value — DOM walks over cells must exclude it.
 */
function OTPInput({ error = false, autoSubmit = true, className, ...rest }: OTPInputProps) {
    // Spread as an object: a present `undefined` key would clobber the Field-set `data-invalid`.
    const invalidAttribute = error ? { 'data-invalid': '' } : undefined;

    return (
        <OTPField.Root
            {...rest}
            {...invalidAttribute}
            length={OTP_LENGTH}
            autoSubmit={autoSubmit}
            className={cn`${ROOT_CLASSES} ${className}`}
        >
            {CELL_INDEXES.map((index) => {
                return <OTPField.Input key={index} placeholder={CELL_PLACEHOLDER} className={CELL_CLASSES} />;
            })}
        </OTPField.Root>
    );
}

export { OTP_LENGTH, OTPInput };
