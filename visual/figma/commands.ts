// Node side of the Figma matrix tests (visual/FIGMA-TESTING.md): file writes the browser can't do.
// Figma data itself is synced before the run (figma-api.ts) and read in the browser from the committed refs.
import type { BrowserCommand } from 'vitest/node';
import type { FigmaStoryResult } from './types.ts';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FIGMA_FLAT_REFS_DIR, FIGMA_RESULTS_DIR } from './types.ts';

/** Stores a backdrop-flattened Figma PNG that toMatchScreenshot compares against. */
export const figmaSaveFlatRef: BrowserCommand<[name: string, pngBase64: string]> = async (
    { project },
    name,
    pngBase64
) => {
    const dir = path.join(project.config.root, FIGMA_FLAT_REFS_DIR);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${path.basename(name)}.png`), Buffer.from(pngBase64, 'base64'));
};

/** Screenshot of one compared cell, keyed by the cell's `files.actual` path. */
export type FigmaCapture = { actual: string; refName: string; actualPngBase64: string };

/**
 * Persists one matrix story's outcome for the Storybook panel and the report page (visual/figma/report.ts).
 * toMatchScreenshot names its files after the compared ref (`refName`); they're renamed to the cell's own paths so
 * two stories held to the same variant don't overwrite each other.
 */
export const figmaSaveStoryResult: BrowserCommand<[result: FigmaStoryResult, captures: FigmaCapture[]]> = async (
    { project },
    result,
    captures
) => {
    const root = project.config.root;
    const comparatorFile = (refName: string, suffix: string) => {
        return path.join(root, FIGMA_RESULTS_DIR, `${refName}-${suffix}.png`);
    };
    await mkdir(path.join(root, FIGMA_RESULTS_DIR, 'results'), { recursive: true });
    const cells = result.blocks.flatMap((block) => {
        return block.cells;
    });
    for (const capture of captures) {
        const cell = cells.find((candidate) => {
            return candidate.files.actual === capture.actual;
        });
        if (!cell) {
            continue;
        }
        await writeFile(path.join(root, capture.actual), Buffer.from(capture.actualPngBase64, 'base64'));
        await rm(comparatorFile(capture.refName, 'actual'), { force: true });
        if (cell.files.diff) {
            await rename(comparatorFile(capture.refName, 'diff'), path.join(root, cell.files.diff));
        }
    }
    await writeFile(
        path.join(root, FIGMA_RESULTS_DIR, 'results', `${result.storyId}.json`),
        `${JSON.stringify(result, null, 4)}\n`
    );
};
