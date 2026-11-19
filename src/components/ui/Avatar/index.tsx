import type { AvatarProps } from './types';
import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import { cn } from '@/lib/cn';

/*
 * Background on the root, not the fallback: it also fills the circle while loading and behind a
 * transparent PNG. `shrink-0`: as a flex child beside a name the circle would otherwise go oval.
 */
const ROOT_CLASSES = `
    inline-flex size-avatar-sm shrink-0 items-center justify-center
    overflow-hidden rounded-full
    bg-surface-datavis-dotindicator-quinary
    text-body-s-semibold text-text-avatar-fallback select-none
`;

/** `object-cover`: real uploads are any aspect ratio; cropping never distorts a face. */
const IMAGE_CLASSES = 'size-full object-cover';

/**
 * A person's photo, or their initials when there is no photo. No `size` prop — pick a size class.
 * The 80px pencil badge is a separate control the caller composes. Figma: `Avatar` 10237:174118.
 */
function Avatar({ src, alt = '', className, children, render }: AvatarProps) {
    // Initials are never the accessible name ("JS" reads "jay ess"): hidden unless `alt` names them.
    const labelled = alt !== '';

    return (
        <BaseAvatar.Root className={cn`${ROOT_CLASSES} ${className}`} render={render}>
            {/* Only with a `src`: a source-less `<img>` logs a failed request for every photo-less avatar. */}
            {src !== undefined && <BaseAvatar.Image alt={alt} className={IMAGE_CLASSES} src={src} />}
            <BaseAvatar.Fallback
                aria-hidden={labelled ? undefined : true}
                aria-label={labelled ? alt : undefined}
                role={labelled ? 'img' : undefined}
            >
                {children}
            </BaseAvatar.Fallback>
        </BaseAvatar.Root>
    );
}

export { Avatar };
