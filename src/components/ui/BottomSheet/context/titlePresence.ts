import { createContext } from 'react';

export type TitlePresence = {
    /** Called by `Title` on mount, and with `false` on unmount. */
    setPresent: (present: boolean) => void;
    present: () => boolean;
};

/** Lets `Title` report itself so `Popup` can flag an unnamed sheet. Null outside a popup. */
export const TitlePresenceContext = createContext<TitlePresence | null>(null);
TitlePresenceContext.displayName = 'BottomSheetTitlePresenceContext';
