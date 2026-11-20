/** @jsxRuntime classic */
// Manager esbuild compiles JSX as classic `React.createElement`; the pragma makes TypeScript agree (React in scope).
// "Figma diff" addon panel for FigmaMatrix stories (visual/FIGMA-TESTING.md):
// - Live: sets the `figmaCompare` global, so the canvas draws each Figma variant beside / over / blended with its cell.
// - Last run: per-cell status from `pnpm vrt figma`, grouped like the Figma set, with spec mismatches and
//   reference / actual / diff for the selected cell. Results come from the dev-only `/__visual` route
//   (visual/figma/serve.ts). Shown only for stories with `parameters.figmaMatrix`.
import type { ReactNode } from 'react';
import type { FigmaBlockResult, FigmaCellResult, FigmaCompareMode, FigmaStoryResult } from '../visual/figma/types.ts';
import React, { Suspense, useState } from 'react';
import {
    QueryClient,
    QueryClientProvider,
    queryOptions,
    useIsFetching,
    useQueryClient,
    useSuspenseQuery,
} from '@tanstack/react-query';
import { AddonPanel } from 'storybook/internal/components';
import { addons, types, useGlobals, useStorybookState } from 'storybook/manager-api';
import { styled } from 'storybook/theming/emotion';
import { layoutMatrix } from '../visual/figma/layout.ts';
import { FIGMA_COMPARE_GLOBAL, FIGMA_RESULTS_DIR, VISUAL_URL_PREFIX } from '../visual/figma/types.ts';

const ADDON_ID = 'amber/figma-diff';
const REPORT_URL = `/${VISUAL_URL_PREFIX}/${FIGMA_RESULTS_DIR}/index.html`;

const LIVE_MODES: { id: FigmaCompareMode; label: string }[] = [
    { id: 'off', label: 'Off' },
    { id: 'side', label: 'Side by side' },
    { id: 'onion', label: 'Onion skin' },
    { id: 'difference', label: 'Difference' },
];

type Mode = 'side' | 'slider' | 'onion' | 'diff';
const MODES: { id: Mode; label: string }[] = [
    { id: 'side', label: 'Side by side' },
    { id: 'slider', label: 'Slider' },
    { id: 'onion', label: 'Onion skin' },
    { id: 'diff', label: 'Diff' },
];

function fileUrl(projectPath: string, version: number): string {
    return `/${VISUAL_URL_PREFIX}/${projectPath}?v=${version}`;
}

function percent(ratio: number | null): string {
    return ratio === null ? 'n/a' : `${(ratio * 100).toFixed(1)} %`;
}

// Manager is its own React root (Storybook's bundled React 18), separate from the app's `queryClient` (which pulls
// in app UI for toasts). Results change only when `pnpm vrt figma` runs, so data stays fresh until Reload.
const panelQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false } },
});

const figmaResultKeys = {
    all: ['figma-result'] as const,
    story: (storyId: string) => {
        return [...figmaResultKeys.all, storyId] as const;
    },
};

function figmaResultOptions(storyId: string) {
    return queryOptions({
        queryKey: figmaResultKeys.story(storyId),
        queryFn: async ({ signal }) => {
            // `Date.now()` busts the dev server's cache so Reload sees a fresh run.
            const response = await fetch(fileUrl(`${FIGMA_RESULTS_DIR}/results/${storyId}.json`, Date.now()), {
                signal,
            });

            return response.ok ? ((await response.json()) as FigmaStoryResult) : null;
        },
    });
}

const Root = styled.div(({ theme }) => {
    return {
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        fontSize: theme.typography.size.s2,
        color: theme.color.defaultText,
    };
});

const Row = styled.div({ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' });

type CellStatus = FigmaCellResult['status'];

function statusColor(status: CellStatus, theme: { color: Record<string, string> }): string {
    if (status === 'pass') {
        return theme.color.positive ?? 'green';
    }
    if (status === 'fail') {
        return theme.color.negative ?? 'red';
    }
    if (status === 'approved') {
        return theme.color.warning ?? 'orange';
    }

    return theme.color.mediumdark ?? 'grey';
}

const STATUS_MARK: Record<CellStatus, string> = { pass: '✓', fail: '✕', approved: '≈', missing: '∅' };

const Badge = styled.span<{ status: CellStatus }>(({ status, theme }) => {
    return {
        padding: '2px 8px',
        borderRadius: 4,
        fontWeight: theme.typography.weight.bold,
        color: theme.color.lightest,
        background: statusColor(status, theme),
    };
});

const Muted = styled.span(({ theme }) => {
    return { color: theme.textMutedColor };
});

const Button = styled.button<{ active?: boolean }>(({ active, theme }) => {
    return {
        padding: '4px 10px',
        borderRadius: 4,
        border: `1px solid ${theme.appBorderColor}`,
        background: active ? theme.color.secondary : 'transparent',
        color: active ? theme.color.lightest : theme.color.defaultText,
        cursor: 'pointer',
        font: 'inherit',
    };
});

const List = styled.ul({ margin: 0, paddingLeft: 20, fontFamily: 'monospace', lineHeight: 1.6 });

const Grid = styled.table(({ theme }) => {
    return {
        borderCollapse: 'collapse',
        fontSize: theme.typography.size.s1,
        'th, td': { padding: '3px 6px', textAlign: 'left' },
        th: { color: theme.textMutedColor, fontWeight: theme.typography.weight.regular },
        caption: { textAlign: 'left', fontWeight: theme.typography.weight.bold, padding: '4px 0' },
    };
});

const CellButton = styled.button<{ status: CellStatus; selected: boolean }>(({ status, selected, theme }) => {
    const color = statusColor(status, theme);

    return {
        minWidth: 64,
        padding: '3px 8px',
        borderRadius: 4,
        border: `2px solid ${selected ? theme.color.secondary : 'transparent'}`,
        background: `${color}2e`,
        color,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: theme.typography.weight.bold,
        cursor: 'pointer',
        font: 'inherit',
    };
});

// Checkerboard so transparent pixels (Figma exports on transparency) are visible.
const Stage = styled.div(({ theme }) => {
    return {
        position: 'relative',
        display: 'inline-grid',
        padding: 12,
        borderRadius: 4,
        border: `1px solid ${theme.appBorderColor}`,
        backgroundColor: '#fff',
        backgroundImage:
            'linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%)',
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
    };
});

const Layer = styled.img({ gridArea: '1 / 1', display: 'block' });

const Caption = styled.figcaption(({ theme }) => {
    return { marginBottom: 4, color: theme.textMutedColor };
});

/** 2x PNGs shown at CSS size via the `2x` density descriptor. */
function Image({ src, label }: { src: string; label: string }) {
    return <Layer srcSet={`${src} 2x`} alt={label} />;
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
    return (
        <figure style={{ margin: 0 }}>
            <Caption>{label}</Caption>
            <Stage>{children}</Stage>
        </figure>
    );
}

function LiveCompare() {
    const [globals, updateGlobals] = useGlobals();
    const current = (globals[FIGMA_COMPARE_GLOBAL] as FigmaCompareMode | undefined) ?? 'off';

    return (
        <Row role="toolbar" aria-label="Show Figma in the canvas">
            <strong>Canvas</strong>
            {LIVE_MODES.map(({ id, label }) => {
                return (
                    <Button
                        key={id}
                        type="button"
                        active={current === id}
                        aria-pressed={current === id}
                        onClick={() => {
                            updateGlobals({ [FIGMA_COMPARE_GLOBAL]: id });
                        }}
                    >
                        {label}
                    </Button>
                );
            })}
        </Row>
    );
}

function Viewer({ cell, version }: { cell: FigmaCellResult; version: number }) {
    const [mode, setMode] = useState<Mode>('side');
    const [amount, setAmount] = useState(50);
    const reference = fileUrl(cell.files.reference, version);
    if (!cell.files.actual) {
        return (
            <Figure label="Figma (no code equivalent)">
                <Image src={fileUrl(cell.files.figma, version)} label="Figma reference" />
            </Figure>
        );
    }
    const actual = fileUrl(cell.files.actual, version);
    const diff = cell.files.diff ? fileUrl(cell.files.diff, version) : null;

    let stage: ReactNode;
    if (mode === 'side') {
        stage = (
            <Row style={{ alignItems: 'flex-start' }}>
                <Figure label="Figma">
                    <Image src={reference} label="Figma reference" />
                </Figure>
                <Figure label="Story">
                    <Image src={actual} label="Rendered story" />
                </Figure>
            </Row>
        );
    } else if (mode === 'diff') {
        stage = (
            <Figure label="Diff (red: differing pixels, yellow: anti-aliasing)">
                {diff ? <Image src={diff} label="Pixel diff" /> : <Muted>No differing pixels.</Muted>}
            </Figure>
        );
    } else {
        // Slider: story revealed left of the handle. Onion: story faded over Figma.
        const overlayStyle =
            mode === 'slider' ? { clipPath: `inset(0 ${100 - amount}% 0 0)` } : { opacity: amount / 100 };
        stage = (
            <Figure label={mode === 'slider' ? 'Story ← | → Figma' : 'Figma under story'}>
                <Image src={reference} label="Figma reference" />
                <Layer srcSet={`${actual} 2x`} alt="Rendered story" style={overlayStyle} />
            </Figure>
        );
    }

    return (
        <>
            <Row role="toolbar" aria-label="Comparison mode">
                {MODES.map(({ id, label }) => {
                    return (
                        <Button
                            key={id}
                            type="button"
                            active={mode === id}
                            aria-pressed={mode === id}
                            onClick={() => {
                                setMode(id);
                            }}
                        >
                            {label}
                        </Button>
                    );
                })}
                {(mode === 'slider' || mode === 'onion') && (
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={amount}
                        aria-label={mode === 'slider' ? 'Slider position' : 'Story opacity'}
                        onChange={(event) => {
                            setAmount(Number(event.target.value));
                        }}
                    />
                )}
            </Row>
            {stage}
        </>
    );
}

function CellDetail({ cell, version }: { cell: FigmaCellResult; version: number }) {
    const { image, spec } = cell;

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Row>
                <Badge status={cell.status}>{cell.status.toUpperCase()}</Badge>
                <strong>{cell.variant.name}</strong>
                {cell.status !== 'missing' && (
                    <Muted>
                        pixels differ: {percent(image.ratio)} (max {(image.maxRatio * 100).toFixed(0)} %)
                    </Muted>
                )}
            </Row>
            {cell.approval && <Muted>Approved deviation: {cell.approval}</Muted>}
            {cell.status === 'missing' && <Muted>Figma draws this variant; the code has no equivalent.</Muted>}
            {image.error && <Muted>Image comparison: {image.error}</Muted>}
            {cell.status !== 'missing' &&
                (spec.mismatches.length === 0 ? (
                    <Muted>Spec matches Figma within 1px.</Muted>
                ) : (
                    <List>
                        {spec.mismatches.map((line) => {
                            return <li key={line}>{line}</li>;
                        })}
                    </List>
                ))}
            {spec.ignored.length > 0 && (
                <List aria-label="Ignored spec lines">
                    {spec.ignored.map((line) => {
                        return (
                            <li key={line}>
                                <Muted>ignored: {line}</Muted>
                            </li>
                        );
                    })}
                </List>
            )}
            <Viewer key={cell.variant.id} cell={cell} version={version} />
        </section>
    );
}

function BlockGrid({
    block,
    selectedId,
    onSelect,
}: {
    block: FigmaBlockResult;
    selectedId: string | undefined;
    onSelect: (id: string) => void;
}) {
    const items = block.cells.map((cell) => {
        return { ...cell, props: cell.variant.props };
    });

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Row>
                <strong>{block.set.name}</strong>
                <a href={block.set.url} target="_blank" rel="noreferrer">
                    Figma ↗
                </a>
            </Row>
            <Row style={{ alignItems: 'flex-start', gap: 24 }}>
                {layoutMatrix(block.axes, block.layout, items).map((section) => {
                    const rowHeaders = section.rows.some((row) => {
                        return row.label !== '';
                    });

                    return (
                        <Grid key={section.title ?? 'all'}>
                            {section.title && <caption>{section.title}</caption>}
                            <thead>
                                <tr>
                                    {rowHeaders && <th scope="col" aria-label="Variant" />}
                                    {section.columns.map((column) => {
                                        return (
                                            <th key={column} scope="col">
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
                                            {rowHeaders && <th scope="row">{row.label}</th>}
                                            {row.cells.map((cell, index) => {
                                                return (
                                                    <td key={cell?.variant.id ?? index}>
                                                        {cell && (
                                                            <CellButton
                                                                type="button"
                                                                status={cell.status}
                                                                selected={cell.variant.id === selectedId}
                                                                aria-pressed={cell.variant.id === selectedId}
                                                                title={`${cell.variant.name}: ${cell.status}`}
                                                                onClick={() => {
                                                                    onSelect(cell.variant.id);
                                                                }}
                                                            >
                                                                {STATUS_MARK[cell.status]}{' '}
                                                                {cell.status === 'missing'
                                                                    ? ''
                                                                    : percent(cell.image.ratio)}
                                                            </CellButton>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Grid>
                    );
                })}
            </Row>
        </section>
    );
}

function ResultView({ storyId }: { storyId: string }) {
    const { data: result, dataUpdatedAt } = useSuspenseQuery(figmaResultOptions(storyId));
    const [selectedId, setSelectedId] = useState<string | null>(null);
    if (!result) {
        return (
            <Muted>
                No result for this story yet. Run <code>pnpm vrt figma</code>, then Reload.
            </Muted>
        );
    }
    // Images reuse the fetch time as cache-buster: new run → new image URLs.
    const version = dataUpdatedAt;
    const cells = result.blocks.flatMap((block) => {
        return block.cells;
    });
    const count = (status: CellStatus) => {
        return cells.filter((cell) => {
            return cell.status === status;
        }).length;
    };
    // Default selection: first failing cell, else the first cell.
    const selected =
        cells.find((cell) => {
            return cell.variant.id === selectedId;
        }) ??
        cells.find((cell) => {
            return cell.status === 'fail';
        }) ??
        cells[0];

    return (
        <>
            <Row>
                <Badge status={count('fail') ? 'fail' : 'pass'}>
                    {count('pass')}/{cells.length - count('missing')} match
                </Badge>
                {count('fail') > 0 && <Muted>{count('fail')} failing</Muted>}
                {count('approved') > 0 && <Muted>{count('approved')} approved deviations</Muted>}
                {count('missing') > 0 && <Muted>{count('missing')} without code equivalent</Muted>}
                <Muted>ran {new Date(result.ranAt).toLocaleString()}</Muted>
            </Row>
            {result.blocks.map((block) => {
                return (
                    <BlockGrid
                        key={block.set.url}
                        block={block}
                        selectedId={selected?.variant.id}
                        onSelect={setSelectedId}
                    />
                );
            })}
            {selected && <CellDetail cell={selected} version={version} />}
        </>
    );
}

function FigmaDiffPanel() {
    const { storyId } = useStorybookState();
    const queryClient = useQueryClient();
    const isFetching = useIsFetching({ queryKey: figmaResultKeys.story(storyId) }) > 0;

    return (
        <Root>
            <LiveCompare />
            <Row>
                <strong>Last run</strong>
                <Button
                    type="button"
                    disabled={isFetching}
                    onClick={() => {
                        void queryClient.invalidateQueries({ queryKey: figmaResultKeys.story(storyId) });
                    }}
                >
                    {isFetching ? 'Reloading…' : 'Reload'}
                </Button>
                <a href={REPORT_URL} target="_blank" rel="noreferrer">
                    All Figma tests ↗
                </a>
            </Row>
            <Suspense fallback={<Muted>Loading…</Muted>}>
                <ResultView key={storyId} storyId={storyId} />
            </Suspense>
        </Root>
    );
}

export function registerFigmaDiffPanel() {
    addons.register(ADDON_ID, () => {
        addons.add(`${ADDON_ID}/panel`, {
            type: types.PANEL,
            title: 'Figma diff',
            // Hidden for stories without `parameters.figmaMatrix`.
            paramKey: 'figmaMatrix',
            render: ({ active }) => {
                return (
                    <AddonPanel active={Boolean(active)}>
                        <QueryClientProvider client={panelQueryClient}>
                            <FigmaDiffPanel />
                        </QueryClientProvider>
                    </AddonPanel>
                );
            },
        });
    });
}
