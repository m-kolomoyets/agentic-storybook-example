import type { StorybookConfig } from '@storybook/react-vite';

// Plugins from vite.config.ts that only make sense for the app build (index.html templating, bundle report).
const APP_ONLY_PLUGINS = /^(vite:html|vite:minify-html|vite-plugin-html|visualizer)/;

const config: StorybookConfig = {
    framework: '@storybook/react-vite',
    stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
    addons: [
        '@storybook/addon-docs',
        '@storybook/addon-a11y',
        '@storybook/addon-vitest',
        '@storybook/addon-designs',
        '@storybook/addon-mcp',
        '@chromatic-com/storybook',
    ],
    staticDirs: ['../public'],
    features: {
        // Required by addon-mcp docs toolset (docs-list / docs-show / docs-show-story).
        componentsManifest: true,
        // CSF Next `story.test()`: behaviour tests nest under their story instead of being stories themselves.
        experimentalTestSyntax: true,
    },
    viteFinal(viteConfig) {
        viteConfig.plugins = viteConfig.plugins?.flat().filter((plugin) => {
            return !(plugin && 'name' in plugin && APP_ONLY_PLUGINS.test(plugin.name));
        });

        return viteConfig;
    },
};

export default config;
