import type { CheckboxGroup as BaseCheckboxGroup } from '@base-ui/react/checkbox-group';
import type { ReactNode } from 'react';

export type CheckboxGroupProps = {
    /** The `Checkbox` children, in whatever layout the caller wants. */
    children?: ReactNode;
    /** Controlled: the `value`s of the ticked checkboxes. */
    value?: string[];
    defaultValue?: string[];
    onValueChange?: BaseCheckboxGroup.Props['onValueChange'];
    /** Every child `value`. Required for a `<Checkbox parent />`: drives it mixed on a subset, checked on all. */
    allValues?: string[];
    /** Disables every checkbox in the group. */
    disabled?: boolean;
    /** The caller's layout hook (`flex gap-*`): Figma draws no group spacing. */
    className?: string;
};
