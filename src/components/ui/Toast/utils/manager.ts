import type { ToastData, ToastOptions, ToastStatus, ToastUpdate } from '../types';
import { Toast as BaseToast } from '@base-ui/react/toast';

/** One queue per bundle (ADR-0005); not exported, so no `toast.promise`. */
export const manager = BaseToast.createToastManager<ToastData>();

/** `negative` is sticky; `undefined` = Base UI's 5000ms default. */
const STATUS_TIMEOUT: Record<ToastStatus, number | undefined> = {
    default: undefined,
    positive: undefined,
    negative: 0,
    warning: undefined,
};

/** `high` → `role="alertdialog"` + hidden `role="alert"` mirror: the screen reader interrupts. */
const STATUS_PRIORITY: Record<ToastStatus, 'low' | 'high'> = {
    default: 'low',
    positive: 'low',
    negative: 'high',
    warning: 'low',
};

/** Status rides on `type` (→ `data-type`) and in `data`; always written together. */
function payloadFor(status: ToastStatus, options: Omit<ToastOptions, 'id' | 'onClose'>) {
    return {
        title: options.title,
        type: status,
        timeout: options.duration ?? STATUS_TIMEOUT[status],
        priority: STATUS_PRIORITY[status],
        data: {
            status,
            descriptor: options.descriptor,
            icon: options.icon,
            action: options.action,
            layout: options.layout,
        },
    };
}

function raise(status: ToastStatus, options: ToastOptions): string {
    return manager.add({ id: options.id, onClose: options.onClose, ...payloadFor(status, options) });
}

/** Imperative entry point; each raise returns the id `update`/`dismiss` take. */
export const toast = {
    default: (options: ToastOptions) => {
        return raise('default', options);
    },
    positive: (options: ToastOptions) => {
        return raise('positive', options);
    },
    /** Sticky, announced urgently. */
    negative: (options: ToastOptions) => {
        return raise('negative', options);
    },
    warning: (options: ToastOptions) => {
        return raise('warning', options);
    },
    /**
     * Patches in place (aria wiring and focus survive). Raising with an id already on screen also
     * updates and refreshes the timer — the only dedup; none by content.
     */
    update: (id: string, next: ToastUpdate) => {
        manager.update(id, payloadFor(next.status, next));
    },
    /** No argument closes every toast. */
    dismiss: (id?: string) => {
        manager.close(id);
    },
};

/** The manager is module state, so toasts leak across tests/stories — reset between them. */
export function resetToasts() {
    manager.close();
}
