import type { ReactNode } from 'react';
import type { BreadcrumbItem, BreadcrumbsProps, RenderedCrumb } from './types';
import ArrowBackIcon from '@/assets/icons/arrow-back.svg?react';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/cn';
import { collapseMiddle, hasDestination, isCollapsed } from './utils/crumbs';

/* `min-w-px`: `truncate` is a no-op on a flex item whose min-width resolves to its content. */
const CRUMB_CLASSES = 'min-w-px truncate';

const LEAF_CLASSES = `${CRUMB_CLASSES} text-text-general-strong`;

const PLAIN_CRUMB_CLASSES = `${CRUMB_CLASSES} text-text-general-medium`;

/*
 * `outline-*`, not an inset ring: a text run has no box. `py-l -my-l` grows the hit area to 44px
 * without growing the row — padding, not `::before`, because `truncate` clips outside the box.
 */
const LINK_CLASSES = `
    ${PLAIN_CRUMB_CLASSES}
    py-l -my-l
    rounded-xxs transition-colors hover:text-text-general-strong
    focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-border-focused
`;

/* Separators are `aria-hidden` (the `<ol>` carries the order). */
const SEPARATOR_CLASSES = 'text-text-general-medium select-none';

/*
 * 20px arrow; an invisible `::before` grows the target to 44px tall, reaching right only the `gap-m`
 * to the first crumb so it never steals that crumb's taps. `shrink-0`: crumbs truncate, not the arrow.
 */
const BACK_CLASSES = `
    relative flex size-2xl shrink-0 items-center justify-center rounded-xxs text-icons-general-strong
    before:absolute before:-inset-y-l before:-left-l before:-right-m before:content-['']
    transition-colors hover:text-text-general-medium
    focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-border-focused
`;

type CrumbAnchorProps = {
    crumb: BreadcrumbItem;
    className: string;
    label?: string;
    children: ReactNode;
};

/** The anchor behind linked ancestors and the back arrow. */
function CrumbAnchor({ crumb, className, label, children }: CrumbAnchorProps) {
    // An explicit `href: undefined` would overwrite the href a router `Link` computes from its `to`.
    const destination = crumb.to === undefined ? undefined : { href: crumb.to };

    return useRender({
        render: crumb.render,
        defaultTagName: 'a',
        props: { ...destination, 'aria-label': label, className, children },
    });
}

/** Back arrow to the parent crumb (never `history.back()`), named `Back to <parent>`. */
function BackArrow({ parent }: { parent: BreadcrumbItem }) {
    return (
        <CrumbAnchor crumb={parent} className={BACK_CLASSES} label={`Back to ${parent.label}`}>
            <ArrowBackIcon aria-hidden className="size-full" />
        </CrumbAnchor>
    );
}

/** Leaf, link, plain text or `…`. The `…` is not a control; `title` and sr-only text name what it hides. */
function CrumbContent({ crumb, isLeaf }: { crumb: RenderedCrumb; isLeaf: boolean }) {
    if (isCollapsed(crumb)) {
        const hidden = crumb.collapsed.map((hiddenCrumb) => {
            return hiddenCrumb.label;
        });
        return (
            // `shrink-0`: squeezing the `…` would lose the only sign that crumbs are missing.
            <span className={`${SEPARATOR_CLASSES} shrink-0`} title={hidden.join(' / ')}>
                <span aria-hidden>…</span>
                <span className="sr-only">{hidden.join(', ')}</span>
            </span>
        );
    }
    // The leaf is never a link, whatever destination it carries.
    if (isLeaf) {
        return (
            <span aria-current="page" className={LEAF_CLASSES}>
                {crumb.label}
            </span>
        );
    }
    if (!hasDestination(crumb)) {
        return <span className={PLAIN_CRUMB_CLASSES}>{crumb.label}</span>;
    }
    return (
        <CrumbAnchor crumb={crumb} className={LINK_CLASSES}>
            {crumb.label}
        </CrumbAnchor>
    );
}

/**
 * Trail, back arrow and action slot in a `<nav aria-label="Breadcrumb">`.
 * Figma: `Breadcrumbs/Default` `10827:215593`.
 */
function Breadcrumbs({ items, action, className }: BreadcrumbsProps) {
    if (items.length === 0) {
        return null;
    }
    // Taken from `items`, not the collapsed list.
    const parent = items.at(-2);
    const crumbs = collapseMiddle(items);

    return (
        // No explicit height: padding + line box give the drawn 52px.
        <nav aria-label="Breadcrumb" className={cn`flex min-w-px items-center gap-m py-xl ${className}`}>
            {parent !== undefined && hasDestination(parent) ? <BackArrow parent={parent} /> : null}
            <ol className="flex min-w-px items-center gap-xs text-body-s">
                {crumbs.map((crumb, index) => {
                    return (
                        // Position, not label: trails repeat labels.
                        // eslint-disable-next-line @eslint-react/no-array-index-key
                        <li key={index} className="flex min-w-px items-center gap-xs">
                            {index > 0 ? (
                                <span aria-hidden className={SEPARATOR_CLASSES}>
                                    /
                                </span>
                            ) : null}
                            <CrumbContent crumb={crumb} isLeaf={index === crumbs.length - 1} />
                        </li>
                    );
                })}
            </ol>
            {action === undefined ? null : <div className="ms-auto shrink-0">{action}</div>}
        </nav>
    );
}

export { Breadcrumbs };
