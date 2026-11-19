import type { StatusIconProps } from './types';
import { cn } from '@/lib/cn';
import {
    STATUS_ICON_COLOR,
    STATUS_ICON_FILL,
    STATUS_ICON_GLYPH,
    STATUS_ICON_GLYPH_SIZE,
    STATUS_ICON_WRAPPER,
} from './utils/statusIcon';

/**
 * 40×40 chip with a 20px glyph, tinted to a message's severity. `aria-hidden` even with an
 * override: the adjacent text carries the meaning. Figma: `Status Icon` 9312:64474 / 10826:215582.
 */
function StatusIcon({ status, surface = 'on-surface', icon, className }: StatusIconProps) {
    return (
        <div
            aria-hidden="true"
            className={cn`${STATUS_ICON_WRAPPER} ${STATUS_ICON_FILL[surface][status]} ${STATUS_ICON_COLOR[surface][status]} ${className}`}
        >
            <span className={STATUS_ICON_GLYPH_SIZE}>{icon ?? STATUS_ICON_GLYPH[status]}</span>
        </div>
    );
}

export { StatusIcon };
