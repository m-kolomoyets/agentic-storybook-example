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

/** Leaf geometry is relative to the variant root, in CSS px. Colors are 0–255 sRGB, alpha 0–1. */
export type FigmaSpec = {
    root: { name: string; width: number; height: number; radius: [number, number, number, number]; fill: Rgba | null };
    texts: {
        characters: string;
        box: Box;
        fontFamily: string;
        fontSize: number;
        fontWeight: number;
        lineHeightPx: number;
        letterSpacing: number;
        color: Rgba | null;
    }[];
    /** Glyph instances (no text inside), left-to-right then top-to-bottom. `component`: the main component's name. */
    icons: { name: string; component: string | null; box: Box }[];
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
    /** Approved deviations (ADR 0002): mismatch lines containing any of these are dropped. Say why next to them. */
    ignore?: string[];
};

/** `fileKey-nodeId` with single dashes (Vitest sanitises screenshot names: `--` → `-`, `:` → `-`). */
export function figmaSlug(fileKey: string, nodeId: string): string {
    return `${fileKey}-${variantSlug(nodeId)}`;
}

export function variantSlug(nodeId: string): string {
    return nodeId.replace(':', '-');
}

export type FigmaCellResult = {
    variant: { id: string; name: string; props: Record<string, string> };
    /**
     * `missing`: Figma draws the variant, the code has no equivalent (renderCell returned null). `approved`: it
     * fails, but a FigmaApproval covers it. Neither fails the run.
     */
    status: 'pass' | 'fail' | 'approved' | 'missing';
    /** The FigmaApproval reason, when one matches. */
    approval: string | null;
    spec: { mismatches: string[]; ignored: string[] };
    image: {
        /** null when the comparator could not measure (e.g. sizes differ). */
        mismatchedPixels: number | null;
        ratio: number | null;
        maxRatio: number;
        /** Comparator message when it could not measure. */
        error: string | null;
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
