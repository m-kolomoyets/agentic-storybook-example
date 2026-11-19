import type { ComponentPropsWithRef, ReactNode } from 'react';

export type OptionIndicator = 'check' | 'radio';

/** State comes from the host's `data-selected` / `data-highlighted` / `data-disabled`, never from props. */
export type OptionProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
    /** Accessible name and typeahead text, even when `labelContent` replaces the drawing. */
    label: string;
    /** Second line — the whole of Figma's Big set (no `size`/`variant`). */
    subtitle?: string;
    /** 20px leading glyph. Opt-in (Figma's default glyph is placeholder art). */
    startAddon?: ReactNode;
    /** Trailing glyph (e.g. chevron); sits before the checkmark slot. */
    endAddon?: ReactNode;
    /**
     * Replaces only the title/subtitle stack (row keeps padding, states, slots). Must fit one line —
     * two with `subtitle` — since the list's row height is a constant.
     */
    labelContent?: ReactNode;
    /**
     * `check`: trailing checkmark revealed by `data-selected`. `radio`: leading ring instead, no checkmark
     * (`Select`'s mobile sheet).
     * @default 'check'
     */
    indicator?: OptionIndicator;
    className?: string;
    children?: never;
};

export type SelectValueProps = Omit<ComponentPropsWithRef<'span'>, 'children'> & {
    label?: string;
    subtitle?: string;
    /** Shown when `label` is absent, in `Input`'s placeholder colour. */
    placeholder?: string;
    className?: string;
    children?: never;
};
