import type { useRender } from '@base-ui/react/use-render';
import type { ReactNode } from 'react';

/** `to` (plain href) and `render` (router `Link`) are exclusive; the leaf has neither. */
type BreadcrumbDestination =
    /** Plain anchor: a full page load under a client router — use `render` inside the app. */
    | { to: string; render?: never }
    /** `render={<Link to="…" />}`: the router owns the navigation. */
    | { to?: never; render: useRender.RenderProp }
    /** Not a link. */
    | { to?: never; render?: never };

/** One crumb. The last item is the current page and is never a link. */
export type BreadcrumbItem = {
    /** One line, ellipsis-truncated, never wrapped. */
    label: string;
} & BreadcrumbDestination;

/** The `…` crumb standing in for the collapsed middle. */
export type CollapsedCrumb = {
    collapsed: readonly BreadcrumbItem[];
};

export type RenderedCrumb = BreadcrumbItem | CollapsedCrumb;

export type BreadcrumbsProps = {
    /** Root first. The last item is the current page (unlinked, `aria-current="page"`). Empty renders nothing. */
    items: BreadcrumbItem[];
    /** Right-hand slot, opaque to the primitive. */
    action?: ReactNode;
    className?: string;
};
