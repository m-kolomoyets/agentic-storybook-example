// Browser side: hold a rendered element to the Figma spec from visual/figma/commands.ts.
// Compares what survives DOM flattening (Figma auto-layout frames rarely map 1:1 to elements): the root box, each
// visible text run (matched by its characters) and each icon (matched by left-to-right order). Returns readable
// mismatch lines; an empty list means "matches Figma within tolerance".
import type { FigmaIssue, FigmaIssueValue, FigmaLayout, FigmaShadow, FigmaSpec, FigmaStroke, Rgba } from './types.ts';
import type { FigmaVariableCatalog } from './variables.ts';
import catalogue from './__refs__/variables.json';
import { backgroundOf } from './a11y.ts';
import { contrastRatio, deltaEOK, distance, nearestToken, over, toHsl, tokenColor, toRgba } from './colors.ts';
import { kitIconFile, kitIconOf } from './content.tsx';
import { kitColorToken } from './variables.ts';

/** CSS px. Sub-pixel layout and font metrics differ between Figma and Chromium; 1px absorbs that, not real drift. */
const PX = 1;
/**
 * Extra CSS px per character of text laid out before a measured edge. Linux Chromium (the pinned Docker browser)
 * rounds every glyph advance to a whole pixel while Figma keeps fractions, so a label drifts up to ~0.2px per glyph
 * ("Stop Recondition": 124px vs Figma's 121px) and moves everything after it. No Chromium flag or fontconfig setting
 * changes this (visual/FIGMA-TESTING.md → Tolerances).
 */
const TEXT_ADVANCE = 0.25;
/** Cap on the summed allowance: "Stop Recondition" (16 glyphs) drifts 3px; past ~4px the drift is a real error. */
const MAX_TEXT_SLACK = 4;
/** Per 0–255 channel: Figma stores float colors, CSS rounds to bytes, color spaces round-trip. */
const CHANNEL = 3;

type Box = { x: number; y: number; width: number; height: number };

/**
 * What each colour is seen over: the story's real backdrop (its ancestors' backgrounds on the page ground) and
 * Figma's (the variant's fill on the same ground). Colours are compared as seen, not as declared.
 */
type Backdrop = { story: Rgba; figma: Rgba };

/**
 * CSS Color 4 `deltaEOK` between the two colours as seen. Calibrated on the kit (2026-11-21, 476 pairs): matching
 * pairs ≤ 0.0036, every real difference ≥ 0.021; 0.01 sits between. A translucent colour that rounds differently but
 * looks the same (α 0.1 vs 0.102) no longer fails.
 */
const EOK = 0.01;

function seenDelta(actual: Rgba, expected: Rgba, back: Backdrop): number {
    return deltaEOK(over(actual, back.story), over(expected, back.figma));
}

/**
 * Contrast of each side's colour against what it's seen over, for a row of a colour WCAG constrains; undefined for
 * disabled controls (exempt).
 */
function contrastOf(
    actual: Rgba,
    expected: Rgba,
    back: Backdrop,
    required: number,
    criterion: string,
    exempt: boolean
): FigmaIssue['contrast'] {
    if (exempt) {
        return undefined;
    }
    const ratio = (color: Rgba, under: Rgba) => {
        return Math.round(contrastRatio(over(color, under), under) * 10) / 10;
    };

    return { figma: ratio(expected, back.figma), story: ratio(actual, back.story), required, criterion };
}

function colorDiff(actual: Rgba, expected: Rgba, back: Backdrop): boolean {
    return seenDelta(actual, expected, back) > EOK;
}

function colorValue(color: Rgba): FigmaIssueValue {
    const text = toHsl(color);

    return { text, note: nearestToken(color, CHANNEL), swatch: text };
}

/** `ΔEOK 0.684 · 0 RGB · α +0.88`: the seen difference first, then the declared one (largest channel, alpha). */
function colorDelta(actual: Rgba, expected: Rgba, back: Backdrop): string {
    const channel = Math.max(
        Math.abs(actual.r - expected.r),
        Math.abs(actual.g - expected.g),
        Math.abs(actual.b - expected.b)
    );
    const alpha = signed(actual.a - expected.a);
    const seen = `ΔEOK ${seenDelta(actual, expected, back).toFixed(3)}`;

    return alpha === '0' ? `${seen} · ${channel} RGB` : `${seen} · ${channel} RGB · α ${alpha}`;
}

const COLOR_TOLERANCE = `ΔEOK ≤ ${EOK} as seen`;
/** CSS px. Stroke weights are whole or half pixels on both sides; a quarter absorbs DPR rounding. */
const STROKE = 0.25;
/** CSS px. Shadow offsets/spread are declared integers; blur rasterises differently (Gaussian σ = blur/2 in CSS). */
const SHADOW_OFFSET = 0.5;
const SHADOW_BLUR = 1;
/** Node vs CSS opacity: both floats; Figma stores 0.3 as 0.30000001. */
const OPACITY = 0.01;
/** CSS px. Gaps are declared integers and flexbox places items exactly; half a pixel absorbs centring remainders. */
const GAP = 0.5;

function relative(rect: DOMRect, origin: DOMRect): Box {
    return { x: rect.x - origin.x, y: rect.y - origin.y, width: rect.width, height: rect.height };
}

function near(actual: number, expected: number, slack = 0): boolean {
    return Math.abs(actual - expected) <= PX + slack;
}

/** Text-advance allowance for an edge at Figma x `edge`: every text run that ends at or before it, capped. */
function textSlackBefore(spec: FigmaSpec, edge: number): number {
    const slack = spec.texts
        .filter((text) => {
            return text.box.x + text.box.width <= edge + 0.5;
        })
        .reduce((sum, text) => {
            return sum + text.characters.length * TEXT_ADVANCE;
        }, 0);

    return Math.min(slack, MAX_TEXT_SLACK);
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

/** `+2`, `−18` (true minus sign), `0`. */
function signed(value: number): string {
    const rounded = round(value);
    if (rounded > 0) {
        return `+${rounded}`;
    }

    return rounded < 0 ? `−${Math.abs(rounded)}` : '0';
}

function px(value: number): string {
    return `${round(value)}px`;
}

function tolerance(slack = 0): string {
    return `±${round(PX + slack)}px`;
}

/** One numeric property, in CSS px. */
function lengthIssue(element: string, property: string, actual: number, expected: number, slack = 0): FigmaIssue {
    return {
        element,
        property,
        expected: { text: px(expected) },
        actual: { text: px(actual) },
        delta: `${signed(actual - expected)}px`,
        tolerance: tolerance(slack),
    };
}

/** A box's position or size, `x, y` / `w × h`. */
function pairIssue(
    element: string,
    property: string,
    [actualA, actualB]: [number, number],
    [expectedA, expectedB]: [number, number],
    separator: string,
    slack = 0
): FigmaIssue {
    return {
        element,
        property,
        expected: { text: `${round(expectedA)}${separator}${round(expectedB)}px` },
        actual: { text: `${round(actualA)}${separator}${round(actualB)}px` },
        delta: `${signed(actualA - expectedA)}${separator}${signed(actualB - expectedB)}px`,
        tolerance: tolerance(slack),
    };
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
 * are one glyph to Figma, so they count once, as the topmost layer.
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

    // The last of a stack is drawn on top: keep it, so its colour is the one compared.
    return visible.filter((element, index) => {
        const box = element.getBoundingClientRect();

        return !visible.slice(index + 1).some((later) => {
            const other = later.getBoundingClientRect();

            return (
                Math.abs(other.x - box.x) < 0.5 &&
                Math.abs(other.y - box.y) < 0.5 &&
                Math.abs(other.width - box.width) < 0.5 &&
                Math.abs(other.height - box.height) < 0.5
            );
        });
    });
}

type Shadow = Omit<FigmaShadow, 'color'> & { color: Rgba };
type Stroke = Omit<FigmaStroke, 'color'> & { color: Rgba; source: string };

/** Splits a computed list (`box-shadow`) on top-level commas. */
function splitList(value: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    for (let index = 0; index < value.length; index++) {
        const char = value[index];
        if (char === '(') {
            depth++;
        } else if (char === ')') {
            depth--;
        } else if (char === ',' && depth === 0) {
            parts.push(value.slice(start, index));
            start = index + 1;
        }
    }
    parts.push(value.slice(start));

    return parts
        .map((part) => {
            return part.trim();
        })
        .filter(Boolean);
}

/** Computed `box-shadow` → visible shadows (Tailwind stacks transparent `0 0 #0000` placeholders: dropped). */
function cssShadows(value: string): Shadow[] {
    if (value === 'none') {
        return [];
    }

    return splitList(value).flatMap((part) => {
        const color = /(?:rgba?|hsla?|oklab|oklch|lab|lch|color)\([^)]*\)|#[\da-f]+|transparent/i.exec(part)?.[0];
        const lengths = part
            .replace(color ?? '', '')
            .replace('inset', '')
            .trim()
            .split(/\s+/)
            .map((length) => {
                return Number.parseFloat(length) || 0;
            });
        const rgba = color ? toRgba(color) : null;
        if (!rgba || rgba.a === 0) {
            return [];
        }
        const [x = 0, y = 0, blur = 0, spread = 0] = lengths;

        return [{ inset: /\binset\b/.test(part), x, y, blur, spread, color: rgba }];
    });
}

/** A spread-only shadow (Tailwind `ring` / `inset-ring`) draws a stroke, not a shadow. */
function isRing(shadow: Shadow): boolean {
    return shadow.x === 0 && shadow.y === 0 && shadow.blur === 0 && shadow.spread > 0;
}

/**
 * Every way the kit draws a stroke, in Figma's terms: `border` (inside the box), `outline` (outside, or inside/centre
 * by negative offset), `inset-ring` (inset spread shadow, inside) and `ring` (outer spread shadow, outside).
 */
function cssStrokes(style: CSSStyleDeclaration): Stroke[] {
    const strokes: Stroke[] = [];
    const sides = (['Top', 'Right', 'Bottom', 'Left'] as const).map((side) => {
        const lineStyle = style.getPropertyValue(`border-${side.toLowerCase()}-style`);

        return lineStyle === 'none' || lineStyle === 'hidden'
            ? 0
            : Number.parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) || 0;
    }) as [number, number, number, number];
    const borderColor = toRgba(style.borderTopColor);
    if (Math.max(...sides) > 0 && borderColor.a > 0) {
        strokes.push({
            weight: Math.max(...sides),
            sides: new Set(sides).size > 1 ? sides : null,
            align: 'INSIDE',
            color: borderColor,
            dashed: /dashed|dotted/.test(style.borderTopStyle),
            source: 'border',
        });
    }
    const outline = Number.parseFloat(style.outlineWidth) || 0;
    const outlineColor = toRgba(style.outlineColor);
    if (style.outlineStyle !== 'none' && outline > 0 && outlineColor.a > 0) {
        const offset = Number.parseFloat(style.outlineOffset) || 0;
        let align: FigmaStroke['align'] = 'OUTSIDE';
        if (offset <= -outline + 0.25) {
            align = 'INSIDE';
        } else if (offset < -0.25) {
            align = 'CENTER';
        }
        strokes.push({
            weight: outline,
            sides: null,
            align,
            color: outlineColor,
            dashed: /dashed|dotted/.test(style.outlineStyle),
            source: offset === 0 ? 'outline' : `outline, offset ${round(offset)}px`,
        });
    }
    for (const shadow of cssShadows(style.boxShadow).filter(isRing)) {
        strokes.push({
            weight: shadow.spread,
            sides: null,
            align: shadow.inset ? 'INSIDE' : 'OUTSIDE',
            color: shadow.color,
            dashed: false,
            source: shadow.inset ? 'inset-ring' : 'ring',
        });
    }

    return strokes;
}

/** `1px`, or per side `0px 0px 1px 0px` (top right bottom left). */
function weightText(stroke: FigmaStroke | Stroke): string {
    return stroke.sides ? stroke.sides.map(px).join(' ') : px(stroke.weight);
}

function strokeText(stroke: FigmaStroke | Stroke): string {
    const weight = weightText(stroke);

    return `${weight} ${stroke.align.toLowerCase()}${stroke.dashed ? ' dashed' : ''} ${toHsl(stroke.color)}`;
}

function shadowText(shadow: Shadow): string {
    return `${px(shadow.x)} ${px(shadow.y)} ${px(shadow.blur)} ${px(shadow.spread)}`;
}

/** Root stroke: Figma's one stroke against whichever CSS mechanism draws it; extra drawn strokes are reported too. */
function strokeIssues(expected: FigmaStroke | null, strokes: Stroke[], back: Backdrop, exempt: boolean): FigmaIssue[] {
    const element = 'Component';
    const out: FigmaIssue[] = [];
    const pick = expected
        ? (strokes.find((stroke) => {
              return stroke.align === expected.align;
          }) ?? strokes[0])
        : undefined;
    if (expected && !pick) {
        out.push({
            element,
            property: 'Stroke',
            expected: {
                text: strokeText(expected),
                note: nearestToken(expected.color, CHANNEL),
                swatch: toHsl(expected.color),
            },
            actual: { text: 'none', note: 'no border, outline or ring' },
            tolerance: 'present',
        });
    }
    if (expected && pick) {
        const weights = (stroke: FigmaStroke | Stroke) => {
            return stroke.sides ?? [stroke.weight, stroke.weight, stroke.weight, stroke.weight];
        };
        if (
            weights(pick).some((weight, index) => {
                return Math.abs(weight - (weights(expected)[index] ?? 0)) > STROKE;
            })
        ) {
            out.push({
                element,
                property: 'Stroke width',
                expected: { text: weightText(expected) },
                actual: { text: weightText(pick), note: pick.source },
                delta: `${signed(pick.weight - expected.weight)}px`,
                tolerance: `±${STROKE}px`,
            });
        }
        if (pick.align !== expected.align) {
            out.push({
                element,
                property: 'Stroke position',
                expected: { text: expected.align.toLowerCase() },
                actual: { text: pick.align.toLowerCase(), note: pick.source },
                tolerance: 'exact',
            });
        }
        if (colorDiff(pick.color, expected.color, back)) {
            out.push({
                element,
                property: 'Stroke colour',
                expected: colorValue(expected.color),
                actual: { ...colorValue(pick.color), note: `${colorValue(pick.color).note} · ${pick.source}` },
                delta: colorDelta(pick.color, expected.color, back),
                tolerance: COLOR_TOLERANCE,
                contrast: contrastOf(pick.color, expected.color, back, 3, 'WCAG 1.4.11 non-text', exempt),
            });
        }
        if (pick.dashed !== expected.dashed) {
            out.push({
                element,
                property: 'Stroke style',
                expected: { text: expected.dashed ? 'dashed' : 'solid' },
                actual: { text: pick.dashed ? 'dashed' : 'solid', note: pick.source },
                tolerance: 'exact',
            });
        }
    }
    for (const extra of strokes.filter((stroke) => {
        return stroke !== pick;
    })) {
        out.push({
            element,
            property: 'Stroke',
            expected: { text: expected ? 'one stroke' : 'none' },
            actual: {
                text: strokeText(extra),
                note: `${extra.source} · ${nearestToken(extra.color, CHANNEL)}`,
                swatch: toHsl(extra.color),
            },
            tolerance: 'exact',
        });
    }

    return out;
}

/** Figma drop/inner shadows against the computed non-ring `box-shadow`s, paired by kind then nearest geometry. */
function shadowIssues(expected: FigmaShadow[], drawn: Shadow[], back: Backdrop): FigmaIssue[] {
    const element = 'Component';
    const out: FigmaIssue[] = [];
    const left = [...drawn];
    const label = (shadow: { inset: boolean }) => {
        return shadow.inset ? 'Inner shadow' : 'Drop shadow';
    };
    for (const shadow of expected) {
        const distance = (other: Shadow) => {
            return (
                Math.abs(other.x - shadow.x) +
                Math.abs(other.y - shadow.y) +
                Math.abs(other.blur - shadow.blur) +
                Math.abs(other.spread - shadow.spread)
            );
        };
        const match = left
            .filter((candidate) => {
                return candidate.inset === shadow.inset;
            })
            .sort((a, b) => {
                return distance(a) - distance(b);
            })[0];
        if (!match) {
            out.push({
                element,
                property: label(shadow),
                expected: { text: `${shadowText(shadow)} ${toHsl(shadow.color)}`, swatch: toHsl(shadow.color) },
                actual: { text: 'none' },
                tolerance: 'present',
            });
            continue;
        }
        left.splice(left.indexOf(match), 1);
        const off =
            Math.abs(match.x - shadow.x) > SHADOW_OFFSET ||
            Math.abs(match.y - shadow.y) > SHADOW_OFFSET ||
            Math.abs(match.spread - shadow.spread) > SHADOW_OFFSET ||
            Math.abs(match.blur - shadow.blur) > SHADOW_BLUR;
        if (off) {
            out.push({
                element,
                property: `${label(shadow)} (x y blur spread)`,
                expected: { text: shadowText(shadow) },
                actual: { text: shadowText(match) },
                delta: `${signed(match.x - shadow.x)} ${signed(match.y - shadow.y)} ${signed(match.blur - shadow.blur)} ${signed(match.spread - shadow.spread)}px`,
                tolerance: `±${SHADOW_OFFSET}px, blur ±${SHADOW_BLUR}px`,
            });
        }
        if (colorDiff(match.color, shadow.color, back)) {
            out.push({
                element,
                property: `${label(shadow)} colour`,
                expected: colorValue(shadow.color),
                actual: colorValue(match.color),
                delta: colorDelta(match.color, shadow.color, back),
                tolerance: COLOR_TOLERANCE,
            });
        }
    }
    for (const extra of left) {
        out.push({
            element,
            property: label(extra),
            expected: { text: 'none' },
            actual: { text: `${shadowText(extra)} ${toHsl(extra.color)}`, swatch: toHsl(extra.color) },
            tolerance: 'exact',
        });
    }

    return out;
}

const SVG_SHAPES = 'path, circle, ellipse, rect, polygon, polyline, line, text, use';

/**
 * A rendered glyph's visible colour, mirroring the Figma side: topmost painted shape (fill, else stroke; CSS-drawn
 * glyphs: background, else border), alpha × fill/stroke-opacity × every `opacity` up to (not including) `root`.
 */
function renderedGlyphColor(glyph: Element, root: Element): Rgba | null {
    const paintOf = (value: string) => {
        return value === 'none' || value.startsWith('url(') ? null : toRgba(value);
    };
    let target: Element = glyph;
    let color: Rgba | null = null;
    if (glyph.tagName.toLowerCase() === 'svg') {
        for (const shape of [...glyph.querySelectorAll(SVG_SHAPES)].reverse()) {
            const style = getComputedStyle(shape);
            if (style.display === 'none' || style.visibility === 'hidden') {
                continue;
            }
            const fill = paintOf(style.fill);
            const stroke = paintOf(style.stroke);
            const paint =
                fill && fill.a > 0
                    ? { ...fill, a: fill.a * Number(style.fillOpacity) }
                    : stroke && { ...stroke, a: stroke.a * Number(style.strokeOpacity) };
            if (paint && paint.a > 0) {
                target = shape;
                color = paint;
                break;
            }
        }
    } else {
        const style = getComputedStyle(glyph);
        const background = toRgba(style.backgroundColor);
        color = background.a > 0 ? background : (cssStrokes(style)[0]?.color ?? null);
    }
    if (!color) {
        return null;
    }
    let alpha = color.a;
    for (let element: Element | null = target; element && element !== root; element = element.parentElement) {
        alpha *= Number(getComputedStyle(element).opacity);
    }

    return { ...color, a: Math.round(alpha * 1000) / 1000 };
}

type Item = { box: Box; text: boolean; element: Element | null };

/** A container's in-flow items, as flexbox lays them out: visible elements plus non-empty text runs. */
function layoutItems(container: Element, origin: DOMRect): Item[] {
    const items: Item[] = [];
    for (const node of container.childNodes) {
        if (node instanceof Element) {
            const style = getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            if (
                node.checkVisibility() &&
                style.position !== 'absolute' &&
                style.position !== 'fixed' &&
                rect.width > 0 &&
                rect.height > 0
            ) {
                items.push({ box: relative(rect, origin), text: false, element: node });
            }
        } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
            const range = document.createRange();
            range.selectNodeContents(node);
            items.push({ box: relative(range.getBoundingClientRect(), origin), text: true, element: null });
        }
    }

    return items;
}

/**
 * The element arranging the content, mirroring the Figma side: from the root through single-item wrappers that hold
 * text or several items (an icon's own wrapper is an item, not a container).
 */
function layoutContainer(root: Element, origin: DOMRect): { container: Element; items: Item[] } {
    let container = root;
    for (;;) {
        const items = layoutItems(container, origin);
        const only = items.length === 1 ? items[0]?.element : null;
        if (
            !only ||
            only.tagName.toLowerCase() === 'svg' ||
            (!only.textContent?.trim() && layoutItems(only, origin).length < 2)
        ) {
            return { container, items };
        }
        container = only;
    }
}

const PRIMARY_ALIGN: Record<string, string> = {
    normal: 'MIN',
    start: 'MIN',
    'flex-start': 'MIN',
    left: 'MIN',
    center: 'CENTER',
    end: 'MAX',
    'flex-end': 'MAX',
    right: 'MAX',
    'space-between': 'SPACE_BETWEEN',
};
const COUNTER_ALIGN: Record<string, string> = {
    normal: 'STRETCH',
    stretch: 'STRETCH',
    start: 'MIN',
    'flex-start': 'MIN',
    'self-start': 'MIN',
    center: 'CENTER',
    end: 'MAX',
    'flex-end': 'MAX',
    'self-end': 'MAX',
    baseline: 'BASELINE',
    'first baseline': 'BASELINE',
};
const CSS_ALIGN: Record<string, string> = {
    MIN: 'flex-start',
    CENTER: 'center',
    MAX: 'flex-end',
    SPACE_BETWEEN: 'space-between',
    BASELINE: 'baseline',
    STRETCH: 'stretch',
};

function sides(style: CSSStyleDeclaration, box: 'padding' | 'border'): string {
    const values = ['top', 'right', 'bottom', 'left'].map((side) => {
        return style.getPropertyValue(box === 'padding' ? `padding-${side}` : `border-${side}-width`);
    });

    return new Set(values).size === 1 ? (values[0] ?? '0px') : values.join(' ');
}

/**
 * Auto-layout, measured by geometry so text-width drift can't leak in: the gap between neighbours (next start minus
 * previous end) and the content inset on each side (padding + border, or whatever places the content). Declared
 * direction, alignment and wrap are compared only where they can show.
 */
function layoutIssues(
    root: Element,
    spec: FigmaSpec,
    layout: FigmaLayout
): { issues: FigmaIssue[]; container: Element } {
    const element = 'Layout';
    const out: FigmaIssue[] = [];
    const origin = root.getBoundingClientRect();
    const { container, items } = layoutContainer(root, origin);
    const figma = layout.children;
    if (items.length !== figma.length || items.length === 0) {
        // Different item counts (a missing icon, a merged label): the Icons/Text rows say which; gaps can't pair up.
        return { issues: out, container };
    }
    const horizontal = layout.direction === 'HORIZONTAL';
    const start = (box: Box) => {
        return horizontal ? box.x : box.y;
    };
    const end = (box: Box) => {
        return horizontal ? box.x + box.width : box.y + box.height;
    };
    const sorted = [...items].sort((a, b) => {
        return start(a.box) - start(b.box);
    });
    const style = getComputedStyle(container);
    const rootStyle = getComputedStyle(root);
    const flex = style.display.includes('flex');
    if (items.length > 1) {
        const first = sorted[0]?.box;
        const second = sorted[1]?.box;
        const drawnHorizontal = first && second ? second.x >= first.x + first.width - 0.5 : horizontal;
        if (drawnHorizontal !== horizontal) {
            out.push({
                element,
                property: 'Direction',
                expected: { text: horizontal ? 'row' : 'column' },
                actual: {
                    text: drawnHorizontal ? 'row' : 'column',
                    note: flex ? `flex-direction: ${style.flexDirection}` : `display: ${style.display}`,
                },
                tolerance: 'exact',
            });

            return { issues: out, container };
        }
    }
    const gapNote = `${horizontal ? 'column-gap' : 'row-gap'}: ${horizontal ? style.columnGap : style.rowGap}`;
    for (let index = 1; index < figma.length; index++) {
        const before = figma[index - 1];
        const after = figma[index];
        const drawnBefore = sorted[index - 1];
        const drawnAfter = sorted[index];
        if (!before || !after || !drawnBefore || !drawnAfter) {
            continue;
        }
        const expected = start(after.box) - end(before.box);
        const actual = start(drawnAfter.box) - end(drawnBefore.box);
        if (Math.abs(actual - expected) > GAP) {
            out.push({
                element,
                property: `Gap "${before.name}" → "${after.name}"`,
                expected: { text: px(expected) },
                actual: { text: px(actual), note: gapNote },
                delta: `${signed(actual - expected)}px`,
                tolerance: `±${GAP}px`,
            });
        }
    }
    // Content inset. Vertical extents skip bare text runs: a Range is the font's content area, Figma's the line box.
    const extent = (boxes: Box[]) => {
        return {
            left: Math.min(
                ...boxes.map((box) => {
                    return box.x;
                })
            ),
            top: Math.min(
                ...boxes.map((box) => {
                    return box.y;
                })
            ),
            right: Math.max(
                ...boxes.map((box) => {
                    return box.x + box.width;
                })
            ),
            bottom: Math.max(
                ...boxes.map((box) => {
                    return box.y + box.height;
                })
            ),
        };
    };
    const figmaAll = extent(
        figma.map((child) => {
            return child.box;
        })
    );
    const drawnAll = extent(
        items.map((item) => {
            return item.box;
        })
    );
    const blocks = items
        .map((item, index) => {
            return { item, child: figma[index] };
        })
        .filter(({ item }) => {
            return !item.text;
        });
    const figmaBlocks = blocks.length
        ? extent(
              blocks.map(({ child }) => {
                  return child?.box ?? { x: 0, y: 0, width: 0, height: 0 };
              })
          )
        : null;
    const drawnBlocks = blocks.length
        ? extent(
              blocks.map(({ item }) => {
                  return item.box;
              })
          )
        : null;
    const insetNote = `padding: ${sides(rootStyle, 'padding')}${sides(rootStyle, 'border') === '0px' ? '' : ` · border: ${sides(rootStyle, 'border')}`}`;
    const insets: [string, number, number, number][] = [
        ['left', drawnAll.left, figmaAll.left, 0],
        ['right', origin.width - drawnAll.right, spec.root.width - figmaAll.right, textSlackBefore(spec, Infinity)],
    ];
    if (figmaBlocks && drawnBlocks) {
        insets.push(['top', drawnBlocks.top, figmaBlocks.top, 0]);
        insets.push(['bottom', origin.height - drawnBlocks.bottom, spec.root.height - figmaBlocks.bottom, 0]);
    }
    for (const [side, actual, expected, slack] of insets) {
        if (!near(actual, expected, slack)) {
            out.push({
                ...lengthIssue(element, `Inset ${side} (padding)`, actual, expected, slack),
                actual: { text: px(actual), note: insetNote },
            });
        }
    }
    if (!flex) {
        return { issues: out, container };
    }
    if (!layout.hugPrimary && items.length > 0) {
        const drawn = PRIMARY_ALIGN[style.justifyContent] ?? style.justifyContent;
        if (drawn !== layout.primaryAlign) {
            out.push({
                element,
                property: 'Justify content',
                expected: { text: CSS_ALIGN[layout.primaryAlign] ?? layout.primaryAlign },
                actual: { text: style.justifyContent },
                tolerance: 'exact',
            });
        }
    }
    // Cross-axis alignment shows only when items differ in cross size.
    const cross = (box: Box) => {
        return horizontal ? box.height : box.width;
    };
    const crossSizes = figma.map((child) => {
        return cross(child.box);
    });
    if (Math.max(...crossSizes) - Math.min(...crossSizes) > 0.5) {
        const drawn = COUNTER_ALIGN[style.alignItems] ?? style.alignItems;
        if (drawn !== layout.counterAlign) {
            out.push({
                element,
                property: 'Align items',
                expected: { text: CSS_ALIGN[layout.counterAlign] ?? layout.counterAlign },
                actual: { text: style.alignItems },
                tolerance: 'exact',
            });
        }
    }
    if (layout.wrap !== style.flexWrap.startsWith('wrap')) {
        out.push({
            element,
            property: 'Wrap',
            expected: { text: layout.wrap ? 'wrap' : 'nowrap' },
            actual: { text: style.flexWrap },
            tolerance: 'exact',
        });
    }

    return { issues: out, container };
}

const TEXT_CASE: Record<string, string> = {
    ORIGINAL: 'none',
    UPPER: 'uppercase',
    LOWER: 'lowercase',
    TITLE: 'capitalize',
    SMALL_CAPS: 'small-caps',
    SMALL_CAPS_FORCED: 'all-small-caps',
};

/** What a text-transform / caps setting does to a string, for "would it look different". */
function cased(text: string, transform: string): string {
    if (transform === 'uppercase' || transform.includes('small-caps')) {
        return text.toUpperCase();
    }
    if (transform === 'lowercase') {
        return text.toLowerCase();
    }
    if (transform === 'capitalize') {
        return text.replaceAll(/(^|\s)(\S)/g, (_, space: string, letter: string) => {
            return `${space}${letter.toUpperCase()}`;
        });
    }

    return text;
}

/** Text case, decoration, alignment and truncation of one run, where each can show. */
function textStyleIssues(
    element: string,
    characters: string,
    node: Element,
    root: Element,
    text: FigmaSpec['texts'][number]
): FigmaIssue[] {
    const out: FigmaIssue[] = [];
    const style = getComputedStyle(node);
    if (text.textCase !== undefined) {
        const expected = TEXT_CASE[text.textCase] ?? 'none';
        const actual = style.fontVariantCaps.includes('small-caps') ? style.fontVariantCaps : style.textTransform;
        const smallCaps = (value: string) => {
            return value.includes('small-caps');
        };
        if (cased(characters, expected) !== cased(characters, actual) || smallCaps(expected) !== smallCaps(actual)) {
            out.push({
                element,
                property: 'Text case',
                expected: { text: expected },
                actual: { text: actual },
                tolerance: 'exact',
            });
        }
    }
    if (text.textDecoration !== undefined) {
        // Decorations draw through descendants without being inherited: collect them up to the root.
        const lines = new Set<string>();
        for (let current: Element | null = node; current; current = current === root ? null : current.parentElement) {
            for (const line of getComputedStyle(current).textDecorationLine.split(' ')) {
                if (line !== 'none') {
                    lines.add(line);
                }
            }
        }
        const expected = { UNDERLINE: 'underline', STRIKETHROUGH: 'line-through' }[text.textDecoration] ?? 'none';
        const actual = [...lines].join(' ') || 'none';
        if (expected !== actual) {
            out.push({
                element,
                property: 'Text decoration',
                expected: { text: expected },
                actual: { text: actual },
                tolerance: 'exact',
            });
        }
    }
    if (text.textAlign !== undefined && text.autoResize !== undefined && text.autoResize !== 'WIDTH_AND_HEIGHT') {
        const expected =
            { LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' }[text.textAlign] ?? 'left';
        const rtl = style.direction === 'rtl';
        const actual =
            { start: rtl ? 'right' : 'left', end: rtl ? 'left' : 'right' }[style.textAlign] ?? style.textAlign;
        if (expected !== actual) {
            out.push({
                element,
                property: 'Text align',
                expected: { text: expected },
                actual: { text: style.textAlign },
                tolerance: 'exact',
            });
        }
    }
    if (text.truncate !== undefined) {
        let ellipsis = false;
        for (
            let current: Element | null = node;
            current && !ellipsis;
            current = current === root ? null : current.parentElement
        ) {
            ellipsis = getComputedStyle(current).textOverflow === 'ellipsis';
        }
        if (ellipsis !== text.truncate) {
            out.push({
                element,
                property: 'Truncation',
                expected: { text: text.truncate ? 'ellipsis' : 'none' },
                actual: { text: ellipsis ? 'ellipsis' : 'none', note: 'text-overflow' },
                tolerance: 'exact',
            });
        }
    }

    return out;
}

/** `button > span:nth-of-type(2) > svg`: the path from `root` down to `element`, last four steps. */
export function pathFrom(root: Element, element: Element): string {
    const steps: string[] = [];
    for (let current: Element | null = element; current; current = current.parentElement) {
        const tag = current.tagName.toLowerCase();
        const slot = current.getAttribute('data-slot');
        const same = current.parentElement
            ? [...current.parentElement.children].filter((sibling) => {
                  return sibling.tagName === current?.tagName;
              })
            : [];
        const index = same.length > 1 ? `:nth-of-type(${same.indexOf(current) + 1})` : '';
        steps.unshift(`${tag}${slot ? `[data-slot="${slot}"]` : ''}${current === root ? '' : index}`);
        if (current === root) {
            break;
        }
    }

    return steps.slice(-4).join(' > ');
}

const VARIABLES = (catalogue as FigmaVariableCatalog).variables;

/**
 * Figma's side of a colour bound to a variable: `var Surface/control = --color-surface-control`, with the kit token
 * generated from that variable, its value when it no longer matches Figma's (drift), or the nearest token by value
 * when the kit has no token by that name. Returns the kit token for the story side to prefer.
 */
function boundColor(color: Rgba, id: string): { note: string; token: string | null } {
    const variable = VARIABLES[id];
    if (!variable) {
        return {
            note: `var ${id} (unnamed: pnpm vrt figma --variables-script) · ${nearestToken(color, CHANNEL)}`,
            token: null,
        };
    }
    const token = kitColorToken(variable);
    const kit = tokenColor(token);
    if (!kit) {
        return {
            note: `var ${variable.name} · no kit token by that name; nearest ${nearestToken(color, CHANNEL)}`,
            token: null,
        };
    }
    const drift = distance(kit, color) > CHANNEL ? ` (kit value ${toHsl(kit)})` : '';

    return { note: `var ${variable.name} = ${token}${drift}`, token };
}

/**
 * Figma's side of a bound length: `var Spacings/spacing-600 (padding-top)`. The variable's own value isn't in the
 * catalogue and a measured inset can include more than the padding, so no kit token is guessed from the row's value.
 */
function boundLength(id: string, binds: string): string {
    return `var ${VARIABLES[id]?.name ?? `${id} (unnamed)`} (${binds})`;
}

const INSET_VARS = {
    left: 'paddingLeft',
    right: 'paddingRight',
    top: 'paddingTop',
    bottom: 'paddingBottom',
} as const;
const TEXT_VARS: Record<string, keyof NonNullable<FigmaSpec['texts'][number]['vars']>> = {
    'Font size': 'fontSize',
    'Line height': 'lineHeight',
    'Letter spacing': 'letterSpacing',
    'Font family': 'fontFamily',
    'Font weight': 'fontWeight',
};

/**
 * Names Figma's variable on every row whose property Figma binds (spec `vars`): the expected side's note becomes the
 * variable (and its kit token); a colour's received side names that same token when its value is the story's.
 */
function annotateBindings(issues: FigmaIssue[], spec: FigmaSpec): FigmaIssue[] {
    return issues.map((issue) => {
        const colour = (color: Rgba | null | undefined, id: string | undefined): FigmaIssue => {
            if (!color || !id) {
                return issue;
            }
            const { note, token } = boundColor(color, id);
            const received = issue.actual.swatch ? toRgba(issue.actual.swatch) : null;

            return {
                ...issue,
                expected: { ...issue.expected, note },
                actual:
                    received && token
                        ? {
                              ...issue.actual,
                              note: issue.actual.note
                                  ?.replace(/^[=≈][^·]*/, `${nearestToken(received, CHANNEL, token)} `)
                                  .trim(),
                          }
                        : issue.actual,
            };
        };
        const length = (id: string | undefined, binds: string): FigmaIssue => {
            return id ? { ...issue, expected: { ...issue.expected, note: boundLength(id, binds) } } : issue;
        };
        const vars = spec.root.vars ?? {};
        if (issue.element === 'Component') {
            if (issue.property === 'Background') {
                return colour(spec.root.fill, vars.fill);
            }
            if (issue.property === 'Stroke colour') {
                return colour(spec.root.stroke?.color, vars.stroke);
            }
            if (issue.property === 'Corner radius') {
                return length(vars.radius, 'radius');
            }
        }
        if (issue.element === 'Layout') {
            const side = /^Inset (left|right|top|bottom)/.exec(issue.property)?.[1] as
                keyof typeof INSET_VARS | undefined;
            if (side) {
                return length(vars[INSET_VARS[side]], `padding-${side}`);
            }
            if (issue.property.startsWith('Gap ')) {
                return length(vars.gap, 'gap');
            }
        }
        const text = spec.texts.find((candidate) => {
            return issue.element === `Text "${candidate.characters}"`;
        });
        if (text) {
            if (issue.property === 'Colour') {
                return colour(text.color, text.vars?.color);
            }
            const key = TEXT_VARS[issue.property];
            if (key) {
                return length(text.vars?.[key], issue.property.toLowerCase());
            }
        }
        const iconIndex = Number(/^Icon (\d+) /.exec(issue.element)?.[1] ?? 0) - 1;
        const icon = spec.icons[iconIndex];
        if (icon && issue.property === 'Colour') {
            return colour(icon.color, icon.vars?.color);
        }

        return issue;
    });
}

export function figmaSpecMismatches(root: Element, spec: FigmaSpec): FigmaIssue[] {
    const out: FigmaIssue[] = [];
    // Which element each row measured, by its `element` label: becomes the row's selector.
    const measured = new Map<string, Element>([['Component', root]]);
    // Disabled controls are exempt from contrast minimums (WCAG 1.4.3, 1.4.11).
    // The state can sit on the root (a button) or the control inside it (a checkbox inside its label).
    const DISABLED = ':disabled, [aria-disabled="true"], [data-disabled]:not([data-disabled="false"])';
    const disabled = root.matches(DISABLED) || root.querySelector(DISABLED) !== null;
    // Backdrops colours are seen over: the page ground, and the component's surface (its fill on the ground).
    const page = toRgba(getComputedStyle(document.documentElement).backgroundColor);
    const ground: Backdrop = { story: page, figma: page };
    const surface: Backdrop = {
        story: backgroundOf(root),
        figma: spec.root.fill ? over(spec.root.fill, page) : page,
    };
    const origin = root.getBoundingClientRect();
    const rootStyle = getComputedStyle(root);
    const component = 'Component';

    // Root box. Hug-width components grow with their labels: width gets every run's text-advance allowance. A fixed
    // width doesn't follow its text (`hugWidth` false; absent in older manifests, which keep the allowance).
    const widthSlack = spec.root.hugWidth === false ? 0 : textSlackBefore(spec, Infinity);
    if (!near(origin.width, spec.root.width, widthSlack)) {
        out.push(lengthIssue(component, 'Width', origin.width, spec.root.width, widthSlack));
    }
    if (!near(origin.height, spec.root.height)) {
        out.push(lengthIssue(component, 'Height', origin.height, spec.root.height));
    }
    // Radius only shows when the box draws something (fill, stroke, shadow) on either side: an undrawn box's
    // radius (a text link's `rounded-*` for its focus ring, Figma's 0) is invisible, not a mismatch.
    const strokes = cssStrokes(rootStyle);
    const drawnShadows = cssShadows(rootStyle.boxShadow);
    const figmaDraws =
        spec.root.fill !== null ||
        (spec.root.fillTypes?.length ?? 0) > 0 ||
        Boolean(spec.root.stroke) ||
        (spec.root.shadows?.length ?? 0) > 0;
    const storyDraws =
        toRgba(rootStyle.backgroundColor).a > 0 ||
        rootStyle.backgroundImage !== 'none' ||
        strokes.length > 0 ||
        drawnShadows.length > 0;
    const radius = [
        rootStyle.borderTopLeftRadius,
        rootStyle.borderTopRightRadius,
        rootStyle.borderBottomRightRadius,
        rootStyle.borderBottomLeftRadius,
    ].map((value) => {
        return Math.min(Number.parseFloat(value) || 0, origin.width / 2, origin.height / 2);
    });
    // Pills are drawn with a sentinel (Figma 1000, CSS 9999px); both render as half the short side, so compare that.
    const figmaRadius = spec.root.radius.map((value) => {
        return Math.min(value, spec.root.width / 2, spec.root.height / 2);
    });
    if (
        (figmaDraws || storyDraws) &&
        radius.some((value, index) => {
            return !near(value, figmaRadius[index] ?? 0);
        })
    ) {
        const corners = (values: number[]) => {
            return new Set(values).size === 1 ? px(values[0] ?? 0) : values.map(px).join(' ');
        };
        out.push({
            element: component,
            property: 'Corner radius',
            expected: { text: corners(figmaRadius) },
            actual: { text: corners(radius) },
            tolerance: tolerance(),
        });
    }
    if (spec.root.fill) {
        const background = toRgba(rootStyle.backgroundColor);
        if (colorDiff(background, spec.root.fill, ground)) {
            out.push({
                element: component,
                property: 'Background',
                expected: colorValue(spec.root.fill),
                actual: colorValue(background),
                delta: colorDelta(background, spec.root.fill, ground),
                tolerance: COLOR_TOLERANCE,
            });
        }
    }
    if (spec.root.fillTypes?.length && rootStyle.backgroundImage === 'none') {
        out.push({
            element: component,
            property: 'Fill type',
            expected: { text: spec.root.fillTypes.join(' + ').toLowerCase(), note: 'not measured, compare images' },
            actual: { text: 'solid colour only', note: 'background-image: none' },
            tolerance: 'exact',
        });
    }
    if (spec.root.opacity !== undefined) {
        const opacity = Number(rootStyle.opacity);
        if (Math.abs(opacity - spec.root.opacity) > OPACITY) {
            out.push({
                element: component,
                property: 'Opacity',
                expected: { text: String(spec.root.opacity) },
                actual: { text: String(opacity) },
                delta: signed(opacity - spec.root.opacity),
                tolerance: `±${OPACITY}`,
            });
        }
    }
    if (spec.root.stroke !== undefined) {
        // An inside stroke is seen over the fill, outside / centre ones over the ground.
        out.push(
            ...strokeIssues(
                spec.root.stroke,
                strokes,
                spec.root.stroke?.align === 'INSIDE' ? surface : ground,
                disabled
            )
        );
    }
    if (spec.root.shadows) {
        out.push(
            ...shadowIssues(
                spec.root.shadows,
                drawnShadows.filter((shadow) => {
                    return !isRing(shadow);
                }),
                ground
            )
        );
    }

    if (spec.root.blendMode !== undefined) {
        const expected = spec.root.blendMode?.toLowerCase().replaceAll('_', '-') ?? 'normal';
        if (rootStyle.mixBlendMode !== expected) {
            out.push({
                element: component,
                property: 'Blend mode',
                expected: { text: expected },
                actual: { text: rootStyle.mixBlendMode },
                tolerance: 'exact',
            });
        }
    }
    if (spec.root.blur) {
        // Presence only: Figma's blur radius and CSS blur() aren't the same scale, so values are shown, not judged.
        for (const [kind, radius, css] of [
            ['Layer blur', spec.root.blur.layer, rootStyle.filter],
            ['Background blur', spec.root.blur.background, rootStyle.backdropFilter],
        ] as const) {
            const drawn = /blur\(([^)]*)\)/.exec(css)?.[1] ?? null;
            if ((radius !== null) !== (drawn !== null)) {
                out.push({
                    element: component,
                    property: kind,
                    expected: { text: radius === null ? 'none' : `radius ${radius}px` },
                    actual: { text: drawn === null ? 'none' : `blur(${drawn})` },
                    tolerance: 'present',
                });
            }
        }
    }
    if (spec.root.layout) {
        const layout = layoutIssues(root, spec, spec.root.layout);
        measured.set('Layout', layout.container);
        out.push(...layout.issues);
    }

    // Text runs, matched by characters.
    const runs = textRuns(root);
    for (const text of spec.texts) {
        const element = `Text "${text.characters}"`;
        const run = runs.find((candidate) => {
            return candidate.text === text.characters.trim();
        });
        if (run?.node.parentElement) {
            measured.set(element, run.node.parentElement);
        }
        if (!run?.node.parentElement) {
            const rendered =
                runs
                    .map((r) => {
                        return `"${r.text}"`;
                    })
                    .join(', ') || 'no text';
            out.push({
                element,
                property: 'Presence',
                expected: { text: 'rendered' },
                actual: { text: 'not found', note: `renders ${rendered}` },
                tolerance: 'exact text',
            });
            continue;
        }
        const range = document.createRange();
        range.selectNodeContents(run.node);
        const box = relative(range.getBoundingClientRect(), origin);
        // Horizontal: ink box. Vertical: centre only — a Range is the font's content area, Figma's box is the line box.
        const xSlack = textSlackBefore(spec, text.box.x);
        const runSlack = text.characters.length * TEXT_ADVANCE;
        if (!near(box.x, text.box.x, xSlack)) {
            out.push(lengthIssue(element, 'Left offset', box.x, text.box.x, xSlack));
        }
        if (!near(box.width, text.box.width, runSlack)) {
            out.push(lengthIssue(element, 'Width', box.width, text.box.width, runSlack));
        }
        const centre = box.y + box.height / 2;
        const figmaCentre = text.box.y + text.box.height / 2;
        if (!near(centre, figmaCentre)) {
            out.push(lengthIssue(element, 'Vertical centre', centre, figmaCentre));
        }

        const style = getComputedStyle(run.node.parentElement);
        const family = style.fontFamily.split(',')[0]?.replaceAll(/["']/g, '').trim() ?? '';
        if (family !== text.fontFamily) {
            out.push({
                element,
                property: 'Font family',
                expected: { text: text.fontFamily },
                actual: { text: family },
                tolerance: 'exact',
            });
        } else if (!document.fonts.check(`${style.fontWeight} ${style.fontSize} "${family}"`)) {
            out.push({
                element,
                property: 'Font file',
                expected: { text: `${family} ${style.fontWeight} loaded` },
                actual: { text: 'fallback font rendered', note: 'the font file did not load' },
                tolerance: 'exact',
            });
        }
        const fontSize = Number.parseFloat(style.fontSize);
        if (fontSize !== text.fontSize) {
            out.push({ ...lengthIssue(element, 'Font size', fontSize, text.fontSize), tolerance: 'exact' });
        }
        const fontWeight = Number(style.fontWeight);
        if (fontWeight !== text.fontWeight) {
            out.push({
                element,
                property: 'Font weight',
                expected: { text: String(text.fontWeight) },
                actual: { text: String(fontWeight) },
                delta: signed(fontWeight - text.fontWeight),
                tolerance: 'exact',
            });
        }
        // `normal` stays a keyword in computed style; its used value is the line box, i.e. the range height.
        const lineHeight = style.lineHeight === 'normal' ? box.height : Number.parseFloat(style.lineHeight);
        if (!near(lineHeight, text.lineHeightPx)) {
            out.push(lengthIssue(element, 'Line height', lineHeight, text.lineHeightPx));
        }
        const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
        if (Math.abs(letterSpacing - text.letterSpacing) > 0.05) {
            out.push({
                ...lengthIssue(element, 'Letter spacing', letterSpacing, text.letterSpacing),
                tolerance: '±0.05px',
            });
        }
        if (text.color) {
            const color = toRgba(style.color);
            if (colorDiff(color, text.color, { story: backgroundOf(run.node.parentElement), figma: surface.figma })) {
                out.push({
                    element,
                    property: 'Colour',
                    expected: colorValue(text.color),
                    actual: colorValue(color),
                    delta: colorDelta(color, text.color, {
                        story: backgroundOf(run.node.parentElement),
                        figma: surface.figma,
                    }),
                    tolerance: COLOR_TOLERANCE,
                    // Large text (≥24px, or ≥18.66px bold) needs 3:1, other text 4.5:1.
                    contrast: contrastOf(
                        color,
                        text.color,
                        { story: backgroundOf(run.node.parentElement), figma: surface.figma },
                        text.fontSize >= 24 || (text.fontSize >= 18.66 && text.fontWeight >= 700) ? 3 : 4.5,
                        'WCAG 1.4.3 text',
                        disabled
                    ),
                });
            }
        }
        out.push(...textStyleIssues(element, run.text, run.node.parentElement, root, text));
    }

    // Icons, matched by reading order.
    const glyphs = icons(root);
    if (glyphs.length !== spec.icons.length) {
        out.push({
            element: 'Icons',
            property: 'Count',
            expected: {
                text: String(spec.icons.length),
                note:
                    spec.icons
                        .map((icon) => {
                            return icon.name;
                        })
                        .join(', ') || undefined,
            },
            actual: { text: String(glyphs.length) },
            delta: signed(glyphs.length - spec.icons.length),
            tolerance: 'exact',
        });
    }
    spec.icons.forEach((icon, index) => {
        const glyph = glyphs[index];
        if (!glyph) {
            return;
        }
        const element = `Icon ${index + 1} "${icon.name}"`;
        measured.set(element, glyph);
        const box = relative(glyph.getBoundingClientRect(), origin);
        const xSlack = textSlackBefore(spec, icon.box.x);
        if (!near(box.x, icon.box.x, xSlack) || !near(box.y, icon.box.y)) {
            out.push(pairIssue(element, 'Position (x, y)', [box.x, box.y], [icon.box.x, icon.box.y], ', ', xSlack));
        }
        if (!near(box.width, icon.box.width) || !near(box.height, icon.box.height)) {
            out.push(pairIssue(element, 'Size', [box.width, box.height], [icon.box.width, icon.box.height], ' × '));
        }
        // Identity: the kit SVG Figma's main component names vs the one rendered (by path geometry).
        const expectedFile = kitIconFile(icon.component);
        if (expectedFile && glyph.tagName.toLowerCase() === 'svg') {
            const drawnFile = kitIconOf(glyph);
            if (drawnFile !== expectedFile) {
                out.push({
                    element,
                    property: 'Glyph',
                    expected: { text: expectedFile, note: icon.component ?? undefined },
                    actual: {
                        text: drawnFile ?? 'not a kit icon',
                        note: drawnFile ? undefined : 'svg geometry matches no file in src/assets/icons',
                    },
                    tolerance: 'exact',
                });
            }
        }
        if (icon.color) {
            const color = renderedGlyphColor(glyph, root);
            if (!color) {
                out.push({
                    element,
                    property: 'Colour',
                    expected: colorValue(icon.color),
                    actual: { text: 'unpainted', note: 'no fill or stroke found' },
                    tolerance: 'present',
                });
            } else if (colorDiff(color, icon.color, { story: backgroundOf(glyph), figma: surface.figma })) {
                out.push({
                    element,
                    property: 'Colour',
                    expected: colorValue(icon.color),
                    actual: colorValue(color),
                    delta: colorDelta(color, icon.color, { story: backgroundOf(glyph), figma: surface.figma }),
                    tolerance: `${COLOR_TOLERANCE}, alpha × opacity`,
                    contrast: contrastOf(
                        color,
                        icon.color,
                        { story: backgroundOf(glyph), figma: surface.figma },
                        3,
                        'WCAG 1.4.11 non-text',
                        disabled
                    ),
                });
            }
        }
    });

    return annotateBindings(out, spec).map((issue) => {
        const element = measured.get(issue.element);

        return element ? { ...issue, selector: pathFrom(root, element) } : issue;
    });
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
