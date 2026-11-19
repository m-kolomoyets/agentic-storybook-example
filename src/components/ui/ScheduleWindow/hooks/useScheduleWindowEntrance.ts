import { useState } from 'react';

/**
 * The `entranceIndex` for each row of a list: rows present when the list first has any flip in, in
 * that order; rows added later draw at once. An all-new key set (regenerate, reset) flips again.
 * Keyed, not indexed, so a delete followed by an add does not replay an entrance mid-list.
 */
function useScheduleWindowEntrance(keys: readonly string[]) {
    const [initialKeys, setInitialKeys] = useState<readonly string[] | null>(() => {
        return keys.length > 0 ? keys : null;
    });
    const replaced =
        keys.length > 0 &&
        (initialKeys === null ||
            !keys.some((key) => {
                return initialKeys.includes(key);
            }));
    if (replaced) {
        setInitialKeys(keys);
    }
    return (key: string): number | undefined => {
        const index = initialKeys?.indexOf(key) ?? -1;
        return index === -1 ? undefined : index;
    };
}

export { useScheduleWindowEntrance };
