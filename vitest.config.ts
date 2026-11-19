import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

const configDir = path.join(import.meta.dirname, '.storybook');

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
            ],
        },
    });
});
