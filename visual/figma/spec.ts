// Browser side: hold a rendered element to the Figma spec from visual/figma/commands.ts.
// Compares what survives DOM flattening (Figma auto-layout frames rarely map 1:1 to elements): the root box, each
// visible text run (matched by its characters) and each icon (matched by left-to-right order). Returns readable
// mismatch lines; an empty list means "matches Figma within tolerance".
import type { FigmaSpec } from './commands.ts';

/** CSS px. Sub-pixel layout and font metrics differ between Figma and Chromium; 1px absorbs that, not real drift. */
const PX = 1;
/** Per 0–255 channel: Figma stores float colors, CSS rounds to bytes, color spaces round-trip. */
const CHANNEL = 3;

type Rgba = { r: number; g: number; b: number; a: number };
type Box = { x: number; y: number; width: number; height: number };

const canvas = document.createElement('canvas').getContext('2d', { willReadFrequently: true });

/** Any CSS color (oklch, color-mix, …) → sRGB bytes, via the canvas so the browser does the conversion. */
function toRgba(cssColor: string): Rgba {
    if (!canvas) {
        throw new Error('2d canvas unavailable');
    }
    canvas.clearRect(0, 0, 1, 1);
    canvas.fillStyle = cssColor;
    canvas.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = canvas.getImageData(0, 0, 1, 1).data;

    return { r, g, b, a: Math.round((a / 255) * 1000) / 1000 };
}

function colorDiff(actual: Rgba, expected: Rgba): boolean {
    return (
        Math.abs(actual.r - expected.r) > CHANNEL ||
        Math.abs(actual.g - expected.g) > CHANNEL ||
        Math.abs(actual.b - expected.b) > CHANNEL ||
        Math.abs(actual.a - expected.a) > CHANNEL / 255
    );
}

function fmt(color: Rgba): string {
    return `rgba(${color.r},${color.g},${color.b},${color.a})`;
}

function relative(rect: DOMRect, origin: DOMRect): Box {
    return { x: rect.x - origin.x, y: rect.y - origin.y, width: rect.width, height: rect.height };
}

function near(actual: number, expected: number): boolean {
    return Math.abs(actual - expected) <= PX;
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

function textRuns(root: Element): { text: string; node: Text }[] {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const runs: { text: string; node: Text }[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text && node.parentElement?.checkVisibility()) {
            runs.push({ text, node: node as Text });
        }
    }

    return runs;
}

function icons(root: Element): Element[] {
    return [...root.querySelectorAll('svg')]
        .filter((svg) => {
            // Nested <svg> inside an icon is part of that icon.
            return svg.parentElement?.closest('svg') === null && svg.checkVisibility();
        })
        .sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();

            return ra.x - rb.x || ra.y - rb.y;
        });
}

export function figmaSpecMismatches(root: Element, spec: FigmaSpec): string[] {
    const out: string[] = [];
    const origin = root.getBoundingClientRect();
    const rootStyle = getComputedStyle(root);

    // Root box.
    if (!near(origin.width, spec.root.width) || !near(origin.height, spec.root.height)) {
        out.push(
            `root size ${round(origin.width)}×${round(origin.height)} ≠ Figma ${spec.root.width}×${spec.root.height}`
        );
    }
    const radius = [
        rootStyle.borderTopLeftRadius,
        rootStyle.borderTopRightRadius,
        rootStyle.borderBottomRightRadius,
        rootStyle.borderBottomLeftRadius,
    ].map((value) => {
        return Number.parseFloat(value) || 0;
    });
    if (
        radius.some((value, index) => {
            return !near(value, spec.root.radius[index] ?? 0);
        })
    ) {
        out.push(`root radius ${radius.join('/')} ≠ Figma ${spec.root.radius.join('/')}`);
    }
    if (spec.root.fill) {
        const background = toRgba(rootStyle.backgroundColor);
        if (colorDiff(background, spec.root.fill)) {
            out.push(`root background ${fmt(background)} ≠ Figma ${fmt(spec.root.fill)}`);
        }
    }

    // Text runs, matched by characters.
    const runs = textRuns(root);
    for (const text of spec.texts) {
        const label = `text "${text.characters}"`;
        const run = runs.find((candidate) => {
            return candidate.text === text.characters.trim();
        });
        if (!run?.node.parentElement) {
            out.push(
                `${label} not rendered (rendered: ${
                    runs
                        .map((r) => {
                            return `"${r.text}"`;
                        })
                        .join(', ') || 'none'
                })`
            );
            continue;
        }
        const range = document.createRange();
        range.selectNodeContents(run.node);
        const box = relative(range.getBoundingClientRect(), origin);
        // Horizontal: ink box. Vertical: centre only — a Range is the font's content area, Figma's box is the line box.
        if (!near(box.x, text.box.x) || !near(box.width, text.box.width)) {
            out.push(`${label} x/width ${round(box.x)}/${round(box.width)} ≠ Figma ${text.box.x}/${text.box.width}`);
        }
        const centre = box.y + box.height / 2;
        const figmaCentre = text.box.y + text.box.height / 2;
        if (!near(centre, figmaCentre)) {
            out.push(`${label} vertical centre ${round(centre)} ≠ Figma ${figmaCentre}`);
        }

        const style = getComputedStyle(run.node.parentElement);
        const family = style.fontFamily.split(',')[0]?.replaceAll(/["']/g, '').trim();
        if (family !== text.fontFamily) {
            out.push(`${label} font-family ${family} ≠ Figma ${text.fontFamily}`);
        } else if (!document.fonts.check(`${style.fontWeight} ${style.fontSize} "${family}"`)) {
            out.push(`${label} font ${family} ${style.fontWeight} not loaded (fallback rendered)`);
        }
        if (Number.parseFloat(style.fontSize) !== text.fontSize) {
            out.push(`${label} font-size ${style.fontSize} ≠ Figma ${text.fontSize}px`);
        }
        if (Number(style.fontWeight) !== text.fontWeight) {
            out.push(`${label} font-weight ${style.fontWeight} ≠ Figma ${text.fontWeight}`);
        }
        const lineHeight = Number.parseFloat(style.lineHeight);
        if (!near(lineHeight, text.lineHeightPx)) {
            out.push(`${label} line-height ${style.lineHeight} ≠ Figma ${text.lineHeightPx}px`);
        }
        const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
        if (Math.abs(letterSpacing - text.letterSpacing) > 0.05) {
            out.push(`${label} letter-spacing ${style.letterSpacing} ≠ Figma ${text.letterSpacing}px`);
        }
        if (text.color) {
            const color = toRgba(style.color);
            if (colorDiff(color, text.color)) {
                out.push(`${label} color ${fmt(color)} ≠ Figma ${fmt(text.color)}`);
            }
        }
    }

    // Icons, matched by reading order.
    const svgs = icons(root);
    if (svgs.length !== spec.icons.length) {
        out.push(
            `icons: ${svgs.length} rendered ≠ Figma ${spec.icons.length} (${spec.icons
                .map((i) => {
                    return i.name;
                })
                .join(', ')})`
        );
    }
    spec.icons.forEach((icon, index) => {
        const svg = svgs[index];
        if (!svg) {
            return;
        }
        const box = relative(svg.getBoundingClientRect(), origin);
        if (
            !near(box.x, icon.box.x) ||
            !near(box.y, icon.box.y) ||
            !near(box.width, icon.box.width) ||
            !near(box.height, icon.box.height)
        ) {
            out.push(
                `icon #${index + 1} "${icon.name}" box ${round(box.x)},${round(box.y)} ${round(box.width)}×${round(box.height)} ≠ Figma ${icon.box.x},${icon.box.y} ${icon.box.width}×${icon.box.height}`
            );
        }
    });

    return out;
}
