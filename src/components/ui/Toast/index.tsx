import type { ToastAction, ToastData, ToastLayout, ToastProviderProps } from './types';
import CloseIcon from '@/assets/icons/close.svg?react';
import { Toast as BaseToast } from '@base-ui/react/toast';
import { cn } from '@/lib/cn';
import { OVERLAY_TRANSITION_TRAVEL } from '@/lib/ui/overlayMotion';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { StatusIcon } from '@/components/ui/StatusIcon';
import { manager, toast } from './utils/manager';

/** Base UI only flags overflow (`data-limited`); a collapsed stack is undrawn, so the viewport hides them. */
const TOAST_LIMIT = 3;

/*
 * Zero-height strip: cards position against it, so the stack shift is a transform and hover pause
 * still works (`mouseenter` follows DOM containment). Top of the z ladder (popup 1400, modal 1300).
 */
const VIEWPORT_CLASSES = 'pointer-events-none fixed inset-x-none bottom-none z-[1500]';

/*
 * Figma 351px/420px as caps, not widths: a fixed 351px overflows 320px (WCAG 1.4.10).
 * `--toast-inset-bottom` (set by a pinned bar) replaces the whole offset, safe area included.
 * `--toast-offset-y`/`--toast-index` come from Base UI; only the gap is ours (`--spacing-m`).
 * Always `[transform:…]`, never `translate-*`: Tailwind v4 emits the standalone `translate`
 * property, which `transition-[opacity,transform]` does not cover. Enter/exit compose the stack
 * offset (bottom at mobile, right at `md:`); swipe exit continues the gesture.
 */
const ROOT_CLASSES = `
    pointer-events-auto [data-limited]:hidden
    toast-surface rounded-m
    max-w-[21.9375rem] md:max-w-[26.25rem]
    p-l md:p-xl
    absolute left-[var(--spacing-xl)] right-[var(--spacing-xl)]
    bottom-[var(--toast-inset-bottom,calc(var(--spacing-xl)+env(safe-area-inset-bottom)))]
    mx-auto md:ml-auto md:mr-none
    [--toast-stack-offset:calc(var(--toast-offset-y)+var(--toast-index)*var(--spacing-m))]
    [transform:translateY(calc(var(--toast-stack-offset)*-1))]
    flex gap-m
    ${OVERLAY_TRANSITION_TRAVEL}
    data-[starting-style]:[transform:translateY(calc(var(--toast-stack-offset)*-1+100%))]
    data-[ending-style]:[transform:translateY(calc(var(--toast-stack-offset)*-1+100%))]
    md:data-[starting-style]:[transform:translate(100%,calc(var(--toast-stack-offset)*-1))]
    md:data-[ending-style]:[transform:translate(100%,calc(var(--toast-stack-offset)*-1))]
    data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-stack-offset)*-1+var(--toast-swipe-movement-y)+100%))]
    data-[ending-style]:data-[swipe-direction=right]:[transform:translate(calc(var(--toast-swipe-movement-x)+100%),calc(var(--toast-stack-offset)*-1))]
    data-swiping:select-none
    motion-reduce:transition-none
`;

/* `min-w-[0px]`: without it a long title pushes the ✕ off the card. */
const BODY_CLASSES = 'flex min-w-[0px] flex-1 gap-s';

/*
 * `layout` is a class swap over one DOM, never a second subtree: remounting title/descriptor would
 * break `aria-labelledby`/`aria-describedby`. Stacked action indents to the text (9420:63609);
 * `order-1` paints it below the ✕ but keeps it before the ✕ in DOM (WCAG 1.3.2).
 */
const LAYOUT: Record<ToastLayout, { root: string; body: string; action: string }> = {
    inline: {
        root: 'items-center',
        body: 'items-center',
        action: 'shrink-0',
    },
    stacked: {
        root: 'flex-wrap items-start',
        body: 'items-start',
        action: 'order-1 basis-full ps-[calc(var(--spacing-5xl)+var(--spacing-s))]',
    },
};

const TEXT_CLASSES = 'flex min-w-[0px] flex-col gap-xs text-left';

const TITLE_CLASSES = 'text-body-s-medium text-text-on-surface-strong';

const DESCRIPTOR_CLASSES = 'text-caption-m text-text-on-surface-secondary';

/** `link` → `link-secondary`: the `link-primary` family is white-alpha, invisible on this light card. */
const ACTION_BUTTON = {
    link: { variant: 'link-secondary', size: 'sm' },
    primary: { variant: 'primary-on-surface', size: 'md' },
} as const;

type ToastActionButtonProps = {
    action: ToastAction;
    id: string;
    layout: ToastLayout;
};

/** Base UI `Toast.Action` never closes anything; this handler does. */
function ToastActionButton({ action, id, layout }: ToastActionButtonProps) {
    function handleClick() {
        action.onClick();
        // By id, not `Toast.Close`: a structural close cannot be declined.
        if (action.closeOnClick !== false) {
            toast.dismiss(id);
        }
    }

    return (
        <div className={LAYOUT[layout].action}>
            <Button
                {...ACTION_BUTTON[action.variant ?? 'link']}
                startIcon={action.startIcon}
                endIcon={action.endIcon}
                onClick={handleClick}
                // `render`, not `children`: `Toast.Action` returns `null` without renderable children.
                render={<BaseToast.Action type="button" />}
            >
                {action.label}
            </Button>
        </div>
    );
}

/** Base UI `timeout` prop not forwarded: lifetime is per status. */
function ToastProvider({ children }: ToastProviderProps) {
    return (
        <BaseToast.Provider toastManager={manager} limit={TOAST_LIMIT}>
            {children}
        </BaseToast.Provider>
    );
}

/** Base UI adds `role="region"`, `aria-live="polite"`, `aria-label="Notifications"`. */
function ToastViewport() {
    const { toasts } = BaseToast.useToastManager<ToastData>();

    return (
        <BaseToast.Portal>
            <BaseToast.Viewport className={VIEWPORT_CLASSES}>
                {toasts.map((item) => {
                    const layout = item.data?.layout ?? 'inline';

                    return (
                        <BaseToast.Root
                            key={item.id}
                            toast={item}
                            className={cn`${ROOT_CLASSES} ${LAYOUT[layout].root}`}
                        >
                            <div className={cn`${BODY_CLASSES} ${LAYOUT[layout].body}`}>
                                <StatusIcon
                                    className="shrink-0"
                                    icon={item.data?.icon}
                                    status={item.data?.status ?? 'default'}
                                />
                                <div className={TEXT_CLASSES}>
                                    <BaseToast.Title className={TITLE_CLASSES} />
                                    {/* Omitted when absent: an empty `<p>` still lands in `aria-describedby`. */}
                                    {item.data?.descriptor === undefined ? null : (
                                        <BaseToast.Description className={DESCRIPTOR_CLASSES}>
                                            {item.data.descriptor}
                                        </BaseToast.Description>
                                    )}
                                </div>
                            </div>
                            {item.data?.action === undefined ? null : (
                                <ToastActionButton action={item.data.action} id={item.id} layout={layout} />
                            )}
                            {/* ✕ on every toast, even Figma cells without one: a bare 20px glyph fails WCAG 2.5.8,
                                and a sticky `negative` would have no dismissal beyond swipe (WCAG 2.2.1). */}
                            <IconButton
                                size="sm"
                                icon={<CloseIcon />}
                                aria-label="Dismiss notification"
                                render={<BaseToast.Close />}
                                // Default glyph ink is white-alpha, invisible on this light card.
                                className="text-icons-on-surface-strong"
                            />
                        </BaseToast.Root>
                    );
                })}
            </BaseToast.Viewport>
        </BaseToast.Portal>
    );
}

/**
 * Transient status message, manager-driven (ADR-0005): mount `Toast.Provider` + `Toast.Viewport`
 * once, raise from anywhere with `toast.*`. Figma: `Notification` 10768:10277.
 */
const Toast = {
    Provider: ToastProvider,
    Viewport: ToastViewport,
};

export { Toast, ToastProvider, ToastViewport };
export { toast, resetToasts } from './utils/manager';
export type * from './types';
