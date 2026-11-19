import type { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';

/** Relative density role. Figma draws no Small cell. */
export type CheckboxSize = 'md' | 'lg';

type CheckboxBaseProps = {
    /** 16px (`md`) or 20px (`lg`). @default 'md' */
    size?: CheckboxSize;
    /** Controlled tick. Strictly boolean — `indeterminate` is a separate axis. */
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: BaseCheckbox.Root.Props['onCheckedChange'];
    name?: string;
    value?: string;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    className?: string;
    /** Base UI's type: carries control state (`checked`, `indeterminate`, `disabled`) into the callback. */
    render?: BaseCheckbox.Root.Props['render'];
    /** Labels are the caller's `<label>`, never a child. */
    children?: never;
};

/** `parent` and `indeterminate` are mutually exclusive: a parent's mixed state is computed by `CheckboxGroup`. */
type CheckboxStatusProps =
    | {
          /** Third status. Base UI does **not** clear it on click — the caller must. */
          indeterminate?: boolean;
          parent?: false;
      }
    | {
          indeterminate?: never;
          /** Group-managed tri-state parent. Requires `allValues` on the enclosing `CheckboxGroup`. */
          parent: true;
      };

export type CheckboxProps = CheckboxBaseProps & CheckboxStatusProps;
