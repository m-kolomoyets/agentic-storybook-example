// Figma cell content → kit content, so a FigmaMatrix cell renders what the Figma variant draws (same label, same
// glyphs) and the pixels are comparable. Glyphs resolve by name: Figma's main component (`StarFour`,
// `Icons/Chevron Down`) → kebab-case kit SVG (`star-four.svg`, `chevron-down.svg`).
import type { FC, SVGProps } from 'react';
import type { FigmaVariant } from './types.ts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const ICONS = import.meta.glob<FC<SVGProps<SVGSVGElement>>>('../../src/assets/icons/*.svg', {
    eager: true,
    query: '?react',
    import: 'default',
});

const PREFIX = '../../src/assets/icons/';

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
    const Icon = figma ? ICONS[`${PREFIX}${kebab(figma)}.svg`] : undefined;

    return Icon ? <Icon /> : null;
}

const SHAPES = 'path, circle, ellipse, rect, polygon, polyline, line';
const GEOMETRY = ['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'points', 'x1', 'y1', 'x2', 'y2'];

/** viewBox + every shape's geometry: identical for two renders of one kit SVG, whatever their size or colour. */
function fingerprint(svg: Element): string {
    const shapes = [...svg.querySelectorAll(SHAPES)].map((shape) => {
        return `${shape.tagName}:${GEOMETRY.map((name) => {
            return shape.getAttribute(name) ?? '';
        }).join(',')}`;
    });

    return `${svg.getAttribute('viewBox') ?? ''}|${shapes.join(';')}`;
}

let prints: Map<string, string> | null = null;

/** The kit SVG file a Figma glyph names (`StarFour` → `star-four.svg`), or null when the kit has none. */
export function kitIconFile(figma: string | null): string | null {
    const file = figma ? `${kebab(figma)}.svg` : null;

    return file && ICONS[`${PREFIX}${file}`] ? file : null;
}

/** The kit SVG file a rendered `<svg>` was made from, matched by geometry; null when it isn't a kit icon. */
export function kitIconOf(svg: Element): string | null {
    if (!prints) {
        prints = new Map();
        for (const [path, Icon] of Object.entries(ICONS)) {
            const markup = renderToStaticMarkup(createElement(Icon));
            const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
            prints.set(fingerprint(parsed), path.slice(PREFIX.length));
        }
    }

    return prints.get(fingerprint(svg)) ?? null;
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
