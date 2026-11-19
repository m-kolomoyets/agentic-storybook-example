import type { SearchClearButtonProps, SearchFieldProps, SearchInputProps } from './types';
import { useRef, useState } from 'react';
import CloseIcon from '@/assets/icons/close.svg?react';
import SearchIcon from '@/assets/icons/search.svg?react';
import { Input, InputAddonButton } from '@/components/ui/Input';

// The 20px clear button is under WCAG 2.2 (2.5.8)'s 24px minimum; growing it breaks the drawn gap.
const GLYPH_CLASSES = 'size-full text-text-general-strong';

/**
 * Bare search field: leading glyph + trailing clear slot; consumers own value and clear button.
 * Forwards everything else to the native control so it can render under `<Combobox.Input render>`.
 */
function SearchField({ clearButton, value, disabled, ...rest }: SearchFieldProps) {
    // Read off the `value` prop: under `Combobox.Input` it arrives as a spread prop, not internal state.
    const hasValue = value !== undefined && value !== '';
    // No clear button on a disabled field: the value cannot change.
    const endAddon = hasValue && !disabled ? clearButton : undefined;

    return (
        <Input
            {...rest}
            disabled={disabled}
            value={value}
            startAddon={<SearchIcon aria-hidden className={GLYPH_CLASSES} />}
            endAddon={endAddon}
        />
    );
}

/** Clear button for `SearchField`'s trailing slot. A real button: the UA cancel button has no name/focus. */
function SearchClearButton({ label, onClick }: SearchClearButtonProps) {
    return <InputAddonButton icon={<CloseIcon className={GLYPH_CLASSES} />} aria-label={label} onClick={onClick} />;
}

/**
 * Search field with a leading glyph and a clear button once there is a value. Figma: `Search` 8915:26251.
 * Composes into `Field.Root` like `Input`.
 */
function SearchInput({
    value,
    defaultValue,
    onValueChange,
    clearLabel = 'Clear search',
    disabled,
    ...rest
}: SearchInputProps) {
    const controlRef = useRef<HTMLInputElement>(null);
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? '');

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : uncontrolledValue;

    function handleValueChange(next: string) {
        if (!isControlled) {
            setUncontrolledValue(next);
        }
        onValueChange?.(next);
    }

    // Refocus the control: the button unmounts on clear, and focus would drop to `<body>`.
    function handleClear() {
        handleValueChange('');
        controlRef.current?.focus();
    }

    return (
        <SearchField
            {...rest}
            ref={controlRef}
            disabled={disabled}
            value={currentValue}
            onValueChange={handleValueChange}
            clearButton={<SearchClearButton label={clearLabel} onClick={handleClear} />}
        />
    );
}

export { SearchClearButton, SearchField, SearchInput };
