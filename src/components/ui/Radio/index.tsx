import type { RadioProps } from './types';
import RadioButtonCheckedIcon from '@/assets/icons/radio-button-checked.svg?react';
import RadioButtonUncheckedIcon from '@/assets/icons/radio-button-unchecked.svg?react';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { cn } from '@/lib/cn';
import { radioVariants } from './utils/variants';

// Two layers, each owning its own condition, as in `Checkbox`.
const LAYER = 'pointer-events-none absolute inset-none size-full';
const UNCHECKED_LAYER = `${LAYER} hidden group-data-[unchecked]:block`;
const CHECKED_LAYER = `${LAYER} hidden group-data-[checked]:block`;

/**
 * One option of a `RadioGroup`; never render it outside one (its setter is a no-op alone).
 * Figma: `Radio button` 9181:5758. No label — wrap it in a `<label>`, which is also the hit-target
 * mitigation: `sm`/`md` are under WCAG 2.5.8's 24px.
 */
function Radio({ size = 'md', className, ...rest }: RadioProps) {
    return (
        <BaseRadio.Root {...rest} className={cn`${radioVariants({ size })} ${className}`}>
            <RadioButtonUncheckedIcon aria-hidden className={UNCHECKED_LAYER} />
            <RadioButtonCheckedIcon aria-hidden className={CHECKED_LAYER} />
        </BaseRadio.Root>
    );
}

export { Radio };
