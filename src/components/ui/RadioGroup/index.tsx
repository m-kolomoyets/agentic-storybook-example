import type { RadioGroupProps } from './types';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';

/**
 * Shared state for `Radio` children — not optional. Zero styling: Figma draws no group (ADR-0002).
 * Keyboard is Base UI's composite: one tab stop, arrows rove + select in both orientations with wrap;
 * `Home`/`End` disabled by Base UI (not required by the ARIA radio pattern).
 */
function RadioGroup(props: RadioGroupProps) {
    return <BaseRadioGroup {...props} />;
}

export { RadioGroup };
