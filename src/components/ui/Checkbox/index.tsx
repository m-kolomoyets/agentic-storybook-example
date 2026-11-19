import type { CheckboxProps } from './types';
import CheckBoxOutlineBlankIcon from '@/assets/icons/check-box-outline-blank.svg?react';
import CheckBoxPlateIcon from '@/assets/icons/check-box-plate.svg?react';
import CheckBoxIcon from '@/assets/icons/check-box.svg?react';
import IndeterminateCheckBoxIcon from '@/assets/icons/indeterminate-check-box.svg?react';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { cn } from '@/lib/cn';
import { checkboxVariants } from './utils/variants';

/*
 * One layer per status: an indeterminate box carries neither `data-checked` nor `data-unchecked`.
 * The checked/indeterminate glyphs knock the mark out of a solid square, so nothing layers on top.
 * The plate is Figma's `Surface/control` fill behind the unchecked outline: same 24-viewBox contour, so
 * it lands at the drawn 75% inset and radius (a plain square — `check-box.svg` would show a tick hole).
 */
const LAYER = 'pointer-events-none absolute inset-none size-full';
const PLATE_LAYER = `${LAYER} hidden text-surface-control group-data-[unchecked]:block`;
const OUTLINE_LAYER = `${LAYER} hidden group-data-[unchecked]:block`;
const CHECKED_LAYER = `${LAYER} hidden group-data-[checked]:block`;
const INDETERMINATE_LAYER = `${LAYER} hidden group-data-[indeterminate]:block`;

/**
 * Checked / unchecked / indeterminate selection control. Figma: `Check box outline blank` 9183:5528.
 * No label of its own — wrap it in a `<label>`. `indeterminate` must be cleared by the caller (Base UI
 * re-asserts it after every click); for a group parent use `parent` + `CheckboxGroup`'s `allValues`.
 * Base UI drops `name` on a `parent` checkbox — the group submits the children.
 */
function Checkbox({ size = 'md', indeterminate = false, parent = false, className, ...rest }: CheckboxProps) {
    return (
        <BaseCheckbox.Root
            {...rest}
            indeterminate={indeterminate}
            parent={parent}
            className={cn`${checkboxVariants({ size })} ${className}`}
        >
            <CheckBoxPlateIcon aria-hidden className={PLATE_LAYER} />
            <CheckBoxOutlineBlankIcon aria-hidden className={OUTLINE_LAYER} />
            <CheckBoxIcon aria-hidden className={CHECKED_LAYER} />
            <IndeterminateCheckBoxIcon aria-hidden className={INDETERMINATE_LAYER} />
        </BaseCheckbox.Root>
    );
}

export { Checkbox };
