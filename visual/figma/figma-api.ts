// Node side: syncs Figma component sets into visual/figma/__refs__/<slug>/ (committed): manifest.json with the
// variant axes and a layout/type spec per variant, plus one 2x PNG per variant. At most three Figma calls per file
// for any number of sets (version check, batched nodes, batched images): the images endpoint is Tier 1 and
// rate-limits hard. FIGMA_TOKEN is read here only, never shipped to the browser.
import type {
    Box,
    FigmaCatalog,
    FigmaSetManifest,
    FigmaShadow,
    FigmaSpec,
    FigmaStroke,
    FigmaVariant,
    Rgba,
} from './types.ts';
import type { FigmaVariableCatalog } from './variables.ts';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FIGMA_SETS, parseFigmaUrl } from './sets.ts';
import { FIGMA_REFS_DIR, FIGMA_SCALE, figmaSlug, variantSlug } from './types.ts';
import { FIGMA_VARIABLES_FILE, fnv1a, parseVariableLines, variablesExportScript } from './variables.ts';

const API = 'https://api.figma.com/v1';

type Paint = { type: string; visible?: boolean; opacity?: number; color?: Rgba; boundVariables?: { color?: unknown } };
type Effect = {
    type: string;
    visible?: boolean;
    color?: Rgba;
    offset?: { x: number; y: number };
    radius: number;
    spread?: number;
};
type FigmaNode = {
    id: string;
    name: string;
    type: string;
    visible?: boolean;
    characters?: string;
    absoluteBoundingBox: Box;
    fills?: Paint[];
    strokes?: Paint[];
    strokeWeight?: number;
    individualStrokeWeights?: { top: number; right: number; bottom: number; left: number };
    strokeAlign?: FigmaStroke['align'];
    strokeDashes?: number[];
    effects?: Effect[];
    opacity?: number;
    /** Variable aliases per property (`fills` per paint, `rectangleCornerRadii` per corner, …). */
    boundVariables?: Record<string, unknown>;
    layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
    cornerRadius?: number;
    rectangleCornerRadii?: [number, number, number, number];
    style?: {
        fontFamily: string;
        fontSize: number;
        fontWeight: number;
        lineHeightPx: number;
        letterSpacing: number;
        textCase?: string;
        textDecoration?: string;
        textAlignHorizontal?: string;
        textAutoResize?: string;
        textTruncation?: string;
    };
    textTruncation?: string;
    blendMode?: string;
    layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
    layoutPositioning?: 'AUTO' | 'ABSOLUTE';
    layoutWrap?: 'NO_WRAP' | 'WRAP';
    layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
    primaryAxisAlignItems?: string;
    counterAxisAlignItems?: string;
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

function byte(value: number): number {
    return Math.round(value * 255);
}

/**
 * Every visible SOLID paint, composited source-over in array order (Figma lists paints bottom to top), as one colour;
 * `null` when there's none. Paint `opacity` multiplies the colour's alpha, as Figma draws it.
 */
function solidFill(fills: Paint[] | undefined): Rgba | null {
    let out: Rgba | null = null;
    for (const paint of fills ?? []) {
        if (paint.visible !== false && paint.type === 'SOLID' && paint.color) {
            out = over({ ...paint.color, a: paint.color.a * (paint.opacity ?? 1) }, out);
        }
    }

    return out && { r: byte(out.r), g: byte(out.g), b: byte(out.b), a: Math.round(out.a * 1000) / 1000 };
}

/** Source-over of `top` on `back` (straight alpha, 0–1 channels). */
function over(top: Rgba, back: Rgba | null): Rgba {
    if (!back) {
        return top;
    }
    const a = top.a + back.a * (1 - top.a);
    const mix = (front: number, behind: number): number => {
        return a === 0 ? 0 : (front * top.a + behind * back.a * (1 - top.a)) / a;
    };

    return { r: mix(top.r, back.r), g: mix(top.g, back.g), b: mix(top.b, back.b), a };
}

function visibleTypes(paints: Paint[] | undefined): string[] {
    return (paints ?? [])
        .filter((paint) => {
            return paint.visible !== false && paint.type !== 'SOLID';
        })
        .map((paint) => {
            return paint.type;
        });
}

function strokeOf(node: FigmaNode): FigmaStroke | null {
    const color = solidFill(node.strokes);
    const sides = node.individualStrokeWeights;
    const weights = sides ? [sides.top, sides.right, sides.bottom, sides.left] : null;
    const weight = weights ? Math.max(...weights) : (node.strokeWeight ?? 0);
    if (!color || weight <= 0) {
        return null;
    }

    return {
        weight,
        sides: weights && new Set(weights).size > 1 ? (weights as FigmaStroke['sides']) : null,
        align: node.strokeAlign ?? 'INSIDE',
        color,
        dashed: (node.strokeDashes?.length ?? 0) > 0,
    };
}

function shadowsOf(node: FigmaNode): FigmaShadow[] {
    return (node.effects ?? [])
        .filter((effect) => {
            return effect.visible !== false && (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW');
        })
        .map((effect) => {
            const color = effect.color ?? { r: 0, g: 0, b: 0, a: 0 };

            return {
                inset: effect.type === 'INNER_SHADOW',
                x: effect.offset?.x ?? 0,
                y: effect.offset?.y ?? 0,
                blur: effect.radius,
                spread: effect.spread ?? 0,
                color: { r: byte(color.r), g: byte(color.g), b: byte(color.b), a: Math.round(color.a * 1000) / 1000 },
            };
        });
}

function blendOf(node: FigmaNode): string | null {
    return node.blendMode && node.blendMode !== 'NORMAL' && node.blendMode !== 'PASS_THROUGH' ? node.blendMode : null;
}

function blurOf(node: FigmaNode): { layer: number | null; background: number | null } {
    const radius = (type: string) => {
        return (
            (node.effects ?? []).find((effect) => {
                return effect.visible !== false && effect.type === type;
            })?.radius ?? null
        );
    };

    return { layer: radius('LAYER_BLUR'), background: radius('BACKGROUND_BLUR') };
}

function inFlow(node: FigmaNode): FigmaNode[] {
    return (node.children ?? []).filter((child) => {
        return child.visible !== false && child.layoutPositioning !== 'ABSOLUTE';
    });
}

/** The auto-layout frame arranging the content: through single-child auto-layout FRAME wrappers from the root. */
/** The auto-layout container (see layoutOf): the root, or reached through single-child auto-layout FRAME wrappers. */
function layoutNode(root: FigmaNode): FigmaNode {
    let node = root;
    for (;;) {
        const children = inFlow(node);
        const only = children.length === 1 ? children[0] : undefined;
        if (only?.type !== 'FRAME' || !only.layoutMode || only.layoutMode === 'NONE') {
            return node;
        }
        node = only;
    }
}

function layoutOf(root: FigmaNode, origin: Box): FigmaSpec['root']['layout'] {
    const node = layoutNode(root);
    if (!node.layoutMode || node.layoutMode === 'NONE') {
        return null;
    }
    const direction = node.layoutMode;

    return {
        direction,
        primaryAlign: node.primaryAxisAlignItems ?? 'MIN',
        counterAlign: node.counterAxisAlignItems ?? 'MIN',
        wrap: node.layoutWrap === 'WRAP',
        hugPrimary: (direction === 'HORIZONTAL' ? node.layoutSizingHorizontal : node.layoutSizingVertical) === 'HUG',
        children: inFlow(node).map((child) => {
            return {
                name: child.name,
                text: child.type === 'TEXT',
                box: relativeBox(child.absoluteBoundingBox, origin),
            };
        }),
    };
}

/**
 * A glyph's visible colour: its topmost painted shape (last in paint order), fill else stroke, alpha multiplied by
 * every node opacity from the instance down to that shape.
 */
function glyphColor(instance: FigmaNode): { color: Rgba; variable: string | undefined } | null {
    let found: { color: Rgba; variable: string | undefined } | null = null;
    function walk(node: FigmaNode, opacity: number) {
        if (node.visible === false) {
            return;
        }
        const own = opacity * (node.opacity ?? 1);
        if (node.children?.length) {
            node.children.forEach((child) => {
                walk(child, own);
            });

            return;
        }
        const fill = solidFill(node.fills);
        const color = fill ?? solidFill(node.strokes);
        if (color && color.a > 0) {
            found = {
                color: { ...color, a: Math.round(color.a * own * 1000) / 1000 },
                variable: paintVariable(node, fill ? 'fills' : 'strokes'),
            };
        }
    }
    walk(instance, 1);

    return found;
}

/** The variable id (`8019:325`) an alias, or the first alias inside a value, points at. */
function aliasId(value: unknown): string | undefined {
    return /"VariableID:([^"]+)"/.exec(JSON.stringify(value ?? null))?.[1];
}

/** The variable bound to a node's topmost visible solid paint (paint-level binding, else the node's per-paint one). */
function paintVariable(node: FigmaNode, key: 'fills' | 'strokes'): string | undefined {
    const paints = node[key] ?? [];
    for (let index = paints.length - 1; index >= 0; index--) {
        const paint = paints[index];
        if (paint && paint.visible !== false && paint.type === 'SOLID') {
            const perPaint = node.boundVariables?.[key];

            return (
                aliasId(paint.boundVariables?.color) ?? aliasId(Array.isArray(perPaint) ? perPaint[index] : undefined)
            );
        }
    }

    return undefined;
}

/** Drops unbound keys, so manifests only list what Figma binds. */
function bound<T extends Record<string, string | undefined>>(vars: T): Partial<Record<keyof T, string>> | undefined {
    const entries = Object.entries(vars).filter(([, id]) => {
        return id !== undefined;
    });

    return entries.length ? (Object.fromEntries(entries) as Partial<Record<keyof T, string>>) : undefined;
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
 * the same box carries the fill and radius, while the DOM puts them on the root element. `opacity`: the product along
 * that path, as the DOM root carries it.
 */
function surface(root: FigmaNode): { node: FigmaNode; opacity: number } {
    let current = root;
    let opacity = root.opacity ?? 1;
    for (;;) {
        const children = (current.children ?? []).filter((child) => {
            return child.visible !== false;
        });
        const only = children.length === 1 ? children[0] : undefined;
        const painted =
            solidFill(current.fills) !== null ||
            visibleTypes(current.fills).length > 0 ||
            strokeOf(current) !== null ||
            shadowsOf(current).length > 0 ||
            (current.cornerRadius ?? 0) > 0 ||
            current.rectangleCornerRadii;
        if (painted || !only || !sameBox(only.absoluteBoundingBox, current.absoluteBoundingBox)) {
            return { node: current, opacity: Math.round(opacity * 1000) / 1000 };
        }
        current = only;
        opacity *= current.opacity ?? 1;
    }
}

function toSpec(root: FigmaNode, componentName: ComponentName): FigmaSpec {
    const origin = root.absoluteBoundingBox;
    const { node: paint, opacity } = surface(root);
    const spec: FigmaSpec = {
        root: {
            name: root.name,
            width: origin.width,
            height: origin.height,
            hugWidth: root.layoutSizingHorizontal === 'HUG',
            radius:
                paint.rectangleCornerRadii ??
                ([0, 0, 0, 0].fill(paint.cornerRadius ?? 0) as FigmaSpec['root']['radius']),
            fill: solidFill(paint.fills),
            fillTypes: visibleTypes(paint.fills),
            opacity,
            stroke: strokeOf(paint),
            shadows: shadowsOf(paint),
            blendMode: blendOf(root),
            blur: blurOf(paint),
            layout: layoutOf(root, origin),
            vars: bound({
                fill: paintVariable(paint, 'fills'),
                stroke: paintVariable(paint, 'strokes'),
                radius: aliasId(paint.boundVariables?.rectangleCornerRadii ?? paint.boundVariables?.topLeftRadius),
                gap: aliasId(layoutNode(root).boundVariables?.itemSpacing),
                paddingTop: aliasId(root.boundVariables?.paddingTop),
                paddingRight: aliasId(root.boundVariables?.paddingRight),
                paddingBottom: aliasId(root.boundVariables?.paddingBottom),
                paddingLeft: aliasId(root.boundVariables?.paddingLeft),
            }),
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
                textCase: node.style.textCase ?? 'ORIGINAL',
                textDecoration: node.style.textDecoration ?? 'NONE',
                textAlign: node.style.textAlignHorizontal ?? 'LEFT',
                autoResize: node.style.textAutoResize ?? 'NONE',
                truncate: (node.textTruncation ?? node.style.textTruncation) === 'ENDING',
                vars: bound({
                    color: paintVariable(node, 'fills'),
                    fontSize: aliasId(node.boundVariables?.fontSize),
                    lineHeight: aliasId(node.boundVariables?.lineHeight),
                    letterSpacing: aliasId(node.boundVariables?.letterSpacing),
                    fontFamily: aliasId(node.boundVariables?.fontFamily),
                    fontWeight: aliasId(node.boundVariables?.fontStyle ?? node.boundVariables?.fontWeight),
                }),
            });

            return;
        }
        // An instance with no text inside is a glyph (icon, spinner, avatar): compare its box, not its insides.
        if (node !== root && node.type === 'INSTANCE' && !JSON.stringify(node.children ?? []).includes('"TEXT"')) {
            const glyph = glyphColor(node);
            spec.icons.push({
                name: node.name,
                component: componentName(node.componentId),
                box: relativeBox(node.absoluteBoundingBox, origin),
                color: glyph?.color ?? null,
                vars: bound({ color: glyph?.variable }),
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

async function readCatalogue(root: string): Promise<FigmaVariableCatalog> {
    try {
        return JSON.parse(await readFile(path.join(root, FIGMA_VARIABLES_FILE), 'utf8')) as FigmaVariableCatalog;
    } catch {
        return {
            source: { fileKey: '', via: 'Figma Plugin API through the Figma MCP use_figma tool', updatedAt: '' },
            variables: {},
        };
    }
}

/** Variable ids bound in the synced manifests that `variables.json` can't name yet (sorted). */
export async function unnamedFigmaVariables(root: string): Promise<string[]> {
    const catalogue = await readCatalogue(root);
    const ids = new Set<string>();
    for (const url of Object.values(FIGMA_SETS)) {
        const { fileKey, nodeId } = parseFigmaUrl(url);
        const manifest = await readManifest(path.join(root, FIGMA_REFS_DIR, figmaSlug(fileKey, nodeId)));
        for (const match of JSON.stringify(manifest?.variants ?? []).matchAll(/"vars":\{([^}]*)\}/g)) {
            for (const id of (match[1] ?? '').matchAll(/"(\d+:\d+)"/g)) {
                ids.add(id[1] ?? '');
            }
        }
    }

    return [...ids]
        .filter((id) => {
            return !catalogue.variables[id];
        })
        .sort((a, b) => {
            return a.localeCompare(b, 'en', { numeric: true });
        });
}

/** The read-only `use_figma` script naming every unnamed bound variable (empty when all are named). */
export async function figmaVariablesScript(root: string): Promise<string | null> {
    const ids = await unnamedFigmaVariables(root);

    return ids.length ? variablesExportScript(ids) : null;
}

/**
 * Merges the export script's `lines` (saved to `file`) into `variables.json`, after checking them against the
 * checksum the script returned: a hand-copied export must arrive byte for byte.
 */
export async function mergeFigmaVariables(root: string, file: string, checksum: string): Promise<number> {
    const text = (await readFile(file, 'utf8')).replace(/\n+$/, '');
    if (fnv1a(text) !== checksum) {
        throw new Error(`Checksum mismatch: ${fnv1a(text)} ≠ ${checksum}. Save the script's \`lines\` value exactly.`);
    }
    const catalogue = await readCatalogue(root);
    const added = parseVariableLines(text);
    const variables = Object.fromEntries(
        Object.entries({ ...catalogue.variables, ...added }).sort(([a], [b]) => {
            return a.localeCompare(b, 'en', { numeric: true });
        })
    );
    const { fileKey } = parseFigmaUrl(Object.values(FIGMA_SETS)[0] ?? '');
    const next: FigmaVariableCatalog = {
        source: { ...catalogue.source, fileKey, updatedAt: new Date().toISOString().slice(0, 10) },
        variables,
    };
    await writeFile(path.join(root, FIGMA_VARIABLES_FILE), `${JSON.stringify(next, null, 4)}\n`);

    return Object.keys(added).length;
}
