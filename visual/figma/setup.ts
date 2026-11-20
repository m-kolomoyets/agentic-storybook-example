// Figma matrix checks (visual/FIGMA-TESTING.md), for stories tagged `figma` that render <FigmaMatrix>.
// After the play function, each `[data-figma-variant]` cell is held to its Figma variant: 1) spec: layout/type/colour
// within 1px, 2) image: pixelmatch against Figma's 2x PNG within `maxDiffRatio`. `[data-figma-missing]` cells (no code
// equivalent) are recorded, not failed. Soft assertions, so one run reports every cell; the outcome is saved for the
// Storybook "Figma diff" panel and the report page.
import type { FigmaCapture } from './commands.ts';
import type {
    FigmaApproval,
    FigmaBlockResult,
    FigmaCellResult,
    FigmaMatrixParameter,
    FigmaStoryResult,
} from './types.ts';
import { afterEach, beforeEach, expect } from 'vitest';
import { commands, page } from 'vitest/browser';
import { figmaSet } from './manifests.ts';
import { figmaSpecMismatches, textMasks } from './spec.ts';
import { FIGMA_FLAT_REFS_DIR, FIGMA_REFS_DIR, FIGMA_RESULTS_DIR, FIGMA_SCALE, variantSlug } from './types.ts';

declare module 'vitest/browser' {
    interface BrowserCommands {
        figmaSaveFlatRef: (name: string, pngBase64: string) => Promise<void>;
        figmaSaveStoryResult: (result: FigmaStoryResult, captures: FigmaCapture[]) => Promise<void>;
    }
}

// Pilot (Button md, 2x): text anti-aliasing alone differs on ~3 % of pixels (Figma's text renderer ≠ Chromium's).
const DEFAULT_MAX_DIFF_RATIO = 0.05;
/** Long enough for a rendered, motion-frozen story to settle; short, as a mismatch retries until it expires. */
const SCREENSHOT_TIMEOUT = 1500;

// Same freeze as visual/diy/setup.ts. The page keeps the kit's own ground (`html` paints surface-ground): the kit's
// colours are translucent white, so only the real dark ground shows them as drawn. Figma's transparent export is
// flattened onto that same colour (flattenOnBackdrop), because a screenshot in Vitest's iframe can't keep alpha.
const STABILIZE_CSS = `
*, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
}
`;

beforeEach(() => {
    const style = document.createElement('style');
    style.dataset.vrt = '';
    style.textContent = STABILIZE_CSS;
    document.head.append(style);

    return () => {
        style.remove();
    };
});

type Box = { x: number; y: number; width: number; height: number };

/** Mask colour for text boxes, painted identically on Figma's ref and over the story (`textMasks`). */
const MASK = '#ff00ff';

/**
 * Composites Figma's transparent export onto the page ground, in the same browser that rendered the story, and paints
 * the text masks (CSS px, scaled to the 2x export).
 */
async function flattenOnBackdrop(pngUrl: string, backdrop: string, masks: Box[]): Promise<string> {
    const image = new Image();
    image.src = pngUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('2d canvas unavailable');
    }
    context.fillStyle = backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    context.fillStyle = MASK;
    for (const mask of masks) {
        context.fillRect(
            mask.x * FIGMA_SCALE,
            mask.y * FIGMA_SCALE,
            mask.width * FIGMA_SCALE,
            mask.height * FIGMA_SCALE
        );
    }

    return canvas.toDataURL('image/png').slice('data:image/png;base64,'.length);
}

/**
 * Exact mismatched-pixel count. The comparator runs at zero tolerance (it writes the diff image on any difference),
 * and its message carries the count; the story's tolerance is applied by the caller. `null` + message when it
 * could not measure (sizes differ, no reference).
 */
async function measureImage(root: Element, refName: string): Promise<{ pixels: number | null; error: string | null }> {
    try {
        await expect(page.elementLocator(root)).toMatchScreenshot(refName, {
            timeout: SCREENSHOT_TIMEOUT,
            comparatorName: 'pixelmatch',
            comparatorOptions: { threshold: 0.1, allowedMismatchedPixels: 0 },
        });

        return { pixels: 0, error: null };
    } catch (error) {
        // The matcher colours its message; strip ANSI escapes before reading the count.
        const message = (error as Error).message.replaceAll(/\u001b\[[\d;]*m/g, '');
        const count = /(\d+) pixels \(ratio [\d.]+\) differ/.exec(message)?.[1];

        return count === undefined
            ? { pixels: null, error: message.replaceAll(/\s+/g, ' ').trim().slice(0, 400) }
            : { pixels: Number(count), error: null };
    }
}

/** Paints the same text masks over the rendered cell; returns a cleanup that removes them. */
function maskCell(cell: HTMLElement, masks: Box[]): () => void {
    const layers = masks.map((mask) => {
        const layer = document.createElement('div');
        Object.assign(layer.style, {
            position: 'absolute',
            left: `${mask.x}px`,
            top: `${mask.y}px`,
            width: `${mask.width}px`,
            height: `${mask.height}px`,
            background: MASK,
            zIndex: '2147483647',
            pointerEvents: 'none',
        });
        cell.append(layer);

        return layer;
    });

    return () => {
        for (const layer of layers) {
            layer.remove();
        }
    };
}

/**
 * Frames the cell for capture: clipped to Figma's exact box, on a whole CSS pixel. Text widths are fractional and
 * Playwright rounds an element's clip out to whole CSS pixels, so an unclipped capture comes out a pixel off Figma's
 * export and can't be compared at all. Real size drift is the spec check's job (root size within 1px).
 */
function frameCell(cell: HTMLElement, root: Element, width: number, height: number) {
    Object.assign(cell.style, { width: `${width}px`, height: `${height}px`, overflow: 'hidden' });
    const rect = root.getBoundingClientRect();
    cell.style.translate = `${Math.round(rect.x) - rect.x}px ${Math.round(rect.y) - rect.y}px`;
}

type MatrixStory = { parameters: { figmaMatrix?: FigmaMatrixParameter } };

afterEach(async (context) => {
    const story = (context as { story?: MatrixStory }).story;
    const matrix = story?.parameters.figmaMatrix;
    const storyId = context.task.meta.storyId;
    if (context.task.result?.state === 'fail' || !matrix || !storyId) {
        return;
    }

    await document.fonts.ready;
    const backdrop = getComputedStyle(document.documentElement).backgroundColor;
    const maxRatio = matrix.maxDiffRatio ?? DEFAULT_MAX_DIFF_RATIO;
    const isApproved = (line: string) => {
        return (
            matrix.ignore?.some((approved) => {
                return line.includes(approved);
            }) ?? false
        );
    };

    const approvalFor = (approved: FigmaApproval[] | undefined, props: Record<string, string>) => {
        return (
            approved?.find((approval) => {
                return Object.entries(approval.when ?? {}).every(([name, options]) => {
                    return options.includes(props[name] ?? '');
                });
            })?.reason ?? null
        );
    };

    const blocks: FigmaBlockResult[] = [];
    const captures: FigmaCapture[] = [];
    for (const block of matrix.blocks) {
        const entry = figmaSet(block.set);
        if (!entry) {
            throw new Error(`Figma set ${block.set} not synced. Run \`pnpm vrt figma\`.`);
        }
        const container = document.querySelector(`[data-figma-block="${CSS.escape(block.set)}"]`);
        if (!container) {
            throw new Error(`FigmaMatrix block for ${entry.manifest.source.name} not rendered.`);
        }
        const cells: FigmaCellResult[] = [];
        for (const variant of entry.manifest.variants) {
            const figmaFile = `${FIGMA_REFS_DIR}/${entry.slug}/${variantSlug(variant.id)}.png`;
            const cell = container.querySelector<HTMLElement>(`[data-figma-variant="${CSS.escape(variant.id)}"]`);
            const root = cell?.firstElementChild;
            if (!cell || !root) {
                // `[data-figma-missing]`, or filtered out by the layout: Figma draws it, the code doesn't.
                cells.push({
                    variant: { id: variant.id, name: variant.name, props: variant.props },
                    status: 'missing',
                    approval: null,
                    spec: { mismatches: [], ignored: [] },
                    image: { mismatchedPixels: null, ratio: null, maxRatio, error: null },
                    files: { reference: figmaFile, figma: figmaFile, actual: null, diff: null },
                });
                continue;
            }
            // Spec first, on the unframed layout; then frame the cell for the pixel comparison.
            const all = figmaSpecMismatches(root, variant.spec);
            frameCell(cell, root, variant.spec.root.width, variant.spec.root.height);
            const refName = `${entry.slug}-${variantSlug(variant.id)}`;
            const cellName = `${storyId}-${variantSlug(variant.id)}`;
            // Text is judged by spec; pixels judge everything else (textMasks).
            const masks = textMasks(root, variant.spec);
            await commands.figmaSaveFlatRef(refName, await flattenOnBackdrop(entry.pngUrl(variant), backdrop, masks));

            const mismatches = all.filter((line) => {
                return !isApproved(line);
            });
            const unmask = maskCell(cell, masks);
            const { pixels, error } = await measureImage(cell, refName);
            unmask();
            const area = variant.spec.root.width * variant.spec.root.height * FIGMA_SCALE ** 2;
            const ratio = pixels === null ? null : pixels / area;
            const actual = `${FIGMA_RESULTS_DIR}/${cellName}-actual.png`;
            const matches = mismatches.length === 0 && ratio !== null && ratio <= maxRatio;
            const approval = matches ? null : approvalFor(block.approved, variant.props);
            let status: FigmaCellResult['status'] = 'fail';
            if (matches) {
                status = 'pass';
            } else if (approval) {
                status = 'approved';
            }

            cells.push({
                variant: { id: variant.id, name: variant.name, props: variant.props },
                status,
                approval,
                spec: { mismatches, ignored: all.filter(isApproved) },
                image: { mismatchedPixels: pixels, ratio, maxRatio, error },
                files: {
                    reference: `${FIGMA_FLAT_REFS_DIR}/${refName}.png`,
                    figma: figmaFile,
                    actual,
                    diff: pixels ? `${FIGMA_RESULTS_DIR}/${cellName}-diff.png` : null,
                },
            });
            captures.push({ actual, refName, actualPngBase64: await page.screenshot({ element: cell, save: false }) });
        }
        blocks.push({
            set: { name: entry.manifest.source.name, url: block.set, version: entry.manifest.source.version },
            layout: block.layout,
            axes: entry.manifest.axes,
            cells,
        });
    }

    await commands.figmaSaveStoryResult(
        {
            storyId,
            // Composed stories carry no title; addon-vitest records the component name instead.
            title: (context.task.meta as { componentName?: string }).componentName ?? context.task.file.name,
            name: context.task.name,
            blocks,
            ranAt: new Date().toISOString(),
        },
        captures
    );

    const compared = blocks.flatMap((block) => {
        return block.cells.filter((cell) => {
            return cell.status !== 'missing';
        });
    });
    expect(compared.length, 'FigmaMatrix rendered no cells').toBeGreaterThan(0);
    for (const cell of compared.filter((candidate) => {
        return candidate.status !== 'approved';
    })) {
        const label = cell.variant.name;
        expect.soft(cell.spec.mismatches, `Figma spec: ${label}`).toEqual([]);
        expect.soft(cell.image.error, `Figma image: ${label}`).toBeNull();
        if (cell.image.ratio !== null) {
            expect
                .soft(cell.image.ratio, `Figma image: ${label}: ${(cell.image.ratio * 100).toFixed(2)} % differ`)
                .toBeLessThanOrEqual(maxRatio);
        }
    }
});
