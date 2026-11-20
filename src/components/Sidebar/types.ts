import type { useRender } from '@base-ui/react/use-render';
import type { VariantProps } from 'class-variance-authority';
import type { sidebarMenuButtonVariants } from './utils/variants';

export type SidebarProps = React.ComponentProps<'div'> & {
    side?: 'left' | 'right';
    collapsible?: 'offcanvas' | 'icon' | 'none';
};

export type SidebarContentProps = React.ComponentProps<'div'>;

export type SidebarFooterProps = React.ComponentProps<'footer'>;

export type SidebarGroupProps = React.ComponentProps<'div'>;

export type SidebarHeaderProps = React.ComponentProps<'header'>;

export type SidebarInsetProps = React.ComponentProps<'main'>;

export type SidebarMenuProps = React.ComponentProps<'ul'>;

export type SidebarMenuButtonProps = useRender.ComponentProps<'button'> &
    React.ComponentProps<'button'> & {
        isActive?: boolean;
        /** Shown only while the sidebar is collapsed to icons (desktop). */
        tooltip?: string;
    } & VariantProps<typeof sidebarMenuButtonVariants>;

export type SidebarMenuItemProps = React.ComponentProps<'li'>;

export type SidebarMenuSkeletonProps = {
    showIcon?: boolean;
    className?: string;
};

export type SidebarRailProps = React.ComponentProps<'button'>;

export type SidebarTriggerProps = {
    className?: string;
};
