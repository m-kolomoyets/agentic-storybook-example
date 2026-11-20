// Node side: syncs Figma component sets into visual/figma/__refs__/<slug>/ (committed): manifest.json with the
// variant axes and a layout/type spec per variant, plus one 2x PNG per variant. At most three Figma calls per file
// for any number of sets (version check, batched nodes, batched images): the images endpoint is Tier 1 and
// rate-limits hard. FIGMA_TOKEN is read here only, never shipped to the browser.
import type { Box, FigmaCatalog, FigmaSetManifest, FigmaSpec, FigmaVariant, Rgba } from './types.ts';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FIGMA_SETS, parseFigmaUrl } from './sets.ts';
import { FIGMA_REFS_DIR, FIGMA_SCALE, figmaSlug, variantSlug } from './types.ts';

const API = 'https://api.figma.com/v1';

type Paint = { type: string; visible?: boolean; opacity?: number; color?: Rgba };
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
    componentPropertyDefinitions?: Record<string, { type: string; defaultValue: unknown; variantOptions?: string[] }>;
    componentId?: string;
    children?: FigmaNode[];
};

type NodesResponse = {
    version: string;
    lastModified: string;
    nodes: Record<
        string,
        {
            document: FigmaNode;
            components?: Record<string, { name: string; componentSetId?: string }>;
            componentSets?: Record<string, { name: string }>;
        } | null
    >;
};

/** Main-component name of an instance; for a variant (an icon set's `Size=24`), the set's name. */
type ComponentName = (componentId: string | undefined) => string | null;

async function figmaGet<T>(endpoint: string): Promise<T> {
    const token = process.env.FIGMA_TOKEN;
    if (!token) {
        throw new Error('FIGMA_TOKEN missing (.env.local) and the Figma set is not cached yet.');
    }
    let response = await fetch(`${API}${endpoint}`, { headers: { 'X-Figma-Token': token } });
    const retryAfter = Number(response.headers.get('retry-after'));
    // One bounded retry on a short rate-limit window; a long one (Figma has sent days) is reported, not waited out.
    if (response.status === 429 && retryAfter > 0 && retryAfter <= 60) {
        await new Promise((resolve) => {
            setTimeout(resolve, retryAfter * 1000);
        });
        response = await fetch(`${API}${endpoint}`, { headers: { 'X-Figma-Token': token } });
    }
    if (!response.ok) {
        const retry = response.headers.get('retry-after');
        throw new Error(
            `Figma ${endpoint}: ${response.status}${retry ? ` (retry after ${retry}s)` : ''} ${await response.text()}`
        );
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

/** Flattens a variant to what the DOM can be held to: root box + visible text runs + visible icon instances. */
function sameBox(a: Box, b: Box): boolean {
    return (
        Math.abs(a.x - b.x) < 0.5 &&
        Math.abs(a.y - b.y) < 0.5 &&
        Math.abs(a.width - b.width) < 0.5 &&
        Math.abs(a.height - b.height) < 0.5
    );
}

/**
 * The node that paints the variant's box. Figma often wraps it: a paint-less root whose single visible child covers
 * the same box carries the fill and radius, while the DOM puts them on the root element.
 */
function surface(root: FigmaNode): FigmaNode {
    let current = root;
    for (;;) {
        const children = (current.children ?? []).filter((child) => {
            return child.visible !== false;
        });
        const only = children.length === 1 ? children[0] : undefined;
        const painted =
            solidFill(current.fills) !== null || (current.cornerRadius ?? 0) > 0 || current.rectangleCornerRadii;
        if (painted || !only || !sameBox(only.absoluteBoundingBox, current.absoluteBoundingBox)) {
            return current;
        }
        current = only;
    }
}

function toSpec(root: FigmaNode, componentName: ComponentName): FigmaSpec {
    const origin = root.absoluteBoundingBox;
    const paint = surface(root);
    const spec: FigmaSpec = {
        root: {
            name: root.name,
            width: origin.width,
            height: origin.height,
            radius:
                paint.rectangleCornerRadii ??
                ([0, 0, 0, 0].fill(paint.cornerRadius ?? 0) as FigmaSpec['root']['radius']),
            fill: solidFill(paint.fills),
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
            spec.icons.push({
                name: node.name,
                component: componentName(node.componentId),
                box: relativeBox(node.absoluteBoundingBox, origin),
            });

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

/** `Size=Big, State=Default` → `{ Size: 'Big', State: 'Default' }`. */
function variantProps(name: string): Record<string, string> {
    return Object.fromEntries(
        name.split(',').map((pair) => {
            const [key = '', ...value] = pair.split('=');

            return [key.trim(), value.join('=').trim()];
        })
    );
}

/** `#1234:5` suffixes Figma appends to non-variant property names. */
function propertyName(key: string): string {
    return key.replace(/#[\d:]+$/, '');
}

function manifestOf(set: FigmaNode, url: string, nodes: NodesResponse, variants: FigmaVariant[]): FigmaSetManifest {
    const definitions = Object.entries(set.componentPropertyDefinitions ?? {});

    return {
        source: {
            url,
            fileKey: parseFigmaUrl(url).fileKey,
            nodeId: parseFigmaUrl(url).nodeId,
            name: set.name,
            version: nodes.version,
            lastModified: nodes.lastModified,
        },
        axes: definitions
            .filter(([, definition]) => {
                return definition.type === 'VARIANT';
            })
            .map(([key, definition]) => {
                return { name: propertyName(key), options: definition.variantOptions ?? [] };
            }),
        booleans: definitions
            .filter(([, definition]) => {
                return definition.type === 'BOOLEAN';
            })
            .map(([key, definition]) => {
                return { name: propertyName(key), default: definition.defaultValue === true };
            }),
        variants,
    };
}

type SetOutcome = 'cached' | 'specs' | 'fetched';

/** Image URLs point at Figma's CDN, which isn't rate-limited: download in parallel. */
const DOWNLOAD_CONCURRENCY = 8;

async function readManifest(dir: string): Promise<FigmaSetManifest | null> {
    try {
        return JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8')) as FigmaSetManifest;
    } catch {
        return null;
    }
}

async function pngsComplete(dir: string, manifest: FigmaSetManifest | null): Promise<boolean> {
    if (!manifest) {
        return false;
    }
    const present = await Promise.all(
        manifest.variants.map((variant) => {
            return readFile(path.join(dir, `${variantSlug(variant.id)}.png`)).then(
                () => {
                    return true;
                },
                () => {
                    return false;
                }
            );
        })
    );

    return present.every(Boolean);
}

async function download(jobs: { url: string; file: string }[]) {
    let next = 0;
    async function worker() {
        while (next < jobs.length) {
            const job = jobs[next++];
            if (!job) {
                return;
            }
            const response = await fetch(job.url);
            if (!response.ok) {
                throw new Error(`Figma image download ${path.basename(job.file)}: ${response.status}`);
            }
            await writeFile(job.file, Buffer.from(await response.arrayBuffer()));
        }
    }
    await Promise.all(Array.from({ length: DOWNLOAD_CONCURRENCY }, worker));
}

/**
 * Syncs every set in FIGMA_SETS. Per Figma file, at most three calls whatever the number of sets: a version check
 * (`/meta`), one nodes call for all stale sets, one images call for all their variants, both pinned to that version
 * so the snapshot is consistent. Without `refresh` only sets missing from the cache are touched (no calls when none
 * are). With `refresh` specs are always rebuilt, images re-downloaded only for sets whose file version changed.
 */
export async function syncFigmaSets(root: string, refresh: boolean): Promise<Record<string, SetOutcome>> {
    const outcome: Record<string, SetOutcome> = {};
    const entries = await Promise.all(
        Object.entries(FIGMA_SETS).map(async ([key, url]) => {
            const { fileKey, nodeId } = parseFigmaUrl(url);
            const dir = path.join(root, FIGMA_REFS_DIR, figmaSlug(fileKey, nodeId));
            const manifest = await readManifest(dir);

            return { key, url, fileKey, nodeId, dir, manifest, complete: await pngsComplete(dir, manifest) };
        })
    );
    const stale = entries.filter((entry) => {
        if (!refresh && entry.complete) {
            outcome[entry.key] = 'cached';

            return false;
        }

        return true;
    });

    for (const fileKey of new Set(
        stale.map((entry) => {
            return entry.fileKey;
        })
    )) {
        const group = stale.filter((entry) => {
            return entry.fileKey === fileKey;
        });
        const { file } = await figmaGet<{ file: { version: string } }>(`/files/${fileKey}/meta`);
        const nodes = await figmaGet<NodesResponse>(
            `/files/${fileKey}/nodes?ids=${encodeURIComponent(
                group
                    .map((entry) => {
                        return entry.nodeId;
                    })
                    .join(',')
            )}&version=${file.version}`
        );

        const built = group.map((entry) => {
            const node = nodes.nodes[entry.nodeId];
            const set = node?.document;
            if (set?.type !== 'COMPONENT_SET') {
                throw new Error(`${entry.url} is not a component set (got ${set?.type ?? 'nothing'}).`);
            }
            const componentName: ComponentName = (componentId) => {
                const component = componentId ? node?.components?.[componentId] : undefined;
                if (!component) {
                    return null;
                }
                const setName = component.componentSetId
                    ? node?.componentSets?.[component.componentSetId]?.name
                    : undefined;

                return setName ?? component.name;
            };
            const variants: FigmaVariant[] = (set.children ?? [])
                .filter((child) => {
                    return child.type === 'COMPONENT';
                })
                .map((component) => {
                    return {
                        id: component.id,
                        name: component.name,
                        props: variantProps(component.name),
                        spec: toSpec(component, componentName),
                    };
                });
            // Same file version and every PNG on disk: the images can't have changed.
            const needsImages = !(entry.complete && entry.manifest?.source.version === nodes.version);

            return { entry, manifest: manifestOf(set, entry.url, nodes, variants), needsImages };
        });

        const imageSets = built.filter((item) => {
            return item.needsImages;
        });
        if (imageSets.length > 0) {
            // One render call for every variant of every changed set; use_absolute_bounds crops to the node box, as an
            // element screenshot does.
            const ids = imageSets.flatMap((item) => {
                return item.manifest.variants.map((variant) => {
                    return variant.id;
                });
            });
            const images = await figmaGet<{ images: Record<string, string | null> }>(
                `/images/${fileKey}?ids=${encodeURIComponent(ids.join(','))}&format=png&scale=${FIGMA_SCALE}&use_absolute_bounds=true&version=${file.version}`
            );
            const jobs = [];
            for (const item of imageSets) {
                await rm(item.entry.dir, { recursive: true, force: true });
                await mkdir(item.entry.dir, { recursive: true });
                for (const variant of item.manifest.variants) {
                    const url = images.images[variant.id];
                    if (!url) {
                        throw new Error(`Figma could not render ${variant.name} (${variant.id}).`);
                    }
                    jobs.push({ url, file: path.join(item.entry.dir, `${variantSlug(variant.id)}.png`) });
                }
            }
            await download(jobs);
        }

        for (const item of built) {
            await mkdir(item.entry.dir, { recursive: true });
            await writeFile(path.join(item.entry.dir, 'manifest.json'), `${JSON.stringify(item.manifest, null, 4)}\n`);
            outcome[item.entry.key] = item.needsImages ? 'fetched' : 'specs';
        }
    }

    return outcome;
}

/**
 * Every component set in the file (one cheap call), committed as `${FIGMA_REFS_DIR}/catalog.json`: the report's
 * coverage list. Only sets in FIGMA_SETS get images; the rest are listed so gaps stay visible.
 */
export async function syncFigmaCatalog(root: string, refresh: boolean): Promise<'cached' | 'fetched'> {
    const file = path.join(root, FIGMA_REFS_DIR, 'catalog.json');
    if (!refresh) {
        try {
            await readFile(file);

            return 'cached';
        } catch {
            // Not cached yet.
        }
    }
    const { fileKey } = parseFigmaUrl(Object.values(FIGMA_SETS)[0] ?? '');
    const response = await figmaGet<{
        meta: {
            component_sets: {
                node_id: string;
                name: string;
                containing_frame?: { name?: string; pageName?: string };
            }[];
        };
    }>(`/files/${fileKey}/component_sets`);
    const catalog: FigmaCatalog = {
        fileKey,
        syncedAt: new Date().toISOString(),
        sets: response.meta.component_sets
            .map((set) => {
                return {
                    nodeId: set.node_id,
                    name: set.name,
                    page: (set.containing_frame?.pageName ?? '').replace(/^[\s↘]+/, ''),
                    frame: set.containing_frame?.name ?? '',
                };
            })
            .sort((a, b) => {
                return a.page.localeCompare(b.page) || a.name.localeCompare(b.name);
            }),
    };
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify(catalog, null, 4)}\n`);

    return 'fetched';
}
