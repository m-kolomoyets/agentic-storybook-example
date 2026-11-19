import type { useRender } from '@base-ui/react/use-render';
import type { ReactNode } from 'react';

/** Relative density role, not a pixel value — the same role is a different height per variant. */
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonVariant =
    | 'primary'
    | 'primary-on-surface'
    | 'secondary'
    | 'secondary-elevated'
    | 'destructive'
    | 'remote'
    | 'link-primary'
    | 'link-secondary'
    | 'link-tertiary';

type ButtonBaseProps = useRender.ElementProps<'button'> & {
    /** Rendered between the icon slots. */
    children?: ReactNode;
    /** Leading slot. A bare SVGR icon — Button owns its box size. */
    startIcon?: ReactNode;
    /** Trailing slot. `remote` uses both slots at once. */
    endIcon?: ReactNode;
    /**
     * Refuses activation and shows a spinner per icon slot. Not `disabled`: a busy control stays
     * focusable and keeps announcing its name.
     */
    loading?: boolean;
    /** Stretches to the container. Content is centred at every width. */
    fullWidth?: boolean;
    /** Base UI render prop — become an `<a>`, a `Popover.Trigger`, a router `Link`. */
    render?: useRender.RenderProp;
};

/*
 * One union rather than two props because Figma does not draw every cell: illegal
 * variant × size combinations fail to typecheck instead of rendering undesigned geometry.
 */
type ButtonVariantProps =
    | { variant?: 'primary' | 'secondary' | 'destructive'; size?: ButtonSize }
    | { variant: 'primary-on-surface'; size?: Exclude<ButtonSize, 'lg'> }
    | { variant: 'remote'; size?: never }
    | { variant: 'secondary-elevated'; size?: never }
    | { variant: 'link-primary' | 'link-secondary' | 'link-tertiary'; size?: Exclude<ButtonSize, 'lg'> };

export type ButtonProps = ButtonBaseProps & ButtonVariantProps;
