// Node side of the Figma reference project (visual/README.md → "Figma reference").
// `figmaRef(url)` returns the reference for one Figma node: a 2x PNG (compared by toMatchScreenshot) and a trimmed
// layout/type spec (compared by visual/figma/spec.ts). Both are cached in visual/figma/__refs__ (committed), so runs
// are offline and a Figma change shows up as a git diff. FIGMA_REFRESH=1 refetches; FIGMA_TOKEN is only read here,
// never shipped to the browser.
import type { FigmaResult } from './types.ts';
import type { BrowserCommand } from 'vitest/node';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FIGMA_REFS_DIR, FIGMA_RESULTS_DIR } from './types.ts';
/** Figma export scale; the browser context runs at the same deviceScaleFactor. */
export const FIGMA_SCALE = 2;

const API = 'https://api.figma.com/v1';

type Box = { x: number; y: number; width: number; height: number };
type Rgba = { r: number; g: number; b: number; a: number };

/** Leaf geometry is relative to the root node, in CSS px. Colors are 0–255 sRGB, alpha 0–1. */
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
    /** Icon / glyph instances, sorted left-to-right then top-to-bottom. */
    icons: { name: string; box: Box }[];
};

export type FigmaRef = {
    /** Screenshot name; resolves to `${FIGMA_REFS_DIR}/${name}.png`. */
    name: string;
    spec: FigmaSpec;
};

type Paint = {
    type: string;
    visible?: boolean;
    opacity?: number;
    color?: { r: number; g: number; b: number; a: number };
};
type FigmaNode = {
    id: string;
    name: string;
    type: string;
    visible?: boolean;
    characters?: string;
    absoluteBoundingBox: Box;
    fills?: Paint[];
    cornerRadius?: number;
    rectangleCornerRadii?: [number, number, number, number];
    style?: { fontFamily: string; fontSize: number; fontWeight: number; lineHeightPx: number; letterSpacing: number };
    children?: FigmaNode[];
};

function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } {
    const parsed = new URL(url);
    const fileKey = /\/(?:design|file)\/([^/]+)/.exec(parsed.pathname)?.[1];
    const nodeId = parsed.searchParams.get('node-id')?.replace('-', ':');
    if (!fileKey || !nodeId) {
        throw new Error(`Not a Figma node URL: ${url}`);
    }

    return { fileKey, nodeId };
}

async function figmaGet<T>(endpoint: string): Promise<T> {
    const token = process.env.FIGMA_TOKEN;
    if (!token) {
        throw new Error('FIGMA_TOKEN missing (.env.local) and the reference is not cached yet.');
    }
    const response = await fetch(`${API}${endpoint}`, { headers: { 'X-Figma-Token': token } });
    if (!response.ok) {
        throw new Error(`Figma ${endpoint}: ${response.status} ${await response.text()}`);
    }

    return (await response.json()) as T;
}

function solidFill(fills: Paint[] | undefined): Rgba | null {
    const paint = fills?.find((fill) => {
        return fill.visible !== false && fill.type === 'SOLID';
    });
    if (!paint?.color) {
        return null;
    }
    const { r, g, b, a } = paint.color;

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
        a: Math.round(a * (paint.opacity ?? 1) * 1000) / 1000,
    };
}

function relativeBox(box: Box, origin: Box): Box {
    return { x: box.x - origin.x, y: box.y - origin.y, width: box.width, height: box.height };
}

/** Flattens the node tree to what the DOM can be held to: root box + visible text runs + visible icon instances. */
function toSpec(root: FigmaNode): FigmaSpec {
    const origin = root.absoluteBoundingBox;
    const spec: FigmaSpec = {
        root: {
            name: root.name,
            width: origin.width,
            height: origin.height,
            radius:
                root.rectangleCornerRadii ?? ([0, 0, 0, 0].fill(root.cornerRadius ?? 0) as FigmaSpec['root']['radius']),
            fill: solidFill(root.fills),
        },
        texts: [],
        icons: [],
    };

    function walk(node: FigmaNode) {
        if (node.visible === false) {
            return;
        }
        if (node.type === 'TEXT' && node.style) {
            spec.texts.push({
                characters: node.characters ?? '',
                box: relativeBox(node.absoluteBoundingBox, origin),
                fontFamily: node.style.fontFamily,
                fontSize: node.style.fontSize,
                fontWeight: node.style.fontWeight,
                lineHeightPx: node.style.lineHeightPx,
                letterSpacing: node.style.letterSpacing,
                color: solidFill(node.fills),
            });

            return;
        }
        // An instance with no text inside is a glyph (icon, spinner, avatar): compare its box, not its insides.
        if (node !== root && node.type === 'INSTANCE' && !JSON.stringify(node.children ?? []).includes('"TEXT"')) {
            spec.icons.push({ name: node.name, box: relativeBox(node.absoluteBoundingBox, origin) });

            return;
        }
        node.children?.forEach(walk);
    }
    walk(root);
    spec.icons.sort((a, b) => {
        return a.box.x - b.box.x || a.box.y - b.box.y;
    });

    return spec;
}

async function fetchReference(fileKey: string, nodeId: string, pngFile: string, specFile: string) {
    const nodes = await figmaGet<{
        version: string;
        lastModified: string;
        nodes: Record<string, { document: FigmaNode }>;
    }>(`/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`);
    const document = nodes.nodes[nodeId]?.document;
    if (!document) {
        throw new Error(`Figma node ${nodeId} not found in ${fileKey}.`);
    }
    // use_absolute_bounds: crop to the node box; effects (shadows) outside it drop out, as in an element screenshot.
    const images = await figmaGet<{ images: Record<string, string | null> }>(
        `/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=${FIGMA_SCALE}&use_absolute_bounds=true`
    );
    const imageUrl = images.images[nodeId];
    if (!imageUrl) {
        throw new Error(`Figma could not render node ${nodeId}.`);
    }
    const png = await fetch(imageUrl);
    if (!png.ok) {
        throw new Error(`Figma image download: ${png.status}`);
    }

    const spec = toSpec(document);
    await mkdir(path.dirname(pngFile), { recursive: true });
    await writeFile(pngFile, Buffer.from(await png.arrayBuffer()));
    await writeFile(
        specFile,
        `${JSON.stringify({ source: { fileKey, nodeId, version: nodes.version, lastModified: nodes.lastModified }, spec }, null, 4)}\n`
    );

    return spec;
}

export const figmaRef: BrowserCommand<[url: string]> = async ({ project }, url): Promise<FigmaRef> => {
    const { fileKey, nodeId } = parseFigmaUrl(url);
    // Single dashes only: Vitest sanitises screenshot names (`--` → `-`).
    const name = `${fileKey}-${nodeId.replace(':', '-')}`;
    const pngFile = path.join(project.config.root, FIGMA_REFS_DIR, `${name}.png`);
    const specFile = path.join(project.config.root, FIGMA_REFS_DIR, `${name}.json`);

    if (process.env.FIGMA_REFRESH !== '1') {
        try {
            const cached = JSON.parse(await readFile(specFile, 'utf8')) as { spec: FigmaSpec };
            await readFile(pngFile);

            return { name, spec: cached.spec };
        } catch {
            // Not cached yet: fetch below.
        }
    }

    return { name, spec: await fetchReference(fileKey, nodeId, pngFile, specFile) };
};

/** Persists one story's outcome for the Storybook panel and the report page (visual/figma/report.ts). */
export const figmaSaveResult: BrowserCommand<[result: FigmaResult, actualPngBase64: string]> = async (
    { project },
    result,
    actualPngBase64
) => {
    const root = project.config.root;
    await mkdir(path.join(root, FIGMA_RESULTS_DIR, 'results'), { recursive: true });
    await writeFile(path.join(root, result.files.actual), Buffer.from(actualPngBase64, 'base64'));
    await writeFile(
        path.join(root, FIGMA_RESULTS_DIR, 'results', `${result.storyId}.json`),
        `${JSON.stringify(result, null, 4)}\n`
    );
};
