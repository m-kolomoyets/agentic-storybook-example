// How a cell result reads, in words: the plain-text form of a spec issue, the pixel share, comparator errors and a
// one-line conclusion. Shared by the test assertions (setup.ts), the FigmaMatrix story and, through view.ts, the
// Storybook "Figma diff" panel and the report page. Browser-safe: no Node or DOM imports.
import type { FigmaCellResult, FigmaIssue } from './types.ts';

/** `Text "FAN 1" · Font size: story 10px ≠ Figma 12px (−2px; allowed exact)`. Test output. */
export function figmaIssueText(issue: FigmaIssue): string {
    const delta = issue.delta ? `${issue.delta}; ` : '';

    return `${issue.element} · ${issue.property}: story ${issue.actual.text} ≠ Figma ${issue.expected.text} (${delta}allowed ${issue.tolerance})`;
}

/** Legend above the issue groups, and the ⓘ popover beside it. Panel and report inspectors. */
export const DELTA_HELP = {
    legend: 'Δ = story − Figma · allowed = tolerance',
    button: 'What do Δ and allowed mean?',
    title: 'Δ: how far the story is from Figma',
    lines: [
        'Δ = received (story) − expected (Figma). −2px: the story value is 2px smaller; +2px: 2px larger.',
        'Sizes read width × height (−2 × −2px). Shadows read x y blur spread.',
        'Colours show the largest RGB channel gap (0–255) and the alpha gap, unsigned.',
        'Allowed is the tolerance. A row is listed only when Δ falls outside it (±1px, ±3 per RGB channel, exact).',
    ],
} as const;

export function percent(ratio: number | null): string {
    if (ratio === null) {
        return 'n/a';
    }
    const value = ratio * 100;

    return `${value > 0 && value < 0.1 ? '<0.1' : value.toFixed(1)}%`;
}

/**
 * Where the pixels differ, in words: the largest differing region (CSS px, relative to the component) with the element
 * drawn there, and the differing pixels by kind. `null` when the run recorded no explanation.
 */
export function pixelWhere(cell: FigmaCellResult): string | null {
    const { blob, classes } = cell.image;
    if (!blob) {
        return null;
    }
    const round = (value: number) => {
        return Math.round(value * 10) / 10;
    };
    const on = blob.element ? ` on \`${blob.element}\`` : '';
    const where = `Largest differing region: ${round(blob.area)} px² at ${round(blob.box.x)}, ${round(blob.box.y)} (${round(blob.box.width)} × ${round(blob.box.height)})${on}.`;
    if (!classes) {
        return where;
    }
    const px = (count: number) => {
        return Math.round(count / 4);
    };
    const kinds = [
        classes.figma ? `${px(classes.figma)} px drawn only in Figma` : '',
        classes.story ? `${px(classes.story)} px drawn only in the story` : '',
        classes.colour ? `${px(classes.colour)} px in another colour` : '',
    ].filter(Boolean);

    return kinds.length ? `${where} Differing: ${kinds.join(', ')}.` : where;
}

/** Comparator messages carry Vitest paths and full reference names; keep the cause. */
export function imageErrorText(error: string): string {
    const cleaned = error.replace(/\s*Reference screenshot:[\s\S]*/, '').trim();
    const size = /Expected image dimensions to be (\d+)x(\d+)px, but received (\d+)x(\d+)px/.exec(cleaned);
    if (size) {
        return `Image sizes differ: Figma ${size[1]}×${size[2]}px, story ${size[3]}×${size[4]}px (at 2x). Fix the size first; the spec rows say which box is off.`;
    }

    return cleaned;
}

/** `Width 44px ≠ 62px · Height 30px ≠ 24px +1`: a failing cell's first issues; the approval for approved ones. */
export function cellConclusion(cell: FigmaCellResult): string | null {
    if (cell.status === 'approved') {
        return cell.approval;
    }
    if (cell.status !== 'fail') {
        return null;
    }
    if (cell.image.ratio === null && cell.image.error) {
        return imageErrorText(cell.image.error).split('(at 2x).')[0].trim();
    }
    const shown = cell.spec.mismatches.slice(0, 2).map((issue) => {
        const element = issue.element === 'Component' ? '' : `${issue.element} `;

        return `${element}${issue.property} ${issue.actual.text} ≠ ${issue.expected.text}`;
    });
    if (shown.length === 0) {
        const on = cell.image.blob?.element ? `, mostly on ${cell.image.blob.element}` : '';

        return `${percent(cell.image.ratio)} of pixels differ${on}, spec matches: glyph shape or child fill`;
    }
    const more = cell.spec.mismatches.length - shown.length;

    return `${shown.join(' · ')}${more > 0 ? ` +${more}` : ''}`;
}

/**
 * What kind of fix a row asks for. `structure`: something is missing, extra or a different thing (glyph, layer,
 * direction); `wrong-token`: both sides are kit tokens, different ones; `token-drift`: the same token on both sides,
 * so Figma's variable value moved and the code is right; `value`: a raw value off by some amount; `harness`: the
 * measurement, not the component (a font file that didn't load); `a11y-deviation`: the story differs from Figma
 * because Figma's colour fails a WCAG contrast minimum the story meets: an approval candidate (ADR 0002), not a fix.
 */
export type IssueKind = 'structure' | 'wrong-token' | 'token-drift' | 'a11y-deviation' | 'value' | 'harness';

export const KIND_LABELS: Record<IssueKind, string> = {
    structure: 'structure',
    'wrong-token': 'wrong token',
    'token-drift': 'token drift',
    'a11y-deviation': 'a11y deviation',
    value: 'value',
    harness: 'harness',
};

const STRUCTURE =
    /^(Presence|Count|Glyph|Direction|Wrap|Fill type|Truncation|Text decoration|Text case|Blend mode|Layer blur|Background blur|Stroke position|Stroke style)$/;
const ABSENT = /^(none|not found|unpainted|not a kit icon|one stroke)$/;

/**
 * The kit token a value's note names: the one it equals (`var Surface/control = --color-surface-control`,
 * `= --color-a → --color-b +2` → `--color-a`), else the first one mentioned (`≈ --color-a (Δ4)`); null when none.
 */
export function tokenOf(note: string | undefined): string | null {
    return /= (--[\w-]+)/.exec(note ?? '')?.[1] ?? /--[\w-]+/.exec(note ?? '')?.[0] ?? null;
}

/** The note names a token the value equals exactly (`= --x`), not just the nearest one (`≈ --x`). */
function isExact(note: string | undefined): boolean {
    return /(^|\s)= --/.test(note ?? '');
}

export function issueKind(issue: FigmaIssue): IssueKind {
    if (issue.property === 'Font file') {
        return 'harness';
    }
    const contrast = issue.contrast;
    if (contrast && contrast.story >= contrast.required && contrast.figma < contrast.required) {
        return 'a11y-deviation';
    }
    if (STRUCTURE.test(issue.property) || ABSENT.test(issue.expected.text) || ABSENT.test(issue.actual.text)) {
        return 'structure';
    }
    const expected = tokenOf(issue.expected.note);
    const actual = tokenOf(issue.actual.note);
    if (expected && expected === actual) {
        return 'token-drift';
    }
    if (expected && actual && isExact(issue.expected.note) && isExact(issue.actual.note)) {
        return 'wrong-token';
    }

    return 'value';
}

/** Both sides map to the same kit token, so the Figma variable's value has drifted; the code is right. */
export function isDrift(issue: FigmaIssue): boolean {
    return issueKind(issue) === 'token-drift';
}

/** 1 slight, 2 moderate, 3 major. */
export type Severity = 1 | 2 | 3;

function numbers(text: string | undefined): number[] {
    return [...(text ?? '').matchAll(/\d+(?:\.\d+)?/g)].map((match) => {
        return Number(match[0]);
    });
}

/**
 * How bad one row is: structure is major; a wrong token moderate; drift slight (the code is right); a value by how
 * many tolerances it's past (alpha counts in 0–255 steps, like the RGB channels).
 */
export function issueSeverity(issue: FigmaIssue): Severity {
    const kind = issueKind(issue);
    if (kind === 'structure') {
        return 3;
    }
    if (kind === 'wrong-token') {
        return 2;
    }
    if (kind === 'token-drift' || kind === 'harness' || kind === 'a11y-deviation') {
        return 1;
    }
    if (!issue.delta) {
        return 2;
    }
    // A colour's delta leads with its seen difference (`ΔEOK 0.684 · …`), judged against `ΔEOK ≤ 0.01`.
    if (issue.delta.startsWith('ΔEOK')) {
        const seen = numbers(issue.delta)[0] ?? 0;
        const over = seen / (numbers(issue.tolerance)[0] || 0.01);
        if (over >= 4) {
            return 3;
        }

        return over >= 2 ? 2 : 1;
    }
    const colour = issue.delta.includes('RGB');
    const off = Math.max(
        ...numbers(issue.delta).map((value) => {
            return colour && value < 1 ? value * 255 : value;
        }),
        0
    );
    // Under a pixel can't be major however tight its tolerance (letter spacing: 0.4px against ±0.05px).
    if (!colour && issue.delta.includes('px') && off < 1) {
        return 1;
    }
    const allowed = numbers(issue.tolerance)[0] || 1;
    const over = off / allowed;
    if (over >= 4) {
        return 3;
    }

    return over >= 2 ? 2 : 1;
}

function rowIs(issue: FigmaIssue, element: RegExp, property: RegExp): boolean {
    return element.test(issue.element) && property.test(issue.property);
}

/**
 * Rows that usually follow from another row of the same cell: fix the cause and they tend to go away. In order; a row
 * takes the first rule whose cause is present (and isn't the row itself).
 */
const FOLLOWS: {
    cause: (issue: FigmaIssue) => boolean;
    follower: (issue: FigmaIssue, cause: FigmaIssue) => boolean;
}[] = [
    {
        // A missing or extra glyph / text run moves and resizes everything around it.
        cause: (issue) => {
            return /^(Count|Presence)$/.test(issue.property);
        },
        follower: (issue) => {
            return (
                /^(Left offset|Position \(x, y\)|Vertical centre)$/.test(issue.property) ||
                rowIs(issue, /^Component$/, /^(Width|Height)$/) ||
                rowIs(issue, /^Layout$/, /^(Inset|Gap )/)
            );
        },
    },
    {
        cause: (issue) => {
            return rowIs(issue, /^Component$/, /^Height$/);
        },
        follower: (issue) => {
            return (
                rowIs(issue, /^Layout$/, /^Inset (top|bottom)/) ||
                /^(Vertical centre|Position \(x, y\))$/.test(issue.property)
            );
        },
    },
    {
        cause: (issue) => {
            return rowIs(issue, /^Layout$/, /^(Inset left|Gap )/);
        },
        follower: (issue) => {
            return (
                /^(Left offset|Position \(x, y\))$/.test(issue.property) ||
                rowIs(issue, /^Component$/, /^Width$/) ||
                rowIs(issue, /^Layout$/, /^Inset right/)
            );
        },
    },
    {
        cause: (issue) => {
            return rowIs(issue, /^Icon /, /^Size$/);
        },
        follower: (issue, cause) => {
            return (
                (issue.element !== cause.element && /^(Left offset|Position \(x, y\))$/.test(issue.property)) ||
                rowIs(issue, /^Component$/, /^(Width|Height)$/) ||
                rowIs(issue, /^Layout$/, /^Inset/)
            );
        },
    },
    {
        cause: (issue) => {
            return rowIs(issue, /^Text /, /^(Font size|Font family|Font weight|Font file)$/);
        },
        follower: (issue, cause) => {
            return (
                (issue.element === cause.element && /^(Width|Vertical centre|Line height)$/.test(issue.property)) ||
                (issue.element !== cause.element && /^(Left offset|Position \(x, y\))$/.test(issue.property)) ||
                rowIs(issue, /^Component$/, /^(Width|Height)$/) ||
                rowIs(issue, /^Layout$/, /^Inset/)
            );
        },
    },
    {
        cause: (issue) => {
            return rowIs(issue, /^Text /, /^Line height$/);
        },
        follower: (issue, cause) => {
            return (
                (issue.element === cause.element && issue.property === 'Vertical centre') ||
                rowIs(issue, /^Component$/, /^Height$/) ||
                rowIs(issue, /^Layout$/, /^Inset (top|bottom)/)
            );
        },
    },
    {
        cause: (issue) => {
            return rowIs(issue, /^Text /, /^Width$/);
        },
        follower: (issue, cause) => {
            return (
                (issue.element !== cause.element && /^(Left offset|Position \(x, y\))$/.test(issue.property)) ||
                rowIs(issue, /^Component$/, /^Width$/) ||
                rowIs(issue, /^Layout$/, /^Inset right/)
            );
        },
    },
    {
        cause: (issue) => {
            return rowIs(issue, /^Component$/, /^Width$/);
        },
        follower: (issue) => {
            return rowIs(issue, /^Layout$/, /^Inset right/);
        },
    },
];

/** `Component · Height`: how a row is named when another row points at it. */
export function issueLabel(issue: FigmaIssue): string {
    return `${issue.element} · ${issue.property}`;
}

/**
 * For each row, the index of the row it likely follows from, or null for a root cause. Chains resolve to the root
 * (a text offset ← its width ← its font size points at the font size).
 */
export function issueCauses(issues: FigmaIssue[]): (number | null)[] {
    const direct = issues.map((issue, index) => {
        for (const rule of FOLLOWS) {
            const cause = issues.findIndex((candidate, at) => {
                return at !== index && rule.cause(candidate) && rule.follower(issue, candidate);
            });
            if (cause !== -1) {
                return cause;
            }
        }

        return null;
    });

    return direct.map((cause) => {
        let root = cause;
        const seen = new Set<number>();
        while (root !== null && direct[root] !== null && !seen.has(root)) {
            seen.add(root);
            root = direct[root] ?? null;
        }

        return root;
    });
}

/** `contrast Figma 1.3:1 · story 19.6:1 · needs 3:1 (WCAG 1.4.11 non-text)`, or null for rows without it. */
export function contrastText(issue: FigmaIssue): string | null {
    const contrast = issue.contrast;

    return contrast
        ? `contrast Figma ${contrast.figma}:1 · story ${contrast.story}:1 · needs ${contrast.required}:1 (${contrast.criterion})`
        : null;
}
