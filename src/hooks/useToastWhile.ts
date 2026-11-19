import type { ToastOptions, ToastStatus } from '@/components/ui/Toast';
import { useEffect, useEffectEvent } from 'react';
import { toast } from '@/components/ui/Toast';

export type ToastWhileOptions = Omit<ToastOptions, 'id' | 'onClose' | 'duration'> & {
    /** Fixed: a second raise with it updates the card on screen instead of stacking a copy. */
    id: string;
    /** User-initiated closes only (✕, swipe, action). Unmount and `open` going false don't call it. */
    onClose?: () => void;
};

/**
 * Bridges state an owner already holds (a store flag, `navigator.onLine`) to the manager-driven
 * `Toast` (ADR-0005): a sticky toast shown while `open`, dismissed when it goes false or the owner
 * unmounts. Options are read when the toast is raised, not on every render.
 */
export function useToastWhile(open: boolean, status: ToastStatus, options: ToastWhileOptions) {
    const { id } = options;
    const raise = useEffectEvent((onClose: () => void) => {
        toast[status]({ ...options, duration: 0, onClose });
    });
    const reportClose = useEffectEvent(() => {
        options.onClose?.();
    });

    useEffect(
        function syncToast() {
            if (!open) {
                return undefined;
            }
            // Cleared before the effect's own dismiss, so only a close the user made reaches `onClose`.
            let owned = true;
            raise(() => {
                if (owned) {
                    reportClose();
                }
            });

            return () => {
                owned = false;
                toast.dismiss(id);
            };
        },
        [open, id]
    );
}
