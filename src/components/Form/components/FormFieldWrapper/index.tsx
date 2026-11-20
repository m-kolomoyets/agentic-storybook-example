import type { FormFieldWrapperProps } from './types';
import { getFieldErrorMessage } from '@/lib/utils/getFieldErrorMessage';
import { Field } from '@/components/ui/Field';
import { useFieldContext } from '../../context/FormContext';

/** `Field.Root` wires label `htmlFor`, `aria-describedby` and the invalid state onto the control. */
function FormFieldWrapper({ className, label, labelClassName, children }: FormFieldWrapperProps) {
    const field = useFieldContext();
    const fieldErrorMessage = getFieldErrorMessage(field.state.meta.errors);
    const isInvalid = !!fieldErrorMessage;

    return (
        <Field.Root className={className} name={field.name} invalid={isInvalid}>
            {!!label && <Field.Label className={labelClassName}>{label}</Field.Label>}
            {children}
            <Field.Error>{fieldErrorMessage}</Field.Error>
        </Field.Root>
    );
}

export { FormFieldWrapper };
