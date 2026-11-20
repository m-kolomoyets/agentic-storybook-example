import { Link } from '@tanstack/react-router';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/Sidebar';

function SidebarTeam() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    size="lg"
                    render={
                        <Link to="/dashboard">
                            <span className="flex aspect-square size-4xl shrink-0 items-center justify-center rounded-s">
                                <img src="/icon.svg" className="size-4xl" alt="" aria-hidden={true} />
                            </span>
                            <span className="grid flex-1 text-left">
                                <span className="truncate text-body-s-semibold">Phenomenon admin panel</span>
                            </span>
                        </Link>
                    }
                />
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

export { SidebarTeam };
