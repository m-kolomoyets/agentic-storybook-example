import type { useRender } from '@base-ui/react/use-render';
import type { ReactNode } from 'react';

/** Relative density role: `md` 44px, `sm` 40px, `xs` 20px. Not `ButtonSize`'s ramp. */
export type IconButtonSize = 'xs' | 'sm' | 'md';

/**
 * `secondary` is Figma `Icon Button/Secondary`; `ghost` a transparent white glyph (no chip fill);
 * `elevated` the 32px dark chip drawn over a map (`15399:457956`).
 */
export type IconButtonVariant = 'secondary' | 'ghost' | 'elevated';

type IconButtonBaseProps = Omit<useRender.ElementProps<'button'>, 'children'> & {
    /** The glyph. A bare SVGR icon — IconButton owns its box size. */
    icon: ReactNode;
    /** Required: an icon-only control has no text to name it. */
    'aria-label': string;
    /** Refuses activation and swaps the glyph for a spinner. Not `disabled`: stays focusable and named. */
    loading?: boolean;
    /** Base UI render prop — become an `<a>`, a `Popover.Trigger`, a router `Link`. */
    render?: useRender.RenderProp;
};

/** `elevated` draws one size (32px), so it is size-locked. */
export type IconButtonProps = IconButtonBaseProps &
    (
        | {
              /** @default 'secondary' */
              variant?: 'secondary' | 'ghost';
              /** @default 'md' */
              size?: IconButtonSize;
          }
        | { variant: 'elevated'; size?: never }
    );
