import type { GrainAvatarKind, GrainAvatarProps } from './types';
import corn from '@/assets/media/grain-avatar/corn.svg';
import other from '@/assets/media/grain-avatar/other.svg';
import soybean from '@/assets/media/grain-avatar/soybean.svg';
import wheat from '@/assets/media/grain-avatar/wheat.svg';
import { cn } from '@/lib/cn';
import { GRAIN_AVATAR_PX } from './constants';
import { grainAvatarKind } from './utils/grainAvatarKind';

const SOURCES: Record<GrainAvatarKind, string> = { corn, soybean, wheat, other };

/* `shrink-0`: always a flex child beside a name. The tile's corner is in the SVG. */
const ROOT_CLASSES = 'block shrink-0 select-none';

/**
 * Square tile of the grain a container holds. Four drawings (the 72px exports, scaled) cover all
 * grain types. `<img>`, not inline SVG: the exports' document-level ids would collide when drawn twice.
 * Figma: `Grain Bin Image` 12847:71290.
 */
function GrainAvatar({ grainType, size = 'lg', alt = '', className }: GrainAvatarProps) {
    const kind = grainAvatarKind(grainType);
    const px = GRAIN_AVATAR_PX[size];

    return (
        <img
            alt={alt}
            className={cn`${ROOT_CLASSES} ${className}`}
            data-grain-kind={kind}
            draggable={false}
            height={px}
            src={SOURCES[kind]}
            width={px}
        />
    );
}

export { GrainAvatar };
