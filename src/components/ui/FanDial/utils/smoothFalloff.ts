/*
 * Radial mask whose alpha follows a monotone cubic through measured `[position %, alpha]` stops.
 * CSS interpolates stops linearly, so each slope jump reads as a ring (Mach bands); a
 * Fritsch–Carlson cubic keeps every measured value, never overshoots, and has a continuous slope.
 */
export type FalloffStop = readonly [position: number, alpha: number];

/** Fritsch–Carlson tangents: zero at local extrema, clamped so each interval stays monotone. */
function monotoneTangents(stops: readonly FalloffStop[]): number[] {
    const n = stops.length;
    const secants = stops.slice(0, -1).map(([x0, y0], i) => {
        return (stops[i + 1][1] - y0) / (stops[i + 1][0] - x0);
    });
    const tangents = stops.map((_, i) => {
        if (i === 0) {
            return secants[0];
        }
        if (i === n - 1) {
            return secants[n - 2];
        }
        const a = secants[i - 1];
        const b = secants[i];
        return a * b <= 0 ? 0 : (a + b) / 2;
    });
    secants.forEach((s, i) => {
        if (s === 0) {
            tangents[i] = 0;
            tangents[i + 1] = 0;
            return;
        }
        const alpha = tangents[i] / s;
        const beta = tangents[i + 1] / s;
        const h = Math.hypot(alpha, beta);
        if (h > 3) {
            tangents[i] = (3 / h) * alpha * s;
            tangents[i + 1] = (3 / h) * beta * s;
        }
    });
    return tangents;
}

/** Alpha at `x`, on the monotone cubic through `stops` (sorted by position, at least two). */
function sampleFalloff(stops: readonly FalloffStop[], x: number): number {
    const tangents = monotoneTangents(stops);
    const last = stops.length - 1;
    if (x <= stops[0][0]) {
        return stops[0][1];
    }
    if (x >= stops[last][0]) {
        return stops[last][1];
    }
    const i = stops.findIndex(([position], k) => {
        return k < last && x <= stops[k + 1][0] && x >= position;
    });
    const [x0, y0] = stops[i];
    const [x1, y1] = stops[i + 1];
    const h = x1 - x0;
    const t = (x - x0) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
        (2 * t3 - 3 * t2 + 1) * y0 +
        (t3 - 2 * t2 + t) * h * tangents[i] +
        (-2 * t3 + 3 * t2) * y1 +
        (t3 - t2) * h * tangents[i + 1]
    );
}

function round(value: number, digits: number) {
    return Number(value.toFixed(digits));
}

/**
 * `radial-gradient(circle farthest-side, …)` mask through `stops`, sampled every `step` percent.
 * Measured stops are always emitted, so the drawn values at them are exact.
 */
export function smoothRadialMask(stops: readonly FalloffStop[], step = 0.25): string {
    const first = stops[0][0];
    const last = stops[stops.length - 1][0];
    const positions = new Set(
        stops.map(([position]) => {
            return position;
        })
    );
    for (let x = first + step; x < last; x += step) {
        positions.add(round(x, 3));
    }
    const body = [...positions]
        .sort((a, b) => {
            return a - b;
        })
        .map((x) => {
            return `rgba(0,0,0,${round(Math.min(1, Math.max(0, sampleFalloff(stops, x))), 4)}) ${x}%`;
        })
        .join(',');
    return `radial-gradient(circle farthest-side,${body})`;
}
