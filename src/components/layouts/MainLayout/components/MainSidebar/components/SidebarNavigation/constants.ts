import type { LinkProps } from '@tanstack/react-router';
import type { ComponentType, SVGProps } from 'react';
import type { Actions, SubjectName } from '@/lib/utils/auth/perms/types';
import GridViewIcon from '@/assets/icons/grid-view.svg?react';
import Inventory2Icon from '@/assets/icons/inventory-2.svg?react';
import TicketIcon from '@/assets/icons/ticket.svg?react';
import { PERM_ACTIONS, PERM_SUBJECTS } from '@/lib/utils/auth/perms/constants';

type SidebarNavigationLinkItem = {
    label: string;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
    linkProps: LinkProps;
    perm?: { action: Actions; subject: SubjectName };
};

export const SIDEBAR_NAVIGATION_LINK_LIST: SidebarNavigationLinkItem[] = [
    {
        label: 'Dashboard',
        Icon: GridViewIcon,
        linkProps: {
            to: '/dashboard',
        },
    },
    {
        label: 'Merchants',
        Icon: Inventory2Icon,
        linkProps: {
            to: '/merchants',
        },
        perm: { action: PERM_ACTIONS.READ, subject: PERM_SUBJECTS.MERCHANT },
    },
    {
        label: 'Vouchers',
        Icon: TicketIcon,
        linkProps: {
            to: '/vouchers',
        },
        perm: { action: PERM_ACTIONS.READ, subject: PERM_SUBJECTS.VOUCHER },
    },
];
