// Figma variables the synced component sets are bound to, by id: their names, so spec rows can say which variable
// Figma uses ("var Surface/control = --color-surface-control") instead of guessing the nearest kit token by value.
// The REST variables endpoint needs the Enterprise-only `file_variables:read` scope, so names come from the Plugin
// API (`figma.variables`) through the Figma MCP `use_figma` tool: `pnpm vrt figma --variables-script` prints the
// read-only script for the ids a sync found unnamed, `pnpm vrt figma --variables <file> <fnv>` merges its output.
// Committed as `${FIGMA_VARIABLES_FILE}`. Browser-safe: no Node imports.
import { FIGMA_REFS_DIR } from './types.ts';

export const FIGMA_VARIABLES_FILE = `${FIGMA_REFS_DIR}/variables.json`;

export type FigmaVariable = { collection: string; type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'; name: string };

/** Keyed by variable id without the `VariableID:` prefix (`8019:325`). */
export type FigmaVariableCatalog = {
    source: { fileKey: string; via: string; updatedAt: string };
    variables: Record<string, FigmaVariable>;
};

const COLLECTIONS: Record<string, string> = { P: 'Primitives', T: 'Tokens' };
const TYPES: Record<string, FigmaVariable['type']> = { C: 'COLOR', F: 'FLOAT', S: 'STRING', B: 'BOOLEAN' };

/** FNV-1a, 32-bit hex: the export script returns it so a copied export can be checked byte for byte. */
export function fnv1a(text: string): string {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619) >>> 0;
    }

    return hash.toString(16);
}

/** `8019:325|T|C|Surface/control` lines (the export script's output) → catalogue entries. */
export function parseVariableLines(text: string): Record<string, FigmaVariable> {
    const out: Record<string, FigmaVariable> = {};
    for (const line of text.split('\n').filter(Boolean)) {
        const [id = '', collection = '', type = '', ...name] = line.split('|');
        out[id] = {
            collection: COLLECTIONS[collection] ?? collection,
            type: TYPES[type] ?? 'STRING',
            name: name.join('|'),
        };
    }

    return out;
}

/**
 * The read-only Plugin API script for `use_figma`: names of the given variables as `id|collection|type|name` lines
 * plus their checksum. Variables are read one by one (no file-wide `valuesByMode` reads).
 */
export function variablesExportScript(ids: string[]): string {
    return `const ids = ${JSON.stringify(ids)};
const collections = Object.fromEntries((await figma.variables.getLocalVariableCollectionsAsync()).map((c) => [c.id, c.name[0]]));
const lines = [];
const missing = [];
for (const id of ids) {
    const variable = await figma.variables.getVariableByIdAsync('VariableID:' + id);
    if (!variable) { missing.push(id); continue; }
    lines.push(id + '|' + (collections[variable.variableCollectionId] ?? '?') + '|' + variable.resolvedType[0] + '|' + variable.name);
}
const text = lines.join('\\n');
let hash = 2166136261;
for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619) >>> 0; }
return { count: lines.length, missing, fnv: hash.toString(16), lines: text };`;
}

/**
 * The kit colour token a Figma colour variable is generated as (src/styles/tokens.css): the path, kebab-cased, with
 * the primitives' `Colors/` folder dropped and the kit's spellings: `Surface/control` → `--color-surface-control`,
 * `Colors/white-alfa/12%` → `--color-white-alpha-12`, `Colors/red-alpha/500 - 12%` → `--color-red-alpha-500-12`.
 * Figma names the kit renamed (`Icons/primary`) have no token by this rule; callers say so.
 */
export function kitColorToken(variable: FigmaVariable): string {
    const path = variable.name.replace(/^Colors\//, '');
    const kebab = path
        .toLowerCase()
        .replaceAll('alfa', 'alpha')
        .replaceAll('detructive', 'destructive')
        .replaceAll('%', '')
        .replaceAll(/[^a-z\d]+/g, '-')
        .replaceAll(/^-|-$/g, '');

    return `--color-${kebab}`;
}
