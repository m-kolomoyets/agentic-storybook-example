// Shared by the Figma matrix tests (setup.ts, browser), the Node sync and commands, the report page and the
// Storybook panel. Browser-safe: no Node imports.

/** Relative to the project root; served in dev under `/${VISUAL_URL_PREFIX}/` (visual/figma/serve.ts). */
export const FIGMA_RESULTS_DIR = 'visual/.results/figma';
export const FIGMA_REFS_DIR = 'visual/figma/__refs__';
/** Figma PNGs flattened onto the comparison backdrop; what toMatchScreenshot compares against. Rebuilt every run. */
export const FIGMA_FLAT_REFS_DIR = `${FIGMA_RESULTS_DIR}/refs`;
export const VISUAL_URL_PREFIX = '__visual';
/** Figma export scale; the browser context runs at the same deviceScaleFactor. */
export const FIGMA_SCALE = 2;
/** Storybook global the "Figma diff" panel writes and FigmaMatrix reads. */
export const FIGMA_COMPARE_GLOBAL = 'figmaCompare';

export type FigmaCompareMode = 'off' | 'side' | 'onion' | 'difference';

export type Box = { x: number; y: number; width: number; height: number };
export type Rgba = { r: number; g: number; b: number; a: number };

/** A node's visible solid strokes, composited. `sides`: per-side weights (top, right, bottom, left) if they differ. */
export type FigmaStroke = {
    weight: number;
    sides: [number, number, number, number] | null;
    align: 'INSIDE' | 'OUTSIDE' | 'CENTER';
    color: Rgba;
    dashed: boolean;
};

/** A DROP_SHADOW (`inset: false`) or INNER_SHADOW, in CSS `box-shadow` terms (Figma `radius` = CSS blur). */
export type FigmaShadow = { inset: boolean; x: number; y: number; blur: number; spread: number; color: Rgba };

/**
 * The auto-layout frame that arranges the variant's content: the root, or the frame reached through single-child
 * auto-layout wrappers (their padding shows as the content inset either way, so it is measured geometrically).
 * `children`: its visible in-flow children, boxes relative to the variant root.
 */
export type FigmaLayout = {
    direction: 'HORIZONTAL' | 'VERTICAL';
    /** primaryAxisAlignItems: MIN, CENTER, MAX, SPACE_BETWEEN. Visible only when the container doesn't hug. */
    primaryAlign: string;
    /** counterAxisAlignItems: MIN, CENTER, MAX, BASELINE. */
    counterAlign: string;
    wrap: boolean;
    /** The container hugs along its direction: no free space, so `primaryAlign` can't show. */
    hugPrimary: boolean;
    children: { name: string; text: boolean; box: Box }[];
};

/**
 * Leaf geometry is relative to the variant root, in CSS px. Colors are 0–255 sRGB, alpha 0–1; a fill is every visible
 * SOLID paint composited bottom to top. Optional fields are absent from manifests synced before they were measured.
 */
export type FigmaSpec = {
    root: {
        name: string;
        width: number;
        height: number;
        radius: [number, number, number, number];
        /** Figma `layoutSizingHorizontal: HUG`: the width follows the content (and so the text's glyph advances). */
        hugWidth?: boolean;
        fill: Rgba | null;
        /** Visible paints the fill can't express (GRADIENT_LINEAR, IMAGE, …). */
        fillTypes?: string[];
        /** Product of node opacities from the variant down to the painted surface. */
        opacity?: number;
        stroke?: FigmaStroke | null;
        shadows?: FigmaShadow[];
        /** Figma `blendMode` when it isn't NORMAL / PASS_THROUGH. */
        blendMode?: string | null;
        /** LAYER_BLUR / BACKGROUND_BLUR radius, as Figma stores it. */
        blur?: { layer: number | null; background: number | null };
        layout?: FigmaLayout | null;
        /** Variable ids (variables.ts) bound to these properties. */
        vars?: Partial<
            Record<
                'fill' | 'stroke' | 'radius' | 'gap' | 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft',
                string
            >
        >;
    };
    texts: {
        characters: string;
        box: Box;
        fontFamily: string;
        fontSize: number;
        fontWeight: number;
        lineHeightPx: number;
        letterSpacing: number;
        color: Rgba | null;
        /** Figma enums. textCase: ORIGINAL, UPPER, LOWER, TITLE, SMALL_CAPS…; textDecoration: NONE, UNDERLINE… */
        textCase?: string;
        textDecoration?: string;
        textAlign?: string;
        /** WIDTH_AND_HEIGHT (box hugs the text: alignment can't show), HEIGHT, NONE, TRUNCATE. */
        autoResize?: string;
        truncate?: boolean;
        vars?: Partial<
            Record<'color' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'fontFamily' | 'fontWeight', string>
        >;
    }[];
    /** Glyph instances (no text inside), left-to-right then top-to-bottom. `component`: the main component's name. */
    icons: {
        name: string;
        component: string | null;
        box: Box;
        /** Topmost painted shape's fill (or stroke), alpha × every opacity from the instance down to it. */
        color?: Rgba | null;
        vars?: { color?: string };
    }[];
};

export type FigmaVariant = {
    /** Figma node id, e.g. `8882:16355`. */
    id: string;
    /** Figma's variant name, e.g. `Size=Big, State=Default`. */
    name: string;
    props: Record<string, string>;
    spec: FigmaSpec;
};

/** One component set, as cached in `${FIGMA_REFS_DIR}/<slug>/manifest.json` next to one PNG per variant. */
export type FigmaSetManifest = {
    source: { url: string; fileKey: string; nodeId: string; name: string; version: string; lastModified: string };
    /** VARIANT properties in Figma's order, each with its options in Figma's order: the matrix axes. */
    axes: { name: string; options: string[] }[];
    /** BOOLEAN properties. Figma renders only their defaults, so they can't be matrix axes. */
    booleans: { name: string; default: boolean }[];
    variants: FigmaVariant[];
};

/**
 * A known, deliberate deviation (ADR 0002): cells whose Figma props match `when` (every listed property takes one of
 * the listed options; omitted properties match anything) report `approved` instead of `fail`, with the reason shown.
 * They're still measured, so the numbers stay visible. Name the WCAG criterion or decision in `reason`.
 */
export type FigmaApproval = { when?: Record<string, string[]>; reason: string };

/** One component set in a matrix: which set, how to group its axes, and its approved deviations. */
export type FigmaMatrixBlock = { set: string; layout: FigmaMatrixLayout; approved?: FigmaApproval[] };

/** Story parameter: hold every cell of this story's FigmaMatrix blocks to their Figma variants. */
export type FigmaMatrixParameter = {
    blocks: FigmaMatrixBlock[];
    /** Share of pixels allowed to differ per cell. Default 5 %. */
    maxDiffRatio?: number;
    /** Approved spec deviations (ADR 0002) dropped from every cell; per-variant ones go in `approved`. */
    ignore?: FigmaIgnore[];
};

/**
 * Drops spec issues whose `property` equals this one (`Letter spacing`) and, when given, whose `element` equals this
 * one (`Text "FAN 1"`, `Component`). Matched on fields, not wording, so rephrasing a message can't un-ignore it.
 */
export type FigmaIgnore = { element?: string; property: string; reason: string };

/** `fileKey-nodeId` with single dashes (Vitest sanitises screenshot names: `--` → `-`, `:` → `-`). */
export function figmaSlug(fileKey: string, nodeId: string): string {
    return `${fileKey}-${variantSlug(nodeId)}`;
}

export function variantSlug(nodeId: string): string {
    return nodeId.replace(':', '-');
}

/** One side of a spec issue. `note`: nearest kit token for colours. `swatch`: CSS colour to paint next to it. */
export type FigmaIssueValue = { text: string; note?: string; swatch?: string };

/**
 * One spec property that differs from Figma, e.g. element `Text "FAN 1"`, property `Font size`, expected `12px`,
 * actual `10px`, delta `−2px`, tolerance `exact`. Rendered as expected/received rows by the panel and the report;
 * `figmaIssueText` (issues.ts) flattens it for test output.
 */
export type FigmaIssue = {
    element: string;
    property: string;
    /** Figma. */
    expected: FigmaIssueValue;
    /** The rendered story. */
    actual: FigmaIssueValue;
    /** Story minus Figma, for numeric properties: `+2px`, `−18 × +6px`. */
    delta?: string;
    /** What still counts as a match: `±1px`, `±3 per RGB channel`, `exact`. */
    tolerance: string;
    /** The measured element, from the component root: `button > span:nth-of-type(2) > svg`. */
    selector?: string;
    /**
     * Colour rows of text, glyphs and strokes: WCAG contrast against what each side is seen over, and the minimum
     * (1.4.3 text 4.5:1, 3:1 when large; 1.4.11 non-text 3:1). Absent where it doesn't apply (disabled controls).
     */
    contrast?: { figma: number; story: number; required: number; criterion: string };
};

export type FigmaCellResult = {
    variant: { id: string; name: string; props: Record<string, string> };
    /**
     * `missing`: Figma draws the variant, the code has no equivalent (renderCell returned null). `approved`: it
     * fails, but a FigmaApproval covers it. Neither fails the run.
     */
    status: 'pass' | 'fail' | 'approved' | 'missing';
    /** The FigmaApproval reason, when one matches. */
    approval: string | null;
    spec: { mismatches: FigmaIssue[]; ignored: FigmaIssue[] };
    image: {
        /** null when the comparator could not measure (e.g. sizes differ). */
        mismatchedPixels: number | null;
        /** Differing share of the area outside text masks (text is judged by spec). */
        ratio: number | null;
        maxRatio: number;
        /** Comparator message when it could not measure. */
        error: string | null;
        /** Differing pixels by kind (diff-map.ts), at 2x: drawn only in Figma, only in the story, other colour. */
        classes?: { figma: number; story: number; colour: number; masked: number } | null;
        /** Largest connected differing region, CSS px relative to the root, and the element drawn at its centre. */
        blob?: { area: number; box: Box; element: string | null } | null;
    };
    /** Relative to the project root. `reference`: Figma on the backdrop (compared); `figma`: Figma's own export. */
    files: { reference: string; figma: string; actual: string | null; diff: string | null };
};

export type FigmaBlockResult = {
    set: { name: string; url: string; version: string };
    layout: FigmaMatrixLayout;
    axes: FigmaSetManifest['axes'];
    cells: FigmaCellResult[];
};

/** One FigmaMatrix story's outcome: `${FIGMA_RESULTS_DIR}/results/<storyId>.json`. */
export type FigmaStoryResult = {
    storyId: string;
    title: string;
    name: string;
    blocks: FigmaBlockResult[];
    ranAt: string;
};

/** Every component set in the Figma file (`${FIGMA_REFS_DIR}/catalog.json`), for coverage. */
export type FigmaCatalog = {
    fileKey: string;
    syncedAt: string;
    sets: { nodeId: string; name: string; page: string; frame: string }[];
};

/** How a matrix groups Figma's axes: one block per `sections` option, `columns` across, the rest down. */
export type FigmaMatrixLayout = { sections: string | null; columns: string };
