import { createContext } from 'react';

export type GuardedPart = 'Title' | 'Descriptor';

export type PartPresence = {
    /** Called by a part on mount, and with `false` on unmount. */
    setPresent: (part: GuardedPart, present: boolean) => void;
    present: (part: GuardedPart) => boolean;
};

/** Lets `Title`/`Descriptor` report themselves so `Popup` can flag an unnamed/undescribed dialog. */
export const PartPresenceContext = createContext<PartPresence | null>(null);
PartPresenceContext.displayName = 'DialogPartPresenceContext';
