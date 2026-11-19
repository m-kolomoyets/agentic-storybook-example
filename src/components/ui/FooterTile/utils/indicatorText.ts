/** The largest count the badge spells out; above it, `99+`. */
const INDICATOR_CAP = 99;

/** The badge's text: `null` at zero (no badge), capped at `99+`. */
export function footerTileIndicatorText(count: number): string | null {
    if (count <= 0) {
        return null;
    }
    return count > INDICATOR_CAP ? `${INDICATOR_CAP}+` : String(count);
}
