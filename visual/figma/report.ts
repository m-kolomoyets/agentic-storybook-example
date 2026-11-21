// Builds visual/.results/figma/index.html from the last `pnpm vrt figma` (visual/FIGMA-TESTING.md):
// - overview: the score, status counts, a per-component table, mismatches by category and pixel-only failures;
// - repeated issues: the same element, property and values failing across variants, each with a copyable prompt;
// - every FigmaMatrix story as the same variant matrix + sticky cell inspector as the Storybook "Figma diff" panel
//   (model: view.ts, styles: theme.ts); ← → step between cells;
// - kit coverage (catalog.json), approved deviations grouped by reason, and Figma variants with no code equivalent.
// Static: image paths are relative, so the page works from disk, as a CI artifact, and through Storybook's
// `/__visual` route. Design: claude.ai artifact "Figma Sync — Storybook addon & report" (Report, Matrix boards).
import type { FigmaCatalog, FigmaCellResult, FigmaIssue, FigmaStoryResult } from './types.ts';
import type { MatrixEntry } from './view.ts';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { diffMapSummary, explainDiff, loadDiffMap, paintDiffMap } from './diff-map.ts';
import { contrastText, DELTA_HELP, percent } from './issues.ts';
import { openLightbox } from './lightbox.ts';
import { parseFigmaUrl } from './sets.ts';
import { FIGMA_UI_CSS, FIGMA_UI_FONTS_HREF } from './theme.ts';
import { FIGMA_REFS_DIR, FIGMA_RESULTS_DIR } from './types.ts';
import {
    approvalSnippet,
    CATEGORIES,
    cellAria,
    cellMetric,
    cellTone,
    commonProps,
    comparable,
    COPY_COMMAND,
    countTones,
    headline,
    inspectorTiles,
    inspectorView,
    isDrift,
    isFailing,
    isPixelOnly,
    issueCategory,
    matrixView,
    ranText,
    storyFixPrompt,
    TONES,
} from './view.ts';

const STORYBOOK_URL = 'http://localhost:6006';
const VERIFY = `Verify: run \`${COPY_COMMAND}\` and open the report.`;
const TONE_ORDER = ['match', 'differ', 'approved', 'nocode'] as const;

type ToPage = (file: string) => string;

function esc(value: string | number): string {
    return String(value).replace(/[&<>"']/g, (char) => {
        return `&#${char.charCodeAt(0)};`;
    });
}

function shortTitle(result: FigmaStoryResult): string {
    return result.title.split('/').at(-1) ?? result.title;
}

function cellsOf(result: FigmaStoryResult): FigmaCellResult[] {
    return result.blocks.flatMap((block) => {
        return block.cells;
    });
}

function storyLink(storyId: string, label: string, className = 'fx-link'): string {
    const id = esc(storyId);

    return `<a class="${className} story-link" data-story="${id}" href="${STORYBOOK_URL}/?path=/story/${id}" target="_blank" rel="noreferrer">${esc(label)}</a>`;
}

/** A button whose label swaps to "Copied ✓" when clicked (SCRIPT). */
function copyButton(text: string, label: string, className: string, aria?: string): string {
    const ariaLabel = aria ? ` aria-label="${esc(aria)}"` : '';

    return `<button type="button" class="${className}" data-copy="${esc(text)}"${ariaLabel}><span data-label="${esc(label)}">${esc(label)}</span></button>`;
}

/** A button that opens the prompt dialog (PROMPT_DIALOG), where the prompt can be edited before copying. */
function promptButton(text: string, label: string, className: string, aria?: string): string {
    const ariaLabel = aria ? ` aria-label="${esc(aria)}"` : '';

    return `<button type="button" class="${className}" aria-haspopup="dialog" data-prompt="${esc(text)}"${ariaLabel}>${esc(label)}…</button>`;
}

function commandButton(): string {
    return `<button type="button" class="fx-cmd" data-copy="${COPY_COMMAND}"><span aria-hidden="true">$</span> ${COPY_COMMAND} <span class="fx-cmd__hint"><span data-label="copy">copy</span></span></button>`;
}

function seg(label: string, attr: string, options: [string, string, number | null][], value: string): string {
    const buttons = options
        .map(([id, text, count]) => {
            const n = count === null ? '' : `<span class="fx-seg__n"> ${count}</span>`;

            return `<button type="button" ${attr}="${id}" aria-pressed="${id === value}">${esc(text)}${n}</button>`;
        })
        .join('');

    return `<div class="fx-seg" role="group" aria-label="${esc(label)}">${buttons}</div>`;
}

function chips(cells: FigmaCellResult[]): string {
    const counts = countTones(cells);

    return TONE_ORDER.map((tone) => {
        const empty = tone !== 'match' && counts[tone] === 0 ? ' data-empty' : '';

        return `<span class="fx-chip" data-tone="${tone}"${empty}><span aria-hidden="true">${TONES[tone].icon}</span> ${counts[tone]} ${TONES[tone].label.toLowerCase()}</span>`;
    }).join('');
}

// ---------- Matrix (mirrors Matrix / Grid / Inspector in .storybook/figma-panel.tsx) ----------

function png(src: string, layer: string): string {
    return `<img srcset="${esc(src)} 2x" alt="" data-layer="${layer}" loading="lazy">`;
}

function thumbHtml(cell: FigmaCellResult, toPage: ToPage): string {
    const figma = toPage(cell.files.figma);
    if (!cell.files.actual) {
        return `<span class="fx-thumb">${png(figma, 'story figma diff swipe')}</span>`;
    }
    let diff = '<span class="fx-thumb__note" data-layer="diff">identical</span>';
    if (cell.files.diff) {
        // The same "what differs" map as the inspector and the Storybook panel (diff-map.ts), painted when the matrix
        // switches to Pixel diff; the raw comparator diff is its fallback.
        diff = `<canvas role="img" aria-label="What differs" data-layer="diff" data-explain-thumb data-reference="${esc(toPage(cell.files.reference))}" data-actual="${esc(toPage(cell.files.actual))}" hidden></canvas>${png(toPage(cell.files.diff), 'diff').replace('<img ', '<img data-explain-fallback hidden ')}`;
    } else if (cell.image.error) {
        diff = '<span class="fx-thumb__note fx-thumb__note--error" data-layer="diff">sizes differ</span>';
    }

    return `<span class="fx-thumb">${png(figma, 'figma swipe')}${png(toPage(cell.files.actual), 'story swipe-story')}${diff}<span class="fx-thumb__line" data-layer="swipe"></span></span>`;
}

function valueHtml(value: FigmaIssue['expected']): string {
    const swatch = value.swatch
        ? `<span class="fx-swatch" aria-hidden="true" style="--swatch: ${esc(value.swatch)}"></span>`
        : '';
    const note = value.note ? `<span class="fx-note">${esc(value.note)}</span>` : '';

    return `<span class="fx-value">${swatch}${esc(value.text)}</span>${note}`;
}

function inspectorHtml(result: FigmaStoryResult, entries: MatrixEntry[], index: number, toPage: ToPage): string {
    const entry = entries[index];
    if (!entry) {
        return '';
    }
    const view = inspectorView(result, entry);
    const tone = TONES[view.tone];
    const tiles = inspectorTiles(entry.cell)
        .map((tile) => {
            // Same as the panel's tiles: a button opening the full-size view (lightbox.ts) of what it shows.
            const open = (stage: string) => {
                return `<button type="button" class="fx-tile__stage"${tile.diff ? ' data-diff' : ''} data-lightbox="${esc(tile.caption)}" aria-label="${esc(`Open ${tile.caption} full size`)}">${stage}</button>`;
            };
            let stage = `<div class="fx-tile__stage"><span>${esc(tile.message ?? '')}</span></div>`;
            if (tile.explain && tile.src) {
                stage = open(
                    `<canvas role="img" aria-label="What differs" data-explain data-reference="${esc(toPage(tile.explain.reference))}" data-actual="${esc(toPage(tile.explain.actual))}"></canvas><img src="${esc(toPage(tile.src))}" alt="" data-explain-fallback hidden>`
                );
            } else if (tile.src) {
                stage = open(`<img src="${esc(toPage(tile.src))}" alt="">`);
            }

            return `<figure class="fx-tile">${stage}<figcaption>${esc(tile.caption)}</figcaption></figure>`;
        })
        .join('');
    let callout = '';
    if (view.callout) {
        const title = view.callout.title ? `<strong>${esc(view.callout.title)}</strong>` : '';
        const code = view.callout.kind === 'approved' ? `<pre class="fx-pre">${esc(view.callout.code)}</pre>` : '';
        callout = `<div class="fx-callout" data-kind="${view.callout.kind}">${title}<span>${esc(view.callout.text)}</span>${code}</div>`;
    }
    const groups = view.groups
        .map((group) => {
            const issues = group.issues
                .map((issue) => {
                    const drift = issue.drift
                        ? '<div class="fx-issue__drift">Figma value drift: both sides map to the same token, the Figma variable value differs.</div>'
                        : '';

                    const meta = `<div class="fx-issue__meta"><span class="fx-kind" data-kind="${esc(issue.kind)}" data-severity="${issue.severity}">${esc(issue.kindLabel)}</span>${issue.selector ? `<code class="fx-mono">${esc(issue.selector)}</code>` : ''}${issue.causedBy ? `<span class="fx-follows">likely follows from ${esc(issue.causedBy)}</span>` : ''}${contrastText(issue) ? `<span class="fx-contrast">${esc(contrastText(issue) ?? '')}</span>` : ''}</div>`;

                    return `<div class="fx-issue"${issue.causedBy ? ' data-follower' : ''}><div class="fx-issue__head"><span>${esc(issue.element)} <span class="fx-mono">${esc(issue.property)}</span></span><span class="fx-mono"><span class="fx-issue__delta">${esc(issue.delta ?? '—')}</span> · allowed ${esc(issue.tolerance)}</span></div>${meta}<dl class="fx-issue__sides"><div><dt>expected · figma</dt><dd>${valueHtml(issue.expected)}</dd></div><div><dt>received · story</dt><dd>${valueHtml(issue.actual)}</dd></div></dl>${drift}</div>`;
                })
                .join('');

            return `<section class="fx-group"><h4>${esc(group.title)} <span>${group.issues.length}</span></h4>${issues}</section>`;
        })
        .join('');
    const deltaId = `fx-delta-${esc(result.storyId)}`;
    const legend = view.groups.length
        ? `<div class="fx-legend"><span>${esc(DELTA_HELP.legend)}</span><button type="button" class="fx-legend__btn" popovertarget="${deltaId}" aria-label="${esc(DELTA_HELP.button)}"><span aria-hidden="true">i</span></button><div id="${deltaId}" popover="auto" role="note" class="fx-popover"><strong>${esc(DELTA_HELP.title)}</strong><ul>${DELTA_HELP.lines
              .map((line) => {
                  return `<li>${esc(line)}</li>`;
              })
              .join('')}</ul></div></div>`
        : '';
    const ignored = view.ignored.length
        ? `<section class="fx-ignored"><h4>Ignored ${view.ignored.length} · from the story's ignore list</h4><ul>${view.ignored
              .map((text) => {
                  return `<li>${esc(text)}</li>`;
              })
              .join('')}</ul></section>`
        : '';
    const fix = view.prompt
        ? `<section class="fx-fix"><h4>Fix prompt</h4><pre class="fx-pre" tabindex="0" aria-label="Fix prompt">${esc(view.prompt)}</pre><div class="fx-row" style="gap: 8px">${promptButton(view.prompt, 'Copy fix prompt', 'fx-btn fx-btn--primary fx-btn--lg')}${copyButton(view.snippet, 'Copy approval snippet', 'fx-btn fx-btn--lg')}<a class="fx-link" href="${esc(entry.block.set.url)}" target="_blank" rel="noreferrer">Figma ↗</a></div><span class="fx-fix__note">The approval snippet goes into the story's approved list. Write the reason before committing.</span></section>`
        : '';

    return `<div class="fx-inspector__nav"><span>${esc(view.place)}</span><div class="fx-row" style="gap: 6px; flex-wrap: nowrap"><button type="button" class="fx-icon-btn" aria-label="Previous cell" data-step="-1">←</button><span class="fx-inspector__pos">${index + 1} / ${entries.length}</span><button type="button" class="fx-icon-btn" aria-label="Next cell" data-step="1">→</button></div></div>
<div class="fx-inspector__head"><div style="display: flex; flex-direction: column; gap: 6px; min-width: 0"><h3>${esc(view.title)}</h3><span class="fx-inspector__when">${esc(view.when)}</span></div><span class="fx-badge" data-tone="${view.tone}"><span aria-hidden="true">${tone.icon}</span> ${esc(tone.label)}</span></div>
<dl class="fx-stats"><div><dt>pixels differ</dt><dd${view.pixels.over ? ' data-over' : ''}>${esc(view.pixels.text)}</dd></div><div><dt>allowed</dt><dd>${esc(view.allowed)}</dd></div><div><dt>properties</dt><dd${view.properties.over ? ' data-over' : ''}>${esc(view.properties.text)}</dd></div></dl>
<div class="fx-tiles" style="--tiles: ${inspectorTiles(entry.cell).length}">${tiles}</div>
<p class="fx-diffmap" data-explain-summary hidden><span class="fx-diffmap__key" aria-hidden="true"><i data-class="colour"></i><i data-class="figma"></i><i data-class="story"></i></span><span></span></p>
${callout}${legend}${groups}${ignored}${fix}`;
}

function matrixHtml(result: FigmaStoryResult, toPage: ToPage): string {
    const view = matrixView(result.blocks);
    const cells = view.entries.map((entry) => {
        return entry.cell;
    });
    const counts = countTones(cells);
    const { lead, tail } = headline(counts);
    const failing = view.entries.filter((entry) => {
        return isFailing(entry.cell);
    });
    const selected = Math.max(
        0,
        view.entries.findIndex((entry) => {
            return isFailing(entry.cell);
        })
    );
    const inspectorId = `fx-inspector-${esc(result.storyId)}`;
    const copyAll = failing.length
        ? promptButton(
              storyFixPrompt(result, view.entries),
              `Copy fix prompt · ${failing.length} variants`,
              'fx-btn fx-btn--primary'
          )
        : '';
    const blocks = view.blocks
        .map(({ block, score, sections }) => {
            const tables = sections
                .map((section) => {
                    const rowHeaders = section.rows.some((row) => {
                        return row.label !== '';
                    });
                    const head = `<tr>${rowHeaders ? '<th scope="col"><span class="fx-sr">Variant</span></th>' : ''}${section.columns
                        .map((column) => {
                            return `<th scope="col">${esc(column)}</th>`;
                        })
                        .join('')}</tr>`;
                    const body = section.rows
                        .map((row) => {
                            const tds = row.cells
                                .map((index) => {
                                    const entry = index === null ? undefined : view.entries[index];
                                    if (!entry || index === null) {
                                        return '<td></td>';
                                    }
                                    const tone = cellTone(entry.cell);

                                    return `<td><button type="button" class="fx-cell" data-tone="${tone}" data-index="${index}" aria-pressed="${index === selected}" aria-controls="${inspectorId}" aria-label="${esc(cellAria(entry))}">${thumbHtml(entry.cell, toPage)}<span class="fx-cell__metric" aria-hidden="true">${TONES[tone].icon} ${esc(cellMetric(entry.cell))}</span></button></td>`;
                                })
                                .join('');

                            return `<tr>${rowHeaders ? `<th scope="row">${esc(row.label)}</th>` : ''}${tds}</tr>`;
                        })
                        .join('');
                    const title = section.title ? `<h4>${esc(section.title)}</h4>` : '';

                    return `<div class="fx-section">${title}<div class="fx-scroll"><table class="fx-grid"><thead>${head}</thead><tbody>${body}</tbody></table></div></div>`;
                })
                .join('');

            return `<section class="fx-block"><div class="fx-block__head"><h3>${esc(block.set.name)}</h3><a class="fx-link" href="${esc(block.set.url)}" target="_blank" rel="noreferrer">Figma ↗</a><span class="fx-block__score">${score}</span></div>${tables}</section>`;
        })
        .join('');
    const templates = view.entries
        .map((_entry, index) => {
            return `<template data-cell="${index}">${inspectorHtml(result, view.entries, index, toPage)}</template>`;
        })
        .join('');

    return `<div class="fx-matrix" data-matrix data-filter="all" data-thumb="story" data-selected="${selected}">
<div class="fx-matrix__summary"><div style="display: flex; flex-direction: column; gap: 10px; min-width: 0"><p class="fx-headline" style="margin: 0">${esc(lead)} <span>${esc(tail)}</span></p><div class="fx-row" style="gap: 6px">${chips(cells)}</div></div><div class="fx-row" style="gap: 8px">${storyLink(result.storyId, 'Storybook ↗')}${copyAll}</div></div>
<div class="fx-matrix__toolbar">${seg(
        'Filter cells',
        'data-filter-value',
        [
            ['all', 'All', cells.length],
            ['differ', 'Differs', counts.differ],
            ['approved', 'Approved', counts.approved],
            ['nocode', 'Not in code', counts.nocode],
            ['match', 'Matches', counts.match],
        ],
        'all'
    )}${seg(
        'Thumbnail',
        'data-thumb-value',
        [
            ['story', 'Story', null],
            ['figma', 'Figma', null],
            ['diff', 'Pixel diff', null],
            ['swipe', 'Swipe', null],
        ],
        'story'
    )}</div>
<div class="fx-matrix__body"><div class="fx-matrix__grid">${blocks}</div><aside id="${inspectorId}" class="fx-inspector" aria-label="Cell detail" tabindex="0">${inspectorHtml(result, view.entries, selected, toPage)}</aside></div>
${templates}
</div>`;
}

// ---------- Report sections ----------

type RepeatedRow = {
    comp: string;
    element: string;
    property: string;
    expected: FigmaIssue['expected'];
    actual: FigmaIssue['actual'];
    allowed: string;
    count: number;
    drift: boolean;
    prompt: string;
};

/** `Text "FAN 3"` → `Text "FAN n"`, so the same text slot groups across variants. */
function slotOf(element: string): string {
    return element.replace(/"([^"]*)"/, (_match, text: string) => {
        return `"${text.replace(/\d+/g, 'n')}"`;
    });
}

function repeatedRows(results: FigmaStoryResult[]): RepeatedRow[] {
    const rows: RepeatedRow[] = [];
    for (const result of results) {
        const comp = shortTitle(result);
        const groups = new Map<string, { issue: FigmaIssue; count: number }>();
        const failing = cellsOf(result).filter(isFailing);
        for (const cell of failing) {
            for (const issue of cell.spec.mismatches) {
                const key = [slotOf(issue.element), issue.property, issue.expected.text, issue.actual.text].join('|');
                const group = groups.get(key);
                groups.set(key, { issue: group?.issue ?? issue, count: (group?.count ?? 0) + 1 });
            }
        }
        for (const { issue, count } of groups.values()) {
            if (count < 2) {
                continue;
            }
            const element = slotOf(issue.element);
            rows.push({
                comp,
                element,
                property: issue.property,
                expected: issue.expected,
                actual: issue.actual,
                allowed: issue.tolerance,
                count,
                drift: isDrift(issue),
                prompt: `Fix ${comp} story "${result.name}": ${element} ${issue.property} is ${issue.actual.text}, Figma expects ${issue.expected.text} (allowed ${issue.tolerance}). Affects ${count} variants. Use tokens, not raw values.\n${VERIFY}`,
            });
        }
        const pixelOnly = failing.filter(isPixelOnly);
        if (pixelOnly.length >= 2) {
            const ratios = pixelOnly.map((cell) => {
                return cell.image.ratio ?? 0;
            });
            const range = `${percent(Math.min(...ratios))}–${percent(Math.max(...ratios))}`;
            rows.push({
                comp,
                element: 'pixels only',
                property: 'inside the component',
                expected: { text: 'figma@2x.png' },
                actual: { text: `story@2x.png · ${range} differ` },
                allowed: `${percent(pixelOnly[0]?.image.maxRatio ?? 0)} of pixels`,
                count: pixelOnly.length,
                drift: false,
                prompt: `Fix ${comp} story "${result.name}": ${pixelOnly.length} variants fail on pixels only (no property mismatch). Compare figma@2x.png and story@2x.png for the inner glyph, stroke or fill and match it.\n${VERIFY}`,
            });
        }
    }

    return rows.sort((a, b) => {
        return b.count - a.count;
    });
}

function bar(segments: [number, string][], height: number, delay = 0): string {
    return `<div class="fx-bar" style="height: ${height}px">${segments
        .filter(([value]) => {
            return value > 0;
        })
        .map(([value, color], index) => {
            return `<div class="fx-grow" style="flex: ${value}; background: ${color}; animation-delay: ${delay + index * 40}ms"></div>`;
        })
        .join('')}</div>`;
}

function overviewHtml(results: FigmaStoryResult[], all: FigmaCellResult[]): string {
    const counts = countTones(all);
    const { lead, tail } = headline(counts);
    const differBy = results
        .map((result) => {
            return [countTones(cellsOf(result)).differ, shortTitle(result)] as const;
        })
        .filter(([count]) => {
            return count > 0;
        })
        .map(([count, name]) => {
            return `${count} ${esc(name)}`;
        })
        .join(' · ');
    const card = (tone: (typeof TONE_ORDER)[number], sub: string) => {
        return `<div class="fx-stat-card" data-tone="${tone}"><span class="fx-stat-card__label"><span aria-hidden="true">${TONES[tone].icon}</span> ${TONES[tone].label}</span><span class="fx-stat-card__n">${counts[tone]}</span><span class="fx-stat-card__sub">${sub}</span></div>`;
    };
    const rows = results
        .map((result, index) => {
            const c = countTones(cellsOf(result));
            const total = comparable(c);

            return `<tr><th scope="row"><a href="#cmp-${esc(result.storyId)}">${esc(shortTitle(result))}</a></th><td>${total}</td><td data-tone="match">${c.match}</td><td data-tone="differ"${c.differ ? '' : ' data-empty'}>${c.differ}</td><td data-tone="approved"${c.approved ? '' : ' data-empty'}>${c.approved}</td><td class="fx-muted">${c.nocode}</td><td>${bar(
                [
                    [c.match, 'var(--match)'],
                    [c.approved, 'var(--approved-bar)'],
                    [c.differ, 'var(--differ)'],
                ],
                6,
                160 + index * 40
            )}</td><td class="fx-num">${c.match + c.approved}/${total}</td></tr>`;
        })
        .join('');

    return `<section id="overview" class="fx-r-section">
<div class="fx-hero"><h1>${esc(lead)} <span>${esc(tail)}</span></h1><p>${results.length} components, ${all.length} Figma variants. ${counts.nocode} have no code equivalent and aren't scored, leaving ${comparable(counts)} comparable. A cell fails when more pixels differ than its limit or a measured property is outside its tolerance.</p></div>
<div class="fx-stat-cards">${card('match', 'within tolerance on pixels and properties')}${card('differ', differBy || 'nothing to fix')}${card('approved', 'deliberate, declared in story code with a reason')}${card('nocode', 'Figma-only variants, not scored')}</div>
<div style="display: flex; flex-direction: column; gap: 8px"><div role="img" aria-label="Of ${all.length} variants: ${counts.match} match, ${counts.approved} approved, ${counts.differ} differ, ${counts.nocode} not in code">${bar(
        [
            [counts.match, 'var(--match)'],
            [counts.approved, 'var(--approved-bar)'],
            [counts.differ, 'var(--differ)'],
            [counts.nocode, 'var(--line-3)'],
        ],
        10
    )}</div><span class="fx-muted" style="font-size: 12px">all ${all.length} Figma variants</span></div>
<div class="fx-table-wrap" tabindex="0" role="region" aria-label="Components"><table class="fx-table fx-table--num"><thead><tr><th scope="col">component</th><th scope="col">comparable</th><th scope="col">✓ match</th><th scope="col">✕ differ</th><th scope="col">≈ approved</th><th scope="col">∅ not in code</th><th scope="col"><span class="fx-sr">Breakdown</span></th><th scope="col">score</th></tr></thead><tbody>${rows}</tbody></table></div>
</section>`;
}

function breakdownHtml(results: FigmaStoryResult[]): string {
    const failing = results.flatMap((result) => {
        return cellsOf(result)
            .filter(isFailing)
            .map((cell) => {
                return { result, cell };
            });
    });
    const issues = failing.flatMap(({ cell }) => {
        return cell.spec.mismatches;
    });
    const withIssues = new Set(
        failing
            .filter(({ cell }) => {
                return cell.spec.mismatches.length > 0;
            })
            .map(({ result }) => {
                return shortTitle(result);
            })
    );
    const byCategory = CATEGORIES.map((category) => {
        const own = issues.filter((issue) => {
            return issueCategory(issue.property) === category;
        });

        return {
            category,
            count: own.length,
            what: [
                ...new Set(
                    own.map((issue) => {
                        return issue.property.toLowerCase();
                    })
                ),
            ].join(', '),
        };
    }).filter((entry) => {
        return entry.count > 0;
    });
    const max = Math.max(
        1,
        ...byCategory.map((entry) => {
            return entry.count;
        })
    );
    let where = '';
    if (withIssues.size === 1) {
        where = `, all in ${[...withIssues][0]}`;
    } else if (withIssues.size > 1) {
        where = ` across ${withIssues.size} components`;
    }
    const categories = byCategory
        .map((entry, index) => {
            return `<div class="fx-cat"><div class="fx-cat__head"><span>${entry.category} <span class="fx-muted">· ${esc(entry.what)}</span></span><span class="fx-mono">${entry.count}</span></div><div class="fx-cat__track"><div class="fx-grow" style="width: ${(entry.count / max) * 100}%; animation-delay: ${index * 40}ms"></div></div></div>`;
        })
        .join('');
    const mismatches = `<div class="fx-r-card" style="flex: 999 1 520px"><div style="display: flex; flex-direction: column; gap: 6px"><h2>${issues.length} property mismatches${esc(where)}</h2><span class="fx-muted">${issues.length ? 'by category, in failing variants' : 'every failing variant matches on measured properties'}</span></div>${categories}</div>`;

    const pixelOnly = results
        .map((result) => {
            const cells = cellsOf(result).filter(isPixelOnly);
            const ratios = cells.map((cell) => {
                return cell.image.ratio ?? 0;
            });

            return { name: shortTitle(result), cells, min: Math.min(...ratios), max: Math.max(...ratios) };
        })
        .filter((entry) => {
            return entry.cells.length > 0;
        });
    const total = pixelOnly.reduce((sum, entry) => {
        return sum + entry.cells.length;
    }, 0);
    const pixelCard = total
        ? `<div class="fx-r-card" style="flex: 1 1 340px"><h2>${total} fail on pixels only</h2><p class="fx-muted" style="margin: 0; font-size: 14px; line-height: 1.6">No measurable property mismatch: the spec measures root size, radius, fill, stroke, shadows, opacity, layout (gaps, insets), texts (incl. case, decoration) and icons (box, colour, glyph), not glyph shapes or child fills, so the failure is only visible in the images.</p><ul class="fx-list">${pixelOnly
              .map((entry) => {
                  const range =
                      entry.min === entry.max ? percent(entry.min) : `${percent(entry.min)}–${percent(entry.max)}`;

                  return `<li><span>${esc(entry.name)}</span><span class="fx-mono" style="color: var(--differ)">${entry.cells.length} · ${range}</span></li>`;
              })
              .join('')}</ul></div>`
        : '';

    return `<section class="fx-r-split">${mismatches}${pixelCard}</section>`;
}

function repeatedHtml(rows: RepeatedRow[]): string {
    if (rows.length === 0) {
        return '';
    }
    const body = rows
        .map((row) => {
            const drift = row.drift ? '<span class="fx-drift">Figma value drift</span>' : '';
            const side = (value: FigmaIssue['expected']) => {
                const swatch = value.swatch
                    ? `<span class="fx-swatch" aria-hidden="true" style="--swatch: ${esc(value.swatch)}"></span>`
                    : '';

                return `<span class="fx-value">${swatch}${esc(value.text)}</span>`;
            };

            return `<tr><td>${esc(row.comp)}</td><th scope="row"><span style="display: flex; flex-direction: column; gap: 6px; align-items: flex-start"><span>${esc(row.element)} <span class="fx-mono fx-muted">${esc(row.property)}</span></span>${drift}</span></th><td>${side(row.expected)}</td><td class="fx-received">${side(row.actual)}</td><td class="fx-mono fx-muted">${esc(row.allowed)}</td><td class="fx-mono">${row.count} variants</td><td>${promptButton(row.prompt, 'Copy fix prompt', 'fx-btn', `Copy fix prompt: ${row.comp} ${row.element} ${row.property}`)}</td></tr>`;
        })
        .join('');

    return `<section id="repeated" class="fx-r-section"><div class="fx-r-head"><h2>repeated issues</h2><span class="fx-muted">same element, property and values, grouped across variants</span></div>
<div class="fx-table-wrap" tabindex="0" role="region" aria-label="Repeated issues"><table class="fx-table"><thead><tr><th scope="col">component</th><th scope="col">element · property</th><th scope="col">expected · figma</th><th scope="col">received · story</th><th scope="col">allowed</th><th scope="col">variants</th><th scope="col"><span class="fx-sr">Action</span></th></tr></thead><tbody>${body}</tbody></table></div></section>`;
}

function componentsHtml(results: FigmaStoryResult[], toPage: ToPage): string {
    const sections = results
        .map((result) => {
            const cells = cellsOf(result);
            const c = countTones(cells);
            const sets = `${result.blocks.length} component set${result.blocks.length === 1 ? '' : 's'} · ${cells.length} variants`;

            return `<details id="cmp-${esc(result.storyId)}" class="fx-component"${c.differ ? ' open' : ''}>
<summary><span class="fx-component__name"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg><h3>${esc(shortTitle(result))}</h3><span class="fx-muted">${sets}</span></span><span class="fx-component__counts fx-mono">${TONE_ORDER.map(
                (tone) => {
                    const empty = tone !== 'match' && c[tone] === 0 ? ' data-empty' : '';

                    return `<span data-tone="${tone}"${empty}><span aria-hidden="true">${TONES[tone].icon}</span> ${c[tone]}<span class="fx-sr"> ${TONES[tone].label.toLowerCase()}</span></span>`;
                }
            ).join('')}</span></summary>
${matrixHtml(result, toPage)}
</details>`;
        })
        .join('\n');

    return `<section id="components" class="fx-r-section"><div class="fx-r-head"><h2>components</h2><span class="fx-muted">click a cell for detail · ← → step between cells</span></div>${sections}</section>`;
}

function coverageHtml(catalog: FigmaCatalog | null, results: FigmaStoryResult[]): string {
    if (!catalog) {
        return '';
    }
    const covered = new Map<string, { result: FigmaStoryResult; variants: number }>();
    for (const result of results) {
        for (const block of result.blocks) {
            covered.set(parseFigmaUrl(block.set.url).nodeId, { result, variants: block.cells.length });
        }
    }
    const sets = [...catalog.sets].sort((a, b) => {
        return Number(covered.has(b.nodeId)) - Number(covered.has(a.nodeId));
    });
    const held = sets.filter((set) => {
        return covered.has(set.nodeId);
    }).length;
    const rows = sets
        .map((set) => {
            const hit = covered.get(set.nodeId);
            const url = `https://www.figma.com/design/${catalog.fileKey}/?node-id=${set.nodeId.replace(':', '-')}`;
            const name = `<a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(set.name)}</a>`;
            if (hit) {
                return `<tr><td data-tone="match"><span aria-hidden="true">✓</span><span class="fx-sr">Has a matrix</span></td><th scope="row">${name}</th><td class="fx-mono fx-muted">${hit.variants} variants</td><td>${storyLink(hit.result.storyId, `${hit.result.title} / ${hit.result.name}`)}</td></tr>`;
            }

            return `<tr><td class="fx-muted"><span aria-hidden="true">○</span><span class="fx-sr">No matrix</span></td><th scope="row" class="fx-uncovered">${name}</th><td class="fx-muted">${esc([set.page, set.frame].filter(Boolean).join(' · '))}</td><td class="fx-muted">no matrix story</td></tr>`;
        })
        .join('');

    return `<section id="coverage"><details class="fx-component"><summary><span class="fx-component__name"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg><h2>kit coverage</h2></span><span class="fx-muted">${held} component set${held === 1 ? ' has' : 's have'} a matrix story · ${sets.length - held} in the Figma file don't yet</span></summary>
<p class="fx-muted" style="margin: 0; padding: 14px 22px 0">Catalog synced ${esc(new Date(catalog.syncedAt).toLocaleDateString('en-GB'))}. To add one: its URL to <code>visual/figma/sets.ts</code>, a FigmaMatrix story, then <code>${COPY_COMMAND}</code>.</p>
<div class="fx-table-wrap fx-table-wrap--flush" tabindex="0" role="region" aria-label="Kit coverage"><table class="fx-table"><thead><tr><th scope="col"><span class="fx-sr">Status</span></th><th scope="col">component set</th><th scope="col">variants · location</th><th scope="col">matrix story</th></tr></thead><tbody>${rows}</tbody></table></div></details></section>`;
}

function approvedHtml(results: FigmaStoryResult[]): string {
    const groups = new Map<string, { cells: FigmaCellResult[]; blocks: Map<string, number>; comps: Set<string> }>();
    for (const result of results) {
        for (const block of result.blocks) {
            for (const cell of block.cells) {
                if (cell.status !== 'approved') {
                    continue;
                }
                const reason = cell.approval ?? '';
                const group = groups.get(reason) ?? {
                    cells: [] as FigmaCellResult[],
                    blocks: new Map<string, number>(),
                    comps: new Set<string>(),
                };
                group.cells.push(cell);
                group.blocks.set(block.set.name, (group.blocks.get(block.set.name) ?? 0) + 1);
                group.comps.add(shortTitle(result));
                groups.set(reason, group);
            }
        }
    }
    if (groups.size === 0) {
        return '';
    }
    const total = [...groups.values()].reduce((sum, group) => {
        return sum + group.cells.length;
    }, 0);
    const comps = new Set(
        [...groups.values()].flatMap((group) => {
            return [...group.comps];
        })
    );
    const cards = [...groups]
        .sort((a, b) => {
            return b[1].cells.length - a[1].cells.length;
        })
        .map(([reason, group]) => {
            const props = commonProps(group.cells);
            const title =
                Object.entries(props)
                    .map(([name, value]) => {
                        return `${name}=${value}`;
                    })
                    .join(' · ') || 'Several variants';
            const where = [...group.blocks]
                .map(([name, count]) => {
                    return `${name} ${count}`;
                })
                .join(' · ');

            return `<div class="fx-approved"><div class="fx-approved__head"><h3>${esc(title)}</h3><span class="fx-mono">≈ ${group.cells.length}</span></div><span class="fx-approved__reason">“${esc(reason)}”</span><span class="fx-muted" style="font-size: 12px; line-height: 1.6">${esc(where)}</span><pre class="fx-pre">${esc(approvalSnippet(props, reason))}</pre></div>`;
        })
        .join('');

    return `<section id="approved" class="fx-r-section"><div class="fx-r-head"><h2>approved <span class="fx-mono" style="color: var(--approved)">≈ ${total}</span></h2><span class="fx-muted">declared in the ${esc([...comps].join(', '))} ${comps.size === 1 ? "story's" : "stories'"} approvals, grouped by reason</span></div><div class="fx-approved-grid">${cards}</div></section>`;
}

function noCodeHtml(results: FigmaStoryResult[]): string {
    const lists = results
        .map((result) => {
            const items = result.blocks.flatMap((block) => {
                return block.cells
                    .filter((cell) => {
                        return cell.status === 'missing';
                    })
                    .map((cell) => {
                        const values = Object.values(cell.variant.props).join(' · ');

                        return result.blocks.length > 1 ? `${block.set.name} · ${values}` : values;
                    });
            });

            return { name: shortTitle(result), items };
        })
        .filter((list) => {
            return list.items.length > 0;
        });
    if (lists.length === 0) {
        return '';
    }
    const total = lists.reduce((sum, list) => {
        return sum + list.items.length;
    }, 0);
    const prompt = `These Figma variants have no story args: ${lists
        .map((list) => {
            return `${list.name} ${list.items.length}`;
        })
        .join(
            ', '
        )} (see the report's "Not in code" list). For each, either add the args to the component and the Figma Matrix story, or leave it design-only.\n${VERIFY}`;

    return `<section id="nocode" class="fx-r-section"><div class="fx-r-head"><h2>not in code <span class="fx-mono fx-muted">∅ ${total}</span></h2><span class="fx-muted">Figma variants no story args produce</span></div>
${lists
    .map((list) => {
        return `<div style="display: flex; flex-direction: column; gap: 10px"><h3 class="fx-nocode__title">${esc(list.name)} <span class="fx-mono fx-muted">${list.items.length}</span></h3><ul class="fx-pills">${list.items
            .map((item) => {
                return `<li>${esc(item)}</li>`;
            })
            .join('')}</ul></div>`;
    })
    .join('')}
<div>${promptButton(prompt, 'Copy prompt: add missing stories', 'fx-btn fx-btn--lg')}</div></section>`;
}

// Page-only layout on top of the shared theme (theme.ts).
const PAGE_CSS = `
body.fx { margin: 0; min-height: 100vh; background: var(--bg); font-size: 14px; --fx-sticky-top: 16px; --fx-sticky-bottom: 16px; }
.fx-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 40px; border-bottom: 1px solid var(--line); }
.fx-top nav { display: flex; flex-wrap: wrap; gap: 2px; }
.fx-top nav a { padding: 8px 12px; border-radius: 999px; color: var(--muted); text-decoration: none; font-size: 13px; transition: color 150ms ease, background-color 150ms ease; }
.fx-top nav a:hover { color: var(--ink); background: var(--raised); }
.fx-brand { font: 700 19px var(--display); letter-spacing: -0.02em; }
.fx-page { margin: 0 auto; padding: 52px 40px 96px; display: flex; flex-direction: column; gap: 64px; }
.fx-r-section { display: flex; flex-direction: column; gap: 14px; scroll-margin-top: 16px; }
#overview { gap: 28px; }
.fx-r-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 10px; }
.fx-r-head h2 { font-size: 32px; }
.fx-hero { display: flex; flex-direction: column; gap: 14px; max-width: 980px; }
.fx-hero h1 { font-size: clamp(34px, 5vw, 58px); line-height: 1.04; letter-spacing: -0.035em; }
.fx-hero h1 span { color: var(--differ); }
.fx-hero p { margin: 0; font-size: 15px; line-height: 1.6; color: var(--muted); }
.fx-stat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
.fx-stat-card { padding: 22px; border-radius: 20px; background: var(--raised); display: flex; flex-direction: column; gap: 8px; }
.fx-stat-card[data-tone='differ'] { background: #1a1210; }
.fx-stat-card__label { font-size: 13px; color: var(--muted); }
.fx-stat-card__label span { color: var(--tone); }
.fx-stat-card[data-tone='approved'] .fx-stat-card__label span { color: var(--approved-bar); }
.fx-stat-card__n { font: 600 52px/1 var(--display); letter-spacing: -0.03em; }
.fx-stat-card[data-tone='differ'] .fx-stat-card__n { color: var(--differ); }
.fx-stat-card__sub { font-size: 12px; color: var(--faint); }
.fx-stat-card[data-tone='differ'] .fx-stat-card__sub { color: var(--muted); }
.fx-bar { display: flex; gap: 3px; border-radius: 999px; overflow: hidden; }
.fx-bar > div { min-width: 2px; }
.fx-table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 20px; }
.fx-table-wrap--flush { border: 0; border-radius: 0; }
.fx-table { width: 100%; min-width: 820px; border-collapse: collapse; font-size: 13px; }
.fx-table thead th { padding: 12px 20px; background: var(--surface); font-size: 11px; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; color: var(--faint); text-align: left; white-space: nowrap; }
.fx-table td, .fx-table tbody th { padding: 14px 20px; border-top: 1px solid var(--line); text-align: left; vertical-align: top; font-weight: 400; }
.fx-table--num td { font-family: var(--mono); vertical-align: middle; }
.fx-table--num tbody th { font-weight: 500; vertical-align: middle; }
.fx-table--num tbody th a { text-decoration: none; }
.fx-table--num td:nth-child(7) { width: 30%; }
.fx-table td.fx-mono { white-space: nowrap; }
.fx-table td[data-tone] { color: var(--tone); }
.fx-num { text-align: right !important; }
.fx-table .fx-received .fx-value { color: var(--differ-ink); }
.fx-table .fx-value { align-items: flex-start; line-height: 1.5; }
.fx-table .fx-swatch { margin-top: 2px; }
.fx-uncovered a { color: var(--muted); }
.fx-drift { padding: 2px 8px; border-radius: 999px; background: rgb(179 166 255 / 0.14); color: var(--approved); font-size: 11px; }
.fx-r-split { display: flex; flex-wrap: wrap; gap: 20px; }
.fx-r-card { min-width: 0; padding: 26px; border-radius: 24px; background: var(--surface); display: flex; flex-direction: column; gap: 18px; }
.fx-r-card h2 { font-size: 24px; }
.fx-cat { display: flex; flex-direction: column; gap: 7px; }
.fx-cat__head { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.fx-cat__head .fx-mono { color: var(--muted); }
.fx-cat__track { height: 8px; border-radius: 999px; background: var(--line); overflow: hidden; }
.fx-cat__track > div { height: 100%; border-radius: 999px; background: var(--differ); }
.fx-list { margin: 0; padding: 0; list-style: none; font-size: 13px; }
.fx-list li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); }
/* Clip, not hidden: hidden would make the details a scroll container and stop the inspector sticking to the page. */
.fx-component { border: 1px solid var(--line); border-radius: 20px; overflow: clip; background: var(--panel); }
.fx-component > summary { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 20px;
    padding: 16px 22px; background: var(--surface); cursor: pointer; list-style: none; }
.fx-component > summary::-webkit-details-marker { display: none; }
/* Sticky stack inside an open component: its summary, then the matrix filter toolbar, then the inspector below both.
   The script measures both into --fx-summary-h / --fx-toolbar-h on the details. */
.fx-component { --fx-sticky-top: calc(var(--fx-summary-h, 0px) + var(--fx-toolbar-h, 0px) + 16px); }
.fx-component[open] > summary { position: sticky; top: 0; z-index: 4; }
.fx-component .fx-matrix__toolbar { position: sticky; top: var(--fx-summary-h, 0px); z-index: 3; background: var(--panel); }
/* Wide report: the inspector takes up to a third of the matrix (theme caps it at 480px for the narrow panel). */
@container fx-body (min-width: 940px) { .fx-component .fx-inspector { flex: 0 1 max(380px, 33.333%); max-width: 33.333%; } }
.fx-component__name { display: flex; align-items: center; gap: 12px; }
.fx-component__name h2, .fx-component__name h3 { font-size: 18px; }
#coverage .fx-component__name h2 { font-size: 22px; }
.fx-component__name svg { transition: transform 150ms var(--ease-out); }
.fx-component[open] > summary svg { transform: rotate(90deg); }
.fx-component__counts { display: flex; gap: 12px; font-size: 12px; }
.fx-component__counts [data-tone] { color: var(--tone); }
.fx-component .fx-matrix { border-top: 1px solid var(--line); }
#components .fx-component + .fx-component { margin-top: 0; }
.fx-approved-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 12px; }
.fx-approved { padding: 22px; border-radius: 20px; border: 1px dashed rgb(179 166 255 / 0.5); display: flex; flex-direction: column; gap: 12px; }
.fx-approved__head { display: flex; justify-content: space-between; gap: 12px; }
.fx-approved__head h3 { font: 600 14px var(--text); letter-spacing: 0; }
.fx-approved__head .fx-mono { font-size: 12px; color: var(--approved); }
.fx-approved__reason { font-size: 13px; line-height: 1.6; color: var(--ink-2); }
.fx-nocode__title { font: 600 13px var(--text); letter-spacing: 0; }
.fx-pills { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 8px; }
.fx-pills li { padding: 8px 14px; border-radius: 999px; border: 1px dashed var(--line-3); font-size: 12px; color: var(--muted); }
.fx code { font: 12px var(--mono); padding: 1px 5px; border-radius: 4px; background: var(--raised-2); }
.fx-foot { padding-top: 24px; border-top: 1px solid var(--line); font-size: 12px; line-height: 1.6; color: var(--faint); }
@media (max-width: 720px) { .fx-top { padding: 14px 16px; } .fx-page { padding: 32px 16px 64px; gap: 48px; } }
`;

// One dialog shared by every prompt button: shows the prompt in an editable textarea; Copy takes the edited text.
const PROMPT_DIALOG = `<dialog class="fx-prompt" id="fx-prompt" aria-labelledby="fx-prompt-title">
<div class="fx-prompt__head"><h2 id="fx-prompt-title">Prompt</h2><button type="button" class="fx-btn" data-prompt-close>Close</button></div>
<textarea aria-labelledby="fx-prompt-title" spellcheck="false"></textarea>
<div class="fx-prompt__foot"><span>Edit the prompt if needed, then copy it.</span><div class="fx-row" style="gap: 8px"><button type="button" class="fx-btn" data-prompt-reset>Reset</button><button type="button" class="fx-btn fx-btn--primary" data-prompt-copy><span data-label="Copy">Copy</span></button></div></div>
</dialog>`;

// Matrix interaction (filter, thumbnail, cell selection, ← → stepping), copy buttons with "Copied ✓" feedback, and
// story links that go same-origin when served by Storybook.
const SCRIPT = `
// "What differs" maps (diff-map.ts, inlined). Readable only when served (canvas reads are blocked on file://):
// otherwise the raw comparator diff stays.
${explainDiff.toString()}
${diffMapSummary.toString()}
${loadDiffMap.toString()}
${paintDiffMap.toString()}
// Full-size view of an inspector tile (lightbox.ts, inlined; the Storybook panel uses the same function).
${openLightbox.toString()}
document.addEventListener('click', (event) => {
    const tile = event.target.closest('[data-lightbox]');
    const picture = tile && tile.querySelector('img:not([hidden]), canvas:not([hidden])');
    if (picture) { openLightbox(tile.dataset.lightbox, tile.hasAttribute('data-diff'), picture); }
});
const explainIn = (root) => {
    for (const canvas of root.querySelectorAll('canvas[data-explain]')) {
        const stage = canvas.parentElement;
        const summary = root.querySelector('[data-explain-summary]');
        loadDiffMap(canvas.dataset.reference, canvas.dataset.actual).then((map) => {
            if (!map) {
                canvas.remove();
                stage.querySelector('[data-explain-fallback]').hidden = false;
                return;
            }
            paintDiffMap(canvas, map);
            canvas.setAttribute('aria-label', 'What differs: ' + diffMapSummary(map));
            if (summary) {
                summary.lastElementChild.textContent = diffMapSummary(map);
                summary.hidden = false;
            }
        });
    }
};
explainIn(document);
// Thumbnails: painted once, when their matrix first shows Pixel diff.
const explainThumbs = (matrix) => {
    for (const canvas of matrix.querySelectorAll('canvas[data-explain-thumb]')) {
        canvas.removeAttribute('data-explain-thumb');
        loadDiffMap(canvas.dataset.reference, canvas.dataset.actual).then((map) => {
            if (!map) {
                canvas.nextElementSibling.hidden = false;
                canvas.remove();
                return;
            }
            paintDiffMap(canvas, map);
            canvas.style.width = map.image.width / 2 + 'px';
            canvas.style.height = map.image.height / 2 + 'px';
            canvas.setAttribute('aria-label', 'What differs: ' + diffMapSummary(map));
            canvas.hidden = false;
        });
    }
};
// Sticky header heights per component (summary wraps on narrow widths) for the toolbar / inspector offsets.
const stickyHeights = new ResizeObserver((entries) => {
    for (const entry of entries) {
        const details = entry.target.closest('.fx-component');
        const name = entry.target.matches('summary') ? '--fx-summary-h' : '--fx-toolbar-h';
        details.style.setProperty(name, entry.target.offsetHeight + 'px');
    }
});
for (const head of document.querySelectorAll('.fx-component > summary, .fx-component .fx-matrix__toolbar')) { stickyHeights.observe(head); }
for (const matrix of document.querySelectorAll('[data-matrix]')) {
    const inspector = matrix.querySelector('.fx-inspector');
    const templates = matrix.querySelectorAll('template[data-cell]');
    const cell = (index) => matrix.querySelector('.fx-cell[data-index="' + index + '"]');
    let current = Number(matrix.dataset.selected);
    const show = (index, focus) => {
        current = (index + templates.length) % templates.length;
        inspector.replaceChildren(templates[current].content.cloneNode(true));
        explainIn(inspector);
        inspector.scrollTop = 0;
        for (const other of matrix.querySelectorAll('.fx-cell[aria-pressed="true"]')) { other.setAttribute('aria-pressed', 'false'); }
        cell(current).setAttribute('aria-pressed', 'true');
        if (focus) { cell(current).focus(); }
    };
    const press = (button, attr) => {
        for (const other of button.parentElement.children) { other.setAttribute('aria-pressed', String(other === button)); }
        matrix.dataset[attr] = button.getAttribute('data-' + attr + '-value');
        if (matrix.dataset.thumb === 'diff') { explainThumbs(matrix); }
    };
    matrix.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target || !matrix.contains(target)) { return; }
        if (target.matches('.fx-cell')) { show(Number(target.dataset.index), false); }
        else if (target.dataset.step) { show(current + Number(target.dataset.step), false); }
        else if (target.hasAttribute('data-filter-value')) { press(target, 'filter'); }
        else if (target.hasAttribute('data-thumb-value')) { press(target, 'thumb'); }
    });
    matrix.querySelector('.fx-matrix__grid').addEventListener('keydown', (event) => {
        if (!event.target.matches('.fx-cell') || event.altKey || event.metaKey || event.ctrlKey) { return; }
        const by = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (by) { event.preventDefault(); show(current + by, true); }
    });
}
const promptDialog = document.getElementById('fx-prompt');
const promptText = promptDialog.querySelector('textarea');
const promptReset = promptDialog.querySelector('[data-prompt-reset]');
const syncReset = () => { promptReset.disabled = promptText.value === promptDialog.dataset.original; };
promptText.addEventListener('input', syncReset);
const flash = (button) => {
    const label = button.querySelector('[data-label]');
    label.textContent = 'Copied ✓';
    label.classList.remove('fx-pop');
    void label.offsetWidth;
    label.classList.add('fx-pop');
    clearTimeout(label.timer);
    label.timer = setTimeout(() => { label.textContent = label.dataset.label; label.classList.remove('fx-pop'); }, 1600);
};
document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-prompt]');
    if (opener) {
        promptDialog.querySelector('h2').textContent = opener.textContent.replace(/…$/, '').replace(/^Copy (\\w)/, (_, c) => c.toUpperCase());
        promptDialog.dataset.original = opener.dataset.prompt;
        promptText.value = opener.dataset.prompt;
        syncReset();
        promptDialog.showModal();
        promptText.focus();
        promptText.setSelectionRange(0, 0);
        promptText.scrollTop = 0;
        return;
    }
    if (event.target.closest('[data-prompt-close]')) { promptDialog.close(); return; }
    if (event.target.closest('[data-prompt-reset]')) { promptText.value = promptDialog.dataset.original; syncReset(); promptText.focus(); return; }
    const copier = event.target.closest('[data-prompt-copy]');
    if (copier) { navigator.clipboard?.writeText(promptText.value); flash(copier); return; }
    const button = event.target.closest('[data-copy]');
    if (!button) { return; }
    navigator.clipboard?.writeText(button.dataset.copy);
    flash(button);
});
if (location.protocol.startsWith('http')) {
    for (const link of document.querySelectorAll('.story-link')) {
        link.href = '/?path=/story/' + link.dataset.story;
    }
}
`;

async function readJson<T>(file: string): Promise<T | null> {
    try {
        return JSON.parse(await readFile(file, 'utf8')) as T;
    } catch {
        return null;
    }
}

/** Writes the report and returns its path, or null when there are no results. */
export async function writeFigmaReport(root: string): Promise<string | null> {
    const resultsDir = path.join(root, FIGMA_RESULTS_DIR);
    let files: string[];
    try {
        files = (await readdir(path.join(resultsDir, 'results'))).filter((file) => {
            return file.endsWith('.json');
        });
    } catch {
        return null;
    }
    const results = (
        await Promise.all(
            files.map((file) => {
                return readJson<FigmaStoryResult>(path.join(resultsDir, 'results', file));
            })
        )
    ).filter((result): result is FigmaStoryResult => {
        return result !== null;
    });
    if (results.length === 0) {
        return null;
    }
    const catalog = await readJson<FigmaCatalog>(path.join(root, FIGMA_REFS_DIR, 'catalog.json'));
    const failing = (result: FigmaStoryResult) => {
        return countTones(cellsOf(result)).differ;
    };
    results.sort((a, b) => {
        return failing(b) - failing(a) || a.title.localeCompare(b.title);
    });
    const all = results.flatMap(cellsOf);
    const toPage: ToPage = (file) => {
        return path.relative(resultsDir, path.join(root, file)).split(path.sep).join('/');
    };
    const ranAt = results
        .map((result) => {
            return result.ranAt;
        })
        .sort()
        .at(-1);
    const repeated = repeatedRows(results);
    const differ = countTones(all).differ;
    const copyAll = differ
        ? promptButton(
              `Fix the ${differ} Figma diff failures. Work through the repeated issues first:\n${repeated
                  .map((row) => {
                      return `- ${row.comp} · ${row.element} ${row.property}: expected ${row.expected.text}, received ${row.actual.text} (${row.count} variants)`;
                  })
                  .join(
                      '\n'
                  )}\nThen the remaining failing cells; each has its own fix prompt in the report.\n${VERIFY}`,
              `Copy fix prompts · ${differ}`,
              'fx-btn fx-btn--primary'
          )
        : '';
    const sections = {
        overview: overviewHtml(results, all),
        breakdown: breakdownHtml(results),
        repeated: repeatedHtml(repeated),
        components: componentsHtml(results, toPage),
        coverage: coverageHtml(catalog, results),
        approved: approvedHtml(results),
        nocode: noCodeHtml(results),
    };
    const nav = (
        [
            ['overview', 'Overview'],
            ['repeated', 'Repeated issues'],
            ['components', 'Components'],
            ['coverage', 'Kit coverage'],
            ['approved', 'Approved'],
            ['nocode', 'Not in code'],
        ] as const
    )
        .filter(([id]) => {
            return sections[id] !== '';
        })
        .map(([id, label]) => {
            return `<a href="#${id}">${label}</a>`;
        })
        .join('');

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Figma diff report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FIGMA_UI_FONTS_HREF}">
<style>${FIGMA_UI_CSS}${PAGE_CSS}</style>
</head>
<body class="fx">
<header class="fx-top">
    <div class="fx-row" style="gap: 24px"><span class="fx-brand">figma diff report</span><nav aria-label="Report sections">${nav}</nav></div>
    <div class="fx-row" style="gap: 10px">${commandButton()}<span class="fx-muted" style="font-size: 12px">ran ${esc(ranAt ? ranText(ranAt) : '—')}</span>${copyAll}</div>
</header>
<main class="fx-page">
${Object.values(sections).join('\n')}
<footer class="fx-foot">Static report. Opens from disk and in CI artifacts; images are 2× PNGs stored next to this file. Regenerate with <code>${COPY_COMMAND}</code>.</footer>
</main>
${PROMPT_DIALOG}
<script>${SCRIPT}</script>
</body>
</html>
`;
    const file = path.join(resultsDir, 'index.html');
    await writeFile(file, html);

    return file;
}
