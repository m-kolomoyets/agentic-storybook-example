import { createContext } from 'react';

export type GuardedPart = 'Title' | 'Descriptor';

export type PartPresence = {
    /** Called by a part on mount, and with `false` on unmount. */
    setPresent: (part: GuardedPart, present: boolean) => void;
    present: (part: GuardedPart) => boolean;
};

/** Lets `Title`/`Descriptor` report themselves so `Content` can flag an empty card. Null outside a card. */
export const PartPresenceContext = createContext<PartPresence | null>(null);
PartPresenceContext.displayName = 'TooltipPartPresenceContext';
