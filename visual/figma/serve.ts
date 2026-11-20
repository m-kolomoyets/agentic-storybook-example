// Dev-only route for the Figma reference results: `/__visual/<path>` → that file under the project root, limited to
// the refs and results folders. The Storybook "Figma diff" panel and the report page (when opened through
// Storybook) read from it. Nothing is copied into `storybook-static`, so Chromatic/Argos uploads stay unchanged.
import type { Plugin } from 'vite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { FIGMA_REFS_DIR, FIGMA_RESULTS_DIR, VISUAL_URL_PREFIX } from './types.ts';

const CONTENT_TYPES: Record<string, string> = {
    '.png': 'image/png',
    '.json': 'application/json',
    '.html': 'text/html; charset=utf-8',
};

export function visualResultsPlugin(): Plugin {
    return {
        name: 'amber:visual-results',
        apply: 'serve',
        configureServer(server) {
            // Not server.config.root: Storybook may point Vite elsewhere.
            const root = path.resolve(import.meta.dirname, '../..');
            const allowed = [FIGMA_REFS_DIR, FIGMA_RESULTS_DIR].map((dir) => {
                return path.resolve(root, dir) + path.sep;
            });

            server.middlewares.use(`/${VISUAL_URL_PREFIX}`, async (request, response, next) => {
                const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
                const file = path.resolve(root, `.${pathname}`);
                const type = CONTENT_TYPES[path.extname(file)];
                // Resolved path must stay inside the two folders: no traversal into the rest of the repo.
                if (
                    !type ||
                    !allowed.some((dir) => {
                        return file.startsWith(dir);
                    })
                ) {
                    next();

                    return;
                }
                try {
                    const body = await readFile(file);
                    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
                    response.end(body);
                } catch {
                    response.writeHead(404, { 'Content-Type': 'text/plain' });
                    response.end('Not found. Run `pnpm vrt figma`.');
                }
            });
        },
    };
}
