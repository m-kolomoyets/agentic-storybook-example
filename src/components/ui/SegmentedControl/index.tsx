import type { SegmentedControlProps } from './types';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { cn } from '@/lib/cn';

const ROOT_CLASSES = 'flex w-full items-stretch gap-s font-sans';

/* Pressed edge is an always-present border, transparent when unpressed, so nothing shifts. */
const CARD_CLASSES = `
    flex min-h-5xl min-w-px flex-1 cursor-pointer items-center justify-center
    rounded-s border border-transparent bg-surface-control px-l py-[10px]
    font-sans text-body-s-medium text-text-general-strong
    appearance-none outline-none transition-colors
    data-[pressed]:border-text-general-strong
    data-disabled:cursor-not-allowed data-disabled:text-text-disabled
    focus-visible:outline-solid focus-visible:outline-1 focus-visible:outline-border-focused
    focus-visible:outline-offset-2
`;

/** One-of-N choice as equal-width pressable cards (a named group of `aria-pressed` buttons). */
function SegmentedControl({
    items,
    value,
    onValueChange,
    disabled = false,
    className,
    'aria-label': ariaLabel,
}: SegmentedControlProps) {
    return (
        <ToggleGroup
            aria-label={ariaLabel}
            value={value === null ? [] : [value]}
            disabled={disabled}
            onValueChange={(next) => {
                const [nextValue] = next;
                // Unpressing the selected card yields `[]`; selection stays put.
                if (nextValue !== undefined) {
                    onValueChange(nextValue);
                }
            }}
            className={cn`${ROOT_CLASSES} ${className}`}
        >
            {items.map(({ value: itemValue, label, disabled: itemDisabled = false }) => {
                return (
                    <Toggle key={itemValue} value={itemValue} disabled={itemDisabled} className={CARD_CLASSES}>
                        {label}
                    </Toggle>
                );
            })}
        </ToggleGroup>
    );
}

export { SegmentedControl };
