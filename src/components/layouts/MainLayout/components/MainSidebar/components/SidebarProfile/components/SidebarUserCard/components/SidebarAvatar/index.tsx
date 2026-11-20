import type { SidebarAvatarProps } from './types';
import { cn } from '@/lib/cn';
import { getNameInitials } from '@/lib/utils/getNameInitials';
import { Avatar } from '@/components/ui/Avatar';

function SidebarAvatar({ className, name, avatarUrl }: SidebarAvatarProps) {
    const userInitials = getNameInitials(name);

    return (
        <Avatar src={avatarUrl} className={cn`size-4xl shrink-0 text-caption-m-medium ${className}`}>
            {userInitials}
        </Avatar>
    );
}

export { SidebarAvatar };
