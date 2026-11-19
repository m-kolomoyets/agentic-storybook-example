import type { FieldDescriptionProps, FieldErrorProps, FieldLabelProps, FieldRootProps } from './types';
import { Field as BaseField } from '@base-ui/react/field';
import { cn } from '@/lib/cn';
import { FieldStateContext } from './context/FieldStateContext';
import { useFieldState } from './hooks/useFieldState';

const ROOT_CLASSES = 'flex w-full flex-col items-start gap-s';

/** 4px gap: a 16px glyph may follow the text as a second child. No `icon` prop. */
const LABEL_CLASSES = 'flex items-center gap-xs text-body-s-medium text-text-general-strong';

const DESCRIPTION_CLASSES = 'text-caption-m text-text-general-strong';

const ERROR_CLASSES = 'text-caption-m text-text-negative';

/**
 * Labelled stack. Figma: `Input` set 8067:6633 (label/helper parts).
 * No `data-[disabled]:` rules: only the input body greys, and `Input` owns that.
 */
function FieldRoot({ children, invalid = false, disabled = false, className, ...rest }: FieldRootProps) {
    return (
        <FieldStateContext value={{ invalid, disabled }}>
            <BaseField.Root
                {...rest}
                invalid={invalid}
                disabled={disabled}
                className={cn`${ROOT_CLASSES} ${className}`}
            >
                {children}
            </BaseField.Root>
        </FieldStateContext>
    );
}

/** Base UI wires `htmlFor` from the Root's id. No `icon` prop: pass a 16px glyph as a second child. */
function FieldLabel({ children, className, ...rest }: FieldLabelProps) {
    return (
        <BaseField.Label {...rest} className={cn`${LABEL_CLASSES} ${className}`}>
            {children}
        </BaseField.Label>
    );
}

/** Hidden while invalid (`Error` takes the slot). Nothing reserves space when absent. */
function FieldDescription({ children, className, ...rest }: FieldDescriptionProps) {
    const { invalid } = useFieldState();

    if (invalid) {
        return null;
    }

    return (
        <BaseField.Description {...rest} className={cn`${DESCRIPTION_CLASSES} ${className}`}>
            {children}
        </BaseField.Description>
    );
}

/** Error message in `Description`'s slot. Shown exactly when the Root is `invalid`. */
function FieldError({ children, match, className, ...rest }: FieldErrorProps) {
    const { invalid } = useFieldState();

    return (
        <BaseField.Error {...rest} match={match ?? invalid} className={cn`${ERROR_CLASSES} ${className}`}>
            {children}
        </BaseField.Error>
    );
}

/** Compound: `<Field.Root>` / `<Field.Label>` / `<Field.Description>` / `<Field.Error>`. */
const Field = {
    Root: FieldRoot,
    Label: FieldLabel,
    Description: FieldDescription,
    Error: FieldError,
};

export { Field, FieldDescription, FieldError, FieldLabel, FieldRoot, useFieldState };
