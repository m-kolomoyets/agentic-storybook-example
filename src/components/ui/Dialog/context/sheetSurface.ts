import { createContext } from 'react';

/** Set once by `Root`: `true` below `md:`, where every part draws its `BottomSheet` counterpart. */
export const SheetSurfaceContext = createContext(false);
SheetSurfaceContext.displayName = 'DialogSheetSurfaceContext';
