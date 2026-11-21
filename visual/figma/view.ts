// What the variant matrix and its cell inspector show, as data: cell tones and metrics, the grid layout, the inspector
// content and the copyable fix prompt / approval snippet. The Storybook "Figma diff" panel (React) and the report page
// (HTML strings) render the same model with the same classes (theme.ts), so they read the same. Browser-safe.
import type { IssueKind, Severity } from './issues.ts';
import type { FigmaBlockResult, FigmaCellResult, FigmaIssue, FigmaStoryResult } from './types.ts';
import {
    contrastText,
    figmaIssueText,
    imageErrorText,
    isDrift,
    issueCauses,
    issueKind,
    issueLabel,
    issueSeverity,
    KIND_LABELS,
    percent,
    pixelWhere,
    tokenOf,
} from './issues.ts';
import { layoutMatrix } from './layout.ts';

export { isDrift };

/** A cell as the UI shows it. `error`: fails because the comparator couldn't measure (sizes differ). */
export type Tone = 'match' | 'differ' | 'error' | 'approved' | 'nocode';

export const TONES: Record<Tone, { label: string; icon: string }> = {
    match: { label: 'Matches', icon: '✓' },
    differ: { label: 'Differs', icon: '✕' },
    error: { label: 'Comparator error', icon: '!' },
    approved: { label: 'Approved', icon: '≈' },
    nocode: { label: 'Not in code', icon: '∅' },
};

export const COPY_COMMAND = 'pnpm vrt figma';

export function cellTone(cell: FigmaCellResult): Tone {
    if (cell.status === 'missing') {
        return 'nocode';
    }
    if (cell.status === 'approved') {
        return 'approved';
    }
    if (cell.status === 'pass') {
        return 'match';
    }

    return cell.image.ratio === null && cell.image.error ? 'error' : 'differ';
}

/** How far a failing cell is off: 1 slight, 2 moderate, 3 major. */
export type Level = 1 | 2 | 3;

export const LEVELS: Record<Level, string> = { 1: 'slight', 2: 'moderate', 3: 'major' };

/**
 * A failing cell's level: the worst root-cause row (rows that follow from another don't add to it) or the pixel share
 * over the allowed one, whichever is worse; a comparator error (sizes differ) is major. Null for cells that don't fail.
 */
export function cellLevel(cell: FigmaCellResult): Level | null {
    const tone = cellTone(cell);
    if (tone === 'error') {
        return 3;
    }
    if (tone !== 'differ') {
        return null;
    }
    const over = cell.image.ratio === null ? 0 : cell.image.ratio / Math.max(cell.image.maxRatio, 0.0001);
    let pixels: Level = 1;
    if (over >= 4) {
        pixels = 3;
    } else if (over >= 2) {
        pixels = 2;
    }
    const causes = issueCauses(cell.spec.mismatches);
    const rows = cell.spec.mismatches
        .filter((_, index) => {
            return causes[index] === null;
        })
        .map(issueSeverity);

    return Math.max(pixels, ...rows) as Level;
}

/** A spec row as the inspector and the prompt read it: what kind of fix, how bad, and what it likely follows from. */
export type IssueView = FigmaIssue & {
    kind: IssueKind;
    kindLabel: string;
    severity: Severity;
    /** `Component · Height` when the row likely follows from that one; null for a root cause. */
    causedBy: string | null;
    /** Kept for the report's drift note. */
    drift: boolean;
};

/** Rows with their kind, severity and cause: root causes first, worst first, each followed by the rows it explains. */
export function issueViews(issues: FigmaIssue[]): IssueView[] {
    const causes = issueCauses(issues);
    const views = issues.map((issue, index) => {
        const cause = causes[index];
        const kind = issueKind(issue);

        return {
            ...issue,
            kind,
            kindLabel: KIND_LABELS[kind],
            severity: issueSeverity(issue),
            causedBy: cause === null || cause === undefined ? null : issueLabel(issues[cause] as FigmaIssue),
            drift: kind === 'token-drift',
            index,
            cause,
        };
    });
    const roots = views
        .filter((view) => {
            return view.cause === null;
        })
        .sort((a, b) => {
            return b.severity - a.severity || a.index - b.index;
        });

    return roots.flatMap((root) => {
        return [
            root,
            ...views.filter((view) => {
                return view.cause === root.index;
            }),
        ].map(({ index: _index, cause: _cause, ...view }) => {
            return view;
        });
    });
}

export function isFailing(cell: FigmaCellResult): boolean {
    return cell.status === 'fail';
}

/** Fails on pixels while every measured property is within tolerance: the difference is somewhere unmeasured. */
export function isPixelOnly(cell: FigmaCellResult): boolean {
    return (
        cell.status === 'fail' &&
        cell.spec.mismatches.length === 0 &&
        cell.image.ratio !== null &&
        cell.image.ratio > cell.image.maxRatio
    );
}

export type Counts = { match: number; differ: number; approved: number; nocode: number };

/** Comparator errors count as `differ`. */
export function countTones(cells: FigmaCellResult[]): Counts {
    const counts: Counts = { match: 0, differ: 0, approved: 0, nocode: 0 };
    for (const cell of cells) {
        const tone = cellTone(cell);
        counts[tone === 'error' ? 'differ' : tone] += 1;
    }

    return counts;
}

export function comparable(counts: Counts): number {
    return counts.match + counts.differ + counts.approved;
}

/** `154 of 180 match Figma or are approved.` + `26 don't.` */
export function headline(counts: Counts): { lead: string; tail: string } {
    const total = comparable(counts);
    const lead = counts.approved
        ? `${counts.match + counts.approved} of ${total} match Figma or are approved.`
        : `${counts.match} of ${total} match Figma.`;
    let tail = `${counts.differ} don't.`;
    if (counts.differ === 0) {
        tail = 'None differ.';
    } else if (counts.differ === 1) {
        tail = "1 doesn't.";
    }

    return { lead, tail };
}

/** Under the thumbnail: `47.0% · 3p`, `size mismatch`, `not in code`. */
export function cellMetric(cell: FigmaCellResult): string {
    const tone = cellTone(cell);
    if (tone === 'nocode') {
        return 'not in code';
    }
    if (tone === 'error') {
        return 'size mismatch';
    }
    const count = cell.spec.mismatches.length;

    return `${percent(cell.image.ratio)}${tone === 'differ' && count ? ` · ${count}p` : ''}`;
}

function whenText(props: Record<string, string>): string {
    return Object.entries(props)
        .map(([name, value]) => {
            return `${name}=${value}`;
        })
        .join(' · ');
}

function quote(value: string): string {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** `{ when: { State: 'Loading' }, reason: '' }`: an entry for the story's `approved` list (FigmaApproval). */
export function approvalSnippet(props: Record<string, string>, reason: string): string {
    const when = Object.entries(props)
        .map(([name, value]) => {
            return `${name}: [${quote(value)}]`;
        })
        .join(', ');

    return `{ when: { ${when} }, reason: ${quote(reason)} }`;
}

/** Props every cell shares: what an approval's `when` most likely was. */
export function commonProps(cells: FigmaCellResult[]): Record<string, string> {
    const [first, ...rest] = cells;
    if (!first) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(first.variant.props).filter(([name, value]) => {
            return rest.every((cell) => {
                return cell.variant.props[name] === value;
            });
        })
    );
}

export const CATEGORIES = ['Layout & size', 'Typography', 'Color', 'Content'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Spec property → the category the report and inspector group it under. */
export function issueCategory(property: string): Category {
    if (/^(background|colour|stroke colour|opacity|blend mode)$|shadow colour$/i.test(property)) {
        return 'Color';
    }
    if (/^font|^line height|^letter spacing|^text (case|decoration|align)$|^truncation$/i.test(property)) {
        return 'Typography';
    }
    if (/^(count|presence|glyph|fill type)$/i.test(property)) {
        return 'Content';
    }

    return 'Layout & size';
}

/** One cell in matrix order, with where it sits: what the inspector steps through. */
export type MatrixEntry = {
    block: FigmaBlockResult;
    /** Position of `block` in the story's blocks: with the variant id, a cell's key (cellKey). */
    blockIndex: number;
    cell: FigmaCellResult;
    section: string | null;
    row: string;
    column: string;
};

type MatrixSectionView = {
    title: string | null;
    columns: string[];
    /** Cells are indexes into `entries`, null where Figma draws no variant. */
    rows: { label: string; cells: (number | null)[] }[];
};

export type MatrixView = {
    entries: MatrixEntry[];
    blocks: { block: FigmaBlockResult; score: string; sections: MatrixSectionView[] }[];
};

export function matrixView(blocks: FigmaBlockResult[]): MatrixView {
    const entries: MatrixEntry[] = [];
    const views = blocks.map((block, blockIndex) => {
        const items = block.cells.map((cell) => {
            return { ...cell, props: cell.variant.props };
        });
        const sections = layoutMatrix(block.axes, block.layout, items).map((section) => {
            return {
                title: section.title,
                columns: section.columns,
                rows: section.rows.map((row) => {
                    return {
                        label: row.label,
                        cells: row.cells.map((cell, index) => {
                            if (!cell) {
                                return null;
                            }
                            entries.push({
                                block,
                                blockIndex,
                                cell,
                                section: section.title,
                                row: row.label,
                                column: section.columns[index] ?? '',
                            });

                            return entries.length - 1;
                        }),
                    };
                }),
            };
        });
        const counts = countTones(block.cells);

        return { block, score: `${counts.match + counts.approved}/${comparable(counts)}`, sections };
    });

    return { entries, blocks: views };
}

/** One cell across the story and the panel: a set can appear in two blocks, so the block's position counts. */
export function cellKey(blockIndex: number, variantId: string): string {
    return `${blockIndex}|${variantId}`;
}

/** Stacked-bar segments in a fixed order: match, approved, differ, not in code. */
export function barSegments(counts: Counts): { tone: 'match' | 'approved' | 'differ' | 'nocode'; value: number }[] {
    return (['match', 'approved', 'differ', 'nocode'] as const).map((tone) => {
        return { tone, value: counts[tone] };
    });
}

function entryTitle(entry: MatrixEntry): string {
    return [entry.row, entry.column].filter(Boolean).join(' · ') || entry.cell.variant.name;
}

export function cellAria(entry: MatrixEntry): string {
    const { cell } = entry;
    const tone = cellTone(cell);
    const pixels = cell.image.ratio === null ? '' : `, ${percent(cell.image.ratio)} of pixels differ`;
    const issues = cell.spec.mismatches.length ? `, ${cell.spec.mismatches.length} properties differ` : '';

    return `${entryTitle(entry)}: ${TONES[tone].label}${tone === 'nocode' ? '' : pixels + issues}`;
}

/** One side of a row for a prompt: the value, its kit token, and any non-token note (`inset-ring`, `padding: 2px`). */
function promptSide(value: FigmaIssue['expected']): string {
    const note = value.note ?? '';
    // Figma's bound variable reads in full (`var Surface/control = --color-surface-control`); other notes shorten to
    // their token plus any non-token detail (`inset-ring`, `padding: 2px 4px`).
    if (note.startsWith('var ')) {
        return `${value.text} (${note})`;
    }
    const token = tokenOf(note);
    const extra = note.includes(' · ') ? note.slice(note.indexOf(' · ') + 3) : '';
    const plain = token ? extra : note;
    const parts = [token, plain].filter(Boolean).join(', ');

    return parts ? `${value.text} (${parts})` : value.text;
}

/** `[value] Layout · Inset left at \`span\`: 8px → 4px (−4px; allowed ±1px).` Values read Figma → story. */
function findingLine(issue: IssueView): string {
    const at = issue.selector ? ` at \`${issue.selector}\`` : '';
    const delta = issue.delta ? `${issue.delta}; ` : '';
    let fix = issue.kind === 'wrong-token' ? tokenAdvice(issue.expected.note) : '';
    const contrast = contrastText(issue);
    if (issue.kind === 'a11y-deviation') {
        fix = ` ${contrast}: Figma's colour fails the minimum, the story's meets it. Keep the story's colour and approve the deviation (ADR 0002) instead of copying Figma.`;
    } else if (contrast && issue.contrast && issue.contrast.story < issue.contrast.required) {
        fix += ` Note: ${contrast}; the story's colour is below the minimum.`;
    }

    return `[${issue.kindLabel}] ${issue.element} · ${issue.property}${at}: ${promptSide(issue.expected)} → ${promptSide(issue.actual)} (${delta}allowed ${issue.tolerance}).${fix}`;
}

/**
 * What to use instead, by how sure the note is: Figma binds a variable the kit has a token for (`var X = --x`), or
 * only the nearest kit token by value is known (no binding, or a variable the kit renamed).
 */
function tokenAdvice(note: string | undefined): string {
    const token = tokenOf(note);
    if (!token) {
        return '';
    }
    if (/^var [^·]* = --/.test(note ?? '')) {
        return ` Use ${token} (the kit token for Figma's variable).`;
    }

    return note?.startsWith('var ')
        ? ` Figma's variable has no kit token by that name; its value equals ${token}.`
        : ` Figma's value is ${token} (nearest kit token by value; Figma binds no variable here).`;
}

/**
 * Findings for a prompt: root causes numbered, worst first, each with the rows that likely follow from it folded into
 * one line; token drift last and marked "don't change code" (the Figma variable moved, the token is right).
 */
function findingLines(views: IssueView[]): string[] {
    if (views.length === 0) {
        return [];
    }
    const lines = ['', 'Findings, most severe first (values read Figma → story):'];
    const drift: IssueView[] = [];
    const deviations: IssueView[] = [];
    let number = 0;
    for (const view of views) {
        if (view.causedBy !== null) {
            continue;
        }
        if (view.kind === 'token-drift') {
            drift.push(view);
            continue;
        }
        if (view.kind === 'a11y-deviation') {
            deviations.push(view);
            continue;
        }
        number += 1;
        lines.push(`${number}. ${findingLine(view)}`);
        const follows = views.filter((other) => {
            return other.causedBy === issueLabel(view);
        });
        if (follows.length) {
            lines.push(
                `   Likely follows from ${number}, recheck after fixing it: ${follows
                    .map((other) => {
                        return `${other.element} · ${other.property} (${other.expected.text} → ${other.actual.text})`;
                    })
                    .join('; ')}.`
            );
        }
    }
    if (drift.length) {
        lines.push('', "Token drift (same kit token both sides: Figma's variable value moved; don't change code):");
        for (const view of drift) {
            lines.push(`- ${findingLine(view)}`);
        }
    }
    if (deviations.length) {
        lines.push('', 'Accessibility deviations (approval candidates, not fixes):');
        for (const view of deviations) {
            lines.push(`- ${findingLine(view)}`);
        }
    }

    return lines;
}

/** The copyable prompt for a failing cell: where it is, what differs, how to verify. */
export function fixPrompt(story: Pick<FigmaStoryResult, 'title' | 'name'>, entry: MatrixEntry): string {
    const { cell, block } = entry;
    const lines = [
        `Fix ${story.title} story "${story.name}" → ${whenText(cell.variant.props)}.`,
        `Figma: ${block.set.name}.`,
    ];
    if (cell.image.ratio === null) {
        lines.push(cell.image.error ? imageErrorText(cell.image.error) : 'Pixels were not compared.');
    } else {
        lines.push(
            `Pixels differ ${percent(cell.image.ratio)} of the unmasked area (allowed ${percent(cell.image.maxRatio)}).`
        );
        const where = pixelWhere(cell);
        if (where && cell.image.ratio > 0) {
            lines.push(where);
        }
    }
    if (isPixelOnly(cell)) {
        lines.push(
            'No property mismatch: root size, radius, fill, stroke, shadows, opacity, layout (gaps, insets), texts (incl. case, decoration) and icons (box, colour, glyph) are within tolerance.'
        );
        lines.push(
            'The difference is inside the component (the shape of an inner glyph, a child fill or a gradient). Compare the Figma and story images.'
        );
    }
    lines.push(...findingLines(issueViews(cell.spec.mismatches)));
    lines.push('', 'Use tokens, not raw values. Leave matching variants unchanged.');
    lines.push(`Verify: run \`${COPY_COMMAND}\`, then Reload the Figma diff panel.`);

    return lines.join('\n');
}

/**
 * One prompt for every failing cell of a story: identical root findings (same row, same values) are listed once with
 * the variants they hit, worst and most widespread first, so a fix shared by many variants reads as one fix. Rows that
 * follow from another are left out (fixing the cause re-measures them); pixel-only cells are summarised by where
 * their largest difference sits.
 */
export function storyFixPrompt(story: Pick<FigmaStoryResult, 'title' | 'name'>, entries: MatrixEntry[]): string {
    const failing = entries.filter((entry) => {
        return isFailing(entry.cell);
    });
    const shared = commonProps(
        failing.map((entry) => {
            return entry.cell;
        })
    );
    const variantName = (entry: MatrixEntry) => {
        const own = Object.fromEntries(
            Object.entries(entry.cell.variant.props).filter(([name]) => {
                return !(name in shared);
            })
        );

        return whenText(own) || entry.cell.variant.name;
    };
    const sets = [
        ...new Set(
            failing.map((entry) => {
                return entry.block.set.name;
            })
        ),
    ].join(', ');
    const lines = [
        `Fix ${story.title} story "${story.name}": ${failing.length} variant${failing.length === 1 ? '' : 's'} differ from Figma (${sets}).`,
    ];
    if (Object.keys(shared).length) {
        lines.push(`All of them: ${whenText(shared)}.`);
    }
    type Group = { view: IssueView; variants: string[]; cells: FigmaCellResult[]; elements: Set<string> };
    const groups = new Map<string, Group>();
    const pixelOnly: string[] = [];
    const errors: string[] = [];
    for (const entry of failing) {
        const { cell } = entry;
        if (cell.image.ratio === null && cell.image.error) {
            errors.push(`${variantName(entry)}: ${imageErrorText(cell.image.error)}`);
        }
        if (isPixelOnly(cell)) {
            const where = cell.image.blob?.element ? ` mostly on \`${cell.image.blob.element}\`` : '';
            pixelOnly.push(`${variantName(entry)} (${percent(cell.image.ratio)}${where})`);
        }
        for (const view of issueViews(cell.spec.mismatches)) {
            if (view.causedBy !== null) {
                continue;
            }
            // Text and icon rows are named by per-variant content ("FAN 1", "Checkbox checked big"): group by slot and
            // where it sits instead, and list the names.
            const slot = /^(Text|Icon \d+) "/.exec(view.element)?.[1];
            const role = slot ? `${slot}@${view.selector ?? ''}` : view.element;
            const key = [view.kind, role, view.property, view.selector, view.expected.text, view.actual.text].join('|');
            const group = groups.get(key) ?? { view, variants: [], cells: [], elements: new Set<string>() };
            group.variants.push(variantName(entry));
            group.cells.push(cell);
            group.elements.add(view.element);
            groups.set(key, group);
        }
    }
    const ordered = [...groups.values()].sort((a, b) => {
        return b.view.severity - a.view.severity || b.variants.length - a.variants.length;
    });
    // `Size=Big, Type=Label: State=Updating · Tone=Neutral; State=Error · Tone=Negative`: props the group's variants
    // share are said once.
    const variantsText = (group: Pick<Group, 'variants' | 'cells'>) => {
        if (group.variants.length === failing.length && failing.length > 1) {
            return `all ${group.variants.length} variants`;
        }
        const common = Object.fromEntries(
            Object.entries(commonProps(group.cells)).filter(([name]) => {
                return !(name in shared);
            })
        );
        const names = group.cells.map((cell) => {
            return whenText(
                Object.fromEntries(
                    Object.entries(cell.variant.props).filter(([name]) => {
                        return !(name in shared) && !(name in common);
                    })
                )
            );
        });
        const shown = names.slice(0, 6).join('; ');
        const list = names.length > 6 ? `${shown}; +${names.length - 6} more` : shown;
        const head = whenText(common);

        return [head, list].filter(Boolean).join(': ') || `${group.variants.length} variants`;
    };
    const fixes = ordered.filter((group) => {
        return group.view.kind !== 'token-drift' && group.view.kind !== 'a11y-deviation';
    });
    const deviations = ordered.filter((group) => {
        return group.view.kind === 'a11y-deviation';
    });
    const drift = ordered.filter((group) => {
        return group.view.kind === 'token-drift';
    });
    if (fixes.length) {
        lines.push('', 'Findings, most severe and most widespread first (values read Figma → story):');
        fixes.forEach((group, index) => {
            const [slot] = /^(Text|Icon \d+)/.exec(group.view.element) ?? [''];
            const names = [...group.elements].map((element) => {
                return element.slice(slot.length + 1);
            });
            const view =
                group.elements.size > 1 ? { ...group.view, element: `${slot} ${names.join(', ')}` } : group.view;
            lines.push(`${index + 1}. ${findingLine(view)}`, `   In ${variantsText(group)}.`);
        });
    }
    if (pixelOnly.length) {
        lines.push(
            '',
            `Pixels only (every measured property matches; the difference is in a glyph shape, child fill or gradient): ${pixelOnly.join('; ')}.`
        );
    }
    if (errors.length) {
        lines.push(
            '',
            'Could not compare pixels:',
            ...errors.map((error) => {
                return `- ${error}`;
            })
        );
    }
    if (drift.length) {
        lines.push('', "Token drift (same kit token both sides: Figma's variable value moved; don't change code):");
        for (const group of drift) {
            lines.push(`- ${findingLine(group.view)} In ${variantsText(group)}.`);
        }
    }
    if (deviations.length) {
        lines.push('', 'Accessibility deviations (approval candidates, not fixes):');
        for (const group of deviations) {
            lines.push(`- ${findingLine(group.view)} In ${variantsText(group)}.`);
        }
    }
    lines.push(
        '',
        'Rows that follow from these (offsets, insets, widths) are left out: re-run after fixing and check what remains.',
        'Use tokens, not raw values. Leave matching variants unchanged.',
        `Verify: run \`${COPY_COMMAND}\`, then Reload the Figma diff panel.`
    );

    return lines.join('\n');
}

type InspectorCallout =
    | { kind: 'pixel' | 'error' | 'nocode' | 'match'; title: string | null; text: string }
    | { kind: 'approved'; title: string; text: string; code: string };

export type InspectorView = {
    place: string;
    title: string;
    when: string;
    tone: Tone;
    pixels: { text: string; over: boolean };
    allowed: string;
    properties: { text: string; over: boolean };
    callout: InspectorCallout | null;
    groups: { title: Category; issues: IssueView[] }[];
    ignored: string[];
    prompt: string | null;
    snippet: string;
};

function calloutOf(cell: FigmaCellResult, tone: Tone): InspectorCallout | null {
    if (tone === 'nocode') {
        return {
            kind: 'nocode',
            title: null,
            text: "Not in code. No story args produce this Figma variant, so there's nothing to compare. It isn't scored.",
        };
    }
    if (tone === 'match') {
        return {
            kind: 'match',
            title: null,
            text: 'Matches. Pixels and every measured property are within tolerance.',
        };
    }
    if (tone === 'approved') {
        const reason = cell.approval ?? '';

        return {
            kind: 'approved',
            title: 'Approved in story code',
            text: `“${reason}”`,
            code: approvalSnippet(commonProps([cell]), reason),
        };
    }
    if (tone === 'error') {
        return {
            kind: 'error',
            title: 'Comparator error',
            text: `${imageErrorText(cell.image.error ?? '')} Property checks below still ran.`,
        };
    }
    if (isPixelOnly(cell)) {
        return {
            kind: 'pixel',
            title: 'Fails on pixels only',
            text: `No measured property differs: root size, radius, fill, stroke, shadows, opacity, layout (gaps, insets), texts (incl. case, decoration) and icons (box, colour, glyph) are all within tolerance. The difference is inside the component (the shape of an inner glyph, a child fill or a gradient), which the spec doesn't measure.${pixelWhere(cell) ? ` ${pixelWhere(cell)}` : ''} Compare the images above.`,
        };
    }

    return null;
}

export function inspectorView(story: Pick<FigmaStoryResult, 'title' | 'name'>, entry: MatrixEntry): InspectorView {
    const { cell } = entry;
    const tone = cellTone(cell);
    const views = issueViews(cell.spec.mismatches);
    const groups = CATEGORIES.map((title) => {
        return {
            title,
            issues: views.filter((issue) => {
                return issueCategory(issue.property) === title;
            }),
        };
    })
        .filter((group) => {
            return group.issues.length > 0;
        })
        // Worst root cause first: a missing glyph (Content) reads before a 1px offset (Layout).
        .sort((a, b) => {
            const worst = (group: { issues: IssueView[] }) => {
                return Math.max(
                    ...group.issues.map((issue) => {
                        return issue.causedBy === null ? issue.severity : 0;
                    })
                );
            };

            return worst(b) - worst(a);
        });
    const failing = isFailing(cell);

    return {
        place: [entry.block.set.name, entry.section].filter(Boolean).join(' · '),
        title: entryTitle(entry),
        when: whenText(cell.variant.props),
        tone,
        pixels: {
            text: cell.image.ratio === null || tone === 'nocode' ? '—' : percent(cell.image.ratio),
            over: cell.image.ratio !== null && cell.image.ratio > cell.image.maxRatio && tone !== 'nocode',
        },
        allowed: percent(cell.image.maxRatio),
        properties: {
            text: tone === 'nocode' ? '—' : `${cell.spec.mismatches.length} differ`,
            over: cell.spec.mismatches.length > 0,
        },
        callout: calloutOf(cell, tone),
        groups,
        ignored: cell.spec.ignored.map(figmaIssueText),
        prompt: failing ? fixPrompt(story, entry) : null,
        snippet: approvalSnippet(cell.variant.props, ''),
    };
}

/** Image tiles in the inspector: Figma, story, and the explained difference (diff-map.ts) or why there's none. */
export type InspectorTile = {
    caption: string;
    src: string | null;
    message: string | null;
    diff: boolean;
    /** The two compared images, for the "what differs" map; `src` (the raw comparator diff) is its fallback. */
    explain: { reference: string; actual: string } | null;
};

/** Paths are project-relative. */
export function inspectorTiles(cell: FigmaCellResult): InspectorTile[] {
    const figma = { caption: 'figma@2x.png', src: cell.files.figma, message: null, diff: false, explain: null };
    if (!cell.files.actual) {
        return [figma, { caption: 'story · none', src: null, message: 'no story render', diff: false, explain: null }];
    }
    let diffMessage: string | null = null;
    if (!cell.files.diff) {
        diffMessage = cell.image.error ? 'sizes differ, could not compare pixels' : 'no differing pixels';
    }

    return [
        figma,
        { caption: 'story@2x.png', src: cell.files.actual, message: null, diff: false, explain: null },
        {
            caption: cell.files.diff ? 'what differs' : 'diff · none',
            src: cell.files.diff,
            message: diffMessage,
            diff: true,
            explain: cell.files.diff ? { reference: cell.files.reference, actual: cell.files.actual } : null,
        },
    ];
}

/** `20 Nov, 12:48`. */
export function ranText(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}
