import path from 'path';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { cn } from 'cn/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    return {
        plugins: [
            tanstackRouter({
                target: 'react',
                autoCodeSplitting: true,
            }),
            react(),
            babel({
                presets: [reactCompilerPreset()],
            }),
            tailwindcss(),
            // Compiles `src/lib/cn-tables.ts` from the kit's @theme so `cn` merges named scales
            // (`p-m`, `text-body-m`, `rounded-s`) — the default tables misread them and drop classes.
            cn({ full: true, css: 'src/styles/index.css', out: 'src/lib/cn-tables.ts' }),
            // Kit icons: `import BellIcon from '@/assets/icons/bell.svg?react'`. The regex also matches
            // `?import&react`, which Vite's dev server emits for `import.meta.glob(..., { query: '?react' })`.
            svgr({
                include: /\.svg\?(?:[^#]*&)?react(?:&|$)/,
                svgrOptions: {
                    plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
                    // Keep file-prefixed ids: inline SVGs share one document id space.
                    svgoConfig: {
                        floatPrecision: 2,
                        plugins: [{ name: 'preset-default', params: { overrides: { cleanupIds: false } } }],
                    },
                },
            }),
            visualizer({
                filename: './tmp/bundle-visualizer.html',
                gzipSize: true,
                brotliSize: true,
            }),
            createHtmlPlugin({
                minify: true,
                template: 'index.html',
                inject: {
                    data: {
                        injectScript:
                            mode === 'scan'
                                ? `<script
                                    crossOrigin="anonymous"
                                    src="//unpkg.com/react-scan/dist/auto.global.js"
                                  ></script>`
                                : '',
                    },
                },
            }),
        ],
        build: {
            // Vite 8 baseline = chrome111 / edge111 / firefox114 / safari16.4 / ios16.4.
            // Syntax only, no polyfills. ES2022 = API ceiling these ship natively.
            // Sync with `lib: ["ES2022"]` (tsconfig.app.json) + `ecmaVersion: 2022` (eslint.config.js). Bump all three.
            // Re-check every Vite major — baseline re-pinned (Vite 7 was chrome107 / firefox104 / safari16).
            target: 'baseline-widely-available',
            chunkSizeWarningLimit: 500,
            rolldownOptions: {
                output: {
                    codeSplitting: {
                        groups: [
                            {
                                name: 'vendor-react',
                                test: /[\\/]node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/,
                                priority: 50,
                            },
                            {
                                name: 'vendor-tanstack-query',
                                test: /[\\/]node_modules[\\/]@tanstack[\\/](react-query|query-core)[\\/]/,
                                priority: 40,
                            },
                            {
                                name: 'vendor-tanstack-router',
                                test: /[\\/]node_modules[\\/]@tanstack[\\/](react-router|router-core|history|react-store|store)[\\/]/,
                                priority: 40,
                            },
                            {
                                name: 'vendor-zod',
                                test: /[\\/]node_modules[\\/]zod[\\/]/,
                                priority: 40,
                            },
                        ],
                    },
                },
            },
        },
        resolve: {
            alias: {
                '@': path.resolve(import.meta.dirname, './src'),
            },
        },
        // Extra free PORTS if you need them (9199, 9889, 9521, 9836, 9713, 9407, 9491)
        server: {
            port: 9777,
        },
        preview: {
            port: 9111,
        },
    };
});
