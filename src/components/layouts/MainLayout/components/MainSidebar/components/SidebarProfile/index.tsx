import UnfoldMoreIcon from '@/assets/icons/unfold-more.svg?react';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/Sidebar';
import { useSidebarContext } from '@/components/Sidebar/context/SidebarContext';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { useLogoutMenuItem } from './hooks/useLogoutMenuItem';
import { SidebarUserCard } from './components/SidebarUserCard';

function SidebarProfile() {
    const { isMobile } = useSidebarContext();
    const logoutItem = useLogoutMenuItem();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <ContextMenu.Root>
                    <ContextMenu.Trigger
                        render={
                            <SidebarMenuButton size="lg" className="h-auto" tooltip="Profile">
                                <SidebarUserCard />
                                <UnfoldMoreIcon aria-hidden className="ml-auto" />
                            </SidebarMenuButton>
                        }
                    />
                    <ContextMenu.Content
                        items={[logoutItem]}
                        side={isMobile ? 'bottom' : 'right'}
                        align="end"
                        sheetTitle="Profile"
                    />
                </ContextMenu.Root>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

export { SidebarProfile };
