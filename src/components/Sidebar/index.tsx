import type {
    SidebarContentProps,
    SidebarFooterProps,
    SidebarGroupProps,
    SidebarHeaderProps,
    SidebarInsetProps,
    SidebarMenuButtonProps,
    SidebarMenuItemProps,
    SidebarMenuProps,
    SidebarMenuSkeletonProps,
    SidebarProps,
    SidebarRailProps,
    SidebarTriggerProps,
} from './types';
import { useState } from 'react';
import LastPageIcon from '@/assets/icons/last-page.svg?react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/cn';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { sidebarMenuButtonVariants } from './utils/variants';
import { useSidebarContext } from './context/SidebarContext';

function Sidebar({ side = 'left', collapsible = 'offcanvas', className, children, ...props }: SidebarProps) {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebarContext();

    if (collapsible === 'none') {
        return (
            <aside
                data-slot="sidebar"
                className={cn`flex h-full w-(--sidebar-width) flex-col bg-surface-ground ${className}`}
                {...props}
            >
                {children}
            </aside>
        );
    }

    if (isMobile) {
        return (
            <BottomSheet.Root
                open={openMobile}
                onOpenChange={(open) => {
                    setOpenMobile(open);
                }}
            >
                <BottomSheet.Popup>
                    <BottomSheet.Title className="sr-only">Navigation</BottomSheet.Title>
                    <BottomSheet.Content>
                        <div data-sidebar="sidebar" data-slot="sidebar" data-mobile="true" className="flex flex-col">
                            {children}
                        </div>
                    </BottomSheet.Content>
                </BottomSheet.Popup>
            </BottomSheet.Root>
        );
    }

    const containerSide =
        side === 'left'
            ? 'left-none border-r group-data-[collapsible=offcanvas]:-left-(--sidebar-width)'
            : 'right-none border-l group-data-[collapsible=offcanvas]:-right-(--sidebar-width)';

    return (
        <aside
            className="group peer hidden text-text-general-strong md:block"
            data-state={state}
            data-collapsible={state === 'collapsed' ? collapsible : ''}
            data-side={side}
            data-slot="sidebar"
        >
            {/* Reserves the sidebar's width in the flow; the panel itself is fixed. */}
            <div
                data-slot="sidebar-gap"
                className="relative w-(--sidebar-width) bg-transparent group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[collapsible=offcanvas]:w-none motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-linear"
            />
            <div
                data-slot="sidebar-container"
                className={cn`fixed inset-y-none z-10 hidden h-full w-(--sidebar-width) border-border-primary group-data-[collapsible=icon]:w-(--sidebar-width-icon) motion-safe:transition-[left,right,width] motion-safe:duration-200 motion-safe:ease-linear md:flex ${containerSide} ${className} `}
                {...props}
            >
                <div
                    data-sidebar="sidebar"
                    data-slot="sidebar-inner"
                    className="flex h-full w-full flex-col bg-surface-ground"
                >
                    {children}
                </div>
            </div>
        </aside>
    );
}

function SidebarContent({ className, ...props }: SidebarContentProps) {
    return (
        <div
            data-slot="sidebar-content"
            data-sidebar="content"
            className={cn`flex min-h-px flex-1 flex-col gap-m overflow-auto group-data-[collapsible=icon]:overflow-hidden ${className}`}
            {...props}
        />
    );
}

function SidebarGroup({ className, ...props }: SidebarGroupProps) {
    return (
        <div
            data-slot="sidebar-group"
            data-sidebar="group"
            className={cn`relative flex w-full min-w-px flex-col p-m ${className}`}
            {...props}
        />
    );
}

function SidebarHeader({ className, ...props }: SidebarHeaderProps) {
    return (
        <header
            data-slot="sidebar-header"
            data-sidebar="header"
            className={cn`flex flex-col gap-m p-m ${className}`}
            {...props}
        />
    );
}

function SidebarFooter({ className, ...props }: SidebarFooterProps) {
    return (
        <footer
            data-slot="sidebar-footer"
            data-sidebar="footer"
            className={cn`flex flex-col gap-m p-m ${className}`}
            {...props}
        />
    );
}

function SidebarInset({ className, ...props }: SidebarInsetProps) {
    return (
        <main
            data-slot="sidebar-inset"
            className={cn`relative flex w-full flex-1 flex-col bg-surface-ground ${className}`}
            {...props}
        />
    );
}

function SidebarMenu({ className, ...props }: SidebarMenuProps) {
    return (
        <ul
            data-slot="sidebar-menu"
            data-sidebar="menu"
            className={cn`flex w-full min-w-px flex-col gap-xs ${className}`}
            {...props}
        />
    );
}

function SidebarMenuButton({
    render,
    isActive = false,
    size = 'default',
    tooltip,
    className,
    ...props
}: SidebarMenuButtonProps) {
    const { isMobile, state } = useSidebarContext();
    const comp = useRender({
        defaultTagName: 'button',
        props: mergeProps<'button'>(
            {
                className: cn`${sidebarMenuButtonVariants({ size })} ${className}`,
            },
            props
        ),
        render,
        state: {
            slot: 'sidebar-menu-button',
            sidebar: 'menu-button',
            size,
            active: isActive,
        },
    });

    if (!tooltip) {
        return comp;
    }

    return (
        <Tooltip.Root disabled={state !== 'collapsed' || isMobile}>
            <Tooltip.Trigger render={comp} />
            <Tooltip.Content side="right" align="center">
                <Tooltip.Title>{tooltip}</Tooltip.Title>
            </Tooltip.Content>
        </Tooltip.Root>
    );
}

function SidebarMenuItem({ className, ...rest }: SidebarMenuItemProps) {
    return (
        <li
            data-slot="sidebar-menu-item"
            data-sidebar="menu-item"
            className={cn`group/menu-item relative ${className}`}
            {...rest}
        />
    );
}

function SidebarMenuSkeleton({ className, showIcon = false }: SidebarMenuSkeletonProps) {
    const [width] = useState(() => {
        return `${Math.floor(Math.random() * 40) + 50}%`;
    });

    return (
        <div
            data-slot="sidebar-menu-skeleton"
            data-sidebar="menu-skeleton"
            className={cn`flex h-4xl items-center rounded-s px-m group-data-[state=expanded]:gap-m ${className}`}
        >
            {showIcon && <Skeleton tone="light" className="size-xl rounded-xs" />}
            <div
                className="max-w-(--skeleton-width) flex-1"
                style={{ '--skeleton-width': width } as React.CSSProperties}
            >
                <Skeleton tone="light" className="h-xl w-full rounded-xs" />
            </div>
        </div>
    );
}

function SidebarRail({ className, ...props }: SidebarRailProps) {
    const { toggleSidebar } = useSidebarContext();

    return (
        <button
            type="button"
            data-sidebar="rail"
            data-slot="sidebar-rail"
            aria-label="Toggle Sidebar"
            tabIndex={-1}
            onClick={toggleSidebar}
            className={cn`absolute inset-y-none z-20 hidden w-xl -translate-x-1/2 group-data-[collapsible=offcanvas]:translate-x-none group-data-[side=left]:-right-xl group-data-[side=right]:left-none after:absolute after:inset-y-none after:left-1/2 after:w-xxs group-data-[collapsible=offcanvas]:after:left-full hover:after:bg-border-primary in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize motion-safe:transition-all motion-safe:ease-linear sm:flex [[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize ${className} `}
            {...props}
        />
    );
}

function SidebarTrigger({ className }: SidebarTriggerProps) {
    const { toggleSidebar } = useSidebarContext();

    return (
        <IconButton
            data-sidebar="trigger"
            data-slot="sidebar-trigger"
            variant="ghost"
            size="sm"
            icon={<LastPageIcon />}
            aria-label="Toggle Sidebar"
            className={className}
            onClick={toggleSidebar}
        />
    );
}

export { SidebarProvider } from './context/SidebarContext';
export {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    SidebarRail,
    SidebarTrigger,
};
