// Browser side: the committed Figma set caches (visual/figma/__refs__), bundled by Vite in both Storybook and the
// Vitest run. A set that hasn't been synced yet is simply absent: run `pnpm vrt figma`.
import type { FigmaSetManifest, FigmaVariant } from './types.ts';
import { parseFigmaUrl } from './sets.ts';
import { figmaSlug, variantSlug } from './types.ts';

const MANIFESTS = import.meta.glob<FigmaSetManifest>('./__refs__/*/manifest.json', { eager: true, import: 'default' });
const PNGS = import.meta.glob<string>('./__refs__/*/*.png', { eager: true, query: '?url', import: 'default' });

export type FigmaSetEntry = {
    slug: string;
    manifest: FigmaSetManifest;
    /** URL of Figma's 2x PNG for a variant, as served by Vite. */
    pngUrl: (variant: FigmaVariant) => string;
};

export function figmaSet(url: string): FigmaSetEntry | null {
    const { fileKey, nodeId } = parseFigmaUrl(url);
    const slug = figmaSlug(fileKey, nodeId);
    const manifest = MANIFESTS[`./__refs__/${slug}/manifest.json`];
    if (!manifest) {
        return null;
    }

    return {
        slug,
        manifest,
        pngUrl: (variant) => {
            return PNGS[`./__refs__/${slug}/${variantSlug(variant.id)}.png`] ?? '';
        },
    };
}
