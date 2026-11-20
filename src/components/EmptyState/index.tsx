import type { EmptyStateProps } from './types';

/** Full-area status screen (404, error boundaries): glyph, heading, message, actions. */
function EmptyState({ icon, title, description, children }: EmptyStateProps) {
    return (
        <div className="flex w-full min-w-px flex-1 flex-col items-center justify-center gap-xl p-3xl text-center text-balance">
            <div className="flex max-w-2xl flex-col items-center gap-m">
                <span
                    aria-hidden
                    className="mb-m flex size-5xl items-center justify-center rounded-m bg-surface-secondary p-m text-icons-general-strong"
                >
                    {icon}
                </span>
                <h2 className="text-heading-l text-text-general-strong">{title}</h2>
                <p className="text-body-m text-text-general-medium">{description}</p>
            </div>
            {children ? <div className="flex max-w-2xl flex-col items-center gap-m">{children}</div> : null}
        </div>
    );
}

export { EmptyState };
