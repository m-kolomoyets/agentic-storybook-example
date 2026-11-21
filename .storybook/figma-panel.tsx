/** @jsxRuntime classic */
// Manager esbuild compiles JSX as classic `React.createElement`; the pragma makes TypeScript agree (React in scope).
// "Figma diff" addon panel for FigmaMatrix stories (visual/FIGMA-TESTING.md). The story is the matrix: its header holds
// the score, the overlay switch and the filter, and its cells are selectable. This panel shows the selected cell only:
// its parameters, pixel and property verdicts, the Figma / story / "what differs" images (click for full size), why it
// fails, the basic a11y of its live render (measured by the story) and a fix prompt; ← → step the selection in the
// story too (selection.ts). Results come from the dev-only `/__visual` route (visual/figma/serve.ts). Shown only for
// stories with `parameters.figmaMatrix`. Content and classes are shared with the report page: visual/figma/view.ts
// (model) and theme.ts (styles).
import type { A11yRow, FigmaSelect, FigmaSelection } from '../visual/figma/selection.ts';
import type { FigmaStoryResult } from '../visual/figma/types.ts';
import type { InspectorTile, MatrixEntry } from '../visual/figma/view.ts';
import React, { Suspense, useEffect, useId, useRef, useState } from 'react';
import {
    QueryClient,
    QueryClientProvider,
    useIsFetching,
    useQuery,
    useQueryClient,
    useSuspenseQuery,
} from '@tanstack/react-query';
import { AddonPanel } from 'storybook/internal/components';
import { addons, types, useChannel, useStorybookState } from 'storybook/manager-api';
import { diffMapSummary, loadDiffMap, paintDiffMap } from '../visual/figma/diff-map.ts';
import { contrastText, DELTA_HELP } from '../visual/figma/issues.ts';
import { openLightbox } from '../visual/figma/lightbox.ts';
import { figmaResultKeys, figmaResultOptions, fileUrl } from '../visual/figma/results.ts';
import { FIGMA_SELECT_EVENT, FIGMA_SELECTION_EVENT, FIGMA_SELECTION_REQUEST_EVENT } from '../visual/figma/selection.ts';
import { FIGMA_UI_CSS } from '../visual/figma/theme.ts';
import { FIGMA_RESULTS_DIR, VISUAL_URL_PREFIX } from '../visual/figma/types.ts';
import {
    cellKey,
    COPY_COMMAND,
    inspectorTiles,
    inspectorView,
    isFailing,
    matrixView,
    ranText,
    TONES,
} from '../visual/figma/view.ts';

/** Δ legend above the issue groups; ⓘ opens a native popover (Escape, outside click close). Same as the report. */
function DeltaHelp() {
    const id = useId();

    return (
        <div className="fx-legend">
            <span>{DELTA_HELP.legend}</span>
            <button type="button" className="fx-legend__btn" popoverTarget={id} aria-label={DELTA_HELP.button}>
                <span aria-hidden="true">i</span>
            </button>
            <div id={id} popover="auto" role="note" className="fx-popover">
                <strong>{DELTA_HELP.title}</strong>
                <ul>
                    {DELTA_HELP.lines.map((line) => {
                        return <li key={line}>{line}</li>;
                    })}
                </ul>
            </div>
        </div>
    );
}

const ADDON_ID = 'amber/figma-diff';
const REPORT_URL = `/${VISUAL_URL_PREFIX}/${FIGMA_RESULTS_DIR}/index.html`;

// The panel scrolls itself. Its body is an inline-size container: one column on the right, two or three at the bottom.
const PANEL_CSS = `
.fx-panel { height: 100%; overflow: auto; display: flex; flex-direction: column; }
.fx-detail__nav { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 14px;
    padding: 10px 20px; border-bottom: 1px solid var(--line); font-size: 12px; color: var(--faint); }
.fx-detail__nav > div { display: flex; align-items: center; gap: 10px; }
.fx-detail__body { container: fx-detail / inline-size; flex: 1 0 auto; }
.fx-detail__cols { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px 24px; padding: 16px 20px 24px; }
.fx-detail__cols > div { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
@container fx-detail (min-width: 680px) {
    .fx-detail__cols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .fx-detail__cols > div:last-child { grid-column: 1 / -1; }
}
@container fx-detail (min-width: 1080px) {
    .fx-detail__cols { grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, 1fr); }
    .fx-detail__cols > div:last-child { grid-column: auto; }
}
.fx-params { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.fx-params li { padding: 2px 8px; border-radius: 6px; border: 1px solid var(--line-2); font: 11px var(--mono); color: var(--muted); }
.fx-params li span { color: var(--faint); }
.fx-a11y { display: flex; flex-direction: column; gap: 8px; }
.fx-a11y > h4 { font: 600 12px var(--text); letter-spacing: 0; }
.fx-a11y > h4 span { font-weight: 400; color: var(--faint); }
.fx-a11y dl { margin: 0; border: 1px solid var(--line-2); border-radius: 12px; overflow: hidden; }
.fx-a11y dl > div { display: grid; grid-template-columns: 130px minmax(0, 1fr) 20px; gap: 10px; align-items: baseline; padding: 8px 12px; font-size: 12px; }
.fx-a11y dl > div + div { border-top: 1px solid var(--line); }
.fx-a11y dt { color: var(--muted); }
.fx-a11y dd { margin: 0; font-family: var(--mono); overflow-wrap: anywhere; }
.fx-a11y dd span { font-family: var(--text); color: var(--faint); }
.fx-a11y [data-pass='true'] { color: var(--match); }
.fx-a11y [data-pass='false'] { color: var(--differ); }
.fx-detail__foot { position: sticky; bottom: 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px;
    padding: 10px 20px; border-top: 1px solid var(--line); background: #0b0b0d; }
.fx-detail__foot > div { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--faint); }
`;

// Manager is its own React root (Storybook's bundled React 18), separate from the app's `queryClient` (which pulls
// in app UI for toasts). Results change only when `pnpm vrt figma` runs, so data stays fresh until Reload.
const panelQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false } },
});

/** `copied` names the last copied button for 1.6s, so its label can read "Copied ✓". */
function useCopy() {
    const [copied, setCopied] = useState<string | null>(null);
    useEffect(
        function resetCopied() {
            if (!copied) {
                return undefined;
            }
            const timer = setTimeout(() => {
                setCopied(null);
            }, 1600);

            return () => {
                clearTimeout(timer);
            };
        },
        [copied]
    );
    const copy = (tag: string, text: string) => {
        void navigator.clipboard?.writeText(text);
        setCopied(tag);
    };

    return { copied, copy };
}

/** Label that swaps to "Copied ✓" with the 150ms pop. */
function CopyLabel({ done, idle }: { done: boolean; idle: string }) {
    return (
        <span key={done ? 'done' : 'idle'} className={done ? 'fx-pop' : undefined}>
            {done ? 'Copied ✓' : idle}
        </span>
    );
}

function CommandButton({ done, onCopy }: { done: boolean; onCopy: () => void }) {
    return (
        <button type="button" className="fx-cmd" onClick={onCopy}>
            <span aria-hidden="true">$</span> {COPY_COMMAND}
            <span className="fx-cmd__hint">
                <CopyLabel done={done} idle="copy" />
            </span>
        </button>
    );
}

function ReloadButton({ busy, onReload }: { busy: boolean; onReload: () => void }) {
    return (
        <button type="button" className="fx-btn" disabled={busy} aria-busy={busy} onClick={onReload}>
            <svg
                className={busy ? 'fx-spin' : undefined}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                <path d="M21 3v5h-5" />
            </svg>
            {busy ? 'Reloading…' : 'Reload'}
        </button>
    );
}

function Footer({ ranAt, reloading, onReload }: { ranAt: string | null; reloading: boolean; onReload: () => void }) {
    const { copied, copy } = useCopy();

    return (
        <div className="fx-detail__foot">
            <CommandButton
                done={copied === 'cmd'}
                onCopy={() => {
                    copy('cmd', COPY_COMMAND);
                }}
            />
            <div>
                {ranAt && <span>ran {ranText(ranAt)}</span>}
                <ReloadButton busy={reloading} onReload={onReload} />
            </div>
        </div>
    );
}

/** The explained difference for one cell (diff-map.ts); cached per image pair and run. */
function useDiffMap(explain: InspectorTile['explain'], version: number) {
    return useQuery({
        queryKey: ['figma-diff-map', explain?.reference, explain?.actual, version],
        queryFn: () => {
            return explain ? loadDiffMap(fileUrl(explain.reference, version), fileUrl(explain.actual, version)) : null;
        },
        enabled: explain !== null,
    });
}

/** A tile's picture: the image, the "what differs" map (or the raw comparator diff), or why there is none. */
function TilePicture({ tile, version }: { tile: InspectorTile; version: number }) {
    const { data: map, isPending } = useDiffMap(tile.diff ? tile.explain : null, version);
    if (!tile.src) {
        return <span>{tile.message}</span>;
    }
    if (tile.diff && map) {
        return (
            <canvas
                role="img"
                aria-label={`What differs: ${diffMapSummary(map)}`}
                ref={(canvas) => {
                    if (canvas) {
                        paintDiffMap(canvas, map);
                    }
                }}
            />
        );
    }
    if (tile.diff && isPending && tile.explain) {
        return <span>reading pixels…</span>;
    }

    return <img src={fileUrl(tile.src, version)} alt="" />;
}

function DiffSummary({ tile, version }: { tile: InspectorTile | undefined; version: number }) {
    const { data: map } = useDiffMap(tile?.explain ?? null, version);
    if (!map) {
        return null;
    }

    return (
        <p className="fx-diffmap">
            <span className="fx-diffmap__key" aria-hidden="true">
                <i data-class="colour" />
                <i data-class="figma" />
                <i data-class="story" />
            </span>
            {diffMapSummary(map)}
        </p>
    );
}

/** Shows a prompt in an editable textarea; Copy takes the edited text. */
function PromptDialog({ title, prompt, onClose }: { title: string; prompt: string; onClose: () => void }) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [text, setText] = useState(prompt);
    const { copied, copy } = useCopy();
    useEffect(function openModal() {
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) {
            dialog.showModal();
            const textarea = dialog.querySelector('textarea');
            textarea?.focus();
            textarea?.setSelectionRange(0, 0);
        }
    }, []);

    return (
        <dialog ref={dialogRef} className="fx fx-prompt" aria-labelledby="fx-prompt-title" onClose={onClose}>
            <div className="fx-prompt__head">
                <h2 id="fx-prompt-title">{title}</h2>
                <button
                    type="button"
                    className="fx-btn"
                    onClick={() => {
                        dialogRef.current?.close();
                    }}
                >
                    Close
                </button>
            </div>
            <textarea
                aria-label={title}
                spellCheck={false}
                value={text}
                onChange={(event) => {
                    setText(event.target.value);
                }}
            />
            <div className="fx-prompt__foot">
                <span>Edit the prompt if needed, then copy it.</span>
                <div className="fx-row" style={{ gap: 8 }}>
                    <button
                        type="button"
                        className="fx-btn"
                        disabled={text === prompt}
                        onClick={() => {
                            setText(prompt);
                        }}
                    >
                        Reset
                    </button>
                    <button
                        type="button"
                        className="fx-btn fx-btn--primary"
                        onClick={() => {
                            copy('prompt', text);
                        }}
                    >
                        <CopyLabel done={copied === 'prompt'} idle="Copy" />
                    </button>
                </div>
            </div>
        </dialog>
    );
}

function passLabel(pass: boolean | null): string {
    if (pass === null) {
        return 'Not judged';
    }

    return pass ? 'Passes' : 'Fails';
}

function A11ySection({ rows }: { rows: A11yRow[] | null | undefined }) {
    return (
        <section className="fx-a11y">
            <h4>
                Accessibility <span>· live render</span>
            </h4>
            {rows === undefined && <p className="fx-muted">Measuring the story render…</p>}
            {rows === null && <p className="fx-muted">Open the story canvas to measure this cell.</p>}
            {rows && (
                <dl>
                    {rows.map((row) => {
                        let mark = '';
                        if (row.pass !== null) {
                            mark = row.pass ? '✓' : '✕';
                        }

                        return (
                            <div key={row.label}>
                                <dt>{row.label}</dt>
                                <dd>
                                    {row.value} {row.note && <span>{row.note}</span>}
                                </dd>
                                <span
                                    role="img"
                                    data-pass={row.pass === null ? undefined : String(row.pass)}
                                    aria-label={passLabel(row.pass)}
                                >
                                    {mark}
                                </span>
                            </div>
                        );
                    })}
                </dl>
            )}
        </section>
    );
}

function Detail({
    story,
    entries,
    index,
    version,
    a11y,
    onStep,
}: {
    story: FigmaStoryResult;
    entries: MatrixEntry[];
    index: number;
    version: number;
    a11y: A11yRow[] | null | undefined;
    onStep: (by: number) => void;
}) {
    const { copied, copy } = useCopy();
    const [prompt, setPrompt] = useState<string | null>(null);
    const entry = entries[index];
    if (!entry) {
        return null;
    }
    const view = inspectorView(story, entry);
    const tiles = inspectorTiles(entry.cell);
    const tone = TONES[view.tone];

    return (
        <>
            <div className="fx-detail__nav">
                <span>{view.place}</span>
                <div>
                    <button
                        type="button"
                        className="fx-icon-btn"
                        aria-label="Previous cell"
                        onClick={() => {
                            onStep(-1);
                        }}
                    >
                        ←
                    </button>
                    <span className="fx-inspector__pos" aria-live="polite">
                        {index + 1} / {entries.length}
                    </span>
                    <button
                        type="button"
                        className="fx-icon-btn"
                        aria-label="Next cell"
                        onClick={() => {
                            onStep(1);
                        }}
                    >
                        →
                    </button>
                    <a className="fx-link" href={`${REPORT_URL}#cmp-${story.storyId}`} target="_blank" rel="noreferrer">
                        Full report ↗
                    </a>
                </div>
            </div>
            <div className="fx-detail__body">
                <div className="fx-detail__cols">
                    <div>
                        <div className="fx-inspector__head">
                            <h3>{view.title}</h3>
                            <span className="fx-badge" data-tone={view.tone}>
                                <span aria-hidden="true">{tone.icon}</span> {tone.label}
                            </span>
                        </div>
                        <ul className="fx-params" aria-label="Variant parameters">
                            {Object.entries(entry.cell.variant.props).map(([name, value]) => {
                                return (
                                    <li key={name}>
                                        <span>{name}=</span>
                                        {value}
                                    </li>
                                );
                            })}
                        </ul>
                        <dl className="fx-stats">
                            <div>
                                <dt>pixels differ</dt>
                                <dd data-over={view.pixels.over || undefined}>{view.pixels.text}</dd>
                            </div>
                            <div>
                                <dt>allowed</dt>
                                <dd>{view.allowed}</dd>
                            </div>
                            <div>
                                <dt>properties differ</dt>
                                <dd data-over={view.properties.over || undefined}>{view.properties.text}</dd>
                            </div>
                        </dl>
                        <div className="fx-tiles" style={{ '--tiles': tiles.length } as React.CSSProperties}>
                            {tiles.map((tile) => {
                                return (
                                    <figure key={tile.caption} className="fx-tile">
                                        <button
                                            type="button"
                                            className="fx-tile__stage"
                                            data-diff={(tile.diff && tile.src !== null) || undefined}
                                            disabled={!tile.src}
                                            aria-label={tile.src ? `Open ${tile.caption} full size` : tile.caption}
                                            onClick={(event) => {
                                                const picture = event.currentTarget.querySelector('img, canvas');
                                                if (
                                                    picture instanceof HTMLImageElement ||
                                                    picture instanceof HTMLCanvasElement
                                                ) {
                                                    openLightbox(tile.caption, tile.diff, picture);
                                                }
                                            }}
                                        >
                                            <TilePicture tile={tile} version={version} />
                                        </button>
                                        <figcaption>{tile.caption}</figcaption>
                                    </figure>
                                );
                            })}
                        </div>
                        <DiffSummary
                            tile={tiles.find((tile) => {
                                return tile.diff;
                            })}
                            version={version}
                        />
                    </div>
                    <div>
                        {view.callout && (
                            <div className="fx-callout" data-kind={view.callout.kind}>
                                {view.callout.title && <strong>{view.callout.title}</strong>}
                                <span>{view.callout.text}</span>
                                {view.callout.kind === 'approved' && <pre className="fx-pre">{view.callout.code}</pre>}
                            </div>
                        )}
                        {view.groups.length > 0 && <DeltaHelp />}
                        {view.groups.map((group) => {
                            return (
                                <section key={group.title} className="fx-group">
                                    <h4>
                                        {group.title} <span>{group.issues.length}</span>
                                    </h4>
                                    {group.issues.map((issue) => {
                                        return (
                                            <div
                                                key={`${issue.element}·${issue.property}`}
                                                className="fx-issue"
                                                data-follower={issue.causedBy ? '' : undefined}
                                            >
                                                <div className="fx-issue__head">
                                                    <span>
                                                        {issue.element}{' '}
                                                        <span className="fx-mono">{issue.property}</span>
                                                    </span>
                                                    <span className="fx-mono">
                                                        <span className="fx-issue__delta">{issue.delta ?? '—'}</span> ·
                                                        allowed {issue.tolerance}
                                                    </span>
                                                </div>
                                                <div className="fx-issue__meta">
                                                    <span
                                                        className="fx-kind"
                                                        data-kind={issue.kind}
                                                        data-severity={issue.severity}
                                                    >
                                                        {issue.kindLabel}
                                                    </span>
                                                    {issue.selector && (
                                                        <code className="fx-mono">{issue.selector}</code>
                                                    )}
                                                    {issue.causedBy && (
                                                        <span className="fx-follows">
                                                            likely follows from {issue.causedBy}
                                                        </span>
                                                    )}
                                                    {contrastText(issue) && (
                                                        <span className="fx-contrast">{contrastText(issue)}</span>
                                                    )}
                                                </div>
                                                <dl className="fx-issue__sides">
                                                    {(
                                                        [
                                                            ['expected · figma', issue.expected],
                                                            ['received · story', issue.actual],
                                                        ] as const
                                                    ).map(([label, value]) => {
                                                        return (
                                                            <div key={label}>
                                                                <dt>{label}</dt>
                                                                <dd>
                                                                    <span className="fx-value">
                                                                        {value.swatch && (
                                                                            <span
                                                                                className="fx-swatch"
                                                                                aria-hidden="true"
                                                                                style={
                                                                                    {
                                                                                        '--swatch': value.swatch,
                                                                                    } as React.CSSProperties
                                                                                }
                                                                            />
                                                                        )}
                                                                        {value.text}
                                                                    </span>
                                                                    {value.note && (
                                                                        <span className="fx-note">{value.note}</span>
                                                                    )}
                                                                </dd>
                                                            </div>
                                                        );
                                                    })}
                                                </dl>
                                                {issue.drift && (
                                                    <div className="fx-issue__drift">
                                                        Figma value drift: both sides map to the same token, the Figma
                                                        variable value differs.
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </section>
                            );
                        })}
                        {view.ignored.length > 0 && (
                            <section className="fx-ignored">
                                <h4>Ignored {view.ignored.length} · from the story&apos;s ignore list</h4>
                                <ul>
                                    {view.ignored.map((text) => {
                                        return <li key={text}>{text}</li>;
                                    })}
                                </ul>
                            </section>
                        )}
                    </div>
                    <div>
                        {view.tone !== 'nocode' && <A11ySection rows={a11y} />}
                        {view.prompt && (
                            <section className="fx-fix">
                                <h4>Fix prompt</h4>
                                <pre className="fx-pre" tabIndex={0} aria-label="Fix prompt">
                                    {view.prompt}
                                </pre>
                                <div className="fx-row" style={{ gap: 8 }}>
                                    <button
                                        type="button"
                                        className="fx-btn fx-btn--primary"
                                        aria-haspopup="dialog"
                                        onClick={() => {
                                            setPrompt(view.prompt ?? '');
                                        }}
                                    >
                                        Copy fix prompt…
                                    </button>
                                    <button
                                        type="button"
                                        className="fx-btn"
                                        onClick={() => {
                                            copy('snippet', view.snippet);
                                        }}
                                    >
                                        <CopyLabel done={copied === 'snippet'} idle="Copy approval snippet" />
                                    </button>
                                    <a className="fx-link" href={entry.block.set.url} target="_blank" rel="noreferrer">
                                        Figma ↗
                                    </a>
                                </div>
                                <span className="fx-fix__note">
                                    The approval snippet goes into the story&apos;s approved list. Write the reason
                                    before committing.
                                </span>
                            </section>
                        )}
                    </div>
                </div>
            </div>
            {prompt !== null && (
                <PromptDialog
                    title="Fix prompt"
                    prompt={prompt}
                    onClose={() => {
                        setPrompt(null);
                    }}
                />
            )}
        </>
    );
}

/** `undefined` a11y: the story hasn't measured this cell yet. */
type PanelSelection = { key: string; a11y: A11yRow[] | null | undefined };

/** The selected cell follows the story; until the story answers, the first failing cell. */
function Results({
    result,
    version,
    reloading,
    onReload,
}: {
    result: FigmaStoryResult;
    version: number;
    reloading: boolean;
    onReload: () => void;
}) {
    const { storyId } = result;
    const [selection, setSelection] = useState<PanelSelection | null>(null);
    const emit = useChannel({
        [FIGMA_SELECTION_EVENT]: (incoming: FigmaSelection) => {
            if (incoming.storyId === storyId) {
                setSelection({ key: incoming.key, a11y: incoming.a11y });
            }
        },
    });
    useEffect(
        function requestSelection() {
            emit(FIGMA_SELECTION_REQUEST_EVENT, { storyId });
        },
        [emit, storyId]
    );
    const { entries } = matrixView(result.blocks);
    const keyOf = (entry: MatrixEntry) => {
        return cellKey(entry.blockIndex, entry.cell.variant.id);
    };
    const found = selection
        ? entries.findIndex((entry) => {
              return keyOf(entry) === selection.key;
          })
        : -1;
    const index =
        found >= 0
            ? found
            : Math.max(
                  0,
                  entries.findIndex((entry) => {
                      return isFailing(entry.cell);
                  })
              );
    const step = (by: number) => {
        const next = entries[(index + by + entries.length) % entries.length];
        if (!next) {
            return;
        }
        const select: FigmaSelect = { storyId, key: keyOf(next) };
        setSelection({ key: select.key, a11y: undefined });
        emit(FIGMA_SELECT_EVENT, select);
    };

    return (
        <>
            <Detail
                story={result}
                entries={entries}
                index={index}
                version={version}
                a11y={found >= 0 ? selection?.a11y : undefined}
                onStep={step}
            />
            <Footer ranAt={result.ranAt} reloading={reloading} onReload={onReload} />
        </>
    );
}

function Empty({ name, reloading, onReload }: { name: string; reloading: boolean; onReload: () => void }) {
    return (
        <>
            <div className="fx-empty" style={{ flex: '1 0 auto' }}>
                <div>
                    <h2>No results yet</h2>
                    <p>
                        There&apos;s no comparison for {name} in the last run. Run the command below, then Reload.
                        Selecting a cell in the story will show its detail here.
                    </p>
                </div>
            </div>
            <Footer ranAt={null} reloading={reloading} onReload={onReload} />
        </>
    );
}

function Loading() {
    return (
        <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '18px 20px 40px' }}>
            <span className="fx-muted">Loading results…</span>
            <div className="fx-skeleton fx-pulse" aria-hidden="true">
                <div style={{ width: 320, maxWidth: '100%' }} />
                <div style={{ width: 380, maxWidth: '100%', height: 26 }} />
                <div style={{ width: 720, maxWidth: '100%', height: 140 }} />
            </div>
        </div>
    );
}

function ResultView({ storyId, name }: { storyId: string; name: string }) {
    const queryClient = useQueryClient();
    const { data: result, dataUpdatedAt } = useSuspenseQuery(figmaResultOptions(storyId));
    const reloading = useIsFetching({ queryKey: figmaResultKeys.story(storyId) }) > 0;
    const reload = () => {
        void queryClient.invalidateQueries({ queryKey: figmaResultKeys.story(storyId) });
    };
    if (!result) {
        return <Empty name={name} reloading={reloading} onReload={reload} />;
    }

    // Images reuse the fetch time as cache-buster: new run → new image URLs.
    return <Results result={result} version={dataUpdatedAt} reloading={reloading} onReload={reload} />;
}

function FigmaDiffPanel() {
    const { storyId, index } = useStorybookState();
    const entry = index?.[storyId];
    const name = (entry && 'title' in entry ? entry.title.split('/').at(-1) : null) ?? 'this story';

    return (
        <div className="fx fx-panel">
            <style>{FIGMA_UI_CSS + PANEL_CSS}</style>
            <Suspense fallback={<Loading />}>
                <ResultView key={storyId} storyId={storyId} name={name} />
            </Suspense>
        </div>
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
