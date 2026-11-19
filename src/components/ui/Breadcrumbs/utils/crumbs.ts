import type { BreadcrumbItem, CollapsedCrumb, RenderedCrumb } from '../types';

/** Crumbs drawn before the middle collapses. A constant, not a prop, so screens cannot disagree. */
const MAX_ITEMS = 4;

export function isCollapsed(crumb: RenderedCrumb): crumb is CollapsedCrumb {
    return 'collapsed' in crumb;
}

/** A crumb without a destination renders as text and never gets the back arrow. */
export function hasDestination(crumb: BreadcrumbItem): boolean {
    return crumb.to !== undefined || crumb.render !== undefined;
}

/**
 * Static overflow rule: the middle collapses to `…`; the first crumb and the tail survive. The tail
 * keeps the parent crumb so the back arrow's target stays visible.
 */
export function collapseMiddle(items: BreadcrumbItem[]): RenderedCrumb[] {
    if (items.length <= MAX_ITEMS) {
        return items;
    }
    const [first, ...rest] = items;
    // `- 2`: the first crumb and the `…` itself.
    const tail = rest.slice(rest.length - (MAX_ITEMS - 2));
    const collapsed = rest.slice(0, rest.length - tail.length);
    return [first, { collapsed }, ...tail];
}
