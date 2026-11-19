import { use } from 'react';
import { FieldStateContext } from '../context/FieldStateContext';

/** Surrounding Root's state. For composites Base UI's field context cannot reach (nested Root shadows). */
export function useFieldState() {
    return use(FieldStateContext);
}
