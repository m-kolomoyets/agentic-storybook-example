import type { ReactNode } from 'react';

/** Always a `string`: Base UI's index fallback breaks silently when tabs are reordered. */
export type TabValue = string;

/** Density role: 24 / 32 / 36px tall on mobile. Figma `with Icon` is `sm` plus a child glyph. */
export type TabsSize = 'sm' | 'md' | 'lg';

export type TabsRootProps = {
    /** Selected tab's `value`. Use `defaultValue` for the uncontrolled form. */
    value?: TabValue;
    defaultValue?: TabValue;
    /** Base UI's, without the event-details argument. */
    onValueChange?: (value: TabValue) => void;
    children: ReactNode;
    className?: string;
};

export type TabsListProps = {
    /** Density for every tab in the row. @default 'lg' */
    size?: TabsSize;
    /** Stretch the track to its container, one equal column per tab. @default false */
    fill?: boolean;
    /** Arrow keys move focus; Enter/Space selects. Off by default: consumers refetch on selection. @default false */
    activateOnFocus?: boolean;
    children: ReactNode;
    className?: string;
};

export type TabsTabProps = {
    /** Required `string`; never Base UI's index fallback. */
    value: TabValue;
    /** Dims and refuses selection; stays focusable with `aria-disabled`. A press shakes and shows the reason. */
    disabled?: boolean;
    /**
     * Shown in a tooltip on hover/focus/press and set as the accessible description. Defaults to
     * `TAB_DISABLED_REASONS.unavailable`. Ignored while enabled.
     */
    disabledReason?: ReactNode;
    /** Free JSX: glyph + label, series dot + label, or a string. */
    children: ReactNode;
    className?: string;
};

export type TabsPanelProps = {
    /** Shown while the `Tab` with the same value is selected. */
    value: TabValue;
    children: ReactNode;
    className?: string;
};
