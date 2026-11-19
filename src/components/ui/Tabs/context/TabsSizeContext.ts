import type { TabsSize } from '../types';
import { createContext } from 'react';

/* `size` is set on `List` but styles each `Tab`. Default is defensive: a `Tab` outside a `List` throws in Base UI. */
export const TabsSizeContext = createContext<TabsSize>('lg');
TabsSizeContext.displayName = 'TabsSizeContext';
