import { SidebarMenu, SidebarMenuItem } from '@/components/Sidebar';
import { Skeleton } from '@/components/ui/Skeleton';

function SidebarProfileFallback() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <div className="flex h-8xl items-center px-m group-data-[collapsible=icon]:size-4xl group-data-[collapsible=icon]:px-none group-data-[state=expanded]:gap-m motion-safe:transition-[width,height,padding]">
                    <Skeleton tone="light" className="size-4xl shrink-0 rounded-full" />
                    <div className="grid flex-1 gap-m">
                        <Skeleton tone="light" className="h-l w-1/2 rounded-xs" />
                        <Skeleton tone="light" className="h-l w-3/4 rounded-xs" />
                    </div>
                </div>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

export { SidebarProfileFallback };
