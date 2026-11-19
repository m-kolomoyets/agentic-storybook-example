import type { FanStatusIconProps, FanStatusIconSize, FanStatusIconStatus } from './types';
import mdError from '@/assets/media/fan-status/md-error.svg';
import mdOff from '@/assets/media/fan-status/md-off.svg';
import mdRunning from '@/assets/media/fan-status/md-running.svg';
import mdUpdating from '@/assets/media/fan-status/md-updating.svg';
import smError from '@/assets/media/fan-status/sm-error.svg';
import smOff from '@/assets/media/fan-status/sm-off.svg';
import smRunning from '@/assets/media/fan-status/sm-running.svg';
import { cn } from '@/lib/cn';

/* Glyph root size in each export: 20 in the 24px tile, 10 in the 12px one. */
const GLYPH_PX: Record<FanStatusIconSize, number> = { md: 20, sm: 10 };

/* URL imports: ink is baked in, and inlining twice would collide document-level ids. 12px `updating` = `off`. */
const GLYPH: Record<FanStatusIconSize, Record<FanStatusIconStatus, string>> = {
    md: { running: mdRunning, error: mdError, off: mdOff, updating: mdUpdating },
    sm: { running: smRunning, error: smError, off: smOff, updating: smOff },
};

const TILE_CLASSES: Record<FanStatusIconSize, string> = {
    md: 'inline-flex size-3xl shrink-0 items-center justify-center overflow-clip rounded-icon-xs',
    sm: 'inline-flex size-l shrink-0 items-center justify-center overflow-clip rounded-xxs',
};

const GROUND_CLASSES: Record<FanStatusIconSize, Record<FanStatusIconStatus, string>> = {
    md: {
        running: 'bg-surface-fan-status-running',
        error: 'bg-surface-fan-status-error',
        off: 'bg-surface-fan-status-off',
        updating: 'bg-surface-fan-status-updating',
    },
    sm: {
        running: 'bg-surface-fan-status-running',
        error: 'bg-surface-fan-status-error',
        off: 'bg-surface-fan-status-off',
        updating: 'bg-surface-fan-status-updating-sm',
    },
};

/** Tinted square tile with a fan glyph. Figma: `Fan States` 13867:643998 (24px), `Side Menu/Fan Icon` 14026:847827. */
function FanStatusIcon({ status, size = 'md', label, className }: FanStatusIconProps) {
    const px = GLYPH_PX[size];
    const a11yProps = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };

    return (
        <span
            {...a11yProps}
            className={cn`${TILE_CLASSES[size]} ${GROUND_CLASSES[size][status]} ${className}`}
            data-status={status}
        >
            <img
                alt=""
                className="block select-none"
                draggable={false}
                height={px}
                src={GLYPH[size][status]}
                width={px}
            />
        </span>
    );
}

export { FanStatusIcon };
