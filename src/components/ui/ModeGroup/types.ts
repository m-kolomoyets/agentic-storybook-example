import type { AerationModeVariant } from '@/components/ui/Badge/utils/modeDot';

export type ModeGroupItem = {
    /** Dot colourway, and the value the group reports. */
    mode: AerationModeVariant;
    /** The word under the dot; the caller's, never derived. */
    label: string;
    /** Greys this one tile only; whole-group unavailability is the root's `disabled`. @default false */
    disabled?: boolean;
};

export type ModeGroupProps = {
    /** Tiles in drawn order; no count is imposed. */
    items: readonly ModeGroupItem[];
    /** Pressed tile, or `null` when nothing is chosen yet. */
    value: AerationModeVariant | null;
    /** Never fired with `null`: a second press on the pressed tile is dropped. */
    onValueChange: (mode: AerationModeVariant) => void;
    /** Greys and deadens every tile. @default false */
    disabled?: boolean;
    /**
     * Strokes every tile `Border/negative` and marks the row `data-invalid`. A surrounding
     * `Field.Root invalid` does the same.
     * @default false
     */
    invalid?: boolean;
    /** Required: an unnamed button group announces as an unlabelled group. */
    'aria-label': string;
    /** Merged onto the row. */
    className?: string;
};
