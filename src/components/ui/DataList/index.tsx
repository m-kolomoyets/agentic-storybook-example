import type { DataListProps } from './types';
import { cn } from '@/lib/cn';

/*
 * `rounded-s` = Figma's `Radius/m` (8px; repo `rounded-m` is 12px). No block padding: the rows' own
 * padding puts each hairline exactly halfway between two rows.
 */
const LIST_CLASSES = 'flex flex-col rounded-s bg-surface-control';

/* Hairline is the row's own top border; no zebra fill (undrawn). */
const ROW_CLASSES = `
    flex items-center justify-between gap-l px-l py-l
    border-t border-border-remote-default first:border-t-0
`;

const LABEL_CLASSES = 'flex min-w-px items-center gap-xs text-body-s-medium text-text-general-medium text-start';

/* `min-w-px` lets a long value wrap instead of pushing the label out of the block. */
const VALUE_CLASSES = 'min-w-px text-body-m-medium text-text-general-strong text-end';

/**
 * Grouped dataset: label/value rows on `Surface/control` as a `<dl>` (term/value pairs, one value
 * column). No heading — the page owns it. Figma: `Note Card / Analyzer Location Card` 10048:189245.
 */
function DataList({ items, columns, className }: DataListProps) {
    return (
        <dl className={cn`${LIST_CLASSES} ${className}`}>
            {columns ? (
                // Hidden: every row already pairs its own term and value; `<dl>` can't carry a `<thead>`.
                <div
                    className={cn`${ROW_CLASSES} text-body-s-medium text-text-general-strong`}
                    aria-hidden="true"
                    data-columns
                >
                    <span className="min-w-px text-start">{columns.label}</span>
                    <span className="min-w-px text-end">{columns.value}</span>
                </div>
            ) : null}
            {items.map((item) => {
                return (
                    <div key={item.label} className={ROW_CLASSES}>
                        <dt className={LABEL_CLASSES}>
                            {item.label}
                            {item.labelAddon}
                        </dt>
                        <dd className={VALUE_CLASSES}>{item.value}</dd>
                    </div>
                );
            })}
        </dl>
    );
}

export { DataList };
