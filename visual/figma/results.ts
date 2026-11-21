// Reading a FigmaMatrix story's last `pnpm vrt figma` outcome over the dev route (serve.ts). Shared by the Storybook
// "Figma diff" panel (manager) and the FigmaMatrix story itself (preview). Browser-safe: no Node imports.
import type { FigmaStoryResult } from './types.ts';
import { queryOptions } from '@tanstack/react-query';
import { FIGMA_RESULTS_DIR, VISUAL_URL_PREFIX } from './types.ts';

export function fileUrl(projectPath: string, version: number): string {
    return `/${VISUAL_URL_PREFIX}/${projectPath}?v=${version}`;
}

export const figmaResultKeys = {
    all: ['figma-result'] as const,
    story: (storyId: string) => {
        return [...figmaResultKeys.all, storyId] as const;
    },
};

/** Null when the story has no run yet, or outside the dev server (static build, Vitest). */
export function figmaResultOptions(storyId: string) {
    return queryOptions({
        queryKey: figmaResultKeys.story(storyId),
        queryFn: async ({ signal }) => {
            // `Date.now()` busts the dev server's cache so Reload sees a fresh run.
            const response = await fetch(fileUrl(`${FIGMA_RESULTS_DIR}/results/${storyId}.json`, Date.now()), {
                signal,
            });

            return response.ok ? ((await response.json()) as FigmaStoryResult) : null;
        },
    });
}
