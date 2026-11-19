import type { DividerProps } from './types';
import { Separator as BaseSeparator } from '@base-ui/react/separator';
import { cn } from '@/lib/cn';

/*
 * A painted 3-stop ramp (transparent → white 20% → transparent), not a border: borders can't fade,
 * and a painted rule doesn't stop short at its block's padding. `shrink-0` keeps the 1px in a crowded flex column.
 */
const BASE_CLASSES = 'shrink-0 from-white-alpha-0 via-white-alpha-20 to-white-alpha-0';

const ORIENTATION_CLASSES: Record<NonNullable<DividerProps['orientation']>, string> = {
    horizontal: 'h-px w-full bg-linear-to-r',
    vertical: 'w-px h-full bg-linear-to-b',
};

/** Hairline between the blocks of a panel; `role="separator"` with `aria-orientation`. Figma: `Div` 8947:19826. */
function Divider({ orientation = 'horizontal', className }: DividerProps) {
    return (
        <BaseSeparator
            orientation={orientation}
            className={cn`${BASE_CLASSES} ${ORIENTATION_CLASSES[orientation]} ${className}`}
        />
    );
}

export { Divider };
