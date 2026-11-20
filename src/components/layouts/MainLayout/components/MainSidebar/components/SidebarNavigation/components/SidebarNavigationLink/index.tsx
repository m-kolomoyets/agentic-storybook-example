import type { SidebarNavigationLinkProps } from './types';
import { Link } from '@tanstack/react-router';
import { SidebarMenuButton } from '@/components/Sidebar';

function SidebarNavigationLink({ activeProps, activeOptions, tooltipText, ...props }: SidebarNavigationLinkProps) {
    return (
        <SidebarMenuButton
            tooltip={tooltipText}
            render={
                <Link
                    activeOptions={{
                        exact: true,
                        ...activeOptions,
                    }}
                    activeProps={{
                        className: 'bg-white-alpha-10 text-body-s-medium',
                        ...activeProps,
                    }}
                    {...props}
                />
            }
        />
    );
}

export { SidebarNavigationLink };
