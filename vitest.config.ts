import type { TestProjectInlineConfiguration } from 'vitest/config';
import type { ToMatchScreenshotOptions } from 'vitest/node';
import path from 'node:path';
import { argosVitestPlugin } from '@argos-ci/storybook/vitest-plugin';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

const configDir = path.join(import.meta.dirname, '.storybook');

// Visual regression comparison (visual/README.md): stories tagged `vrt` only. With VRT_BROWSER_WS set
// (`pnpm vrt`, browser from `pnpm vrt:browser`), Chromium runs in a pinned Linux container so captures
// don't depend on the host OS; `exposeNetwork` routes the container's localhost back to this machine.
const VRT_TAG = 'vrt';
const vrtBrowserWs = process.env.VRT_BROWSER_WS;
const vrtPlatform = vrtBrowserWs ? 'linux-docker' : process.platform;

function vrtPath(dir: string): NonNullable<ToMatchScreenshotOptions['resolveScreenshotPath']> {
    return ({ arg, browserName, ext, root }) => {
        return path.join(root, dir, `${arg}-${browserName}-${vrtPlatform}${ext}`);
    };
}

function vrtProject(
    name: string,
    plugins: NonNullable<TestProjectInlineConfiguration['plugins']>,
    test: NonNullable<TestProjectInlineConfiguration['test']>
): TestProjectInlineConfiguration {
    return {
        extends: true,
        plugins: [storybookTest({ configDir, tags: { include: [VRT_TAG] } }), ...plugins],
        test: {
            name,
            ...test,
            browser: {
                enabled: true,
                headless: true,
                provider: playwright(
                    vrtBrowserWs ? { connectOptions: { wsEndpoint: vrtBrowserWs, exposeNetwork: '<loopback>' } } : {}
                ),
                instances: [{ browser: 'chromium' }],
                screenshotFailures: false,
                ...test.browser,
            },
        },
    };
}

// Storybook stories run as Vitest browser tests (`pnpm test:storybook`).
export default defineConfig((env) => {
    return mergeConfig(viteConfig(env), {
        test: {
            projects: [
                {
                    extends: true,
                    plugins: [storybookTest({ configDir, storybookScript: 'pnpm storybook' })],
                    test: {
                        name: 'storybook',
                        browser: {
                            enabled: true,
                            headless: true,
                            provider: playwright(),
                            instances: [{ browser: 'chromium' }],
                        },
                    },
                },
                // Storybook's runner (UI / MCP test-run) sets VITEST_STORYBOOK and storybookTest() then renames every
                // project to `storybook:<configDir>` — VRT projects share configDir, so names collide. VRT is CLI-only.
                ...(process.env.VITEST_STORYBOOK === 'true' ? [] : vrtProjects()),
            ],
        },
    });
});

function vrtProjects(): TestProjectInlineConfiguration[] {
    return [
        vrtProject('vrt-diy', [], {
            setupFiles: ['./visual/diy/setup.ts'],
            attachmentsDir: 'visual/.results/diy',
            // Storybook's plugin blocks API file writes unless opted in; toMatchScreenshot needs them to
            // save baselines and diffs. The API server stays on localhost.
            api: { allowWrite: true },
            browser: {
                expect: {
                    toMatchScreenshot: {
                        comparatorName: 'pixelmatch',
                        comparatorOptions: { threshold: 0.1, allowedMismatchedPixelRatio: 0 },
                        resolveScreenshotPath: vrtPath('visual/diy/__baselines__'),
                        resolveDiffPath: vrtPath('visual/.results/diy'),
                    },
                },
            },
        }),
        // Captures locally, uploads to Argos (ARGOS_TOKEN); baselines and review live in Argos.
        vrtProject(
            'vrt-argos',
            [
                argosVitestPlugin({
                    uploadToArgos: Boolean(process.env.ARGOS_TOKEN),
                    root: 'visual/.results/argos',
                    buildName: 'storybook-vrt',
                }),
            ],
            {}
        ),
    ];
}
