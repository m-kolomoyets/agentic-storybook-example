import type { InputProps } from '@/components/ui/Input/types';
import RemoveRedEyeIcon from '@/assets/icons/remove-red-eye.svg?react';
import VisibilityOffIcon from '@/assets/icons/visibility-off.svg?react';
import { useToggle } from '@react-hookz/web';
import { getFieldErrorMessage } from '@/lib/utils/getFieldErrorMessage';
import { Input, InputAddonButton } from '@/components/ui/Input';
import { useFieldContext } from '../../context/FormContext';

function PasswordInputField({
    onChange,
    onBlur,
    disabled,
    ...props
}: Omit<InputProps, 'name' | 'id' | 'aria-invalid' | 'value' | 'type' | 'endAddon'>) {
    const field = useFieldContext<string>();
    const fieldErrorMessage = getFieldErrorMessage(field.state.meta.errors);
    const [isVisible, toggleIsVisible] = useToggle();

    return (
        <Input
            name={field.name}
            type={isVisible ? 'text' : 'password'}
            aria-invalid={!!fieldErrorMessage}
            value={field.state.value}
            disabled={disabled}
            onChange={(e) => {
                field.handleChange(e.target.value);
                onChange?.(e);
            }}
            onBlur={(e) => {
                field.handleBlur();
                onBlur?.(e);
            }}
            endAddon={
                <InputAddonButton
                    icon={isVisible ? <VisibilityOffIcon /> : <RemoveRedEyeIcon />}
                    aria-label={isVisible ? 'Hide password' : 'Show password'}
                    aria-pressed={isVisible}
                    disabled={disabled}
                    onClick={toggleIsVisible}
                />
            }
            {...props}
        />
    );
}

export { PasswordInputField };
