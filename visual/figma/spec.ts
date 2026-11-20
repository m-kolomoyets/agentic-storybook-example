// Browser side: hold a rendered element to the Figma spec from visual/figma/commands.ts.
// Compares what survives DOM flattening (Figma auto-layout frames rarely map 1:1 to elements): the root box, each
// visible text run (matched by its characters) and each icon (matched by left-to-right order). Returns readable
// mismatch lines; an empty list means "matches Figma within tolerance".
import type { FigmaSpec, Rgba } from './types.ts';
import { nearestToken, toHsl, toRgba } from './colors.ts';

/** CSS px. Sub-pixel layout and font metrics differ between Figma and Chromium; 1px absorbs that, not real drift. */
const PX = 1;
/**
 * Extra CSS px per character of text laid out before a measured edge. Linux Chromium (the pinned Docker browser)
 * rounds every glyph advance to a whole pixel while Figma keeps fractions, so a label drifts up to ~0.2px per glyph
 * ("Stop Recondition": 124px vs Figma's 121px) and moves everything after it. No Chromium flag or fontconfig setting
 * changes this (visual/FIGMA-TESTING.md → Tolerances).
 */
const TEXT_ADVANCE = 0.25;
/** Per 0–255 channel: Figma stores float colors, CSS rounds to bytes, color spaces round-trip. */
const CHANNEL = 3;

type Box = { x: number; y: number; width: number; height: number };

function colorDiff(actual: Rgba, expected: Rgba): boolean {
    return (
        Math.abs(actual.r - expected.r) > CHANNEL ||
        Math.abs(actual.g - expected.g) > CHANNEL ||
        Math.abs(actual.b - expected.b) > CHANNEL ||
        Math.abs(actual.a - expected.a) > CHANNEL / 255
    );
}

/** Kit HSL + nearest token: `hsl(0 0% 99.6% / 0.12) [= --color-border-primary → --color-white-alpha-12]`. */
function fmt(color: Rgba): string {
    return `${toHsl(color)} [${nearestToken(color, CHANNEL)}]`;
}

function relative(rect: DOMRect, origin: DOMRect): Box {
    return { x: rect.x - origin.x, y: rect.y - origin.y, width: rect.width, height: rect.height };
}

function near(actual: number, expected: number, slack = 0): boolean {
    return Math.abs(actual - expected) <= PX + slack;
}

/** Text-advance allowance for an edge at Figma x `edge`: every text run that ends at or before it. */
function textSlackBefore(spec: FigmaSpec, edge: number): number {
    return spec.texts
        .filter((text) => {
            return text.box.x + text.box.width <= edge + 0.5;
        })
        .reduce((sum, text) => {
            return sum + text.characters.length * TEXT_ADVANCE;
        }, 0);
}

function allowance(slack: number): string {
    return slack > 0 ? ` (±${round(PX + slack)}px)` : '';
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

/**
 * Glyphs in reading order, mirroring Figma's "instance with no text": every top-level <svg>, plus any visible leaf
 * element with no text (CSS-drawn spinners, dots, masks). Layers stacked on the same box (a plate under an outline)
 * are one glyph to Figma, so they count once.
 */
function icons(root: Element): Element[] {
    const visible = [...root.querySelectorAll('*')]
        .filter((element) => {
            if (element.closest('svg') !== null && element.tagName.toLowerCase() !== 'svg') {
                return false;
            }
            if (element.tagName.toLowerCase() === 'svg') {
                // Nested <svg> inside an icon is part of that icon.
                return element.parentElement?.closest('svg') === null && element.checkVisibility();
            }
            const rect = element.getBoundingClientRect();
            // Visually hidden form inputs (Base UI pairs one with every control) and 1px sr-only boxes aren't drawn.
            if (element instanceof HTMLInputElement || rect.width <= 1 || rect.height <= 1) {
                return false;
            }

            return (
                element.childElementCount === 0 &&
                !element.textContent?.trim() &&
                rect.width > 0 &&
                rect.height > 0 &&
                element.checkVisibility()
            );
        })
        .sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();

            return ra.x - rb.x || ra.y - rb.y;
        });

    return visible.filter((element, index) => {
        const box = element.getBoundingClientRect();

        return !visible.slice(0, index).some((earlier) => {
            const other = earlier.getBoundingClientRect();

            return (
                Math.abs(other.x - box.x) < 0.5 &&
                Math.abs(other.y - box.y) < 0.5 &&
                Math.abs(other.width - box.width) < 0.5 &&
                Math.abs(other.height - box.height) < 0.5
            );
        });
    });
}

export function figmaSpecMismatches(root: Element, spec: FigmaSpec): string[] {
    const out: string[] = [];
    const origin = root.getBoundingClientRect();
    const rootStyle = getComputedStyle(root);

    // Root box. Hug-width components grow with their labels: width gets every run's text-advance allowance.
    const widthSlack = textSlackBefore(spec, Infinity);
    if (!near(origin.width, spec.root.width, widthSlack) || !near(origin.height, spec.root.height)) {
        out.push(
            `root size ${round(origin.width)}×${round(origin.height)} ≠ Figma ${spec.root.width}×${spec.root.height}${allowance(widthSlack)}`
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
        const xSlack = textSlackBefore(spec, text.box.x);
        const runSlack = text.characters.length * TEXT_ADVANCE;
        if (!near(box.x, text.box.x, xSlack) || !near(box.width, text.box.width, runSlack)) {
            out.push(
                `${label} x/width ${round(box.x)}/${round(box.width)} ≠ Figma ${text.box.x}/${text.box.width}${allowance(runSlack)}`
            );
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
    const glyphs = icons(root);
    if (glyphs.length !== spec.icons.length) {
        out.push(
            `icons: ${glyphs.length} rendered ≠ Figma ${spec.icons.length} (${spec.icons
                .map((i) => {
                    return i.name;
                })
                .join(', ')})`
        );
    }
    spec.icons.forEach((icon, index) => {
        const glyph = glyphs[index];
        if (!glyph) {
            return;
        }
        const box = relative(glyph.getBoundingClientRect(), origin);
        const xSlack = textSlackBefore(spec, icon.box.x);
        if (
            !near(box.x, icon.box.x, xSlack) ||
            !near(box.y, icon.box.y) ||
            !near(box.width, icon.box.width) ||
            !near(box.height, icon.box.height)
        ) {
            out.push(
                `icon #${index + 1} "${icon.name}" box ${round(box.x)},${round(box.y)} ${round(box.width)}×${round(box.height)} ≠ Figma ${icon.box.x},${icon.box.y} ${icon.box.width}×${icon.box.height}${allowance(xSlack)}`
            );
        }
    });

    return out;
}

/**
 * Where text sits, on either side: per text run, Figma's box ∪ the rendered run's box, padded 1px, relative to
 * `root`. The pixel comparison paints these identically on both images, so pixels judge fills, strokes, shadows and
 * glyphs while text is judged here, by spec value (font, size, weight, colour, position). Text rasterisation and
 * Linux whole-pixel advances otherwise dominate the pixel count.
 */
export function textMasks(root: Element, spec: FigmaSpec): Box[] {
    const origin = root.getBoundingClientRect();
    const runs = textRuns(root);

    return spec.texts.map((text) => {
        const run = runs.find((candidate) => {
            return candidate.text === text.characters.trim();
        });
        let box = text.box;
        if (run) {
            const range = document.createRange();
            range.selectNodeContents(run.node);
            const rendered = relative(range.getBoundingClientRect(), origin);
            const x = Math.min(box.x, rendered.x);
            const y = Math.min(box.y, rendered.y);
            box = {
                x,
                y,
                width: Math.max(box.x + box.width, rendered.x + rendered.width) - x,
                height: Math.max(box.y + box.height, rendered.y + rendered.height) - y,
            };
        }

        return { x: box.x - 1, y: box.y - 1, width: box.width + 2, height: box.height + 2 };
    });
}
