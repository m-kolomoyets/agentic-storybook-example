import { use, useEffect } from 'react';
import { TitlePresenceContext } from '../context/titlePresence';

/** Records the title for the unnamed-sheet guard; deregisters so a reopened sheet is checked again. */
export function useTitlePresence() {
    const title = use(TitlePresenceContext);

    useEffect(
        function recordTitle() {
            title?.setPresent(true);
            return () => {
                title?.setPresent(false);
            };
        },
        [title]
    );
}
