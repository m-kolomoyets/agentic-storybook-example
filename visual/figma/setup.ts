// Figma reference checks (visual/README.md → "Figma reference"), for stories tagged `figma` with
// `parameters.figmaRef.url` → one Figma node whose content the story reproduces (same label, icons, state).
// After the play function: 1) spec — layout/type/colour vs Figma within 1px (hard), 2) image — pixelmatch against
// Figma's 2x PNG (tolerance per story). Both are soft assertions, so one run reports both.
import type { FigmaRef } from './commands.ts';
import { afterEach, beforeEach, expect } from 'vitest';
import { commands, page } from 'vitest/browser';
import { figmaSpecMismatches } from './spec.ts';

export type FigmaRefParameter = {
    /** Figma node URL of the exact variant (not the component set). */
    url: string;
    /** Element to compare; default: the story's first rendered element. */
    selector?: string;
    /** Share of pixels allowed to differ in the image comparison. Default 5 %. */
    maxDiffRatio?: number;
    /** Approved deviations (ADR 0002): mismatch lines containing any of these are dropped. Say why next to them. */
    ignore?: string[];
};

declare module 'vitest/browser' {
    interface BrowserCommands {
        figmaRef: (url: string) => Promise<FigmaRef>;
    }
}

// Pilot (Button md, 2x): text anti-aliasing alone differs on ~3 % of pixels (Figma's text renderer ≠ Chromium's).
const DEFAULT_MAX_DIFF_RATIO = 0.05;

// Same freeze as visual/diy/setup.ts, plus a transparent page (Figma exports the node on transparency).
const STABILIZE_CSS = `
*, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
}
html, body { background: transparent !important; }
/* A dark color-scheme paints the canvas #121212 even under omitBackground; Figma's export sits on transparency. */
:root { color-scheme: light !important; }
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

// Portable stories render into an anonymous <div> on <body> (Storybook's own divs carry classes/ids); inside it,
// the `withKitText` decorator div (.storybook/preview.tsx), then the story.
const STORY_ROOT = 'body > div:not([class], [id]) > div > :first-child';

function storyRoot(selector: string | undefined): Element {
    const found = document.querySelector(selector ?? STORY_ROOT);
    if (!found) {
        throw new Error(`figmaRef: nothing matches ${selector ?? STORY_ROOT}`);
    }

    return found;
}

afterEach(async (context) => {
    const story = (context as { story?: { parameters: Record<string, unknown> } }).story;
    const ref = story?.parameters.figmaRef as FigmaRefParameter | undefined;
    if (context.task.result?.state === 'fail' || !ref) {
        return;
    }

    await document.fonts.ready;
    const root = storyRoot(ref.selector);
    const { name, spec } = await commands.figmaRef(ref.url);

    const mismatches = figmaSpecMismatches(root, spec).filter((line) => {
        return !ref.ignore?.some((approved) => {
            return line.includes(approved);
        });
    });
    expect.soft(mismatches, `Figma spec (${spec.root.name})`).toEqual([]);

    await expect.soft(page.elementLocator(root)).toMatchScreenshot(name, {
        screenshotOptions: { omitBackground: true },
        comparatorName: 'pixelmatch',
        comparatorOptions: { threshold: 0.1, allowedMismatchedPixelRatio: ref.maxDiffRatio ?? DEFAULT_MAX_DIFF_RATIO },
    });
});
