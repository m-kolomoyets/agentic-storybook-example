import { cva } from 'class-variance-authority';

export const sidebarMenuButtonVariants = cva(
    `
        peer/menu-button group/menu-button flex w-full items-center gap-m overflow-hidden rounded-s p-m text-left
        text-body-s text-text-general-strong outline-none motion-safe:transition-[width,height,padding]
        hover:bg-white-alpha-6 active:bg-white-alpha-10
        data-active:bg-white-alpha-10 data-active:text-body-s-medium aria-[current=page]:bg-white-alpha-10
        data-popup-open:bg-white-alpha-10
        focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-border-focused focus-visible:outline-solid
        disabled:pointer-events-none disabled:text-text-disabled aria-disabled:pointer-events-none
        aria-disabled:text-text-disabled
        group-data-[collapsible=icon]:size-4xl! group-data-[collapsible=icon]:p-m!
        [&_svg]:size-xl [&_svg]:shrink-0 [&>span:last-child]:truncate
    `,
    {
        variants: {
            size: {
                default: 'h-4xl',
                lg: 'h-6xl group-data-[collapsible=icon]:p-none!',
            },
        },
        defaultVariants: {
            size: 'default',
        },
    }
);
