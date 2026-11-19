import type { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import type { ReactNode } from 'react';

export type RadioGroupProps = {
    /** The `Radio` children, in whatever layout the caller wants. */
    children?: ReactNode;
    /** Controlled: the `value` of the selected `Radio`. */
    value?: unknown;
    defaultValue?: unknown;
    onValueChange?: BaseRadioGroup.Props['onValueChange'];
    /** Identifies the field on submit. `Radio` has no `name` of its own. */
    name?: string;
    /** Disables every radio in the group. */
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    /** The caller's layout hook (`flex gap-*`): Figma draws no group spacing. */
    className?: string;
};
