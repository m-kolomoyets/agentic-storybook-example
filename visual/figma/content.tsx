// Figma cell content → kit content, so a FigmaMatrix cell renders what the Figma variant draws (same label, same
// glyphs) and the pixels are comparable. Glyphs resolve by name: Figma's main component (`StarFour`,
// `Icons/Chevron Down`) → kebab-case kit SVG (`star-four.svg`, `chevron-down.svg`).
import type { FC, SVGProps } from 'react';
import type { FigmaVariant } from './types.ts';

const ICONS = import.meta.glob<FC<SVGProps<SVGSVGElement>>>('../../src/assets/icons/*.svg', {
    eager: true,
    query: '?react',
    import: 'default',
});

/** `Icons/Chevron Down` → `chevron-down`; `StarFour` → `star-four`. */
function kebab(figmaName: string): string {
    return (figmaName.split('/').pop() ?? figmaName)
        .replaceAll(/([a-z\d])([A-Z])/g, '$1-$2')
        .replaceAll(/[^A-Za-z\d]+/g, '-')
        .replaceAll(/^-|-$/g, '')
        .toLowerCase();
}

/** The kit icon a Figma glyph names, or null (spinners and other non-icon glyphs have no kit SVG). */
export function KitIcon({ figma }: { figma: string | null }) {
    const Icon = figma ? ICONS[`../../src/assets/icons/${kebab(figma)}.svg`] : undefined;

    return Icon ? <Icon /> : null;
}

export type FigmaContent = {
    /** First text run: the label. */
    text: string | null;
    /** Glyph component left of the label (or the only glyph when there is no label). */
    leading: string | null;
    /** Glyph component right of the label. */
    trailing: string | null;
};

export function figmaContent(variant: FigmaVariant): FigmaContent {
    const label = variant.spec.texts[0];
    const icons = variant.spec.icons;
    if (!label) {
        return { text: null, leading: icons[0]?.component ?? null, trailing: null };
    }
    const before = icons.filter((icon) => {
        return icon.box.x < label.box.x;
    });
    const after = icons.filter((icon) => {
        return icon.box.x >= label.box.x + label.box.width;
    });

    return {
        text: label.characters,
        leading: before.at(-1)?.component ?? null,
        trailing: after[0]?.component ?? null,
    };
}
