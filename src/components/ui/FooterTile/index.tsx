import type { FooterTileProps } from './types';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/cn';
import { footerTileIndicatorText } from './utils/indicatorText';

/*
 * 98×64 by padding (12 + 16 glyph + 4 + 20 line + 12). `min-w-px` lets three tiles and their rules
 * fit a card two border pixels narrower than 3×98.
 */
const TILE_CLASSES = `
    flex w-[6.125rem] min-w-px flex-col items-center justify-center gap-xs p-l
    text-body-s-medium text-text-general-strong
    transition-colors
    not-data-selected:not-data-disabled:hover:bg-button-secondary-hover
    data-selected:bg-button-secondary-pressed
    focus-visible:inset-ring-1 focus-visible:inset-ring-border-focused focus-visible:outline-none
    data-disabled:cursor-not-allowed data-disabled:text-text-disabled
`;

/* The badge's positioning context: the glyph box. */
const ICON_CLASSES = 'relative flex size-xl shrink-0 [&>svg]:size-full';

/* 6px above the glyph, 14px from its centre line; grows rightward for `99+`. 10/12 SemiBold has no token. */
const BADGE_CLASSES = `
    pointer-events-none absolute start-[0.5rem] -top-s
    flex h-[0.875rem] min-w-[0.875rem] items-center justify-center rounded-full px-xxs
    bg-surface-negative text-caption-s-medium font-semibold leading-[0.75rem] text-text-general-strong
`;

/**
 * Glyph-over-word footer link (`Team` / `Notifications` / `Settings`).
 * Figma: `❖ Side Menu Bottom Item` `12439:12100`.
 */
function FooterTile({
    label,
    icon,
    selected = false,
    disabled = false,
    indicator = 0,
    to,
    render,
    className,
}: FooterTileProps) {
    const badge = footerTileIndicatorText(indicator);
    // A disabled tile spells no destination; an explicit `href: undefined` would overwrite a router Link's own.
    const destination = disabled || to === undefined ? undefined : { href: to };

    return useRender({
        render: disabled ? undefined : render,
        defaultTagName: disabled ? 'span' : 'a',
        props: {
            ...destination,
            className: cn`${TILE_CLASSES} ${className}`,
            'aria-label': badge === null ? undefined : `${label}, ${indicator} unread`,
            'aria-current': selected ? 'page' : undefined,
            'aria-disabled': disabled ? true : undefined,
            'data-selected': selected ? '' : undefined,
            'data-disabled': disabled ? '' : undefined,
            children: (
                <>
                    {/* Hidden with the glyph: the count is already in the tile's name. */}
                    <span aria-hidden className={ICON_CLASSES}>
                        {icon}
                        {badge === null ? null : <span className={BADGE_CLASSES}>{badge}</span>}
                    </span>
                    <span className="whitespace-nowrap">{label}</span>
                </>
            ),
        },
    });
}

export { FooterTile };
