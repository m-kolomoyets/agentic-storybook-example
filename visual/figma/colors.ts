// Browser side: colours for Figma spec lines, in the kit's own terms. The kit writes tokens as
// `hsl(H S% L% / A)` (src/styles/tokens.css, tokens-supplement.css), so mismatch lines print HSL in that format and
// name the nearest token on each side: "wrong token used" vs "token drifted from Figma" becomes readable at a glance.
// Comparison itself stays in sRGB bytes (spec.ts): even per channel, unlike hue on near-greys.
import type { Rgba } from './types.ts';
import supplementCss from '../../src/styles/tokens-supplement.css?raw';
import tokensCss from '../../src/styles/tokens.css?raw';

const canvas = document.createElement('canvas').getContext('2d', { willReadFrequently: true });

/** Any CSS colour (hsl, oklch, color-mix, …) → sRGB bytes, via the canvas so the browser does the conversion. */
export function toRgba(cssColor: string): Rgba {
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

function distance(a: Rgba, b: Rgba): number {
    return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b), Math.abs(a.a - b.a) * 255);
}

/**
 * The kit token nearest to a colour: `= --alias → --primitive` within `exact` per channel, else `≈ … (Δn)` with the
 * largest channel difference. Several tokens share a value: the first semantic alias is named, then the primitive.
 */
export function nearestToken(color: Rgba, exact: number): string {
    tokenCache ??= parseTokens();
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
