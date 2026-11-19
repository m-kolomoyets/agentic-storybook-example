import type { ReactNode } from 'react';

export type MicroDisplayStatus = 'positive' | 'warning' | 'negative';

/** Heading levels a card title can take; the page's outline decides which. */
export type MicroDisplayHeadingLevel = 2 | 3 | 4 | 5 | 6;

/** `default` is the plain reading; `positive`/`negative` are status words (`ON`, `OFFLINE`) that carry colour. */
export type MicroDisplayTone = 'default' | 'positive' | 'negative';

export type MicroDisplayProps = {
    /** The status the card reports — `Fan, critical` to a screen reader. */
    status: MicroDisplayStatus;
    /** The card's name — `Fan`, `Inventory`, `Grain Risk`. */
    title: string;
    /** What the boxed value is — `Status`, `Bushels`, `CO2 PPM`. */
    valueLabel: string;
    /** The reading. A node, so `ON | 00:53` can be composed by the caller. */
    value: ReactNode;
    /** @default 'default' */
    tone?: MicroDisplayTone;
    /** The bar under the value — a `Meter`. Omitted, the card ends at the value box. */
    meter?: ReactNode;
    /** The title's heading level (the title is a real heading, WCAG 1.3.1). @default 3 */
    headingLevel?: MicroDisplayHeadingLevel;
    /** The status in words, read after the title. Defaults from `status`. */
    statusLabel?: string;
    /** The value box draws the 12px `Loader` in place of `value` (Figma `14499:271398`). */
    loading?: boolean;
    className?: string;
};
