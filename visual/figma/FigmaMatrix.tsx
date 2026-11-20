// Renders one cell per Figma variant of one or more component sets, grouped by each set's own variant properties
// (visual/FIGMA-TESTING.md). Each cell is `[data-figma-variant]`, which the `vrt-figma` run holds to the matching
// Figma PNG and spec; a variant the code can't render shows as `[data-figma-missing]`. With `compare` (set from the
// "Figma diff" panel) the Figma PNG is drawn beside or over each cell, live. Inline styles: this is tooling under
// visual/, outside the kit's Tailwind sources.
import type { CSSProperties, ReactNode } from 'react';
import type { FigmaMatrixLayout, FigmaVariant } from './types.ts';
import { layoutMatrix } from './layout.ts';
import { figmaSet } from './manifests.ts';

type FigmaMatrixBlockProps = {
    /** Component set URL from FIGMA_SETS. */
    set: string;
    layout: FigmaMatrixLayout;
    /** Heading; defaults to the Figma set's name. */
    title?: string;
    /** Renders the code version of one Figma variant; null = no code equivalent (shown, reported as missing). */
    renderCell: (variant: FigmaVariant) => ReactNode;
};

type FigmaMatrixProps = {
    blocks: FigmaMatrixBlockProps[];
    compare?: string;
};

const LABEL: CSSProperties = { fontSize: 12, lineHeight: '16px', opacity: 0.7, textAlign: 'left', fontWeight: 500 };
const CELL: CSSProperties = { padding: '8px 16px 8px 0', verticalAlign: 'middle' };
const MISSING: CSSProperties = {
    display: 'inline-block',
    padding: '4px 8px',
    border: '1px dashed currentColor',
    borderRadius: 4,
    fontSize: 11,
    opacity: 0.5,
};

function overlayStyle(compare: string | undefined): CSSProperties | null {
    if (compare === 'onion') {
        return { opacity: 0.5 };
    }
    if (compare === 'difference') {
        // Identical pixels cancel to black; anything that differs glows.
        return { mixBlendMode: 'difference' };
    }

    return null;
}

function FigmaCell({
    variant,
    png,
    compare,
    children,
}: {
    variant: FigmaVariant;
    png: string;
    compare?: string;
    children: ReactNode;
}) {
    const overlay = overlayStyle(compare);
    const figma = <img srcSet={`${png} 2x`} alt="" aria-hidden style={{ display: 'block', maxWidth: 'none' }} />;

    return (
        <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8 }}>
            <div
                data-figma-variant={variant.id}
                title={variant.name}
                style={{ position: 'relative', display: 'inline-flex' }}
            >
                {children}
                {overlay && (
                    <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', ...overlay }}>
                        {figma}
                    </div>
                )}
            </div>
            {compare === 'side' && figma}
        </div>
    );
}

function FigmaMatrixBlock({ set, layout, title, renderCell, compare }: FigmaMatrixBlockProps & { compare?: string }) {
    const entry = figmaSet(set);
    if (!entry) {
        return (
            <p>
                Figma set {title ?? set} not synced yet. Run <code>pnpm vrt figma</code> (needs FIGMA_TOKEN in
                .env.local).
            </p>
        );
    }
    const sections = layoutMatrix(entry.manifest.axes, layout, entry.manifest.variants);

    return (
        <section data-figma-block={set} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 14, lineHeight: '20px', fontWeight: 600 }}>
                {title ?? entry.manifest.source.name}
            </h2>
            {sections.map((section) => {
                // No row axes (e.g. Size sections × State columns): no row-header column at all.
                const rowHeaders = section.rows.some((row) => {
                    return row.label !== '';
                });

                return (
                    <table key={section.title ?? 'all'} style={{ borderCollapse: 'collapse' }}>
                        {section.title && (
                            <caption style={{ ...LABEL, opacity: 1, paddingBottom: 8 }}>{section.title}</caption>
                        )}
                        <thead>
                            <tr>
                                {rowHeaders && (
                                    <th scope="col" style={LABEL}>
                                        <span style={{ position: 'absolute', clipPath: 'inset(50%)' }}>Variant</span>
                                    </th>
                                )}
                                {section.columns.map((column) => {
                                    return (
                                        <th key={column} scope="col" style={{ ...LABEL, paddingRight: 16 }}>
                                            {column}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {section.rows.map((row) => {
                                return (
                                    <tr key={row.label || 'row'}>
                                        {rowHeaders && (
                                            <th scope="row" style={{ ...LABEL, paddingRight: 16 }}>
                                                {row.label}
                                            </th>
                                        )}
                                        {row.cells.map((variant, index) => {
                                            if (!variant) {
                                                return <td key={index} style={CELL} />;
                                            }
                                            const content = renderCell(variant);

                                            return (
                                                <td key={variant.id} style={CELL}>
                                                    {content === null ? (
                                                        <span
                                                            data-figma-missing={variant.id}
                                                            title={variant.name}
                                                            style={MISSING}
                                                        >
                                                            no code equivalent
                                                        </span>
                                                    ) : (
                                                        <FigmaCell
                                                            variant={variant}
                                                            png={entry.pngUrl(variant)}
                                                            compare={compare}
                                                        >
                                                            {content}
                                                        </FigmaCell>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                );
            })}
        </section>
    );
}

export function FigmaMatrix({ blocks, compare }: FigmaMatrixProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {blocks.map((block) => {
                return <FigmaMatrixBlock key={block.set} {...block} compare={compare} />;
            })}
        </div>
    );
}
