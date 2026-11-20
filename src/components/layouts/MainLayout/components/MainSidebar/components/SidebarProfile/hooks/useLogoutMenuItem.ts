import type { ContextMenuItem } from '@/components/ui/ContextMenu/types';
import { createElement } from 'react';
import LogoutIcon from '@/assets/icons/logout.svg?react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { logoutMutationOptions } from '@/services/authExample/queries';

export function useLogoutMenuItem(): ContextMenuItem {
    const navigate = useNavigate();
    const { mutate: logout, isPending: isLogOutPending } = useMutation(logoutMutationOptions());

    return {
        label: 'Log out',
        icon: createElement(LogoutIcon),
        disabled: isLogOutPending,
        onSelect() {
            logout(undefined, {
                onSuccess() {
                    navigate({
                        to: '/login',
                        ignoreBlocker: true,
                    });
                },
            });
        },
    };
}
