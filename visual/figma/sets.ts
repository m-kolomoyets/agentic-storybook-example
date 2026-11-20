// Figma component sets held to the code by `pnpm vrt figma` (visual/FIGMA-TESTING.md).
// FigmaMatrix stories name these in their blocks; the runner syncs them all in at most three Figma calls
// into visual/figma/__refs__ before the tests run. Add a set here, then run `pnpm vrt figma`.
const KIT = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

export const FIGMA_SETS = {
    /** Buttons: one Figma set per code `variant`; Size × State (remote and secondary-elevated: State only). */
    buttonPrimary: `${KIT}8696-12170`,
    buttonPrimaryOnSurface: `${KIT}9642-177476`,
    buttonSecondary: `${KIT}8038-2005`,
    buttonSecondaryElevated: `${KIT}12963-8280`,
    buttonDestructive: `${KIT}8274-18709`,
    buttonRemote: `${KIT}9263-22344`,
    buttonLinkPrimary: `${KIT}8887-16205`,
    buttonLinkSecondary: `${KIT}9275-43776`,
    buttonLinkTertiary: `${KIT}9315-49693`,
    /** `Check box outline blank`: State × Status × Size. */
    checkbox: `${KIT}9183-5528`,
    /** `Radio button`: State × Status × Size. */
    radio: `${KIT}9181-5758`,
    /** `Badge`: Size × State × Tone × Type × Leading × Mode, sparsely drawn (31 variants). */
    badge: `${KIT}8673-4388`,
} as const;

export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } {
    const parsed = new URL(url);
    const fileKey = /\/(?:design|file)\/([^/]+)/.exec(parsed.pathname)?.[1];
    const nodeId = parsed.searchParams.get('node-id')?.replace('-', ':');
    if (!fileKey || !nodeId) {
        throw new Error(`Not a Figma node URL: ${url}`);
    }

    return { fileKey, nodeId };
}
