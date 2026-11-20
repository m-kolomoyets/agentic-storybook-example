// Shared by the Figma reference test (setup.ts, browser), its Node commands, the report page and the Storybook panel.

/** Where results land, relative to the project root. Served in dev at `/${VISUAL_URL_PREFIX}/…` (.storybook/main.ts). */
export const FIGMA_RESULTS_DIR = 'visual/.results/figma';
export const FIGMA_REFS_DIR = 'visual/figma/__refs__';
export const VISUAL_URL_PREFIX = '__visual';

export type FigmaRefParameter = {
    /** Figma node URL of the exact variant (not the component set). */
    url: string;
    /** Element to compare; default: the story's first rendered element. */
    selector?: string;
    /** Share of pixels allowed to differ in the image comparison. Default 5 %. */
    maxDiffRatio?: number;
    /** Approved deviations (ADR 0002): mismatch lines containing any of these are dropped. Say why next to them. */
    ignore?: string[];
};

/** One story's outcome. Image paths are relative to the project root. */
export type FigmaResult = {
    storyId: string;
    title: string;
    name: string;
    figmaUrl: string;
    figmaNode: string;
    status: 'pass' | 'fail';
    spec: { mismatches: string[]; ignored: string[] };
    image: {
        /** null when the comparator could not measure (e.g. sizes differ). */
        mismatchedPixels: number | null;
        ratio: number | null;
        maxRatio: number;
        /** Comparator message when it could not measure. */
        error: string | null;
    };
    files: { reference: string; actual: string; diff: string | null };
    ranAt: string;
};
