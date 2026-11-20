import type { SidebarUserCardProps } from './types';
import { getRouteApi } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { SidebarAvatar } from './components/SidebarAvatar';

const routeApi = getRouteApi('/_authenticated');

function SidebarUserCard({ className }: SidebarUserCardProps) {
    const me = routeApi.useRouteContext({
        select(context) {
            return context.auth.me;
        },
    });
    const fullName = `${me.firstName} ${me.lastName}`;

    return (
        <div className={cn`flex min-w-px items-center gap-m py-s text-left ${className}`}>
            <SidebarAvatar name={`${fullName} (${me.username})`} avatarUrl={me.image} />
            <div className="grid flex-1 text-left">
                <span className="truncate text-body-s-semibold">{fullName}</span>
                <span className="truncate text-caption-m text-text-general-medium">{me.email}</span>
            </div>
        </div>
    );
}

export { SidebarUserCard };
