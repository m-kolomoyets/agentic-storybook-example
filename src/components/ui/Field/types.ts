import type { Field as BaseField } from '@base-ui/react/field';
import type { CSSProperties, ReactNode } from 'react';

export type FieldState = {
    invalid: boolean;
    disabled: boolean;
};

export type FieldRootProps = {
    children?: ReactNode;
    /** Swaps `Description` for `Error`; wins over `Input`'s `error` (Base UI applies context last). */
    invalid?: boolean;
    disabled?: boolean;
    name?: string;
    className?: string;
    style?: CSSProperties;
    /** Base UI's type, not `useRender.RenderProp`: it carries field state into the callback. */
    render?: BaseField.Root.Props['render'];
};

export type FieldLabelProps = {
    children?: ReactNode;
    className?: string;
    /**
     * Set `false` (with a non-`<label>` `render`) when the control is a `<button>`: a native `<label>`
     * forwards hover and click to it. `aria-labelledby` still names it.
     */
    nativeLabel?: boolean;
    render?: BaseField.Label.Props['render'];
};

export type FieldDescriptionProps = {
    children?: ReactNode;
    className?: string;
    render?: BaseField.Description.Props['render'];
};

export type FieldErrorProps = {
    children?: ReactNode;
    /** Defaults to the Root's `invalid`. Set explicitly only to opt into Base UI's own validity matching. */
    match?: BaseField.Error.Props['match'];
    className?: string;
    render?: BaseField.Error.Props['render'];
};
