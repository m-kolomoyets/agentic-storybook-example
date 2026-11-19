import type { useRender } from '@base-ui/react/use-render';
import type { MouseEvent, ReactNode } from 'react';

/** Relative density role, never a pixel value. `lg` = Figma `Big`. */
export type BadgeSize = 'sm' | 'md' | 'lg';

/** Colour pair. `info` and `recondition` render identically today; keep both. */
export type BadgeVariant =
    'neutral' | 'positive' | 'negative' | 'warning' | 'info' | 'cool' | 'dry' | 'recondition' | 'custom';

type BadgeBaseProps = useRender.ElementProps<'span'> & {
    /** Content; a leading icon child is sized by the root. */
    children?: ReactNode;
    /** Padding and gap only; no height at any size. @default 'md' */
    size?: BadgeSize;
    className?: string;
    /** Base UI render prop: an `<a>`, a router `Link`, a `Popover.Trigger`. */
    render?: useRender.RenderProp;
};

/** `selected` defined = chip (`<button>`, focusable, `onClick` required); undefined = decorative `<span>`. */
type BadgeSelectionProps =
    | { variant?: BadgeVariant; selected?: never; disabled?: never; onClick?: never }
    | {
          /** Selected inverts to `Surface/tertiary`; no selected tint is drawn, so neutral only. */
          variant?: 'neutral';
          /** Chip; emitted as `aria-pressed`. */
          selected: boolean;
          /** Also guarded in the handler: `render` can make the root an `<a>`, where `disabled` is inert. */
          disabled?: boolean;
          onClick: (event: MouseEvent<HTMLElement>) => void;
      };

export type BadgeProps = BadgeBaseProps & BadgeSelectionProps;
