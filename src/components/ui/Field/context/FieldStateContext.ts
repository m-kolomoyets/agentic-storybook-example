import type { FieldState } from '../types';
import { createContext } from 'react';

/**
 * Base UI does not swap description for error from Root's `invalid` (`FieldError` reads only its
 * own validity), so this context carries it.
 */
export const FieldStateContext = createContext<FieldState>({ invalid: false, disabled: false });

FieldStateContext.displayName = 'FieldStateContext';
