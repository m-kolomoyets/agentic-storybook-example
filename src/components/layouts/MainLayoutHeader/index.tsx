import type { MainLayoutHeaderProps } from './types';
import { cn } from '@/lib/cn';
import { SidebarTrigger } from '@/components/Sidebar';
import { Divider } from '@/components/ui/Divider';

function MainLayoutHeader({ children, className, ...rest }: MainLayoutHeaderProps) {
    return (
        <header className={cn`-mx-3xl -mt-3xl flex items-center gap-m p-3xl ${className}`} {...rest}>
            <div className="flex shrink-0 items-center gap-m">
                <SidebarTrigger />
                <Divider orientation="vertical" className="mr-m h-xl" />
            </div>
            {children}
        </header>
    );
}

export { MainLayoutHeader };
