import type { Radio as BaseRadio } from '@base-ui/react/radio';

/** Relative density role, never a pixel value. */
export type RadioSize = 'sm' | 'md' | 'lg';

export type RadioProps = {
    /** 12px (`sm`), 16px (`md`) or 20px (`lg`). @default 'md' */
    size?: RadioSize;
    /** Identifies this option within its `RadioGroup`. No `checked`: the group owns selection. */
    value: unknown;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    className?: string;
    /** Base UI's type: carries the control state into the callback. */
    render?: BaseRadio.Root.Props['render'];
    /** Labels are the caller's `<label>`. */
    children?: never;
};
