/** Generic reasons a tab is disabled. A caller with a sharper reason passes its own string. */
export const TAB_DISABLED_REASONS = {
    /** Something the tab waits on is running. */
    busy: 'Available once processing finishes',
    /** Nothing behind the tab yet. */
    empty: 'Nothing to show here yet',
    /** What the tab would show failed. */
    error: 'Unavailable because something went wrong',
    /** The user has to configure something first. */
    setup: 'Finish setup to unlock this',
    /** Fallback when the caller gives none. */
    unavailable: 'Not available right now',
} as const;

/** How long a press keeps the disabled reason open. */
export const REASON_HOLD_MS = 2500;
