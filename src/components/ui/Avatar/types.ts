import type { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import type { ReactNode } from 'react';

export type AvatarProps = {
    /** Photo URL. Omitted or failing → the fallback (`children`) renders. */
    src?: string;
    /**
     * Photo alt text. Defaults to `''` (decorative): most placements sit beside the person's name.
     * Pass a name only where the avatar stands alone — it then names the fallback too.
     */
    alt?: string;
    /** Size via a class: `size-avatar-md` (48px), `size-avatar-lg text-heading-s` (80px). Default 44px. */
    className?: string;
    /** Fallback — conventionally initials, computed by the caller (locale-sensitive). */
    children?: ReactNode;
    render?: BaseAvatar.Root.Props['render'];
};
