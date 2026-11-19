import type { SplitButtonState, SplitButtonZonePosition } from '../types';
import { createContext } from 'react';

/* `loading`/`disabled` live on the root (Figma spins both zones at once), so zones read them here. */
export const SplitButtonContext = createContext<SplitButtonState>({ loading: false, disabled: false });
SplitButtonContext.displayName = 'SplitButtonContext';

/* Outer-corner role, written by the root around each zone rather than inferred from DOM order. */
export const SplitButtonPositionContext = createContext<SplitButtonZonePosition | undefined>(undefined);
SplitButtonPositionContext.displayName = 'SplitButtonPositionContext';
