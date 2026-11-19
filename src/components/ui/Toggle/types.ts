import type { Switch as BaseSwitch } from '@base-ui/react/switch';

export type ToggleProps = {
    /** Controlled on/off. Use `defaultChecked` for the uncontrolled form. */
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: BaseSwitch.Root.Props['onCheckedChange'];
    name?: string;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    className?: string;
    /** Base UI's type: carries control state (`checked`, `disabled`, `readOnly`) into the callback. */
    render?: BaseSwitch.Root.Props['render'];
    /** Labels are the caller's `<label>`, never a child. */
    children?: never;
};
