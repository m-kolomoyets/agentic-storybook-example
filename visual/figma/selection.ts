// The selected matrix cell, shared by the FigmaMatrix story (preview) and the "Figma diff" panel (manager) over the
// Storybook channel: the story's grid is the matrix, the panel shows the selected cell. Channel events rather than a
// global, so the selection never lands in the URL. Browser-safe: no Node or DOM imports.

/** Story → panel: what is selected, with the a11y of its live render (null when there is none: not in code). */
export const FIGMA_SELECTION_EVENT = 'amber/figma-diff/selection';
/** Panel → story: select this cell (← → in the panel). */
export const FIGMA_SELECT_EVENT = 'amber/figma-diff/select';
/** Panel → story: send the current selection again (the panel mounted after the story). */
export const FIGMA_SELECTION_REQUEST_EVENT = 'amber/figma-diff/selection-request';

/** One basic check, like the DevTools accessibility pane. `pass`: null when it doesn't apply or isn't judged. */
export type A11yRow = { label: string; value: string; note: string; pass: boolean | null };

export type FigmaSelection = {
    storyId: string;
    /** cellKey (view.ts): block position + Figma variant id. */
    key: string;
    a11y: A11yRow[] | null;
};

export type FigmaSelect = { storyId: string; key: string };
