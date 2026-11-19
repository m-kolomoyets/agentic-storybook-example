import type { GuardedPart } from '../context/partPresence';
import { use, useEffect } from 'react';
import { PartPresenceContext } from '../context/partPresence';

/** Records a part's presence for the empty-card guard, for as long as it is mounted. */
export function usePartPresence(part: GuardedPart) {
    const parts = use(PartPresenceContext);

    useEffect(
        function recordPresence() {
            parts?.setPresent(part, true);
            return () => {
                parts?.setPresent(part, false);
            };
        },
        [parts, part]
    );
}
