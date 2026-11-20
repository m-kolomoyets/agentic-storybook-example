import type { AvatarProps } from '@/components/ui/Avatar/types';

export type SidebarAvatarProps = {
    name: string;
    avatarUrl?: string;
} & Pick<AvatarProps, 'className'>;
