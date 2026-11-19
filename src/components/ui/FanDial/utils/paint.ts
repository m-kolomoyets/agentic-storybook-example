import { smoothRadialMask } from './smoothFalloff';

/*
 * Layer geometry and paint (amber ADR-0012: arcs are CSS conic gradients cut to a ring by masks,
 * because Figma angular gradients don't export to SVG). 375×333 box, centre (187.5, 166.5); layers
 * are inset by (centre − r) / box as %. Radii (11445:9913): 151.044 plate / gauge outer; 141.917
 * inner outline / gauge inner; 118.645 the disc the liveness arc rides; 96.5 the visible orb.
 * Ring mask stop = inner r / outer r.
 */

// Gauge arc band r 141.917…151.044 (painted in the grey ring, over the ticks).
export const GAUGE_ARC_BOX = 'inset-[4.64144%_9.72160%]';
export const GAUGE_ARC_RING =
    '[mask-image:radial-gradient(circle_farthest-side,transparent_calc(93.958%_-_0.5px),black_calc(93.958%_+_0.5px))]';

// 40 ticks, 9deg step, 0.4deg ink ≈ 1px. Ramp mask r 114 → r 140 fades each tick along its length.
export const TICKS_PAINT =
    '[background:repeating-conic-gradient(from_0deg,var(--color-grey-500)_0deg_0.4deg,transparent_0.4deg_9deg)]';
export const TICKS_RING = '[mask-image:radial-gradient(circle_farthest-side,transparent_75.474%,black_93%)]';

// Rotating group's reach, r 122.6 (Group 1410103954, 11446:9793).
export const LIVENESS_GROUP_BOX = 'inset-[13.18318%_17.30667%]';

// Ellipse 1271: 1.5 stroke on r 118.645 aligned OUTSIDE → band 118.645…120.145.
export const LIVENESS_ARC_INSET = 'inset-[1.00122%]';
export const LIVENESS_ARC_RING =
    '[mask-image:radial-gradient(circle_farthest-side,transparent_calc(98.7515%_-_0.5px),black_calc(98.7515%_+_0.5px))]';

/*
 * Bloom falloff: nothing inside the orb, plateau to r 99, then decay — the plateau makes it a body of
 * light, not a lit edge. Stops from 83.2% out are alpha fitted off the 4x export of 11830:210078.
 */
export const LIVENESS_BLOOM_FALLOFF = smoothRadialMask([
    [78.6, 0],
    [79.5, 1],
    [80.8, 1],
    [81.6, 0.9],
    [83.2, 0.632],
    [84.0, 0.538],
    [84.8, 0.472],
    [85.6, 0.407],
    [86.5, 0.347],
    [87.3, 0.293],
    [88.1, 0.248],
    [88.9, 0.207],
    [89.7, 0.175],
    [90.5, 0.144],
    [91.4, 0.118],
    [92.2, 0.097],
    [93.0, 0.081],
    [93.8, 0.065],
    [94.6, 0.055],
    [95.4, 0.042],
    [96.3, 0.032],
    [99.5, 0],
]);

// Core: the bloom's white lip via `color-dodge` — a blend, not a white overlay, so `critical` dodges
// to hotter red, not pink.
export const LIVENESS_CORE_FALLOFF = smoothRadialMask([
    [78.6, 0],
    [79.5, 1],
    [80.8, 1],
    [81.6, 0.9],
    [82.4, 0.5],
    [83.2, 0],
]);

// Ellipse 1278 — hairline ring r 113.5, 1.36 stroke inside. Ink is an offset inner shadow in Figma,
// hence the brightness swing at 12/3/6/9 o'clock carried by the conic mask.
export const HAIRLINE_RING_BOX = 'inset-[15.91592%_19.73333%]';
export const HAIRLINE_RING_MASK =
    '[mask-image:radial-gradient(circle_farthest-side,transparent_calc(98.80288%_-_0.5px),black_calc(98.80288%_+_0.5px)),conic-gradient(from_0deg,rgba(0,0,0,0.25)_0deg,rgba(0,0,0,0.8)_90deg,rgba(0,0,0,0.43)_180deg,rgba(0,0,0,0.83)_270deg,rgba(0,0,0,0.25)_360deg)] mask-intersect';

// r 96.5 — Group 1410103953: the orb (wash, veil, rim, halo).
export const ORB_BOX = 'inset-[21.02102%_24.26667%]';

// Veil: fault colour pooled in the orb floor; the σ=32 blur is baked into the stops (`filter: blur()`
// would fade past the element's edge).
export const ORB_VEIL_PAINT =
    '[background:linear-gradient(to_bottom,transparent_40%,color-mix(in_oklab,var(--fan-dial-orb)_4%,transparent)_50%,color-mix(in_oklab,var(--fan-dial-orb)_12%,transparent)_60%,color-mix(in_oklab,var(--fan-dial-orb)_28%,transparent)_70%,color-mix(in_oklab,var(--fan-dial-orb)_50%,transparent)_80%,color-mix(in_oklab,var(--fan-dial-orb)_73%,transparent)_90%,color-mix(in_oklab,var(--fan-dial-orb)_89%,transparent)_100%)]';

// Wash: only `recondition` declares it; transparent head stop paints nothing for other modes.
export const ORB_WASH_PAINT =
    '[background:radial-gradient(circle_farthest-side,transparent_50%,var(--fan-dial-wash-mid,transparent)_80%,var(--fan-dial-wash-edge,transparent)_100%)]';

// Ellipse 1259 inner shadow (stdDeviation 16 → 32px).
export const ORB_HALO = '[box-shadow:inset_0_0_32px_color-mix(in_oklab,var(--fan-dial-glow)_45%,transparent)]';

// Crest (`Running/Filled`) layers, cross-faded over the resting orb.
export const ORB_FILL_WASH_PAINT =
    '[background:radial-gradient(circle_farthest-side,transparent_30%,var(--fan-dial-fill-wash,transparent)_100%)]';
export const ORB_FILL_HALO =
    '[box-shadow:inset_0_0_32px_color-mix(in_oklab,var(--fan-dial-fill-glow)_45%,transparent)]';
// Re-declares `--fan-dial-orb` so a mode with no crest does not inherit the fault veil twice.
export const ORB_FILL_VEIL = '[--fan-dial-orb:var(--fan-dial-fill-orb,transparent)]';
export const ORB_FILL_RIM = '[border-color:var(--fan-dial-fill-glow,transparent)]';

/*
 * Gauge arc: one angle (`--fan-dial-sweep`) sets ramp and length; at 0deg it paints nothing. Tail
 * at 12 o'clock is `dark-violet-alpha-950-0`, not `transparent` — rgba(0,0,0,0) darkens the last degrees.
 */
export const GAUGE_ARC_PAINT =
    '[background:conic-gradient(from_0deg,var(--color-dark-violet-alpha-950-0)_0deg,var(--fan-dial-gauge-fade)_calc(var(--fan-dial-sweep)_*_0.4),var(--fan-dial-gauge-mid)_calc(var(--fan-dial-sweep)_*_0.67),var(--fan-dial-gauge-head)_var(--fan-dial-sweep),transparent_calc(var(--fan-dial-sweep)_+_min(var(--fan-dial-sweep),0.4deg)))]';

/*
 * Liveness arc, measured off the frame: 240°…315°, plateau from 277°. No `var()` fallback: the
 * property is registered, so a fallback would never apply.
 */
export const LIVENESS_ARC_PAINT =
    '[background:conic-gradient(from_0deg,transparent_0deg,transparent_240deg,var(--fan-dial-live-line)_277deg,var(--fan-dial-live-line)_315deg,transparent_315.5deg)]';
export const LIVENESS_BLOOM_PAINT =
    '[background:conic-gradient(from_0deg,transparent_0deg,transparent_240deg,var(--fan-dial-live-bloom)_277deg,var(--fan-dial-live-bloom)_315deg,transparent_315.5deg)]';
