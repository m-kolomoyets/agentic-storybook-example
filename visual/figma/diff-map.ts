/// <reference lib="dom" />
// "What differs" map: re-reads the two images the pixel check compared (Figma flattened on the ground, the story
// screenshot) and classifies each differing pixel, instead of showing the comparator's raw diff (a faded copy plus
// red/yellow dots, where a colour change and a moved edge look the same). Classes, same hues as the onion skin:
// orange = drawn only in Figma, blue = drawn only in the story, yellow = drawn in both but in another colour.
// The story is the dim grey context; text masks (#ff00ff, judged by spec) are hatched.
// Used by the Storybook panel and, via `Function#toString`, by the report page's inline script: every function here
// must stay self-contained (no imports, no outer references) and plain-JS-safe once types are stripped.

export type Pixels = { width: number; height: number; data: Uint8ClampedArray };

export type DiffMap = {
    image: Pixels;
    /** Pixel counts per class (at 2x). */
    counts: { figma: number; story: number; colour: number; masked: number };
    /** Most common colour change, as hex: `figma → story`. */
    pair: { figma: string; story: string } | null;
    /**
     * Largest 8-connected region of differing pixels (any class, text masks excluded), at 2x: where the eye lands.
     * A thin wrong stroke or a misplaced glyph forms one region while its share of the whole image stays small.
     */
    blob: { pixels: number; x: number; y: number; width: number; height: number } | null;
};

export function explainDiff(reference: Pixels, actual: Pixels): DiffMap | null {
    if (reference.width !== actual.width || reference.height !== actual.height) {
        return null;
    }
    const { width, height } = reference;
    const ref = reference.data;
    const act = actual.data;
    const out = new Uint8ClampedArray(ref.length);
    const counts = { figma: 0, story: 0, colour: 0, masked: 0 };
    const pairs = new Map<string, { n: number; f: number[]; s: number[] }>();
    // pixelmatch's YIQ distance and its 0.1 threshold, as the test uses (minus anti-alias detection).
    const yiq = (r: number, g: number, b: number) => {
        return [
            r * 0.29889531 + g * 0.58662247 + b * 0.11448223,
            r * 0.59597799 - g * 0.2741761 - b * 0.32180189,
            r * 0.21147017 - g * 0.52261711 + b * 0.31114694,
        ];
    };
    const distance = (a: number[], b: number[]) => {
        const [y1, i1, q1] = yiq(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0);
        const [y2, i2, q2] = yiq(b[0] ?? 0, b[1] ?? 0, b[2] ?? 0);

        return (
            0.5053 * ((y1 ?? 0) - (y2 ?? 0)) ** 2 +
            0.299 * ((i1 ?? 0) - (i2 ?? 0)) ** 2 +
            0.1957 * ((q1 ?? 0) - (q2 ?? 0)) ** 2
        );
    };
    const LIMIT = 35215 * 0.1 * 0.1;
    // "Drawn" = differs from the ground. Ground = the most common colour on the reference's border ring (the page
    // ground around rounded corners, or the component's own base fill when it is a full rectangle).
    const ring = new Map<string, number>();
    for (let x = 0; x < width; x += 1) {
        for (const y of [0, height - 1]) {
            const o = (y * width + x) * 4;
            const key = `${ref[o]},${ref[o + 1]},${ref[o + 2]}`;
            ring.set(key, (ring.get(key) ?? 0) + 1);
        }
    }
    for (let y = 0; y < height; y += 1) {
        for (const x of [0, width - 1]) {
            const o = (y * width + x) * 4;
            const key = `${ref[o]},${ref[o + 1]},${ref[o + 2]}`;
            ring.set(key, (ring.get(key) ?? 0) + 1);
        }
    }
    const groundKey = [...ring].sort((a, b) => {
        return b[1] - a[1];
    })[0]?.[0];
    const ground = (groundKey ?? '0,0,0').split(',').map(Number);
    const drawn = (pixel: number[]) => {
        return distance(pixel, ground) > LIMIT;
    };
    const hex = (rgb: number[]) => {
        return `#${rgb
            .map((value) => {
                return Math.round(value).toString(16).padStart(2, '0');
            })
            .join('')}`;
    };

    // Pass 1: class per pixel. 0 same, 1 Figma only, 2 story only, 3 other colour, 4 text mask.
    const FIGMA = 1;
    const STORY = 2;
    const COLOUR = 3;
    const MASK = 4;
    const classes = new Uint8Array(width * height);
    const rgbAt = (data: Uint8ClampedArray, p: number) => {
        return [data[p * 4] ?? 0, data[p * 4 + 1] ?? 0, data[p * 4 + 2] ?? 0];
    };
    const isMask = (rgb: number[]) => {
        return rgb[0] === 255 && rgb[1] === 0 && rgb[2] === 255;
    };
    for (let p = 0; p < classes.length; p += 1) {
        const f = rgbAt(ref, p);
        const st = rgbAt(act, p);
        if (isMask(f) || isMask(st)) {
            classes[p] = MASK;
        } else if (distance(f, st) > LIMIT) {
            const inFigma = drawn(f);
            const inStory = drawn(st);
            if (inFigma && !inStory) {
                classes[p] = FIGMA;
            } else if (inStory && !inFigma) {
                classes[p] = STORY;
            } else {
                classes[p] = COLOUR;
            }
        }
    }
    // Pass 2: a "colour" pixel touching a Figma-only / story-only one is the anti-aliased edge of a shape that moved
    // or resized, not a colour change: it joins that shape class.
    const settled = new Uint8Array(classes);
    for (let p = 0; p < classes.length; p += 1) {
        if (classes[p] !== COLOUR) {
            continue;
        }
        const x = p % width;
        const y = Math.floor(p / width);
        for (let dy = -1; dy <= 1 && settled[p] === COLOUR; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
                const nx = x + dx;
                const ny = y + dy;
                const neighbour = classes[ny * width + nx];
                if (nx >= 0 && ny >= 0 && nx < width && ny < height && (neighbour === FIGMA || neighbour === STORY)) {
                    settled[p] = neighbour;
                    break;
                }
            }
        }
    }
    // Largest connected region of differing pixels (iterative flood fill, 8 neighbours).
    let blob: DiffMap['blob'] = null;
    const seen = new Uint8Array(settled.length);
    const stack = new Int32Array(settled.length);
    for (let start = 0; start < settled.length; start += 1) {
        const kind = settled[start] ?? 0;
        if (seen[start] || kind === 0 || kind === MASK) {
            continue;
        }
        let depth = 0;
        stack[depth++] = start;
        seen[start] = 1;
        let pixels = 0;
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        while (depth > 0) {
            const p = stack[--depth] ?? 0;
            pixels += 1;
            const x = p % width;
            const y = Math.floor(p / width);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            for (let dy = -1; dy <= 1; dy += 1) {
                for (let dx = -1; dx <= 1; dx += 1) {
                    const nx = x + dx;
                    const ny = y + dy;
                    const n = ny * width + nx;
                    const neighbour = settled[n] ?? 0;
                    if (
                        nx >= 0 &&
                        ny >= 0 &&
                        nx < width &&
                        ny < height &&
                        !seen[n] &&
                        neighbour !== 0 &&
                        neighbour !== MASK
                    ) {
                        seen[n] = 1;
                        stack[depth++] = n;
                    }
                }
            }
        }
        if (!blob || pixels > blob.pixels) {
            blob = { pixels, x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
        }
    }
    // Pass 3: paint, count, and collect colour pairs from true colour pixels only.
    for (let p = 0; p < settled.length; p += 1) {
        const o = p * 4;
        const f = rgbAt(ref, p);
        const st = rgbAt(act, p);
        let colour: number[];
        if (settled[p] === MASK) {
            counts.masked += 1;
            // Diagonal hatch: text, judged by the property checks.
            colour = ((p % width) + Math.floor(p / width)) % 6 < 2 ? [92, 92, 100] : [30, 30, 34];
        } else if (settled[p] === FIGMA) {
            counts.figma += 1;
            colour = [255, 138, 61];
        } else if (settled[p] === STORY) {
            counts.story += 1;
            colour = [77, 163, 255];
        } else if (settled[p] === COLOUR) {
            counts.colour += 1;
            colour = [255, 222, 89];
            const key = `${f.map((v) => {
                return v >> 3;
            })}|${st.map((v) => {
                return v >> 3;
            })}`;
            const entry = pairs.get(key) ?? { n: 0, f: [0, 0, 0], s: [0, 0, 0] };
            entry.n += 1;
            for (let c = 0; c < 3; c += 1) {
                entry.f[c] = (entry.f[c] ?? 0) + (f[c] ?? 0);
                entry.s[c] = (entry.s[c] ?? 0) + (st[c] ?? 0);
            }
            pairs.set(key, entry);
        } else {
            // Same: the story as dim grey context.
            const luminance = 0.2126 * (st[0] ?? 0) + 0.7152 * (st[1] ?? 0) + 0.0722 * (st[2] ?? 0);
            colour = [luminance * 0.35 + 8, luminance * 0.35 + 8, luminance * 0.35 + 10];
        }
        out[o] = colour[0] ?? 0;
        out[o + 1] = colour[1] ?? 0;
        out[o + 2] = colour[2] ?? 0;
        out[o + 3] = 255;
    }
    // A pair is named only when one change dominates (a fill or stroke), not a scatter of edge tones.
    const top = [...pairs.values()]
        .sort((a, b) => {
            return b.n - a.n;
        })
        .find((entry) => {
            return entry.n >= Math.max(32, counts.colour * 0.3);
        });
    const average = (sum: number[], n: number) => {
        return sum.map((value) => {
            return value / n;
        });
    };

    return {
        image: { width, height, data: out },
        counts,
        pair: top ? { figma: hex(average(top.f, top.n)), story: hex(average(top.s, top.n)) } : null,
        blob,
    };
}

/** One line under the map: what each colour means here, biggest first, in CSS px (the images are 2x). */
export function diffMapSummary(map: DiffMap): string {
    const px = (count: number) => {
        return `${Math.max(1, Math.round(count / 4)).toLocaleString('en-GB')} px`;
    };
    const parts: { n: number; text: string }[] = [];
    if (map.counts.colour > 0) {
        const pair = map.pair ? ` (Figma ${map.pair.figma} → story ${map.pair.story})` : '';
        parts.push({
            n: map.counts.colour,
            text: `yellow: same shape, other colour on ${px(map.counts.colour)}${pair}`,
        });
    }
    if (map.counts.figma > 0) {
        parts.push({
            n: map.counts.figma,
            text: `orange: ${px(map.counts.figma)} drawn only in Figma (missing, moved or smaller in the story)`,
        });
    }
    if (map.counts.story > 0) {
        parts.push({
            n: map.counts.story,
            text: `blue: ${px(map.counts.story)} drawn only in the story (extra, moved or larger)`,
        });
    }
    // Orange and blue in similar amounts: the same shape sits elsewhere or at another size.
    const { figma, story } = map.counts;
    const lead =
        figma > 0 && story > 0 && Math.max(figma, story) <= Math.min(figma, story) * 2.5
            ? ['Shapes shifted or resized: orange where Figma draws, blue where the story draws instead']
            : [];
    const lines = parts
        .sort((a, b) => {
            return b.n - a.n;
        })
        .map((part) => {
            return part.text;
        });
    lines.unshift(...lead);
    if (lines.length === 0) {
        lines.push('No pixel above the comparison threshold; the raw count comes from anti-aliasing');
    }
    if (map.counts.masked > 0) {
        lines.push('hatched: text, checked by properties instead of pixels');
    }

    return `${lines.join(' · ')}.`;
}

/** Loads both images (same origin) and explains them; null when they can't be read or compared. */
export async function loadDiffMap(referenceUrl: string, actualUrl: string): Promise<DiffMap | null> {
    const read = async (url: string) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
            throw new Error('2d canvas unavailable');
        }
        context.drawImage(image, 0, 0);

        return context.getImageData(0, 0, canvas.width, canvas.height);
    };
    try {
        const [reference, actual] = await Promise.all([read(referenceUrl), read(actualUrl)]);

        return explainDiff(reference, actual);
    } catch {
        // Unreadable (missing file, or a file:// page where canvas reads are blocked): the caller shows the raw diff.
        return null;
    }
}

export function paintDiffMap(canvas: HTMLCanvasElement, map: DiffMap): void {
    canvas.width = map.image.width;
    canvas.height = map.image.height;
    canvas
        .getContext('2d')
        ?.putImageData(new ImageData(new Uint8ClampedArray(map.image.data), map.image.width, map.image.height), 0, 0);
}
