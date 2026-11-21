// Renders one cell per Figma variant of one or more component sets, grouped by each set's own variant properties
// (visual/FIGMA-TESTING.md). Each cell's `[data-figma-variant]` wraps only the component, which the `vrt-figma` run
// holds to the matching Figma PNG and spec; a variant the code can't render has no `[data-figma-variant]`.
// The story is the matrix: its header shows the last run's score for the component, the overlay switch (Figma beside,
// under or blended with each cell: the `figmaCompare` global) and a filter. With a run, every cell carries its status
// and is selectable (click, or ← → ↑ ↓ Home End); the "Figma diff" panel shows the selected cell (selection.ts), with
// the basic a11y of its live render (a11y.ts). Without a run (Vitest, static builds) cells are plain renders.
// Same layout rules at any component size: cell widths and pane heights come from the Figma variants' own boxes.
// Scoped CSS: this is tooling under visual/, outside the kit's Tailwind sources.
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { MatrixSection } from './layout.ts';
import type { FigmaSetEntry } from './manifests.ts';
import type { FigmaSelect, FigmaSelection } from './selection.ts';
import type { FigmaCellResult, FigmaCompareMode, FigmaMatrixLayout, FigmaStoryResult, FigmaVariant } from './types.ts';
import type { Level, Tone } from './view.ts';
import { useEffect, useRef, useState } from 'react';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { UPDATE_GLOBALS } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';
import { measureA11y } from './a11y.ts';
import { diffMapSummary, loadDiffMap, paintDiffMap } from './diff-map.ts';
import { cellConclusion } from './issues.ts';
import { layoutMatrix } from './layout.ts';
import { figmaSet } from './manifests.ts';
import { figmaResultOptions, fileUrl } from './results.ts';
import { FIGMA_SELECT_EVENT, FIGMA_SELECTION_EVENT, FIGMA_SELECTION_REQUEST_EVENT } from './selection.ts';
import { FIGMA_COMPARE_GLOBAL, FIGMA_RESULTS_DIR, VISUAL_URL_PREFIX } from './types.ts';
import {
    barSegments,
    cellKey,
    cellLevel,
    cellMetric,
    cellTone,
    COPY_COMMAND,
    countTones,
    headline,
    inspectorTiles,
    LEVELS,
    ranText,
    TONES,
} from './view.ts';

type FigmaMatrixBlockProps = {
    /** Component set URL from FIGMA_SETS. */
    set: string;
    layout: FigmaMatrixLayout;
    /** Heading; defaults to the Figma set's name. */
    title?: string;
    /** Renders the code version of one Figma variant; null = no code equivalent (shown, reported as missing). */
    renderCell: (variant: FigmaVariant) => ReactNode;
};

/** The parts of Storybook's story context the matrix reads: pass the render function's second argument. */
type MatrixContext = { id: string; title: string; globals: Record<string, unknown> };

type FigmaMatrixProps = {
    blocks: FigmaMatrixBlockProps[];
    context: MatrixContext;
};

type Filter = 'all' | 'differ' | 'approved' | 'nocode' | 'match';

// Preview-side cache for the last run; results change only when `pnpm vrt figma` runs (reload the story to refetch).
const resultsClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false } },
});

/** feColorMatrix values: luminance → `rgb` × `gain`, alpha kept. */
function tint([r, g, b]: [number, number, number], gain: number): string {
    const luminance = [0.2126, 0.7152, 0.0722];
    const row = (channel: number) => {
        return [
            ...luminance.map((weight) => {
                return (weight * channel * gain).toFixed(4);
            }),
            0,
            0,
        ].join(' ');
    };

    return [row(r), row(g), row(b), '0 0 0 1 0'].join(' ');
}

const MODES: { id: FigmaCompareMode; label: string; hint: string }[] = [
    { id: 'off', label: 'Off', hint: 'Story renders as it ships, no Figma layer.' },
    { id: 'side', label: 'Side by side', hint: 'Figma first, story second (stacked for large components).' },
    {
        id: 'onion',
        label: 'Onion skin',
        hint: 'Figma in orange, story in blue, screened: matching pixels turn near-white, drift shows as one hue.',
    },
    {
        id: 'difference',
        label: 'Difference',
        hint: 'Last run’s “what differs” map: orange only in Figma, blue only in story, yellow other colour.',
    },
];

const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'differ', label: 'Differs' },
    { id: 'approved', label: 'Approved' },
    { id: 'nocode', label: 'Not in code' },
    { id: 'match', label: 'Matches' },
];

const BAR_COLORS: Record<'match' | 'approved' | 'differ' | 'nocode', string> = {
    match: 'var(--fm-match)',
    approved: 'var(--fm-approved-bar)',
    differ: 'var(--fm-differ)',
    nocode: 'var(--fm-line-3)',
};

/** Size class of the largest Figma variant: the header tag. */
function sizeClass(width: number): string {
    if (width <= 40) {
        return 'small';
    }

    return width <= 280 ? 'medium' : 'large';
}

/** From the set's largest variant box: minimum cell width per mode, whether side-by-side panes stack, pane height. */
function rulesFor(entry: FigmaSetEntry, mode: FigmaCompareMode) {
    const width = Math.max(
        ...entry.manifest.variants.map((variant) => {
            return variant.spec.root.width;
        })
    );
    const height = Math.max(
        ...entry.manifest.variants.map((variant) => {
            return variant.spec.root.height;
        })
    );
    const stacked = width * 2 + 56 > 600;
    const minWidth = {
        off: Math.max(width + 32, 76),
        side: Math.max(stacked ? width + 32 : width * 2 + 56, 132),
        onion: Math.max(width + 32, 76),
        difference: Math.max(width + 32, 76),
    }[mode];

    return {
        stacked,
        minWidth,
        width,
        height,
        style: { '--fm-min': `${minWidth}px`, '--fm-pane': `${Math.max(height + 20, 34)}px` } as CSSProperties,
    };
}

/** Row-label column of a fluid grid: fits the longest label, 72–240px. */
function labelWidth(labels: string[]): number {
    const longest = Math.max(
        0,
        ...labels.map((label) => {
            return label.length;
        })
    );

    return Math.min(240, Math.max(72, longest * 7 + 16));
}

/** Dialog magnification: the variant fills ~720×420 without passing 6×, in half steps. */
function zoomFor(width: number, height: number): number {
    const fit = Math.min(720 / Math.max(width, 1), 420 / Math.max(height, 1));

    return Math.max(1, Math.min(6, Math.floor(fit * 2) / 2));
}

/** Three pips, `level` of them lit: how far a failing cell is off. */
function LevelPips({ level }: { level: Level }) {
    return (
        <span className="fm-level" data-level={level} aria-hidden="true">
            <i />
            <i />
            <i />
        </span>
    );
}

function inFilter(tone: Tone, filter: Filter): boolean {
    if (filter === 'all') {
        return true;
    }
    if (filter === 'differ') {
        return tone === 'differ' || tone === 'error';
    }

    return tone === filter;
}

function FigmaImage({ png }: { png: string }) {
    return <img srcSet={`${png} 2x`} alt="" aria-hidden style={{ display: 'block', maxWidth: 'none' }} />;
}

// Busts the browser cache for run images once per preview load (results change only when `pnpm vrt figma` runs).
const LOADED_AT = Date.now();

/**
 * A cell's "what differs" picture from its last run: the same diff-map.ts map (or raw comparator diff, or why there is
 * none) the Figma diff panel and the report show, from the same tile model (view.ts `inspectorTiles`).
 */
function DiffMapPicture({ tile }: { tile: ReturnType<typeof inspectorTiles>[number] }) {
    const { explain } = tile;
    const { data: map, isPending } = useQuery(
        {
            queryKey: ['figma-diff-map', explain?.reference, explain?.actual],
            queryFn: () => {
                return explain
                    ? loadDiffMap(fileUrl(explain.reference, LOADED_AT), fileUrl(explain.actual, LOADED_AT))
                    : null;
            },
            enabled: explain !== null,
        },
        resultsClient
    );
    if (map) {
        return (
            <canvas
                role="img"
                aria-label={`What differs: ${diffMapSummary(map)}`}
                style={{ width: map.image.width / 2, height: map.image.height / 2 }}
                ref={(canvas) => {
                    if (canvas) {
                        paintDiffMap(canvas, map);
                    }
                }}
            />
        );
    }
    if (explain && isPending) {
        return <span>reading pixels…</span>;
    }
    if (tile.src) {
        return <img srcSet={`${fileUrl(tile.src, LOADED_AT)} 2x`} alt="" />;
    }

    return <span>{tile.message}</span>;
}

/**
 * The measured cell: `[data-figma-variant]` with the component as its first child. `measured={false}` (the zoom
 * dialog's copy) drops the attribute, so the run and the panel only ever see the grid's cell.
 */
function Specimen({
    variant,
    content,
    overlay,
    measured,
}: {
    variant: FigmaVariant;
    content: ReactNode;
    overlay?: ReactNode;
    measured: boolean;
}) {
    return (
        <div
            className="fm-specimen"
            data-figma-variant={measured ? variant.id : undefined}
            title={variant.name}
            style={{ position: 'relative', display: 'inline-flex' }}
        >
            {content}
            {overlay}
        </div>
    );
}

/** What a cell shows in the current mode. Not in code: the Figma variant, faded. */
function CellBody({
    variant,
    content,
    png,
    mode,
    stacked,
    result,
    measured = true,
}: {
    variant: FigmaVariant;
    content: ReactNode;
    png: string;
    mode: FigmaCompareMode;
    stacked: boolean;
    /** The cell's last run: difference mode shows its "what differs" map instead of the live blend. */
    result?: FigmaCellResult;
    measured?: boolean;
}) {
    if (content === null) {
        return (
            <div className="fm-pane fm-pane--missing">
                <FigmaImage png={png} />
            </div>
        );
    }
    if (mode === 'side') {
        return (
            <div className="fm-panes" data-stacked={stacked || undefined}>
                <div className="fm-pane">
                    <span className="fm-pane__label">figma</span>
                    <FigmaImage png={png} />
                </div>
                <div className="fm-pane">
                    <span className="fm-pane__label">story</span>
                    <Specimen variant={variant} content={content} measured={measured} />
                </div>
            </div>
        );
    }
    // Difference with a run: the run's map, opaque over the measured cell (which stays rendered for the run and a11y).
    const diffTile =
        mode === 'difference' && result
            ? inspectorTiles(result).find((tile) => {
                  return tile.diff;
              })
            : undefined;
    if (diffTile) {
        return (
            <div className="fm-pane" data-mode="map">
                <Specimen
                    variant={variant}
                    content={content}
                    measured={measured}
                    overlay={
                        <div className="fm-overlay" data-mode="map">
                            <DiffMapPicture tile={diffTile} />
                        </div>
                    }
                />
            </div>
        );
    }
    // Onion / difference: Figma on top of the measured cell, never part of its first child.
    const overlay =
        mode === 'onion' || mode === 'difference' ? (
            <div className="fm-overlay" data-mode={mode}>
                <FigmaImage png={png} />
                {mode === 'onion' && (
                    <span
                        className="fm-box"
                        style={{ width: variant.spec.root.width, height: variant.spec.root.height }}
                    />
                )}
            </div>
        ) : null;

    return (
        <div className="fm-pane" data-mode={mode}>
            <Specimen variant={variant} content={content} overlay={overlay} measured={measured} />
        </div>
    );
}

/** Dialog-only modes: the grid's overlays plus a before / after slider. */
type ZoomMode = FigmaCompareMode | 'slider';

const ZOOM_MODES: { id: ZoomMode; label: string; hint: string }[] = [
    ...MODES.filter((option) => {
        return option.id === 'onion' || option.id === 'difference';
    }),
    {
        id: 'slider',
        label: 'Slider',
        hint: 'Figma left of the handle, story right. Drag the handle, or focus it and use ← → (Page Up / Down for 10%).',
    },
    ...MODES.filter((option) => {
        return option.id === 'side';
    }),
];

/** Before / after: the Figma PNG over the story, clipped at the handle; Figma left, story right. */
function SliderCompare({
    variant,
    content,
    png,
    zoom,
}: {
    variant: FigmaVariant;
    content: ReactNode;
    png: string;
    zoom: number;
}) {
    const [position, setPosition] = useState(50);

    return (
        <div className="fm-slider">
            <div className="fm-slider__tags" aria-hidden="true">
                <span data-side="figma">◧ Figma</span>
                <span data-side="story">Story · code ◨</span>
            </div>
            <div className="fm-slider__frame" style={{ '--fm-pos': `${position}%` } as CSSProperties}>
                <div style={{ zoom }}>
                    <div className="fm-pane" data-mode="slider">
                        <Specimen
                            variant={variant}
                            content={content}
                            measured={false}
                            overlay={
                                <div className="fm-overlay" data-mode="slider">
                                    <FigmaImage png={png} />
                                </div>
                            }
                        />
                    </div>
                </div>
                <span className="fm-slider__divider" aria-hidden="true">
                    <span />
                </span>
                <input
                    type="range"
                    className="fm-slider__input"
                    min={0}
                    max={100}
                    step={1}
                    value={position}
                    aria-label="Split between Figma (left) and story (right)"
                    aria-valuetext={`${position}% Figma, ${100 - position}% story`}
                    onChange={(event) => {
                        setPosition(Number(event.target.value));
                    }}
                />
            </div>
        </div>
    );
}

/**
 * One cell, magnified in a modal: onion skin, difference or side by side at up to 6×, so drift reads without browser
 * zoom. Esc, the close button or a backdrop click closes it; focus returns to the opener.
 */
function ZoomDialog({
    title,
    variant,
    content,
    png,
    mode: initialMode,
    result,
    onClose,
}: {
    title: string;
    variant: FigmaVariant;
    content: ReactNode;
    png: string;
    mode: FigmaCompareMode;
    result: FigmaCellResult | undefined;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const [mode, setMode] = useState<ZoomMode>(initialMode);
    useEffect(function open() {
        const dialog = ref.current;
        dialog?.showModal();

        return () => {
            dialog?.close();
        };
    }, []);
    const tone = result ? cellTone(result) : undefined;
    const level = result ? cellLevel(result) : null;
    const zoom = zoomFor(variant.spec.root.width, variant.spec.root.height);
    const conclusion = result ? cellConclusion(result) : null;

    return (
        <dialog
            ref={ref}
            className="fm-dialog"
            aria-labelledby="fm-dialog-title"
            onClose={onClose}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="fm-dialog__head">
                <div className="fm-dialog__title">
                    <h2 id="fm-dialog-title">{title}</h2>
                    {result && tone && (
                        <p data-tone={tone}>
                            <span className="fm-dialog__status">
                                {TONES[tone].icon} {TONES[tone].label}
                                {level && (
                                    <>
                                        {' '}
                                        · <LevelPips level={level} /> {LEVELS[level]}
                                    </>
                                )}
                            </span>{' '}
                            <span className="fm-muted">{cellMetric(result)}</span>
                        </p>
                    )}
                    {conclusion && <p className="fm-muted">{conclusion}</p>}
                </div>
                <div className="fm-dialog__tools">
                    <div className="fm-seg" role="group" aria-label="Dialog overlay mode">
                        {ZOOM_MODES.map((option) => {
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    aria-pressed={mode === option.id}
                                    onClick={() => {
                                        setMode(option.id);
                                    }}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                    <span className="fm-muted fm-dialog__zoom-label">{zoom}×</span>
                    <button type="button" className="fm-dialog__close" aria-label="Close" onClick={onClose}>
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            aria-hidden="true"
                        >
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>
            </div>
            <div className="fm-dialog__stage fm-scrollbar">
                {mode === 'slider' && content !== null ? (
                    <SliderCompare variant={variant} content={content} png={png} zoom={zoom} />
                ) : (
                    <div className="fm-dialog__zoom" style={{ zoom }}>
                        <CellBody
                            variant={variant}
                            content={content}
                            png={png}
                            mode={mode === 'slider' ? 'side' : mode}
                            stacked={variant.spec.root.width * 2 + 56 > 960 / zoom}
                            result={result}
                            measured={false}
                        />
                    </div>
                )}
            </div>
            <p className="fm-dialog__hint fm-muted">
                {
                    ZOOM_MODES.find((option) => {
                        return option.id === mode;
                    })?.hint
                }
            </p>
        </dialog>
    );
}

/** One cell in display order: what selection and arrow keys walk. */
type Spot = {
    key: string;
    blockIndex: number;
    variant: FigmaVariant;
    result: FigmaCellResult | undefined;
    sectionIndex: number;
    row: number;
    column: number;
};

type BlockModel = {
    block: FigmaMatrixBlockProps;
    entry: FigmaSetEntry | null;
    sections: MatrixSection<FigmaVariant>[];
    results: Map<string, FigmaCellResult>;
};

function blockModels(blocks: FigmaMatrixBlockProps[], run: FigmaStoryResult | null | undefined): BlockModel[] {
    return blocks.map((block, index) => {
        const entry = figmaSet(block.set);
        const result =
            run?.blocks.find((candidate, candidateIndex) => {
                return candidate.set.url === block.set && candidateIndex === index;
            }) ??
            run?.blocks.find((candidate) => {
                return candidate.set.url === block.set;
            }) ??
            run?.blocks[index];

        return {
            block,
            entry,
            sections: entry ? layoutMatrix(entry.manifest.axes, block.layout, entry.manifest.variants) : [],
            results: new Map(
                (result?.cells ?? []).map((cell) => {
                    return [cell.variant.id, cell];
                })
            ),
        };
    });
}

function spotsOf(models: BlockModel[]): Spot[] {
    return models.flatMap((model, blockIndex) => {
        return model.sections.flatMap((section, sectionIndex) => {
            return section.rows.flatMap((row, rowIndex) => {
                return row.cells.flatMap((variant, column) => {
                    return variant
                        ? [
                              {
                                  key: cellKey(blockIndex, variant.id),
                                  blockIndex,
                                  variant,
                                  result: model.results.get(variant.id),
                                  sectionIndex,
                                  row: rowIndex,
                                  column,
                              },
                          ]
                        : [];
                });
            });
        });
    });
}

/** The cell an arrow key moves to: along the display order, or up / down the same column of the same section. */
function moveFrom(spots: Spot[], current: Spot, key: string): Spot | undefined {
    const index = spots.indexOf(current);
    if (key === 'ArrowRight') {
        return spots[Math.min(index + 1, spots.length - 1)];
    }
    if (key === 'ArrowLeft') {
        return spots[Math.max(index - 1, 0)];
    }
    if (key === 'Home') {
        return spots[0];
    }
    if (key === 'End') {
        return spots.at(-1);
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
        const column = spots.filter((spot) => {
            return (
                spot.blockIndex === current.blockIndex &&
                spot.sectionIndex === current.sectionIndex &&
                spot.column === current.column
            );
        });
        const position = column.indexOf(current) + (key === 'ArrowDown' ? 1 : -1);

        return column[position];
    }

    return undefined;
}

function channel() {
    try {
        return addons.getChannel();
    } catch {
        return null;
    }
}

function Header({
    context,
    largest,
    mode,
    run,
    cells,
    filter,
    onFilter,
}: {
    context: MatrixContext;
    largest: number;
    mode: FigmaCompareMode;
    run: FigmaStoryResult | null | undefined;
    cells: FigmaCellResult[];
    filter: Filter;
    onFilter: (filter: Filter) => void;
}) {
    const [copied, setCopied] = useState(false);
    useEffect(
        function resetCopied() {
            if (!copied) {
                return undefined;
            }
            const timer = setTimeout(() => {
                setCopied(false);
            }, 1600);

            return () => {
                clearTimeout(timer);
            };
        },
        [copied]
    );
    const counts = countTones(cells);
    const { lead, tail } = headline(counts);
    const segments = barSegments(counts);
    const total = cells.length;
    const reportUrl = `/${VISUAL_URL_PREFIX}/${FIGMA_RESULTS_DIR}/index.html#cmp-${context.id}`;
    const setMode = (id: FigmaCompareMode) => {
        channel()?.emit(UPDATE_GLOBALS, { globals: { [FIGMA_COMPARE_GLOBAL]: id } });
    };

    return (
        <>
            <header className="fm-head" data-sticky={run !== undefined || undefined}>
                <div className="fm-head__top">
                    <div className="fm-head__title">
                        <span className="fm-tag">#{sizeClass(largest)}</span>
                        <h1>
                            {(context.title.split('/').pop() ?? context.title).toLowerCase()}{' '}
                            <span className="fm-muted">/ figma matrix</span>
                        </h1>
                    </div>
                    <div className="fm-head__meta">
                        {run && <span>ran {ranText(run.ranAt)}</span>}
                        <a href={reportUrl} target="_blank" rel="noreferrer">
                            Full report <span aria-hidden="true">↗</span>
                        </a>
                    </div>
                </div>
                <div className="fm-toolbar">
                    <div className="fm-toolbar__mode">
                        <span className="fm-eyebrow">overlay</span>
                        <div className="fm-seg" role="group" aria-label="Overlay mode">
                            {MODES.map((option) => {
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        aria-pressed={mode === option.id}
                                        onClick={() => {
                                            setMode(option.id);
                                        }}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                        <span className="fm-muted fm-hint">
                            {
                                MODES.find((option) => {
                                    return option.id === mode;
                                })?.hint
                            }
                        </span>
                    </div>
                    {run && (
                        <div className="fm-seg" role="group" aria-label="Filter cells">
                            {FILTERS.map((option) => {
                                const count = option.id === 'all' ? total : counts[option.id];

                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        aria-pressed={filter === option.id}
                                        onClick={() => {
                                            onFilter(option.id);
                                        }}
                                    >
                                        {option.label} <span className="fm-seg__n">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </header>
            {run && (
                <div className="fm-summary">
                    <div className="fm-summary__score">
                        <p className="fm-headline">
                            {lead} <span>{tail}</span>
                        </p>
                        <div
                            className="fm-bar"
                            role="img"
                            aria-label={`Of ${total} variants: ${counts.match} match, ${counts.approved} approved, ${counts.differ} differ, ${counts.nocode} not in code`}
                        >
                            {segments
                                .filter((segment) => {
                                    return segment.value > 0;
                                })
                                .map((segment, index) => {
                                    return (
                                        <div
                                            key={segment.tone}
                                            className="fm-grow"
                                            style={{
                                                flex: segment.value,
                                                background: BAR_COLORS[segment.tone],
                                                animationDelay: `${index * 40}ms`,
                                            }}
                                        />
                                    );
                                })}
                        </div>
                    </div>
                    <div className="fm-chips">
                        {(['match', 'differ', 'approved', 'nocode'] as const).map((tone) => {
                            return (
                                <span
                                    key={tone}
                                    className="fm-chip"
                                    data-tone={tone}
                                    data-empty={(tone !== 'match' && counts[tone] === 0) || undefined}
                                >
                                    <span aria-hidden="true">{TONES[tone].icon}</span> {counts[tone]}{' '}
                                    {TONES[tone].label.toLowerCase()}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}
            {run === null && (
                <div className="fm-norun">
                    <div>
                        <strong>No results yet</strong>
                        <span className="fm-muted">
                            The grid below renders live. Run the comparison to get statuses.
                        </span>
                    </div>
                    <button
                        type="button"
                        className="fm-cmd"
                        onClick={() => {
                            void navigator.clipboard?.writeText(COPY_COMMAND);
                            setCopied(true);
                        }}
                    >
                        <span aria-hidden="true">$</span> {COPY_COMMAND}{' '}
                        <span key={String(copied)} className={copied ? 'fm-cmd__hint fm-pop' : 'fm-cmd__hint'}>
                            {copied ? 'Copied ✓' : 'copy'}
                        </span>
                    </button>
                </div>
            )}
        </>
    );
}

export function FigmaMatrix({ blocks, context }: FigmaMatrixProps) {
    const requested = context.globals[FIGMA_COMPARE_GLOBAL];
    const mode =
        MODES.find((candidate) => {
            return candidate.id === requested;
        })?.id ?? 'off';
    // In Vitest and static builds the dev route is absent: no results, so no statuses, selection or inert content,
    // and the measured `[data-figma-variant]` renders exactly as it ships.
    const { data: run } = useQuery(figmaResultOptions(context.id), resultsClient);
    const hasRun = Boolean(run);
    const [filter, setFilter] = useState<Filter>('all');
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [zoomed, setZoomed] = useState<{ key: string; label: string } | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    const models = blockModels(blocks, run);
    const spots = spotsOf(models);
    const cells = spots.flatMap((spot) => {
        return spot.result ? [spot.result] : [];
    });
    const fallback =
        spots.find((spot) => {
            return spot.result?.status === 'fail';
        }) ?? spots[0];
    const selected =
        spots.find((spot) => {
            return spot.key === selectedKey;
        }) ?? fallback;
    const zoomedSpot = zoomed
        ? spots.find((spot) => {
              return spot.key === zoomed.key;
          })
        : undefined;
    const zoomedEntry = zoomedSpot ? models[zoomedSpot.blockIndex].entry : null;
    const largest = Math.max(
        ...models.flatMap((model) => {
            return (model.entry?.manifest.variants ?? []).map((variant) => {
                return variant.spec.root.width;
            });
        }),
        0
    );

    // Tell the panel what is selected, with the a11y of its live render; answer its requests and its ← →.
    const selectedId = hasRun ? selected?.key : undefined;
    useEffect(
        function syncSelection() {
            const bus = channel();
            if (!bus || !selectedId) {
                return undefined;
            }
            const send = () => {
                const root = rootRef.current?.querySelector(
                    `[data-fm-key="${CSS.escape(selectedId)}"] [data-figma-variant] > :first-child`
                );
                const selection: FigmaSelection = {
                    storyId: context.id,
                    key: selectedId,
                    a11y: root ? measureA11y(root) : null,
                };
                bus.emit(FIGMA_SELECTION_EVENT, selection);
            };
            const onRequest = ({ storyId }: { storyId: string }) => {
                if (storyId === context.id) {
                    send();
                }
            };
            const onSelect = ({ storyId, key }: FigmaSelect) => {
                if (storyId === context.id) {
                    setSelectedKey(key);
                    rootRef.current
                        ?.querySelector(`[data-fm-key="${CSS.escape(key)}"]`)
                        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }
            };
            // After paint, so the a11y read sees the selected cell as rendered.
            const frame = requestAnimationFrame(send);
            bus.on(FIGMA_SELECTION_REQUEST_EVENT, onRequest);
            bus.on(FIGMA_SELECT_EVENT, onSelect);

            return () => {
                cancelAnimationFrame(frame);
                bus.off(FIGMA_SELECTION_REQUEST_EVENT, onRequest);
                bus.off(FIGMA_SELECT_EVENT, onSelect);
            };
        },
        [selectedId, context.id, mode]
    );

    const select = (spot: Spot, focus: boolean) => {
        setSelectedKey(spot.key);
        if (focus) {
            rootRef.current
                ?.querySelector<HTMLElement>(`[data-fm-key="${CSS.escape(spot.key)}"] .fm-cell__select`)
                ?.focus();
        }
    };
    const handleKeyDown = (spot: Spot) => {
        return (event: KeyboardEvent<HTMLButtonElement>) => {
            const target = moveFrom(spots, spot, event.key);
            if (target) {
                event.preventDefault();
                select(target, true);
            }
        };
    };

    return (
        <div ref={rootRef} className="fm" data-mode={mode}>
            {/* Luminance → one hue: onion layers (Figma orange, story blue) and the amplified difference. */}
            <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
                <filter id="fm-tint-figma" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="matrix" values={tint([1, 0.54, 0.24], 1.1)} />
                </filter>
                <filter id="fm-tint-story" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="matrix" values={tint([0.3, 0.64, 1], 1.1)} />
                </filter>
                <filter id="fm-amplify" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="matrix" values={tint([1, 0.54, 0.24], 4)} />
                </filter>
            </svg>
            <style href="amber-figma-matrix" precedence="default">
                {MATRIX_CSS}
            </style>
            <Header
                context={context}
                largest={largest}
                mode={mode}
                run={run}
                cells={cells}
                filter={filter}
                onFilter={setFilter}
            />
            {models.map((model, blockIndex) => {
                const { block, entry } = model;
                if (!entry) {
                    return (
                        <p key={block.set}>
                            Figma set {block.title ?? block.set} not synced yet. Run <code>{COPY_COMMAND}</code> (needs
                            FIGMA_TOKEN in .env.local).
                        </p>
                    );
                }
                const { stacked, style, minWidth } = rulesFor(entry, mode);
                const blockCells = [...model.results.values()];
                const blockCounts = countTones(blockCells);
                const title = block.title ?? entry.manifest.source.name;

                return (
                    <section key={`${block.set}|${blockIndex}`} data-figma-block={block.set} className="fm-block">
                        <header className="fm-block__head">
                            <h2>{title}</h2>
                            <a href={block.set} target="_blank" rel="noreferrer">
                                Open in Figma <span aria-hidden="true">↗</span>
                            </a>
                            {hasRun && (
                                <span className="fm-score" data-tone={blockCounts.differ ? 'differ' : 'match'}>
                                    {blockCounts.match + blockCounts.approved}/
                                    {blockCounts.match + blockCounts.approved + blockCounts.differ}
                                </span>
                            )}
                        </header>
                        {model.sections.map((section) => {
                            const rowHeaders = section.rows.some((row) => {
                                return row.label !== '';
                            });
                            const labelW = rowHeaders
                                ? labelWidth(
                                      section.rows.map((row) => {
                                          return row.label;
                                      })
                                  )
                                : 0;
                            const gridStyle = {
                                ...style,
                                '--fm-grid-min': `${labelW + section.columns.length * (minWidth + 8) + 8}px`,
                            } as CSSProperties;

                            return (
                                <div key={section.title ?? 'all'} className="fm-section">
                                    {section.title && <h3>{section.title}</h3>}
                                    {/* With a run (dev only) the grid fills the width and scrolls in its own box;
                                        without one (Vitest) it keeps whole-pixel, content-sized columns. */}
                                    <div className="fm-scroll fm-scrollbar" data-fluid={hasRun || undefined}>
                                        <table className="fm-grid" style={gridStyle} data-fluid={hasRun || undefined}>
                                            <caption className="fm-sr">
                                                {[title, section.title].filter(Boolean).join(', ')}
                                            </caption>
                                            {hasRun && (
                                                <colgroup>
                                                    {rowHeaders && <col style={{ width: labelW }} />}
                                                    {section.columns.map((column) => {
                                                        return <col key={column} />;
                                                    })}
                                                </colgroup>
                                            )}
                                            <thead>
                                                <tr>
                                                    {rowHeaders && (
                                                        <th scope="col">
                                                            <span className="fm-sr">Variant</span>
                                                        </th>
                                                    )}
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
                                                            {row.cells.map((variant, column) => {
                                                                if (!variant) {
                                                                    return (
                                                                        <td key={`empty-${section.columns[column]}`} />
                                                                    );
                                                                }
                                                                const key = cellKey(blockIndex, variant.id);
                                                                const spot = spots.find((candidate) => {
                                                                    return candidate.key === key;
                                                                });
                                                                const result = spot?.result;
                                                                const tone = result ? cellTone(result) : undefined;
                                                                const level = result ? cellLevel(result) : null;
                                                                const isSelected = hasRun && selected?.key === key;
                                                                const label = [row.label, section.columns[column]]
                                                                    .filter(Boolean)
                                                                    .join(' · ');
                                                                const content = block.renderCell(variant);
                                                                const zoomable =
                                                                    content !== null &&
                                                                    (mode === 'onion' || mode === 'difference');
                                                                const levelText = level
                                                                    ? `, ${LEVELS[level]} mismatch`
                                                                    : '';

                                                                return (
                                                                    <td key={variant.id}>
                                                                        <div
                                                                            className="fm-cell"
                                                                            data-fm-key={key}
                                                                            data-tone={tone}
                                                                            data-level={level ?? undefined}
                                                                            data-selected={isSelected || undefined}
                                                                            data-dim={
                                                                                (tone && !inFilter(tone, filter)) ||
                                                                                undefined
                                                                            }
                                                                        >
                                                                            <div
                                                                                className="fm-cell__body"
                                                                                inert={hasRun}
                                                                            >
                                                                                <CellBody
                                                                                    variant={variant}
                                                                                    content={content}
                                                                                    png={entry.pngUrl(variant)}
                                                                                    mode={mode}
                                                                                    stacked={stacked}
                                                                                    result={result}
                                                                                />
                                                                            </div>
                                                                            {result && tone && (
                                                                                <span
                                                                                    className="fm-cell__metric"
                                                                                    aria-hidden="true"
                                                                                >
                                                                                    {TONES[tone].icon}{' '}
                                                                                    {cellMetric(result)}
                                                                                    {level && (
                                                                                        <>
                                                                                            {' '}
                                                                                            <LevelPips level={level} />
                                                                                        </>
                                                                                    )}
                                                                                </span>
                                                                            )}
                                                                            {zoomable && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="fm-cell__zoom"
                                                                                    tabIndex={
                                                                                        !hasRun || isSelected ? 0 : -1
                                                                                    }
                                                                                    aria-label={`Enlarge ${label || variant.name}`}
                                                                                    title="Enlarge"
                                                                                    onClick={() => {
                                                                                        if (spot && hasRun) {
                                                                                            select(spot, false);
                                                                                        }
                                                                                        setZoomed({
                                                                                            key,
                                                                                            label: `${title} · ${label || variant.name}`,
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    <svg
                                                                                        width="12"
                                                                                        height="12"
                                                                                        viewBox="0 0 24 24"
                                                                                        fill="none"
                                                                                        stroke="currentColor"
                                                                                        strokeWidth="2"
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        aria-hidden="true"
                                                                                    >
                                                                                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                                                                    </svg>
                                                                                </button>
                                                                            )}
                                                                            {result && tone && spot && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="fm-cell__select"
                                                                                    tabIndex={isSelected ? 0 : -1}
                                                                                    aria-pressed={isSelected}
                                                                                    aria-label={`${label || variant.name}: ${TONES[tone].label}${levelText}, ${cellMetric(result)}. Show in the Figma diff panel`}
                                                                                    title={
                                                                                        cellConclusion(result) ??
                                                                                        TONES[tone].label
                                                                                    }
                                                                                    onClick={() => {
                                                                                        select(spot, false);
                                                                                    }}
                                                                                    onKeyDown={handleKeyDown(spot)}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                );
            })}
            {zoomedSpot && zoomedEntry && zoomed && (
                <ZoomDialog
                    key={zoomed.key}
                    title={zoomed.label}
                    variant={zoomedSpot.variant}
                    content={models[zoomedSpot.blockIndex].block.renderCell(zoomedSpot.variant)}
                    png={zoomedEntry.pngUrl(zoomedSpot.variant)}
                    mode={mode}
                    result={zoomedSpot.result}
                    onClose={() => {
                        setZoomed(null);
                    }}
                />
            )}
        </div>
    );
}

const MATRIX_CSS = `
/* Every rule targets the matrix's own chrome (header, labels, cell frame), never the measured component inside
   [data-figma-variant]: no inherited font, colour or box-sizing, no transitions on its buttons, no focus styles. */
.fm {
    --fm-ink: #f4f4f2; --fm-muted: #a1a1aa; --fm-faint: #8a8a94; --fm-line: #1f1f23; --fm-line-2: #26262b; --fm-line-3: #34343a;
    --fm-surface: #111113; --fm-raised: #18181b;
    --fm-match: #3dd68c; --fm-differ: #ff7a4d; --fm-approved: #c9c0ff; --fm-approved-bar: #b3a6ff; --fm-nocode: #8a8a94;
    --fm-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    --fm-display: 'Inter Tight', 'Inter', ui-sans-serif, system-ui, sans-serif;
    --fm-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --fm-ground: var(--color-surface-ground, #0a0a0b);
    width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 22px; padding: 0 40px 48px;
}
/* Thin, dark scrollbars: the page's and every scroller of the matrix. */
:root:has(.fm) { scrollbar-width: thin; scrollbar-color: var(--fm-line-3, #34343a) transparent; }
.fm-scrollbar { scrollbar-width: thin; scrollbar-color: var(--fm-line-3) transparent; }
@media (hover: hover) { .fm-scrollbar:hover { scrollbar-color: #55555b transparent; } }
.fm-head, .fm-block__head, .fm-section > h3, .fm-grid > caption, .fm-grid > thead th, .fm-grid > tbody > tr > th, .fm-cell__metric, .fm-pane__label, .fm-block > p {
    color: var(--fm-ink); font-size: 13px; line-height: 1.5;
}
.fm-head *, .fm-head *::before, .fm-head *::after, .fm-block__head *, .fm-cell, .fm-pane, .fm-panes, .fm-cell__select { box-sizing: border-box; }
.fm-head h1, .fm-head p, .fm-block__head h2, .fm-section > h3 { margin: 0; }
.fm-head a, .fm-block__head a { color: var(--fm-muted); font-size: 12px; text-decoration: none; }
.fm-head a:hover, .fm-block__head a:hover { color: var(--fm-ink); }
.fm-head :focus-visible, .fm-block__head :focus-visible { outline: 2px solid var(--fm-ink); outline-offset: 2px; }
.fm-muted { color: var(--fm-faint); }
.fm-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.fm-eyebrow { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fm-faint); }
.fm [data-tone='match'] { --fm-tone: var(--fm-match); --fm-tone-bg: rgb(61 214 140 / 0.12); --fm-tone-line: var(--fm-line-2); }
.fm [data-tone='differ'], .fm [data-tone='error'] { --fm-tone: var(--fm-differ); --fm-tone-bg: rgb(255 122 77 / 0.12); --fm-tone-line: rgb(255 122 77 / 0.5); }
.fm [data-tone='approved'] { --fm-tone: var(--fm-approved); --fm-tone-bg: rgb(179 166 255 / 0.12); --fm-tone-line: rgb(179 166 255 / 0.6); }
.fm [data-tone='nocode'] { --fm-tone: var(--fm-nocode); --fm-tone-bg: var(--fm-raised); --fm-tone-line: #3a3a40; }
.fm [data-tone][data-empty] { --fm-tone: var(--fm-faint); --fm-tone-bg: var(--fm-raised); }

/* Motion (chrome only): press 120ms, colour 150ms, filter fade 200ms, bar grows once; off with reduced motion. */
.fm-seg > button, .fm-cmd { font-family: inherit; transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 120ms var(--fm-ease-out); }
.fm-seg > button:active, .fm-cmd:active { transform: scale(0.97); }
.fm-pop { display: inline-block; animation: fm-pop 150ms var(--fm-ease-out); }
@keyframes fm-pop { from { opacity: 0; transform: scale(0.97); } }
.fm-grow { transform-origin: left center; animation: fm-grow 500ms var(--fm-ease-out) both; }
@keyframes fm-grow { from { transform: scaleX(0); } }

/* Header */
/* Sticky only in Storybook dev (a run was looked up): in Vitest it would cover cells being screenshotted. */
.fm-head[data-sticky] { position: sticky; top: 0; z-index: 10; }
.fm-head { display: flex; flex-direction: column; gap: 16px; margin: 0 -40px; padding: 24px 40px 14px;
    background: var(--fm-ground); border-bottom: 1px solid var(--fm-line); }
.fm-head__top { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px; }
.fm-head__title { display: flex; flex-direction: column; gap: 8px; }
.fm-head__meta { display: flex; align-items: center; gap: 14px; font-size: 12px; color: var(--fm-faint); }
.fm-tag { font: 11px var(--fm-mono); color: var(--fm-faint); }
.fm-head h1 { font: 600 32px/1 var(--fm-display); letter-spacing: -0.02em; }
.fm-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; padding: 16px 18px; border-radius: 16px; background: var(--fm-surface); }
.fm-summary__score { flex: 1 1 320px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.fm-headline { font: 600 18px/1.25 var(--fm-display); letter-spacing: -0.01em; }
.fm-headline span { color: var(--fm-faint); }
.fm-bar { display: flex; gap: 3px; height: 8px; border-radius: 999px; overflow: hidden; }
.fm-bar > div { min-width: 2px; }
.fm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.fm-chip { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 999px; font-size: 12px;
    white-space: nowrap; background: var(--fm-tone-bg); color: var(--fm-tone); }
.fm-norun { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; padding: 16px 18px; border-radius: 16px; border: 1px dashed var(--fm-line-3); }
.fm-norun > div { flex: 1 1 260px; display: flex; flex-direction: column; gap: 4px; }
.fm-cmd { display: inline-flex; align-items: center; gap: 10px; height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--fm-line-2);
    background: #0d0d0f; color: #e4e4e7; font: 12px var(--fm-mono); cursor: pointer; }
.fm-cmd > span:first-child { color: var(--fm-faint); }
.fm-cmd__hint { font: 11px system-ui, sans-serif; color: var(--fm-faint); }
.fm-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 20px; }
.fm-toolbar__mode { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.fm-hint { font-size: 12px; max-width: 520px; }
.fm-seg { display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 3px; border: 1px solid var(--fm-line-2); border-radius: 999px; }
.fm-seg > button { height: 28px; padding: 0 12px; border: 0; border-radius: 999px; background: transparent; color: var(--fm-muted); font-size: 12px; cursor: pointer; }
.fm-seg > button[aria-pressed='true'] { background: var(--fm-ink); color: #0a0a0b; }
.fm-seg__n { font-family: var(--fm-mono); opacity: 0.7; }

/* Set */
.fm-block { display: flex; flex-direction: column; gap: 14px; padding-top: 22px; border-top: 1px solid var(--fm-line); }
.fm-block__head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; }
.fm-block__head h2 { font: 600 18px var(--fm-display); letter-spacing: -0.01em; }
.fm-score { font: 11px var(--fm-mono); color: var(--fm-tone); }
.fm-section { display: flex; flex-direction: column; gap: 6px; }
.fm-section > h3 { font-size: 12px; font-weight: 600; color: #c9c9cf; }
/* No scroller around the grid: Chrome rasterises a scroller's content on device pixels, which shifts the measured
   capture by a sub-pixel. Wide grids scroll with the page. */
.fm-scroll { width: max-content; }
.fm-grid { border-collapse: separate; border-spacing: 8px; margin-left: -8px; }
/* Fluid (with a run): full width, equal columns, own horizontal scroller below the minimum. */
.fm-scroll[data-fluid] { width: calc(100% + 16px); margin: 0 -8px; overflow-x: auto; }
.fm-grid[data-fluid] { width: 100%; min-width: var(--fm-grid-min); margin-left: 0; table-layout: fixed; }
.fm-grid th { font-size: 11px; font-weight: 400; color: var(--fm-faint); text-align: center; white-space: nowrap; vertical-align: bottom; }
.fm-grid th[scope='row'] { max-width: 240px; padding-right: 8px; font-size: 12px; line-height: 1.4; color: var(--fm-muted); text-align: left; white-space: normal; vertical-align: middle; }
.fm-grid td { min-width: var(--fm-min); padding: 0; vertical-align: top; }

/* Cell: status on the wrapper; panes keep the kit's own ground (what the test screenshots). */
.fm-cell { position: relative; display: flex; flex-direction: column; gap: 6px; height: 100%; padding: 6px; border-radius: 12px; scroll-margin: 170px 8px 8px;
    border: 1px solid var(--fm-tone-line, transparent); transition: opacity 200ms ease, border-color 150ms ease, box-shadow 150ms ease; }
.fm-cell[data-tone='differ'], .fm-cell[data-tone='error'] { background: rgb(255 122 77 / 0.06); }
.fm-cell[data-tone='approved'] { border-style: dashed; background: rgb(179 166 255 / 0.05); }
.fm-cell[data-tone='nocode'] { border-style: dashed; }
/* Mismatch level: the same hue, stronger frame and wash per level; pips under the cell say which. */
.fm-cell[data-level='1'] { --fm-tone-line: rgb(255 122 77 / 0.35); background: rgb(255 122 77 / 0.04); }
.fm-cell[data-level='2'] { --fm-tone-line: rgb(255 122 77 / 0.65); background: rgb(255 122 77 / 0.08); }
.fm-cell[data-level='3'] { --fm-tone-line: rgb(255 122 77 / 0.95); background: rgb(255 122 77 / 0.13); box-shadow: inset 0 0 0 1px rgb(255 122 77 / 0.4); }
.fm-level { display: inline-flex; gap: 2px; vertical-align: middle; }
.fm-level > i { width: 4px; height: 9px; border-radius: 1px; background: var(--fm-line-3); }
.fm-level[data-level='1'] > i:nth-child(-n + 1), .fm-level[data-level='2'] > i:nth-child(-n + 2), .fm-level[data-level='3'] > i { background: var(--fm-differ); }
.fm-cell[data-selected] { border: 1px solid var(--fm-ink); box-shadow: 0 0 0 4px rgb(244 244 242 / 0.14); }
.fm-cell[data-dim] { opacity: 0.22; }
.fm-cell:has(.fm-cell__select:focus-visible) { outline: 2px solid var(--fm-ink); outline-offset: 2px; }
.fm-cell__select { position: absolute; inset: 0; z-index: 2; width: 100%; height: 100%; padding: 0; border: 0; border-radius: inherit;
    background: transparent; cursor: pointer; }
.fm-cell__select:focus-visible { outline: none; }
@media (hover: hover) and (pointer: fine) { .fm-cell:not([data-selected]):has(.fm-cell__select:hover) { border-color: var(--fm-line-3); } }
.fm-cell__zoom { position: absolute; top: 4px; right: 4px; z-index: 3; display: grid; place-items: center; width: 24px; height: 24px; padding: 0;
    border: 1px solid var(--fm-line-3); border-radius: 8px; background: rgb(13 13 15 / 0.85); color: var(--fm-ink); cursor: zoom-in;
    opacity: 0; transition: opacity 150ms ease; }
.fm-cell:hover .fm-cell__zoom, .fm-cell[data-selected] .fm-cell__zoom, .fm-cell__zoom:focus-visible { opacity: 1; }
.fm-cell__zoom:focus-visible { outline: 2px solid var(--fm-ink); outline-offset: 1px; }
@media (hover: none) { .fm-cell__zoom { opacity: 1; } }
.fm-cell__metric { font: 11px var(--fm-mono); color: var(--fm-tone); text-align: center; white-space: nowrap; }
.fm-cell__body { display: flex; flex-direction: column; flex: 1; }
.fm-panes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; }
.fm-panes[data-stacked] { grid-template-columns: minmax(0, 1fr); }
.fm-pane { position: relative; display: flex; align-items: center; justify-content: center; min-height: var(--fm-pane); padding: 6px;
    border-radius: 8px; overflow: hidden; background: var(--color-surface-ground); }
.fm-panes .fm-pane { padding-top: 18px; }
.fm-pane__label { position: absolute; top: 3px; left: 6px; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fm-faint); }
.fm-pane--missing { opacity: 0.4; }
/* Off is what the test screenshots: the component on the page's own backdrop (the Figma ref is flattened on it), in
   a top-left flex item at a whole-pixel offset. Centring or inline baseline alignment puts it on half pixels and the
   capture comes out shifted. */
.fm-pane[data-mode='off'] { align-items: flex-start; justify-content: flex-start; min-height: 0; padding: 6px; border-radius: 0;
    overflow: visible; background: none; }
/* Onion: story tinted blue under Figma tinted orange, screened: overlap → near-white; drift → a single-hue edge. */
.fm-pane[data-mode='onion'] { isolation: isolate; }
.fm-pane[data-mode='onion'] .fm-specimen > :first-child { filter: url('#fm-tint-story'); outline: 1px dashed #4da3ff; }
/* Difference: each layer on the same ground, identical pixels cancel to black; the pane amplifies what is left. */
.fm-pane[data-mode='difference'] { background: #000; filter: url('#fm-amplify'); }
.fm-pane[data-mode='difference'] .fm-specimen { background: var(--color-surface-ground); box-shadow: 0 0 0 64px var(--color-surface-ground); }
.fm-overlay { position: absolute; top: 0; left: 0; pointer-events: none; }
.fm-overlay[data-mode='onion'] { mix-blend-mode: screen; filter: url('#fm-tint-figma'); }
.fm-overlay[data-mode='difference'] { inset: -64px; padding: 64px; background: var(--color-surface-ground); mix-blend-mode: difference; }
.fm-box { position: absolute; top: 0; left: 0; outline: 1px dashed white; }
/* Difference with a run: the run's "what differs" map (diff-map.ts), opaque over the cell, as in the panel and report. */
.fm-pane[data-mode='map'] { background: #000; }
.fm-overlay[data-mode='map'] { right: 0; bottom: 0; display: flex; align-items: flex-start; background: #000; }
.fm-overlay[data-mode='map'] canvas, .fm-overlay[data-mode='map'] img { display: block; flex: none; max-width: none; image-rendering: pixelated; }
.fm-overlay[data-mode='map'] span { align-self: center; padding: 0 4px; font-size: 10px; color: var(--fm-faint); white-space: nowrap; }

/* Zoom dialog */
/* margin: auto re-centres the modal in the viewport (the kit's preflight zeroes dialog margins). */
.fm-dialog { margin: auto; box-sizing: border-box; width: min(1100px, calc(100vw - 48px)); max-height: calc(100vh - 48px); padding: 0;
    border: 1px solid var(--fm-line-2); border-radius: 16px; background: #0d0d0f; flex-direction: column; overflow: hidden; }
.fm-dialog[open] { display: flex; }
.fm-dialog::backdrop { background: rgb(0 0 0 / 0.65); }
/* Font, colour and box-sizing on the chrome only: the component in the stage inherits the page's own, as in the grid,
   so it lays out the same and lines up with its Figma layer. */
.fm-dialog__head, .fm-dialog__hint, .fm-slider__tags { color: var(--fm-ink); font: 13px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; }
.fm-dialog__head *, .fm-dialog__head *::before, .fm-dialog__head *::after, .fm-dialog__stage, .fm-dialog__hint { box-sizing: border-box; }
.fm-dialog__head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px 20px; padding: 16px 18px;
    border-bottom: 1px solid var(--fm-line); }
.fm-dialog__title { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.fm-dialog__title h2 { margin: 0; font: 600 16px/1.3 var(--fm-display); }
.fm-dialog__title p { margin: 0; font-size: 12px; }
.fm-dialog__status { color: var(--fm-tone); font-weight: 600; }
.fm-dialog__tools { display: flex; align-items: center; gap: 10px; }
.fm-dialog__zoom-label { font: 11px var(--fm-mono); }
.fm-dialog__close { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 1px solid var(--fm-line-3); border-radius: 999px;
    background: transparent; color: var(--fm-ink); cursor: pointer; }
.fm-dialog button:focus-visible { outline: 2px solid var(--fm-ink); outline-offset: 2px; }
.fm-dialog__stage { flex: 1 1 auto; min-height: 0; overflow: auto; display: grid; place-items: center; padding: 32px;
    background-color: #0a0a0b; background-image: radial-gradient(#1f1f23 1px, transparent 1px); background-size: 16px 16px; }
.fm-dialog__zoom .fm-pane, .fm-dialog__zoom .fm-panes { border-radius: 4px; }
/* Slider: the frame is exactly the specimen's box, so the handle's % and the Figma clip's % line up. */
.fm-slider { display: flex; flex-direction: column; gap: 8px; }
.fm-slider__tags { display: flex; justify-content: space-between; gap: 16px; font: 600 11px var(--fm-mono); letter-spacing: 0.04em; text-transform: uppercase; }
.fm-slider__tags > [data-side='figma'] { color: var(--fm-differ); }
.fm-slider__tags > [data-side='story'] { color: #6cb6ff; }
.fm-slider__frame { position: relative; display: inline-block; align-self: center; outline: 1px dashed var(--fm-line-3); outline-offset: 4px; }
.fm-pane[data-mode='slider'] { display: block; min-height: 0; padding: 0; border-radius: 0; overflow: visible; }
/* Box = the specimen's box (same as the handle's frame), so the cut and the handle share one %; the PNG may overhang. */
.fm-overlay[data-mode='slider'] { right: 0; bottom: 0; clip-path: inset(-100vh calc(100% - var(--fm-pos)) -100vh -100vw); }
.fm-slider__divider { position: absolute; top: -10px; bottom: -10px; left: var(--fm-pos); width: 2px; margin-left: -1px; background: var(--fm-ink);
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.5); pointer-events: none; }
.fm-slider__divider > span { position: absolute; top: 50%; left: 50%; width: 18px; height: 18px; border-radius: 999px; background: var(--fm-ink);
    box-shadow: 0 0 0 2px rgb(0 0 0 / 0.5); transform: translate(-50%, -50%); }
.fm-slider__input { position: absolute; inset: -10px 0; width: 100%; height: calc(100% + 20px); margin: 0; opacity: 0; cursor: ew-resize; }
.fm-slider__frame:has(.fm-slider__input:focus-visible) .fm-slider__divider > span { outline: 2px solid #6cb6ff; outline-offset: 2px; }
.fm-dialog__hint { margin: 0; padding: 10px 18px; border-top: 1px solid var(--fm-line); font-size: 12px; }

@media (prefers-reduced-motion: reduce) {
    .fm-head *, .fm-cell, .fm-cell__zoom, .fm-grow, .fm-pop { animation: none !important; transition: none !important; }
}
`;
