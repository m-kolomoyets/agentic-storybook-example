import type { FunctionComponent, SVGProps } from 'react';
import { useId, useState } from 'react';
import preview from '#.storybook/preview';
import { expect, userEvent } from 'storybook/test';

/*
 * Gallery for the Figma-sourced icon set. No barrel: consumers import each file via SVGR's `?react`
 * query, and `import.meta.glob` enumerates them at build time (costs nothing outside this story).
 *
 * Two silent `import.meta.glob` traps: `query`/`import` are options, not part of the pattern
 * (`'./*.svg?react'` matches nothing), and the options must be an inline literal — Vite rewrites the
 * call statically, so a hoisted options const drops `eager` and yields lazy loaders, not components.
 */

type IconComponent = FunctionComponent<SVGProps<SVGSVGElement>>;

type IconEntry = { name: string; dir: string; Icon: IconComponent };

function toEntries(modules: Record<string, IconComponent>, dir: string): IconEntry[] {
    return Object.entries(modules)
        .map(([path, Icon]) => {
            return { name: path.replace(/^.*\//, '').replace(/\.svg$/, ''), dir, Icon };
        })
        .sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
}

const ICONS = toEntries(
    import.meta.glob<IconComponent>('./*.svg', { eager: true, query: '?react', import: 'default' }),
    '@/assets/icons'
);

const ILLUSTRATIONS = toEntries(
    import.meta.glob<IconComponent>('./illustrations/*.svg', { eager: true, query: '?react', import: 'default' }),
    '@/assets/icons/illustrations'
);

function importLine({ name, dir }: IconEntry) {
    const componentName = name
        .split('-')
        .map((part) => {
            return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join('');
    return `import ${componentName}Icon from '${dir}/${name}.svg?react';`;
}

type IconGridProps = {
    entries: IconEntry[];
    /** Size utility — the icons carry no width/height of their own. */
    sizeClass: string;
    label: string;
};

function IconGrid({ entries, sizeClass, label }: IconGridProps) {
    const [query, setQuery] = useState('');
    const [copied, setCopied] = useState('');
    const statusId = useId();

    const needle = query.trim().toLowerCase().replace(/\s+/g, '-');
    const visible = entries.filter((entry) => {
        return entry.name.includes(needle);
    });

    // Not `copyToClipboard`: it reports through the Toast viewport, which this story does not mount.
    async function handleCopy(entry: IconEntry) {
        try {
            await navigator.clipboard.writeText(importLine(entry));
            setCopied(entry.name);
        } catch {
            setCopied('');
        }
    }

    return (
        <div className="flex flex-col gap-xl">
            <div className="flex flex-wrap items-center gap-l">
                <input
                    type="search"
                    aria-label={`Filter ${label}`}
                    aria-describedby={statusId}
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                    }}
                    placeholder={`Filter ${label}…`}
                    className="w-64 rounded-s border border-border-primary bg-surface-input px-l py-m text-body-m text-text-general-strong"
                />
                <span id={statusId} role="status" className="text-body-s text-text-general-medium">
                    {visible.length} of {entries.length}
                    {copied ? ` · copied ${copied}` : ' · click one to copy its import'}
                </span>
            </div>

            <ul aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-l">
                {visible.map((entry) => {
                    return (
                        <li key={entry.name}>
                            <button
                                type="button"
                                onClick={() => {
                                    void handleCopy(entry);
                                }}
                                title={importLine(entry)}
                                className="flex size-full flex-col items-center gap-m rounded-s border border-border-primary bg-surface-card p-l text-text-general-strong hover:border-border-accent"
                            >
                                <entry.Icon aria-hidden="true" className={sizeClass} />
                                <span className="text-caption-s break-all text-text-general-medium">{entry.name}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

const meta = preview.meta({
    title: 'Foundations/Icons',
    component: IconGrid,
    args: { entries: ICONS, sizeClass: 'size-3xl', label: 'icons' },
    argTypes: { entries: { control: false } },
    parameters: { layout: 'padded' },
});

/** Every icon in `src/assets/icons`. Typing filters the grid; the status line counts matches. */
export const AllIcons = meta.story();

AllIcons.test('typing filters the grid and the status line counts matches', async ({ canvas }) => {
    const grid = canvas.getByRole('list', { name: 'icons' });
    const total = ICONS.length;
    await expect(grid.querySelectorAll('li')).toHaveLength(total);

    await userEvent.type(canvas.getByRole('searchbox', { name: 'Filter icons' }), 'arrow back');
    await expect(canvas.getByRole('button', { name: 'arrow-back' })).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'close' })).toBeNull();
    const shown = grid.querySelectorAll('li').length;
    await expect(shown).toBeGreaterThan(0);
    await expect(shown).toBeLessThan(total);
    await expect(canvas.getByRole('status')).toHaveTextContent(`${shown} of ${total}`);

    await userEvent.clear(canvas.getByRole('searchbox'));
    await expect(grid.querySelectorAll('li')).toHaveLength(total);
});

/** `src/assets/icons/illustrations/*.svg` (the PNGs there are not icons). */
export const Illustrations = meta.story({
    args: { entries: ILLUSTRATIONS, sizeClass: 'size-5xl', label: 'illustrations' },
});

Illustrations.test('lists every svg illustration', async ({ canvas }) => {
    await expect(canvas.getByRole('list', { name: 'illustrations' }).querySelectorAll('li')).toHaveLength(
        ILLUSTRATIONS.length
    );
});

// Monochrome icons are `fill="currentColor"`, so they take the surrounding text colour.
const COLOR_CLASSES = [
    'text-text-general-strong',
    'text-text-general-medium',
    'text-text-negative',
    'text-text-link-tertiary-default',
    'text-text-disabled',
];

/** Colour comes from the parent `color`, no props. */
export const ColorInheritance = meta.story({
    render: function ColorInheritance() {
        return (
            <div className="flex flex-col gap-l">
                {COLOR_CLASSES.map((colorClass) => {
                    return (
                        <div key={colorClass} className="flex items-center gap-l">
                            {/* Ink on icons only: `text-disabled` is low-contrast by design. */}
                            <span className={`flex gap-l ${colorClass}`}>
                                {ICONS.slice(0, 6).map((entry) => {
                                    return <entry.Icon key={entry.name} aria-hidden="true" className="size-3xl" />;
                                })}
                            </span>
                            <span className="text-body-s text-text-general-medium">{colorClass}</span>
                        </div>
                    );
                })}
            </div>
        );
    },
});

const SIZE_CLASSES = ['size-xl', 'size-2xl', 'size-3xl', 'size-4xl', 'size-5xl'];

/** `width`/`height` are stripped, so the box is whatever the spacing-scale size utility says. */
export const Sizes = meta.story({
    render: function Sizes() {
        return (
            <div className="flex flex-col gap-l text-text-general-strong">
                {SIZE_CLASSES.map((sizeClass) => {
                    return (
                        <div key={sizeClass} className="flex items-center gap-l">
                            {ICONS.slice(0, 6).map((entry) => {
                                return <entry.Icon key={entry.name} aria-hidden="true" className={sizeClass} />;
                            })}
                            <span className="text-body-s text-text-general-medium">{sizeClass}</span>
                        </div>
                    );
                })}
            </div>
        );
    },
});
