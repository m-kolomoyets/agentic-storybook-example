import type { ModeGroupProps } from './types';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { cn } from '@/lib/cn';
import { presence } from '@/lib/ui/dataPresence';
import { MODE_DOT, MODE_DOT_ROUND } from '@/components/ui/Badge/utils/modeDot';
import { useFieldState } from '@/components/ui/Field';
import { TILE_STROKE_BY_MODE } from './utils/classes';

/* Tiles are `flex-1`: drawn widths are the frame width divided by three. */
const ROOT_CLASSES = 'flex w-full items-stretch gap-s font-sans';

/*
 * Tile: 76px tall at every width. State classes gate on Base UI's `data-pressed`/`data-disabled` so
 * `disabled > pressed > default` holds by specificity. Fill/shadows: Figma effect style `Gray Style Modes`,
 * the pair the `remote` button variant binds. Focus ring is an outset outline (the inner shadow would paint
 * over an inset ring), outside the pressed stroke so both stay visible (WCAG 2.4.7).
 */
const TILE_CLASSES = `
    relative flex h-[4.75rem] flex-1 cursor-pointer flex-col items-center justify-center gap-s
    rounded-m p-l outline-none
    font-sans text-body-s-medium
    text-text-general-strong transition-colors
    bg-button-remote-default shadow-button-remote inset-shadow-button-remote
    not-data-disabled:not-data-[pressed]:hover:bg-button-remote-hover
    data-[pressed]:bg-button-remote-pressed
    data-disabled:cursor-not-allowed data-disabled:bg-button-remote-disabled data-disabled:text-text-on-surface-disabled
    focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-border-focused
    focus-visible:outline-offset-2
`;

/* Invalid stroke: an inset outline, off while focused so the focus ring stays the one indicator (WCAG 2.4.7). */
const TILE_INVALID_CLASSES = `
    not-data-disabled:not-focus-visible:in-data-invalid:outline-solid
    not-data-disabled:not-focus-visible:in-data-invalid:outline-1
    not-data-disabled:not-focus-visible:in-data-invalid:-outline-offset-1
    not-data-disabled:not-focus-visible:in-data-invalid:outline-border-negative
`;

/* Longhand masks only: the `mask` shorthand resets `mask-composite`. Drawn only while pressed. */
const TILE_STROKE_CLASSES = `
    before:pointer-events-none before:absolute before:inset-none before:content-['']
    before:rounded-[inherit] before:p-[1px] before:opacity-60 before:hidden data-[pressed]:before:block
    before:[mask-image:linear-gradient(#000_0_0),linear-gradient(#000_0_0)]
    before:[mask-clip:content-box,border-box] before:[mask-composite:exclude]
`;

/* Figma's disabled dot has no extractable token; the mode gradient at 40% is the nearest reading. */
const DOT_DISABLED_CLASSES = 'opacity-40';

/**
 * A row of tiles an operator picks one aeration mode from. Base UI `ToggleGroup` (tiles announce as
 * `aria-pressed` buttons). Re-pressing the pressed tile does not clear it. Figma: `Mode` 9262:41931.
 */
function ModeGroup({
    items,
    value,
    onValueChange,
    disabled = false,
    invalid = false,
    className,
    'aria-label': ariaLabel,
}: ModeGroupProps) {
    const fieldState = useFieldState();
    const isInvalid = invalid || fieldState.invalid;
    // Base UI's value is an array; this group is one-or-none, and the empty array (re-press) is dropped.
    const groupValue = value === null ? [] : [value];

    return (
        <ToggleGroup
            aria-label={ariaLabel}
            value={groupValue}
            disabled={disabled}
            onValueChange={(next) => {
                const [mode] = next;
                if (mode !== undefined) {
                    onValueChange(mode);
                }
            }}
            className={cn`${ROOT_CLASSES} ${className}`}
            {...presence('data-invalid', isInvalid)}
        >
            {items.map(({ mode, label, disabled: itemDisabled = false }) => {
                const dotDisabled = disabled || itemDisabled ? DOT_DISABLED_CLASSES : '';
                return (
                    <Toggle
                        key={mode}
                        value={mode}
                        disabled={itemDisabled}
                        className={cn`${TILE_CLASSES} ${TILE_INVALID_CLASSES} ${TILE_STROKE_CLASSES} ${TILE_STROKE_BY_MODE[mode]}`}
                    >
                        <span
                            aria-hidden="true"
                            className={cn`size-2xl ${MODE_DOT_ROUND} ${MODE_DOT[mode]} ${dotDisabled}`}
                        />
                        {label}
                    </Toggle>
                );
            })}
        </ToggleGroup>
    );
}

export { ModeGroup };
export { MODE_GROUP_DESKTOP_TILE_CLASSES } from './utils/classes';
