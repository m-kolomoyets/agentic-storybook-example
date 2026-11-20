// DIY visual regression: one screenshot per `vrt`-tagged story, after its play function.
// Baselines: visual/diy/__baselines__ (committed). Diffs: visual/.results/diy (gitignored).
import { afterEach, beforeEach, expect } from 'vitest';
import { page } from 'vitest/browser';

// Mirrors what Chromatic/Argos do natively: freeze motion and the caret so captures are stable.
const STABILIZE_CSS = `
*, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
}
`;

beforeEach(() => {
    const style = document.createElement('style');
    style.dataset.vrt = '';
    style.textContent = STABILIZE_CSS;
    document.head.append(style);

    return () => {
        style.remove();
    };
});

afterEach(async ({ task }) => {
    if (task.result?.state === 'fail') {
        return;
    }

    const storyId = task.meta.storyId;
    if (!storyId) {
        return;
    }

    await document.fonts.ready;
    // Whole viewport, not #storybook-root: portalled overlays (dialogs, toasts, menus) render outside it.
    await expect(page.elementLocator(document.body)).toMatchScreenshot(storyId);
});

declare module 'vitest' {
    interface TaskMeta {
        /** Set by @storybook/addon-vitest for every story test. */
        storyId?: string;
    }
}
