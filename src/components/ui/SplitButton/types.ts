import type { useRender } from '@base-ui/react/use-render';
import type { ReactNode } from 'react';

export type SplitButtonZone = 'action' | 'disclosure';

export type SplitButtonZonePosition = 'first' | 'last';

export type SplitButtonState = {
    loading: boolean;
    disabled: boolean;
};

export type SplitButtonActionProps = useRender.ElementProps<'button'> & {
    /** Leading slot. A bare SVGR icon — the zone owns its 20px box. */
    startIcon?: ReactNode;
    /** Base UI render prop. */
    render?: useRender.RenderProp;
};

export type SplitButtonDisclosureProps = Omit<useRender.ElementProps<'button'>, 'children' | 'value'> & {
    /** The current selection, rendered before the chevron. Widened from the string-only attribute. */
    value: ReactNode;
    /** Base UI render prop. Supplying one is also what earns `aria-haspopup`. */
    render?: useRender.RenderProp;
};

export type SplitButtonProps = Omit<useRender.ElementProps<'div'>, 'role'> & {
    /**
     * Spins both zones and refuses activation on both (Figma `8885:21013`). Not `disabled`:
     * busy zones stay focusable and named.
     */
    loading?: boolean;
    /** Disables both zones. */
    disabled?: boolean;
};
