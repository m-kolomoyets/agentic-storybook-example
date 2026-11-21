// Browser side: colours for Figma spec lines, in the kit's own terms. The kit writes tokens as
// `hsl(H S% L% / A)` (src/styles/tokens.css, tokens-supplement.css), so mismatch lines print HSL in that format and
// name the nearest token on each side: "wrong token used" vs "token drifted from Figma" becomes readable at a glance.
// Comparison itself stays in sRGB bytes (spec.ts): even per channel, unlike hue on near-greys.
import type { Rgba } from './types.ts';
import supplementCss from '../../src/styles/tokens-supplement.css?raw';
import tokensCss from '../../src/styles/tokens.css?raw';

const canvas = document.createElement('canvas').getContext('2d', { willReadFrequently: true });

/** `rgb(1, 2, 3)`, `rgba(1, 2, 3, 0.1)`, `rgb(1 2 3 / 10%)`: the computed-value form of legacy sRGB colours. */
function parseRgb(value: string): Rgba | null {
    const match = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/.exec(value.trim());
    if (!match) {
        return null;
    }
    const [, r = '0', g = '0', b = '0', alpha, unit] = match;
    const a = alpha === undefined ? 1 : Number(alpha) / (unit ? 100 : 1);

    return {
        r: Math.round(Number(r)),
        g: Math.round(Number(g)),
        b: Math.round(Number(b)),
        a: Math.round(a * 1000) / 1000,
    };
}

/** Resolves a colour to its computed value (hsl/hex/named → `rgb[a]()`), on a probe in the document. */
let probe: HTMLElement | null = null;
function computedColor(cssColor: string): string {
    probe ??= document.createElement('span');
    if (!probe.isConnected) {
        // Tests reset the body between stories.
        probe.hidden = true;
        document.body.append(probe);
    }
    probe.style.color = '';
    probe.style.color = cssColor;

    return probe.style.color ? getComputedStyle(probe).color : cssColor;
}

/**
 * Any CSS colour → sRGB bytes. Legacy sRGB syntaxes are parsed exactly from their computed value; others (oklch,
 * color-mix, …) go through a canvas. The canvas stores premultiplied bytes, so a translucent colour comes back with
 * channels off by up to 255/(255·α) (≈10 at α 0.1): exact parsing first keeps those from reading as mismatches.
 */
export function toRgba(cssColor: string): Rgba {
    const exact = parseRgb(cssColor) ?? parseRgb(computedColor(cssColor));
    if (exact) {
        return exact;
    }
    if (!canvas) {
        throw new Error('2d canvas unavailable');
    }
    canvas.clearRect(0, 0, 1, 1);
    canvas.fillStyle = cssColor;
    canvas.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = canvas.getImageData(0, 0, 1, 1).data;

    return { r, g, b, a: Math.round((a / 255) * 1000) / 1000 };
}

function trim(value: number): string {
    return String(Math.round(value * 10) / 10);
}

/** `hsl(H S% L% / A)`, one decimal, alpha only when below 1: the token files' format. */
export function toHsl({ r, g, b, a }: Rgba): string {
    const [rn, gn, bn] = [r / 255, g / 255, b / 255];
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const light = (max + min) / 2;
    const delta = max - min;
    let hue = 0;
    let sat = 0;
    if (delta > 0) {
        sat = delta / (1 - Math.abs(2 * light - 1));
        if (max === rn) {
            hue = ((gn - bn) / delta) % 6;
        } else if (max === gn) {
            hue = (bn - rn) / delta + 2;
        } else {
            hue = (rn - gn) / delta + 4;
        }
        hue = (hue * 60 + 360) % 360;
    }
    const alpha = a < 1 ? ` / ${Math.round(a * 1000) / 1000}` : '';

    return `hsl(${trim(hue)} ${trim(sat * 100)}% ${trim(light * 100)}%${alpha})`;
}

type Token = { name: string; alias: boolean; rgba: Rgba };

/** Every `--color-*` in the token files, aliases resolved; the supplement wins on duplicates, as in the cascade. */
function parseTokens(): Token[] {
    const raw = new Map<string, string>();
    for (const css of [tokensCss, supplementCss]) {
        for (const match of css.matchAll(/(--color-[\w-]+)\s*:\s*([^;]+);/g)) {
            raw.set(match[1] ?? '', (match[2] ?? '').trim());
        }
    }
    const resolve = (value: string, depth = 0): string | null => {
        const reference = /^var\((--color-[\w-]+)\)$/.exec(value)?.[1];
        if (!reference) {
            return value;
        }
        const next = raw.get(reference);

        return next && depth < 10 ? resolve(next, depth + 1) : null;
    };
    const tokens: Token[] = [];
    for (const [name, value] of raw) {
        const resolved = resolve(value);
        if (resolved) {
            tokens.push({ name, alias: value.startsWith('var('), rgba: toRgba(resolved) });
        }
    }

    return tokens;
}

let tokenCache: Token[] | null = null;

/** A kit colour token's value, aliases resolved; null when the kit has no such token. */
export function tokenColor(name: string): Rgba | null {
    tokenCache ??= parseTokens();

    return (
        tokenCache.find((token) => {
            return token.name === name;
        })?.rgba ?? null
    );
}

export function distance(a: Rgba, b: Rgba): number {
    return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b), Math.abs(a.a - b.a) * 255);
}

/**
 * The kit token nearest to a colour: `= --alias → --primitive` within `exact` per channel, else `≈ … (Δn)` with the
 * largest channel difference. Several tokens share a value: the first semantic alias is named, then the primitive.
 */
export function nearestToken(color: Rgba, exact: number, prefer?: string | null): string {
    tokenCache ??= parseTokens();
    // Several tokens can share a value: when the one Figma binds is among them, name it.
    const preferred = prefer
        ? tokenCache.find((token) => {
              return token.name === prefer;
          })
        : undefined;
    if (preferred && distance(color, preferred.rgba) <= exact) {
        return `= ${preferred.name}`;
    }
    let best = Infinity;
    for (const token of tokenCache) {
        best = Math.min(best, distance(color, token.rgba));
    }
    const matches = tokenCache.filter((token) => {
        return distance(color, token.rgba) === best;
    });
    const alias = matches.find((token) => {
        return token.alias;
    });
    const primitive = matches.find((token) => {
        return !token.alias;
    });
    const names = [alias?.name, primitive?.name].filter(Boolean).join(' → ');
    const more = matches.length > 2 ? ` +${matches.length - 2}` : '';

    return best <= exact ? `= ${names}${more}` : `≈ ${names}${more} (Δ${Math.round(best)})`;
}

/** Source-over of `top` (straight alpha) on `under`, which is treated as opaque: what the eye sees. */
export function over(top: Rgba, under: Rgba): Rgba {
    const mix = (front: number, back: number) => {
        return front * top.a + back * (1 - top.a);
    };

    return { r: mix(top.r, under.r), g: mix(top.g, under.g), b: mix(top.b, under.b), a: 1 };
}

function linear(channel: number): number {
    const value = channel / 255;

    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of an opaque colour. */
export function luminance(color: Rgba): number {
    return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

/** WCAG contrast ratio of two opaque colours, 1–21. */
export function contrastRatio(a: Rgba, b: Rgba): number {
    const [light = 0, dark = 0] = [luminance(a), luminance(b)].sort((x, y) => {
        return y - x;
    });

    return (light + 0.05) / (dark + 0.05);
}

/** sRGB → OKLab (Björn Ottosson's matrices, as CSS Color 4 uses them). */
function oklab(color: Rgba): [number, number, number] {
    const [r, g, b] = [linear(color.r), linear(color.g), linear(color.b)];
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
}

/** CSS Color 4 `deltaEOK`: Euclidean distance in OKLab between two opaque colours (0 same, ~1 black vs white). */
export function deltaEOK(a: Rgba, b: Rgba): number {
    const [l1, a1, b1] = oklab(a);
    const [l2, a2, b2] = oklab(b);

    return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}
