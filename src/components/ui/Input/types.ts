import type { Input as BaseInput } from '@base-ui/react/input';
import type { ComponentPropsWithRef, ReactNode } from 'react';

/**
 * Extends Base UI's props: a text input's surface (`aria-label`, `onBlur`, `inputMode`, `autoComplete`, …) is open.
 * Omitted: native `size` (char-width hint, would clash with the kit's density name), `style` (tokens only),
 * `children`; `type` and `className` are narrowed below.
 */
type NativeInputProps = Omit<BaseInput.Props, 'children' | 'type' | 'size' | 'className' | 'style'>;

export type InputProps = NativeInputProps & {
    /**
     * Everything except `search`: it would summon the browser's own unstyled cancel button. Use `SearchInput`.
     * `date`/`time` render the native picker — legacy callers only.
     */
    type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'date' | 'time';
    /**
     * Standalone invalid hook (`Border/negative`). Inside a `Field.Root` use its `invalid` instead;
     * when both are set the Field wins (Base UI applies context last).
     */
    error?: boolean;
    /** Leading slot. A node, not an icon: the designed trailing example is a button. `Input` owns the 20px box. */
    startAddon?: ReactNode;
    /** Trailing slot. See `startAddon`. */
    endAddon?: ReactNode;
    /** Merged onto the bordered body, not the inner `<input>`. */
    className?: string;
    /** Labels are `Field.Label`, never a child. */
    children?: never;
};

export type InputAddonButtonProps = Omit<
    ComponentPropsWithRef<'button'>,
    'children' | 'className' | 'style' | 'type'
> & {
    /** The glyph. A bare SVGR icon — the button owns its box. */
    icon: ReactNode;
    /** Required: an icon-only control has no text to name it. */
    'aria-label': string;
    className?: string;
};
