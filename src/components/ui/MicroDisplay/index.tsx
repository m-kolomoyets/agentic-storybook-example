import type { MicroDisplayProps } from './types';
import { useId } from 'react';
import { cn } from '@/lib/cn';
import { Loader } from '@/components/ui/Loader';
import {
    MICRO_DISPLAY_ROOT_CLASSES,
    MICRO_DISPLAY_STATUS_TEXT,
    MICRO_DISPLAY_TITLE_CLASSES,
    MICRO_DISPLAY_VALUE_BLOCK_CLASSES,
    MICRO_DISPLAY_VALUE_BOX_CLASSES,
    MICRO_DISPLAY_VALUE_PAINT,
} from './constants';

/**
 * Small card naming one reading, boxing its value, with an optional `Meter` under it.
 * Figma: `Micro-Display` `Size=Small` `9256:44165` (set `9422:73275`).
 */
function MicroDisplay({
    status,
    title,
    valueLabel,
    value,
    tone = 'default',
    meter,
    headingLevel = 3,
    statusLabel = MICRO_DISPLAY_STATUS_TEXT[status],
    loading = false,
    className,
}: MicroDisplayProps) {
    const titleId = useId();
    const Heading = `h${headingLevel}` as const;

    return (
        // A named group, not a `<section>`: three region landmarks for three small cards would crowd the list.
        <div role="group" aria-labelledby={titleId} className={cn`${MICRO_DISPLAY_ROOT_CLASSES} ${className}`}>
            <div className="flex w-full items-center gap-m">
                <Heading id={titleId} className={MICRO_DISPLAY_TITLE_CLASSES}>
                    <span>{title}</span>
                    <span className="sr-only">, {statusLabel}</span>
                </Heading>
            </div>
            {/* A name/value pair (WCAG 1.3.1): reads "Status, OFFLINE". The box is the `<dd>` itself. */}
            <dl className={MICRO_DISPLAY_VALUE_BLOCK_CLASSES}>
                <dt className="text-center text-caption-m-medium leading-[12px] text-text-general-medium uppercase">
                    {valueLabel}
                </dt>
                <dd aria-busy={loading || undefined} className={MICRO_DISPLAY_VALUE_BOX_CLASSES}>
                    {/* The ring sits in the value's 20px line box so the card does not jump when it lands. */}
                    {loading ? (
                        <span className="flex h-[20px] w-full items-center justify-center">
                            <Loader variant="secondary" size="sm" label={`Loading ${valueLabel}`} />
                        </span>
                    ) : (
                        <span
                            className={cn`w-full text-center text-body-s-medium tracking-[0.56px] tabular-nums ${MICRO_DISPLAY_VALUE_PAINT[tone]}`}
                        >
                            {value}
                        </span>
                    )}
                </dd>
            </dl>
            {meter}
        </div>
    );
}

export { MicroDisplay };
// Shared with fan-card composites that draw the same status dot.
export { MICRO_DISPLAY_DOT_CLASSES, MICRO_DISPLAY_DOT_PAINT } from './constants';
