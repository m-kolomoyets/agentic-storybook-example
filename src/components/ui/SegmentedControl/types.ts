export type SegmentedControlItem = {
    value: string;
    label: string;
    disabled?: boolean;
};

export type SegmentedControlProps = {
    items: readonly SegmentedControlItem[];
    /** Selected item's value; `null` for no selection. Pressing the selected item keeps it selected. */
    value: string | null;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    /** Names the group. Required: the segments alone don't say what they choose. */
    'aria-label': string;
    className?: string;
};
